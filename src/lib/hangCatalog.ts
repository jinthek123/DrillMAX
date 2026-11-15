import catalog4 from '../../../DrillMAX-dev-data/dev-data/hang2bot-4b.json'
import catalog5 from '../../../DrillMAX-dev-data/dev-data/hang2bot-5b.json'
import catalog6 from '../../../DrillMAX-dev-data/dev-data/hang2bot-6b.json'
import catalog8 from '../../../DrillMAX-dev-data/dev-data/hang2bot-8b.json'
import type { ButtonMode } from '../types'

export interface HangSong {
  title: string
  pattern: string
  /** 게임 표기 레벨. SC 배지 색 구간용 */
  level?: number
  difficulty: number
  floor: number
  floorName: string
  tags?: Record<string, number>
  sync_run_id?: string
}

interface HangFile {
  button: number
  songs: HangSong[]
}

const catalogs: Record<ButtonMode, HangFile> = {
  '4B': catalog4 as unknown as HangFile,
  '5B': catalog5 as unknown as HangFile,
  '6B': catalog6 as unknown as HangFile,
  '8B': catalog8 as unknown as HangFile,
}

const listeners = new Set<() => void>()

export function subscribeHangCatalog(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyHangCatalog() {
  for (const listener of listeners) listener()
}

export function hangCatalog(button: ButtonMode): HangFile {
  return catalogs[button]
}

export function hangSyncId(button: ButtonMode): string {
  for (const song of catalogs[button].songs) {
    if (song.sync_run_id) return song.sync_run_id
  }
  return ''
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
    difficulty: typeof song.difficulty === 'number' ? song.difficulty : song.floor / 10,
    floor: song.floor,
    floorName: song.floorName,
    tags: song.tags && typeof song.tags === 'object' ? song.tags : undefined,
    sync_run_id: typeof song.sync_run_id === 'string' ? song.sync_run_id : undefined,
  }
}

export function installHangCatalog(button: ButtonMode, rawSongs: unknown[]): boolean {
  const songs: HangSong[] = []
  for (const raw of rawSongs) {
    const song = asHangSong(raw)
    if (!song) continue
    songs.push(song)
  }
  if (songs.length === 0 || !songs.some((song) => song.sync_run_id)) return false
  catalogs[button] = { button: Number(button.replace('B', '')), songs }
  notifyHangCatalog()
  return true
}
