import { hangSyncId, installHangCatalog } from './hangCatalog'
import type { ButtonMode } from '../types'

const DAY_KEY = 'drillmax-hang2bot-sync'
const DB_NAME = 'drillmax-hang2bot'
const STORE = 'catalogs'
const HANG_ORIGIN = 'https://djmax-bf8a54aa6ab0.herokuapp.com'
const BUTTONS = [4, 5, 6, 8] as const
const PAGE_LIMIT = 80
const MAX_PAGES = 40

export type HangSyncStatus = 'limited' | 'unchanged' | 'updated' | 'partial' | 'failed'

interface SyncRecord {
  day: string
  status: HangSyncStatus
}

function localDay(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

export function readHangSync(): SyncRecord | null {
  try {
    const raw = localStorage.getItem(DAY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SyncRecord
    if (!parsed || parsed.day !== localDay() || !parsed.status) return null
    return parsed
  } catch {
    return null
  }
}

export function hangSyncUsedToday() {
  return readHangSync() != null
}

function writeHangSync(status: HangSyncStatus) {
  const record: SyncRecord = { day: localDay(), status }
  localStorage.setItem(DAY_KEY, JSON.stringify(record))
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbGet(db: IDBDatabase, key: string) {
  return idbRequest(db.transaction(STORE, 'readonly').objectStore(STORE).get(key))
}

function idbPut(db: IDBDatabase, key: string, value: unknown) {
  return idbRequest(db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key))
}

function idbDelete(db: IDBDatabase, key: string) {
  return idbRequest(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key))
}

interface SongPage {
  total: number
  songs: unknown[]
}

function asPage(value: unknown): SongPage | null {
  if (!value || typeof value !== 'object') return null
  const page = value as { total?: unknown; songs?: unknown }
  if (typeof page.total !== 'number' || !Array.isArray(page.songs)) return null
  return { total: page.total, songs: page.songs }
}

function syncIdOf(song: unknown) {
  if (!song || typeof song !== 'object') return ''
  const id = (song as { sync_run_id?: unknown }).sync_run_id
  return typeof id === 'string' ? id : ''
}

async function hangGetOnce(path: string): Promise<unknown> {
  if (import.meta.env.DEV) {
    const response = await fetch(`/hang-proxy${path}`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(String(response.status))
    return response.json()
  }
  const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
  const response = await tauriFetch(`${HANG_ORIGIN}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'DrillMAX' },
    connectTimeout: 20000,
    maxRedirections: 0,
  })
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

async function hangGet(path: string): Promise<unknown> {
  let last: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await hangGetOnce(path)
    } catch (error) {
      last = error
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
    }
  }
  throw last
}

async function downloadButton(button: number): Promise<unknown[]> {
  const first = asPage(await hangGet(`/songs/${button}?page=1&limit=${PAGE_LIMIT}`))
  if (!first || first.total <= 0) throw new Error('page')
  const songs = [...first.songs]
  let page = 1
  while (songs.length < first.total && page < MAX_PAGES) {
    page += 1
    const next = asPage(
      await hangGet(`/songs/${button}?page=${page}&limit=${PAGE_LIMIT}`),
    )
    if (!next || next.songs.length === 0) break
    songs.push(...next.songs)
  }
  if (songs.length !== first.total) throw new Error('short')
  return songs
}

function buttonMode(button: number): ButtonMode {
  return `${button}B` as ButtonMode
}

function syncStatus(updated: number, failed: number): HangSyncStatus {
  if (updated > 0 && failed > 0) return 'partial'
  if (updated > 0) return 'updated'
  if (failed > 0) return 'failed'
  return 'unchanged'
}

async function refreshOne(button: number): Promise<'same' | 'updated'> {
  const mode = buttonMode(button)
  const probe = asPage(await hangGet(`/songs/${button}?page=1&limit=1`))
  const remoteId = probe ? syncIdOf(probe.songs[0]) : ''
  if (!remoteId) throw new Error('probe')
  if (remoteId === hangSyncId(mode)) return 'same'
  const songs = await downloadButton(button)
  if (syncIdOf(songs[0]) !== remoteId) throw new Error('moved')
  const db = await openDb()
  try {
    await idbPut(db, mode, songs)
    if (!installHangCatalog(mode, songs)) {
      await idbDelete(db, mode)
      throw new Error('shape')
    }
  } finally {
    db.close()
  }
  return 'updated'
}

let refreshing = false

export async function refreshHangCatalogs(): Promise<HangSyncStatus> {
  if (refreshing || hangSyncUsedToday()) return 'limited'
  refreshing = true
  writeHangSync('failed')
  try {
    let updated = 0
    let failed = 0
    for (const button of BUTTONS) {
      try {
        const result = await refreshOne(button)
        if (result === 'updated') updated += 1
      } catch {
        failed += 1
      }
    }
    const status = syncStatus(updated, failed)
    writeHangSync(status)
    return status
  } finally {
    refreshing = false
  }
}

export async function loadSavedHangCatalogs() {
  try {
    const db = await openDb()
    try {
      for (const button of BUTTONS) {
        const mode = buttonMode(button)
        const saved = await idbGet(db, mode)
        if (!Array.isArray(saved)) continue
        installHangCatalog(mode, saved)
      }
    } finally {
      db.close()
    }
  } catch {
    // 저장본이 없으면 앱에 들어 있는 목록을 그대로 쓴다.
  }
}
