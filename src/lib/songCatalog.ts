import type { ButtonMode, Difficulty } from '../types'

const API_URL = 'https://v-archive.net/db/v2/songs.json'
const CACHE_KEY = 'rhythmform-song-catalog-v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7일

export interface SongEntry {
  name: string
  composer: string
  dlcCode: string
  patterns: Partial<
    Record<ButtonMode, Partial<Record<Difficulty, { level?: number }>>>
  >
}

interface CachePayload {
  fetchedAt: number
  songs: SongEntry[]
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function loadCachedSongs(): SongEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CachePayload
    if (!Array.isArray(parsed.songs)) return []
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return parsed.songs
    return parsed.songs
  } catch {
    return []
  }
}

export function isCacheFresh(): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as CachePayload
    return Date.now() - parsed.fetchedAt <= CACHE_TTL_MS
  } catch {
    return false
  }
}

export async function fetchSongCatalog(): Promise<SongEntry[]> {
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(`곡 목록 로드 실패 (${res.status})`)
  const data = (await res.json()) as Array<{
    name?: string
    composer?: string
    dlcCode?: string
    patterns?: SongEntry['patterns']
  }>

  const songs: SongEntry[] = data
    .filter((s) => typeof s.name === 'string' && s.name.trim())
    .map((s) => ({
      name: s.name!.trim(),
      composer: (s.composer ?? '').trim(),
      dlcCode: (s.dlcCode ?? '').trim(),
      patterns: s.patterns ?? {},
    }))

  const payload: CachePayload = { fetchedAt: Date.now(), songs }
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
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
  songs: SongEntry[],
  title: string,
): SongEntry | undefined {
  const key = normalize(title)
  return songs.find((s) => normalize(s.name) === key)
}

/** 부분 일치 + 시작 일치 우선 정렬 */
export function searchSongs(
  songs: SongEntry[],
  query: string,
  limit = 12,
): SongEntry[] {
  const q = normalize(query)
  if (!q) return []

  const scored: { song: SongEntry; score: number }[] = []
  for (const song of songs) {
    const name = normalize(song.name)
    const composer = normalize(song.composer)
    let score = -1
    if (name === q) score = 100
    else if (name.startsWith(q)) score = 80
    else if (name.includes(q)) score = 60
    else if (composer.startsWith(q)) score = 40
    else if (composer.includes(q)) score = 20
    if (score >= 0) scored.push({ song, score })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.song.name.localeCompare(b.song.name, 'ko')
  })

  return scored.slice(0, limit).map((s) => s.song)
}
