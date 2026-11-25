import type {
  AppData,
  ButtonMode,
  Chart,
  DailyBest,
  Difficulty,
  Play,
} from '../types'
import { normalizeSongKey, type SongEntry } from './songCatalog'
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

/** 사용자 기록. 차트는 기준 정보 스냅샷, 플레이는 사건 로그. */
export interface RecordChart {
  id: string
  titleId: number | null
  title: string
  composer?: string
  dlcCode?: string
  button: ButtonMode
  difficulty: Difficulty
  level?: number
  floor?: number
  floorName?: string
  order?: number
  archiveBest?: number
  createdAt: string
}

export interface RecordPlay {
  id: string
  chartId: string
  at: string
  score: number
  maxCombo?: boolean
  status?: '미갱신' | '성공'
  source?: Play['source']
}

export interface RecordFile {
  version: 2
  updatedAt: string
  nickname?: string
  suppressedKeys?: string[]
  charts: RecordChart[]
  plays: RecordPlay[]
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
    map.set(normalizeSongKey(s.name), s)
  }
  return map
}

function finiteLevel(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** AppData → 사용자 기록 파일. 일최고는 저장하지 않고 플레이에서 다시 만든다. */
export function toRecordFile(
  data: AppData,
  opts?: { nickname?: string; catalog?: SongEntry[] },
): RecordFile {
  const cat = catalogByName(opts?.catalog ?? [])
  const charts = data.charts.map((chart) => {
    const meta = cat.get(normalizeSongKey(chart.title))
    const catPat = meta?.patterns?.[chart.button]?.[chart.difficulty]
    const composer = chart.composer || meta?.composer || ''
    const dlcCode = chart.dlcCode || meta?.dlcCode || ''
    const row: RecordChart = {
      id: chart.id,
      titleId: chart.titleId ?? meta?.title ?? null,
      title: chart.title,
      button: chart.button,
      difficulty: chart.difficulty,
      createdAt: chart.createdAt,
    }
    if (composer) row.composer = composer
    if (dlcCode) row.dlcCode = dlcCode
    const level = chart.level ?? catPat?.level
    if (finiteLevel(level) != null) row.level = finiteLevel(level)
    const floor = chart.floor ?? catPat?.floor
    if (typeof floor === 'number' && Number.isFinite(floor)) row.floor = floor
    const floorName = chart.floorName || catPat?.floorName || ''
    if (floorName) row.floorName = floorName
    if (typeof chart.order === 'number') row.order = chart.order
    if (typeof chart.archiveBest === 'number') row.archiveBest = round2(chart.archiveBest)
    return row
  })
  charts.sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.title.localeCompare(b.title, 'ko') ||
      a.button.localeCompare(b.button) ||
      a.difficulty.localeCompare(b.difficulty),
  )

  const plays = data.plays.map((play) => {
    const row: RecordPlay = {
      id: play.id,
      chartId: play.chartId,
      at: play.playedAt,
      score: round2(play.accuracy),
      source: play.source,
    }
    if (play.maxCombo) row.maxCombo = true
    if (play.status) row.status = play.status
    return row
  })
  plays.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    nickname: opts?.nickname || undefined,
    suppressedKeys:
      data.suppressedKeys && data.suppressedKeys.length > 0
        ? data.suppressedKeys
        : undefined,
    charts,
    plays,
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
          titleId: typeof song.title === 'number' ? song.title : undefined,
          composer: song.composer || undefined,
          dlcCode: song.dlcCode || undefined,
          archiveBest: pat.archiveBest,
          order: typeof pat.order === 'number' ? pat.order : undefined,
          level:
            typeof pat.level === 'number' && Number.isFinite(pat.level)
              ? pat.level
              : undefined,
          floor: typeof pat.floor === 'number' && Number.isFinite(pat.floor) ? pat.floor : undefined,
          floorName: pat.floorName || undefined,
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

const BUTTON_SET = new Set<string>(BUTTONS)
const DIFF_SET = new Set<string>(DIFFS)

function isButton(value: unknown): value is ButtonMode {
  return typeof value === 'string' && BUTTON_SET.has(value)
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && DIFF_SET.has(value)
}

/** 기록 파일 v2 → AppData. 일최고는 플레이에서 다시 계산한다. */
export function fromRecordFile(file: RecordFile): AppData {
  const charts: Chart[] = []
  const plays: Play[] = []
  for (const row of file.charts ?? []) {
    if (!row || typeof row.id !== 'string' || typeof row.title !== 'string') continue
    if (!isButton(row.button) || !isDifficulty(row.difficulty)) continue
    charts.push({
      id: row.id,
      title: row.title.trim(),
      button: row.button,
      difficulty: row.difficulty,
      createdAt: row.createdAt || file.updatedAt || new Date().toISOString(),
      titleId: typeof row.titleId === 'number' ? row.titleId : undefined,
      composer: row.composer || undefined,
      dlcCode: row.dlcCode || undefined,
      order: typeof row.order === 'number' ? row.order : undefined,
      level: finiteLevel(row.level),
      floor: typeof row.floor === 'number' && Number.isFinite(row.floor) ? row.floor : undefined,
      floorName: row.floorName || undefined,
      archiveBest: typeof row.archiveBest === 'number' ? row.archiveBest : undefined,
    })
  }
  const chartIds = new Set(charts.map((chart) => chart.id))
  for (const row of file.plays ?? []) {
    if (!row || typeof row.id !== 'string' || !chartIds.has(row.chartId)) continue
    if (typeof row.score !== 'number' || !Number.isFinite(row.score)) continue
    const score = round2(row.score)
    if (isDiscardAccuracy(score)) continue
    const source = row.source === 'manual' || row.source === 'live' || row.source === 'log' ? row.source : 'log'
    plays.push({
      id: row.id,
      chartId: row.chartId,
      accuracy: score,
      playedAt: new Date(row.at || file.updatedAt || Date.now()).toISOString(),
      maxCombo: row.maxCombo === true,
      source,
      status: row.status === '미갱신' || row.status === '성공' ? row.status : undefined,
    })
  }
  return {
    charts,
    plays,
    dailyBests: [],
    suppressedKeys: Array.isArray(file.suppressedKeys) ? file.suppressedKeys : undefined,
  }
}

/** v2 기록 파일, v1 곡 트리, 구 AppData JSON 을 모두 읽는다. */
export function parsePersistedJson(raw: string): AppData {
  const parsed = JSON.parse(raw) as RecordFile | DrillMaxFile | AppData
  if (parsed && typeof parsed === 'object' && (parsed as RecordFile).version === 2 && Array.isArray((parsed as RecordFile).charts)) {
    return fromRecordFile(parsed as RecordFile)
  }
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

export function stringifyRecord(file: RecordFile): string {
  return JSON.stringify(file, null, 2)
}
