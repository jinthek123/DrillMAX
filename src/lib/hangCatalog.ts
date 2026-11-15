import type { ButtonMode } from '../types'

export interface HangSong {
  title: string
  pattern: string
  /** 게임 표기 레벨. SC 배지 색 구간용 */
  level?: number
  floor: number
  floorName: string
  tags?: Record<string, number>
}

interface HangFile {
  button: number
  syncId: string
  songs: HangSong[]
}

const BUTTONS: ButtonMode[] = ['4B', '5B', '6B', '8B']

function emptyFile(button: ButtonMode): HangFile {
  return { button: Number(button.replace('B', '')), syncId: '', songs: [] }
}

const catalogs: Record<ButtonMode, HangFile> = {
  '4B': emptyFile('4B'),
  '5B': emptyFile('5B'),
  '6B': emptyFile('6B'),
  '8B': emptyFile('8B'),
}

const listeners = new Set<() => void>()

export function subscribeHangCatalog(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifyHangCatalog() {
  for (const listener of listeners) listener()
}

export function hangCatalog(button: ButtonMode): HangFile {
  return catalogs[button]
}

export function hangSyncId(button: ButtonMode): string {
  return catalogs[button].syncId
}

export function rememberSyncId(button: ButtonMode, syncId: string) {
  if (!syncId || catalogs[button].syncId === syncId) return
  catalogs[button] = { ...catalogs[button], syncId }
}

/** 지금 보는 버튼만 곡 목록을 들고 있는다. 동기화 번호는 남겨 둔다. */
export function focusHangCatalog(button: ButtonMode) {
  for (const key of BUTTONS) {
    if (key === button || catalogs[key].songs.length === 0) continue
    catalogs[key] = { ...catalogs[key], songs: [] }
  }
}

function readSyncId(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const id = (value as { sync_run_id?: unknown }).sync_run_id
  return typeof id === 'string' ? id : ''
}

function copyTags(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const tags: Record<string, number> = {}
  for (const [name, score] of Object.entries(value)) {
    if (!name.trim() || typeof score !== 'number' || !Number.isFinite(score) || score <= 0) {
      continue
    }
    tags[name] = score
  }
  return Object.keys(tags).length > 0 ? tags : undefined
}

function asHangSong(value: unknown): HangSong | null {
  if (!value || typeof value !== 'object') return null
  const song = value as HangSong
  if (typeof song.pattern !== 'string' || !song.pattern) return null
  if (typeof song.floor !== 'number' || !Number.isFinite(song.floor)) return null
  if (typeof song.floorName !== 'string' || !song.floorName) return null
  if (song.title != null && typeof song.title !== 'string') return null
  return {
    title: typeof song.title === 'string' ? song.title : '',
    pattern: song.pattern,
    level: typeof song.level === 'number' ? song.level : undefined,
    floor: song.floor,
    floorName: song.floorName,
    tags: copyTags(song.tags),
  }
}

export function installHangCatalog(
  button: ButtonMode,
  rawSongs: unknown[],
  knownSyncId = '',
): boolean {
  const songs: HangSong[] = []
  let syncId = knownSyncId
  for (const raw of rawSongs) {
    if (!syncId) syncId = readSyncId(raw)
    const song = asHangSong(raw)
    if (song) songs.push(song)
  }
  if (songs.length === 0 || !syncId) return false
  catalogs[button] = {
    button: Number(button.replace('B', '')),
    syncId,
    songs,
  }
  notifyHangCatalog()
  return true
}
