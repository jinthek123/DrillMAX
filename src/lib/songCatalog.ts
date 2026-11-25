import { archiveUrl } from './bridgeUrl'
import type { ButtonMode, Difficulty } from '../types'
const CACHE_KEY = 'drillmax-song-catalog-v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7일
const BUTTONS: ButtonMode[] = ['4B', '5B', '6B', '8B']
const DIFFS: Difficulty[] = ['NM', 'HD', 'MX', 'SC']

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

let memoryPayload: CachePayload | null = null
let cacheNeedsRewrite = false

function slimMeta(value: unknown): SongPatternMeta | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const meta: SongPatternMeta = {}
  if (typeof row.level === 'number' && Number.isFinite(row.level)) meta.level = row.level
  if (typeof row.floor === 'number' && Number.isFinite(row.floor)) meta.floor = row.floor
  else if (row.floor === null) meta.floor = null
  if (typeof row.floorName === 'string') meta.floorName = row.floorName
  else if (row.floorName === null) meta.floorName = null
  if (meta.level == null && meta.floor == null && meta.floorName == null) return undefined
  return meta
}

/** 자동완성과 배지에 쓰는 칸만 남긴다. rating·standard·tags 는 메모리에 두지 않는다. */
function slimPatterns(value: unknown): SongEntry['patterns'] {
  const patterns: SongEntry['patterns'] = {}
  if (!value || typeof value !== 'object') return patterns
  const raw = value as Record<string, unknown>
  for (const button of BUTTONS) {
    const bag = raw[button]
    if (!bag || typeof bag !== 'object') continue
    const next: Partial<Record<Difficulty, SongPatternMeta>> = {}
    for (const diff of DIFFS) {
      const meta = slimMeta((bag as Record<string, unknown>)[diff])
      if (meta) next[diff] = meta
    }
    if (Object.keys(next).length > 0) patterns[button] = next
  }
  return patterns
}

function songsAreFat(songs: SongEntry[]): boolean {
  for (const song of songs) {
    for (const bag of Object.values(song.patterns)) {
      if (!bag) continue
      for (const meta of Object.values(bag)) {
        if (!meta || typeof meta !== 'object') continue
        if ('rating' in meta || 'standard' in meta || 'tags' in meta) return true
      }
    }
  }
  return false
}

function readCache(): CachePayload | null {
  if (memoryPayload) return memoryPayload
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachePayload
    if (!parsed || !Array.isArray(parsed.songs)) return null
    memoryPayload = parsed
    return parsed
  } catch {
    return null
  }
}

function rememberCache(payload: CachePayload) {
  memoryPayload = payload
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
}

export function loadCachedSongs(): SongEntry[] {
  const parsed = readCache()
  if (!parsed) return []
  if (!songsAreFat(parsed.songs)) return parsed.songs
  const songs = parsed.songs.map((song) => ({
    ...song,
    patterns: slimPatterns(song.patterns),
  }))
  memoryPayload = { fetchedAt: parsed.fetchedAt, songs }
  cacheNeedsRewrite = true
  return songs
}

/** 화면을 그린 뒤에 호출한다. 렌더 중에 localStorage 를 다시 쓰지 않는다. */
export function rewriteSlimSongCache() {
  if (!cacheNeedsRewrite || !memoryPayload) return
  cacheNeedsRewrite = false
  rememberCache(memoryPayload)
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
      patterns: slimPatterns(s.patterns),
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

export function chartPattern(
  index: SongIndex,
  chart: { title: string; button: ButtonMode; difficulty: Difficulty },
): SongPatternMeta | undefined {
  return findSongExact(index, chart.title)?.patterns[chart.button]?.[chart.difficulty]
}

type ChartFacts = {
  title: string
  button: ButtonMode
  difficulty: Difficulty
  level?: number
  floorName?: string
}

/** 기록에 있는 레벨을 쓰고, 없으면 곡 목록에서 찾는다. */
export function chartLevel(index: SongIndex, chart: ChartFacts): number | undefined {
  return chart.level ?? chartPattern(index, chart)?.level
}

/** 기록에 있는 층 이름을 쓰고, 없으면 곡 목록에서 찾는다. */
export function chartFloorName(index: SongIndex, chart: ChartFacts): string | undefined {
  return chart.floorName || chartPattern(index, chart)?.floorName || undefined
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
