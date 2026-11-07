import type { AppData, DailyBest, Play } from '../types'
import { localDateKey } from './dates'
import { round2 } from './math'

export const DAILY_BEST_KEEP_DAYS = 30
/** 단일 곡 그래프·목록에 남기는 최대 플레이 수 (초과 시 오래된 것부터 삭제) */
export const PLAY_KEEP_PER_CHART = 15

/** 0.00% 이하는 기록으로 취급하지 않음 */
export function isDiscardAccuracy(accuracy: number): boolean {
  return round2(accuracy) <= 0
}

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function cutoffDate(keepDays = DAILY_BEST_KEEP_DAYS): Date {
  const d = startOfLocalDay()
  d.setDate(d.getDate() - (keepDays - 1))
  return d
}

function dayKey(chartId: string, date: string): string {
  return `${chartId}|${date}`
}

/** 차트별·날짜별 Daily Best upsert (전체 성과 월간 그래프용) */
export function upsertDailyBest(
  dailyBests: DailyBest[] | undefined,
  play: Pick<Play, 'id' | 'chartId' | 'accuracy' | 'playedAt'>,
): DailyBest[] {
  if (isDiscardAccuracy(play.accuracy)) return dailyBests ?? []
  const date = localDateKey(play.playedAt)
  const accuracy = round2(play.accuracy)
  const list = [...(dailyBests ?? [])]
  const idx = list.findIndex(
    (d) => d.chartId === play.chartId && d.date === date,
  )
  const next: DailyBest = {
    date,
    accuracy,
    playId: play.id,
    chartId: play.chartId,
    updatedAt: new Date().toISOString(),
  }
  if (idx < 0) list.push(next)
  else if (accuracy > list[idx].accuracy) list[idx] = next
  return trimDailyBests(list)
}

/** 차트별 최근 N개만 유지 (playedAt 오름차순 기준 앞에서 삭제) */
export function trimPlaysPerChart(
  plays: Play[],
  keepPerChart = PLAY_KEEP_PER_CHART,
): Play[] {
  const byChart = new Map<string, Play[]>()
  for (const p of plays) {
    const list = byChart.get(p.chartId)
    if (list) list.push(p)
    else byChart.set(p.chartId, [p])
  }
  const out: Play[] = []
  for (const list of byChart.values()) {
    list.sort(
      (a, b) =>
        new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime(),
    )
    const kept =
      list.length > keepPerChart ? list.slice(list.length - keepPerChart) : list
    out.push(...kept)
  }
  return out
}

/** 단일 곡은 최근 15판만 남기고, Daily Best는 30일 창에 새 플레이를 반영한다. */
export function appendPlay(
  data: AppData,
  play: Play,
): { data: AppData; accepted: boolean } {
  if (isDiscardAccuracy(play.accuracy)) {
    return { data, accepted: false }
  }
  const plays = trimPlaysPerChart([...data.plays, play])
  return {
    accepted: true,
    data: {
      ...data,
      plays,
      dailyBests: upsertDailyBest(data.dailyBests, play),
    },
  }
}

function preferDailyBest(a: DailyBest, b: DailyBest): DailyBest {
  return round2(b.accuracy) > round2(a.accuracy) ? b : a
}

/** 같은 차트·날짜는 더 높은 정확도만 남기고, 30일 밖은 제거 */
function mergeDailyBests(
  ...lists: Array<DailyBest[] | undefined>
): DailyBest[] {
  const map = new Map<string, DailyBest>()
  for (const list of lists) {
    for (const row of list ?? []) {
      if (!row.chartId || !row.date || isDiscardAccuracy(row.accuracy)) continue
      const next = { ...row, accuracy: round2(row.accuracy) }
      const key = dayKey(row.chartId, row.date)
      const prev = map.get(key)
      map.set(key, prev ? preferDailyBest(prev, next) : next)
    }
  }
  return trimDailyBests([...map.values()])
}

export function trimDailyBests(
  dailyBests: DailyBest[],
  keepDays = DAILY_BEST_KEEP_DAYS,
): DailyBest[] {
  const min = localDateKey(cutoffDate(keepDays))
  return dailyBests
    .filter((d) => d.date >= min && d.chartId)
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date)
      if (byDate !== 0) return byDate
      return (a.chartId ?? '').localeCompare(b.chartId ?? '')
    })
}

/**
 * 차트 삭제·정리.
 * 플레이가 있는 날은 그 플레이의 최고점, 15판 제한으로 빠진 날은 저장된 Daily Best를 유지.
 * Daily Best는 최근 30일, 단일 곡 플레이는 차트당 최근 15개.
 */
export function sanitizeAppData(data: AppData): AppData {
  const chartIds = new Set(data.charts.map((c) => c.id))
  const playsIn = data.plays.filter(
    (p) => chartIds.has(p.chartId) && !isDiscardAccuracy(p.accuracy),
  )
  const playDays = new Set(
    playsIn.map((p) => dayKey(p.chartId, localDateKey(p.playedAt))),
  )
  const stored = (data.dailyBests ?? []).filter((d) => {
    if (!d.chartId || !chartIds.has(d.chartId)) return false
    return !playDays.has(dayKey(d.chartId, d.date))
  })
  return {
    ...data,
    plays: trimPlaysPerChart(playsIn),
    dailyBests: mergeDailyBests(stored, rebuildDailyBestsFromPlays(playsIn)),
    suppressedKeys: data.suppressedKeys,
  }
}

/** 플레이에서 차트별 Daily Best 복원 (월간 그래프용, 날짜당 최고만) */
function rebuildDailyBestsFromPlays(plays: Play[]): DailyBest[] {
  const map = new Map<string, DailyBest>()
  for (const p of plays) {
    if (isDiscardAccuracy(p.accuracy)) continue
    const date = localDateKey(p.playedAt)
    const accuracy = round2(p.accuracy)
    const key = dayKey(p.chartId, date)
    const prev = map.get(key)
    if (!prev || accuracy > prev.accuracy) {
      map.set(key, {
        date,
        accuracy,
        playId: p.id,
        chartId: p.chartId,
        updatedAt: p.playedAt,
      })
    }
  }
  return trimDailyBests([...map.values()])
}

function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function diffLocalDays(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime()
  const b = startOfLocalDay(to).getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * 전체 성과 스파크라인: 1일 1칸, 최대 keepDays.
 * 첫 Daily Best를 왼쪽(0)에 두고, 이후 슬라이딩.
 */
export function dailyBestSeriesForChart(
  dailyBests: DailyBest[] | undefined,
  chartId: string,
  keepDays = DAILY_BEST_KEEP_DAYS,
): Array<{ date: string; label: string; accuracy: number | null }> {
  const chartRows = (dailyBests ?? [])
    .filter((d) => d.chartId === chartId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  const byDate = new Map(chartRows.map((d) => [d.date, d.accuracy]))
  const today = startOfLocalDay()
  let start: Date

  if (chartRows.length === 0) {
    start = cutoffDate(keepDays)
  } else {
    const first = parseLocalYmd(chartRows[0].date)
    const daysSinceFirst = diffLocalDays(first, today)
    start =
      daysSinceFirst >= keepDays - 1
        ? cutoffDate(keepDays)
        : startOfLocalDay(first)
  }

  const out: Array<{ date: string; label: string; accuracy: number | null }> =
    []
  for (let i = 0; i < keepDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = localDateKey(d)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    out.push({
      date: key,
      label: `${mm}/${dd}`,
      accuracy: byDate.has(key) ? (byDate.get(key) as number) : null,
    })
  }
  return out
}

/** 로드·가져오기 시 플레이와 저장된 Daily Best를 함께 정리 */
export function normalizeAppData(data: AppData): AppData {
  const charts = Array.isArray(data.charts) ? data.charts : []
  const plays = (Array.isArray(data.plays) ? data.plays : []).filter(
    (p) => !isDiscardAccuracy(p.accuracy),
  )
  return sanitizeAppData({
    charts,
    plays,
    dailyBests: Array.isArray(data.dailyBests) ? data.dailyBests : [],
    suppressedKeys: Array.isArray(data.suppressedKeys)
      ? data.suppressedKeys
      : undefined,
  })
}
