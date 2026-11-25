import catalog4Url from '../../../DrillMAX-dev-data/hang2bot-4b.json?url'
import catalog5Url from '../../../DrillMAX-dev-data/hang2bot-5b.json?url'
import catalog6Url from '../../../DrillMAX-dev-data/hang2bot-6b.json?url'
import catalog8Url from '../../../DrillMAX-dev-data/hang2bot-8b.json?url'
import {
  dropHangSongs,
  focusHangCatalog,
  hangCatalog,
  hangSyncId,
  installHangCatalog,
  publishHangJackets,
  readSyncId,
  releaseHangSongs,
  rememberSyncId,
} from './hangCatalog'
import { localDateKey } from './dates'
import type { ButtonMode } from '../types'

const BUNDLED_URL: Record<ButtonMode, string> = {
  '4B': catalog4Url,
  '5B': catalog5Url,
  '6B': catalog6Url,
  '8B': catalog8Url,
}

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

export function readHangSync(): SyncRecord | null {
  try {
    const raw = localStorage.getItem(DAY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SyncRecord
    if (!parsed || parsed.day !== localDateKey() || !parsed.status) return null
    return parsed
  } catch {
    return null
  }
}

export function hangSyncUsedToday() {
  return readHangSync() != null
}

function writeHangSync(status: HangSyncStatus) {
  const record: SyncRecord = { day: localDateKey(), status }
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

function parseStored(value: unknown): { syncId: string; songs: unknown[] } | null {
  if (Array.isArray(value)) {
    const syncId = value.reduce<string>((found, song) => found || readSyncId(song), '')
    return syncId ? { syncId, songs: value } : null
  }
  if (!value || typeof value !== 'object') return null
  const record = value as { syncId?: unknown; songs?: unknown }
  if (typeof record.syncId !== 'string' || !record.syncId || !Array.isArray(record.songs)) {
    return null
  }
  return { syncId: record.syncId, songs: record.songs }
}

function storedCatalog(button: ButtonMode) {
  const file = hangCatalog(button)
  return { syncId: file.syncId, songs: file.songs }
}

async function readStoredSyncId(button: ButtonMode): Promise<string> {
  const known = hangSyncId(button)
  if (known) return known
  try {
    const db = await openDb()
    try {
      const parsed = parseStored(await idbGet(db, button))
      if (!parsed) return ''
      rememberSyncId(button, parsed.syncId)
      return parsed.syncId
    } finally {
      db.close()
    }
  } catch {
    return ''
  }
}

async function refreshOne(button: number): Promise<'same' | 'updated'> {
  const mode = buttonMode(button)
  const probe = asPage(await hangGet(`/songs/${button}?page=1&limit=1`))
  const remoteId = probe ? readSyncId(probe.songs[0]) : ''
  if (!remoteId) throw new Error('probe')
  if (remoteId === (await readStoredSyncId(mode))) return 'same'
  const songs = await downloadButton(button)
  if (readSyncId(songs[0]) !== remoteId) throw new Error('moved')
  if (!installHangCatalog(mode, songs, remoteId)) throw new Error('shape')
  const stored = storedCatalog(mode)
  const db = await openDb()
  try {
    await idbPut(db, mode, stored)
  } finally {
    db.close()
  }
  if (retainButton !== mode) dropHangSongs(mode)
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

const loading = new Map<ButtonMode, Promise<void>>()
let retainButton: ButtonMode | null = null
let catalogEpoch = 0

/** 추천 탭을 떠나면 곡 목록을 놓는다. 진행 중이던 적재가 끝나도 다시 들고 있지 않는다. */
export function releaseHangCatalogs() {
  catalogEpoch += 1
  retainButton = null
  releaseHangSongs()
}

async function loadHangButton(button: ButtonMode): Promise<void> {
  const epoch = catalogEpoch
  const stillCurrent = () => epoch === catalogEpoch
  try {
    let db: IDBDatabase | null = null
    try {
      db = await openDb()
      const saved = await idbGet(db, button)
      if (!stillCurrent()) return
      const parsed = parseStored(saved)
      if (parsed && installHangCatalog(button, parsed.songs, parsed.syncId)) {
        if (Array.isArray(saved)) {
          const stored = storedCatalog(button)
          await idbPut(db, button, stored)
        }
        return
      }
    } catch {
      // 저장본이 없으면 앱에 들어 있는 목록을 쓴다.
    } finally {
      db?.close()
    }
    if (!stillCurrent()) return
    try {
      const response = await fetch(BUNDLED_URL[button])
      if (!response.ok || !stillCurrent()) return
      const data = (await response.json()) as { songs?: unknown }
      if (!stillCurrent() || !Array.isArray(data.songs)) return
      installHangCatalog(button, data.songs)
    } catch {
      // 목록을 못 읽으면 상수 없음으로 둔다.
    }
  } finally {
    if (stillCurrent() && retainButton) focusHangCatalog(retainButton)
  }
}

const jacketJobs = new Map<ButtonMode, Promise<void>>()

/** 다른 버튼 곡 목록은 비워도, 캐러셀 뒤 카드의 자켓은 찾을 수 있게 주소만 남긴다. */
export function indexHangJackets(button: ButtonMode): Promise<void> {
  const pending = jacketJobs.get(button)
  if (pending) return pending
  const job = fillJacketIndex(button).catch(() => {
    jacketJobs.delete(button)
  })
  jacketJobs.set(button, job)
  return job
}

function jacketRows(songs: Iterable<unknown>) {
  const rows: { pattern: string; title: string; title_jacket?: string }[] = []
  for (const raw of songs) {
    if (!raw || typeof raw !== 'object') continue
    const song = raw as { title?: unknown; pattern?: unknown; title_jacket?: unknown }
    if (typeof song.title !== 'string' || typeof song.pattern !== 'string') continue
    if (typeof song.title_jacket !== 'string' || !song.title_jacket) continue
    rows.push({ title: song.title, pattern: song.pattern, title_jacket: song.title_jacket })
  }
  return rows
}

async function fillJacketIndex(button: ButtonMode): Promise<void> {
  const live = hangCatalog(button).songs
  if (live.some((song) => song.title_jacket)) {
    publishHangJackets(button, live)
    return
  }
  const pending = loading.get(button)
  if (pending) {
    await pending
    const loaded = hangCatalog(button).songs
    if (loaded.some((song) => song.title_jacket)) {
      publishHangJackets(button, loaded)
      return
    }
  }
  let storedSongs: unknown[] | null = null
  try {
    const db = await openDb()
    try {
      storedSongs = parseStored(await idbGet(db, button))?.songs ?? null
    } finally {
      db.close()
    }
  } catch {
    storedSongs = null
  }
  if (storedSongs) {
    publishHangJackets(button, jacketRows(storedSongs))
    return
  }
  const response = await fetch(BUNDLED_URL[button])
  if (!response.ok) return
  const data = (await response.json()) as { songs?: unknown }
  if (!Array.isArray(data.songs)) return
  publishHangJackets(button, jacketRows(data.songs))
}

export function ensureHangCatalog(button: ButtonMode): Promise<void> {
  retainButton = button
  if (hangCatalog(button).songs.length > 0) {
    focusHangCatalog(button)
    return Promise.resolve()
  }
  const pending = loading.get(button)
  if (pending) return pending
  const job = loadHangButton(button).finally(() => loading.delete(button))
  loading.set(button, job)
  return job
}
