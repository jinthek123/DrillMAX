import type {
  AppData,
  ButtonMode,
  Chart,
  DailyBest,
  Difficulty,
  Play,
} from '../types'
import type { SongEntry } from './songCatalog'
import { isDiscardAccuracy } from './dailyBest'
import { round2 } from './math'

/** V-ARCHIVE songs.json 과 맞춘 패턴 필드 + DrillMax 성적 */
export interface DrillMaxPattern {
  level?: number
  floor?: number | null
  floorName?: string | null
  /** 로컬 최고 정확도 (archive API의 score 와 동일 의미) */
  score?: number
  maxCombo?: boolean
  /** V-ARCHIVE PB */
  archiveBest?: number
  /** 전체 성과·사이드바의 직접 정렬 순서 */
  order?: number
  /** 단일 곡: 모든 플레이 (시·분·초 포함) */
  plays?: Array<{
    id?: string
    at: string
    score: number
    maxCombo?: boolean
    status?: '미갱신' | '성공'
    source?: Play['source']
  }>
  /** 전체 성과용 일최고 (날짜당 1개) — plays 있으면 로드 시 재계산 가능 */
  dailyBests?: Array<{
    date: string
    score: number
    maxCombo?: boolean
    status?: '미갱신' | '성공'
    source?: Play['source']
    updatedAt?: string
  }>
}

export interface DrillMaxSong {
  /** songs.json 의 title (곡 ID). 모르면 null */
  title: number | null
  name: string
  composer: string
  dlcCode: string
  patterns: Partial<
    Record<ButtonMode, Partial<Record<Difficulty, DrillMaxPattern>>>
  >
}

export interface DrillMaxFile {
  version: 1
  updatedAt: string
  nickname?: string
  /** 삭제된 LIVE/로그 플레이 지문 (재수집 방지) */
  suppressedKeys?: string[]
  songs: DrillMaxSong[]
}

const BUTTONS: ButtonMode[] = ['4B', '5B', '6B', '8B']
const DIFFS: Difficulty[] = ['NM', 'HD', 'MX', 'SC']

function stableChartId(
  name: string,
  button: ButtonMode,
  difficulty: Difficulty,
): string {
  return `rf:${button}|${difficulty}|${name}`
}

function catalogByName(songs: SongEntry[]): Map<string, SongEntry> {
  const map = new Map<string, SongEntry>()
  for (const s of songs) {
    map.set(s.name.trim().toLowerCase(), s)
  }
  return map
}

/** AppData → songs.json 스타일 DrillMax.json */
export function toDrillMaxFile(
  data: AppData,
  opts?: { nickname?: string; catalog?: SongEntry[] },
): DrillMaxFile {
  const cat = catalogByName(opts?.catalog ?? [])
  const playsByChart = new Map<string, Play[]>()
  for (const p of data.plays) {
    const list = playsByChart.get(p.chartId)
    if (list) list.push(p)
    else playsByChart.set(p.chartId, [p])
  }
  const dailyByChart = new Map<string, DailyBest[]>()
  for (const d of data.dailyBests ?? []) {
    const list = dailyByChart.get(d.chartId)
    if (list) list.push(d)
    else dailyByChart.set(d.chartId, [d])
  }

  const songMap = new Map<string, DrillMaxSong>()

  for (const chart of data.charts) {
    const key = chart.title.trim().toLowerCase()
    const meta = cat.get(key)
    let song = songMap.get(key)
    if (!song) {
      song = {
        title: meta?.title ?? null,
        name: chart.title,
        composer: meta?.composer ?? '',
        dlcCode: meta?.dlcCode ?? '',
        patterns: {},
      }
      songMap.set(key, song)
    }

    const plays = (playsByChart.get(chart.id) ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime(),
      )
    const localBest =
      plays.length > 0 ? Math.max(...plays.map((p) => p.accuracy)) : null
    const bestPlay =
      localBest == null
        ? null
        : plays.find((p) => p.accuracy === localBest) ?? null
    const catPat = meta?.patterns?.[chart.button]?.[chart.difficulty]
    const dailies = (dailyByChart.get(chart.id) ?? [])
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const play = plays.find((p) => p.id === d.playId)
        return {
          date: d.date,
          score: round2(d.accuracy),
          maxCombo: play?.maxCombo,
          status: play?.status,
          source: play?.source,
          updatedAt: d.updatedAt,
        }
      })

    const bag = song.patterns[chart.button] ?? {}
    bag[chart.difficulty] = {
      level: catPat?.level,
      floor: catPat?.floor ?? null,
      floorName: catPat?.floorName ?? null,
      score: localBest != null ? round2(localBest) : undefined,
      maxCombo: bestPlay?.maxCombo,
      archiveBest:
        chart.archiveBest != null ? round2(chart.archiveBest) : undefined,
      order: chart.order,
      plays:
        plays.length > 0
          ? plays.map((p) => ({
              id: p.id,
              at: p.playedAt,
              score: round2(p.accuracy),
              maxCombo: p.maxCombo,
              status: p.status,
              source: p.source,
            }))
          : undefined,
      dailyBests: dailies.length > 0 ? dailies : undefined,
    }
    song.patterns[chart.button] = bag
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    nickname: opts?.nickname || undefined,
    suppressedKeys:
      data.suppressedKeys && data.suppressedKeys.length > 0
        ? data.suppressedKeys
        : undefined,
    songs: [...songMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'ko'),
    ),
  }
}

/** DrillMax.json → AppData */
export function fromDrillMaxFile(file: DrillMaxFile): AppData {
  const charts: Chart[] = []
  const plays: Play[] = []
  const dailyBests: DailyBest[] = []

  for (const song of file.songs ?? []) {
    const name = song.name?.trim()
    if (!name) continue
    for (const button of BUTTONS) {
      const byDiff = song.patterns?.[button]
      if (!byDiff) continue
      for (const difficulty of DIFFS) {
        const pat = byDiff[difficulty]
        if (!pat) continue
        const id = stableChartId(name, button, difficulty)
        charts.push({
          id,
          title: name,
          button,
          difficulty,
          createdAt: file.updatedAt || new Date().toISOString(),
          archiveBest: pat.archiveBest,
          order: typeof pat.order === 'number' ? pat.order : undefined,
        })

        if (Array.isArray(pat.plays) && pat.plays.length > 0) {
          for (const row of pat.plays) {
            const score = round2(row.score)
            if (isDiscardAccuracy(score)) continue
            const at = row.at || file.updatedAt || new Date().toISOString()
            plays.push({
              id: row.id || crypto.randomUUID(),
              chartId: id,
              accuracy: score,
              playedAt: new Date(at).toISOString(),
              maxCombo: row.maxCombo,
              source: row.source ?? 'log',
              status: row.status,
            })
          }
        } else if (Array.isArray(pat.dailyBests) && pat.dailyBests.length > 0) {
          // 구포맷: 일최고만 있음 → 정오 스텁으로 복원 (LIVE 배지 오인 방지)
          for (const d of pat.dailyBests) {
            const score = round2(d.score)
            if (isDiscardAccuracy(score)) continue
            const playId = crypto.randomUUID()
            const playedAt = `${d.date}T12:00:00`
            plays.push({
              id: playId,
              chartId: id,
              accuracy: score,
              playedAt: new Date(playedAt).toISOString(),
              maxCombo: d.maxCombo,
              source: 'log',
              status: d.status,
            })
          }
        } else if (
          typeof pat.score === 'number' &&
          !isDiscardAccuracy(pat.score)
        ) {
          const playId = crypto.randomUUID()
          plays.push({
            id: playId,
            chartId: id,
            accuracy: round2(pat.score),
            playedAt: file.updatedAt || new Date().toISOString(),
            maxCombo: pat.maxCombo,
            source: 'log',
          })
        }

        for (const row of pat.dailyBests ?? []) {
          const score = round2(row.score)
          if (!row.date || isDiscardAccuracy(score)) continue
          dailyBests.push({
            date: row.date,
            chartId: id,
            accuracy: score,
            updatedAt: row.updatedAt || `${row.date}T12:00:00.000Z`,
          })
        }
      }
    }
  }

  return {
    charts,
    plays,
    dailyBests,
    suppressedKeys: Array.isArray(file.suppressedKeys)
      ? file.suppressedKeys
      : undefined,
  }
}

/** 구 AppData JSON 또는 DrillMax.json 모두 수용 */
export function parsePersistedJson(raw: string): AppData {
  const parsed = JSON.parse(raw) as AppData | DrillMaxFile
  if (
    parsed &&
    typeof parsed === 'object' &&
    'songs' in parsed &&
    Array.isArray((parsed as DrillMaxFile).songs)
  ) {
    return fromDrillMaxFile(parsed as DrillMaxFile)
  }
  const legacy = parsed as AppData
  if (!Array.isArray(legacy.charts) || !Array.isArray(legacy.plays)) {
    throw new Error('잘못된 JSON 형식입니다.')
  }
  return {
    charts: legacy.charts,
    plays: legacy.plays,
    dailyBests: Array.isArray(legacy.dailyBests) ? legacy.dailyBests : [],
    suppressedKeys: Array.isArray(legacy.suppressedKeys)
      ? legacy.suppressedKeys
      : undefined,
  }
}

export function stringifyDrillMax(file: DrillMaxFile): string {
  return JSON.stringify(file, null, 2)
}
