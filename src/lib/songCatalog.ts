import { archiveUrl } from './bridgeUrl'
import type { ButtonMode, Difficulty } from '../types'
const CACHE_KEY = 'drillmax-song-catalog-v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7일

export interface SongPatternMeta {
  level?: number
  floor?: number | null
  floorName?: string | null
}

export interface SongEntry {
  /** songs.json 의 title (곡 ID) */
  title?: number
  name: string
  composer: string
  dlcCode: string
  patterns: Partial<
    Record<ButtonMode, Partial<Record<Difficulty, SongPatternMeta>>>
  >
}

interface CachePayload {
  fetchedAt: number
  songs: SongEntry[]
}

export function normalizeSongKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export interface SongIndex {
  byName: Map<string, SongEntry>
  entries: Array<{ song: SongEntry; name: string; composer: string }>
}

let memoryRaw: string | null = null
let memoryPayload: CachePayload | null = null

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) {
      memoryRaw = null
      memoryPayload = null
      return null
    }
    if (raw === memoryRaw && memoryPayload) return memoryPayload
    const parsed = JSON.parse(raw) as CachePayload
    if (!parsed || !Array.isArray(parsed.songs)) return null
    memoryRaw = raw
    memoryPayload = parsed
    return parsed
  } catch {
    return null
  }
}

function rememberCache(payload: CachePayload) {
  const raw = JSON.stringify(payload)
  memoryRaw = raw
  memoryPayload = payload
  localStorage.setItem(CACHE_KEY, raw)
}

export function loadCachedSongs(): SongEntry[] {
  return readCache()?.songs ?? []
}

export function isCacheFresh(): boolean {
  const parsed = readCache()
  if (!parsed) return false
  return Date.now() - parsed.fetchedAt <= CACHE_TTL_MS
}

export function buildSongIndex(songs: SongEntry[]): SongIndex {
  const byName = new Map<string, SongEntry>()
  const entries = songs.map((song) => {
    const name = normalizeSongKey(song.name)
    const composer = normalizeSongKey(song.composer)
    if (!byName.has(name)) byName.set(name, song)
    return { song, name, composer }
  })
  return { byName, entries }
}

export async function fetchSongCatalog(): Promise<SongEntry[]> {
  const res = await fetch(archiveUrl('/db/v2/songs.json'))
  if (!res.ok) throw new Error(`곡 목록 로드 실패 (${res.status})`)
  const data = (await res.json()) as Array<{
    title?: number
    name?: string
    composer?: string
    dlcCode?: string
    patterns?: SongEntry['patterns']
  }>

  const songs: SongEntry[] = data
    .filter((s) => typeof s.name === 'string' && s.name.trim())
    .map((s) => ({
      title: typeof s.title === 'number' ? s.title : undefined,
      name: s.name!.trim(),
      composer: (s.composer ?? '').trim(),
      dlcCode: (s.dlcCode ?? '').trim(),
      patterns: s.patterns ?? {},
    }))

  rememberCache({ fetchedAt: Date.now(), songs })
  return songs
}

export function availableButtons(song: SongEntry): ButtonMode[] {
  const order: ButtonMode[] = ['4B', '5B', '6B', '8B']
  return order.filter((b) => song.patterns[b] && Object.keys(song.patterns[b]!).length > 0)
}

export function availableDifficulties(
  song: SongEntry,
  button: ButtonMode,
): Difficulty[] {
  const order: Difficulty[] = ['NM', 'HD', 'MX', 'SC']
  const bag = song.patterns[button]
  if (!bag) return []
  return order.filter((d) => bag[d] != null)
}

export function findSongExact(
  index: SongIndex,
  title: string,
): SongEntry | undefined {
  return index.byName.get(normalizeSongKey(title))
}

/** 부분 일치 + 시작 일치 우선 정렬. 이름 정규화는 인덱스를 만들 때 한 번만 한다. */
export function searchSongs(
  index: SongIndex,
  query: string,
  limit = 12,
): SongEntry[] {
  const q = normalizeSongKey(query)
  if (!q) return []

  const scored: { song: SongEntry; score: number }[] = []
  for (const entry of index.entries) {
    let score = -1
    if (entry.name === q) score = 100
    else if (entry.name.startsWith(q)) score = 80
    else if (entry.name.includes(q)) score = 60
    else if (entry.composer.startsWith(q)) score = 40
    else if (entry.composer.includes(q)) score = 20
    if (score >= 0) scored.push({ song: entry.song, score })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.song.name.localeCompare(b.song.name, 'ko')
  })

  return scored.slice(0, limit).map((s) => s.song)
}
