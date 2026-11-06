import type { AppData, DailyBest, Play } from '../types'
import { round2 } from './math'

export const DAILY_BEST_KEEP_DAYS = 30

export function localDateKey(input: Date | string = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

/**
 * 단일 곡 기록: 플레이는 전부 보관.
 * 전체 성과용 Daily Best만 날짜별 최고로 갱신.
 */
export function appendPlay(
  data: AppData,
  play: Play,
): { data: AppData; accepted: boolean } {
  if (isDiscardAccuracy(play.accuracy)) {
    return { data, accepted: false }
  }
  return {
    accepted: true,
    data: {
      ...data,
      plays: [...data.plays, play],
      dailyBests: upsertDailyBest(data.dailyBests, play),
    },
  }
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

/** 차트 삭제·정리: orphan play 제거 후 Daily Best 재계산. 플레이 히스토리는 유지. */
export function sanitizeAppData(data: AppData): AppData {
  const chartIds = new Set(data.charts.map((c) => c.id))
  const plays = data.plays.filter(
    (p) => chartIds.has(p.chartId) && !isDiscardAccuracy(p.accuracy),
  )
  return {
    ...data,
    plays,
    dailyBests: rebuildDailyBestsFromPlays(plays),
    suppressedKeys: data.suppressedKeys,
  }
}

/** 플레이에서 차트별 Daily Best 복원 (월간 그래프용, 날짜당 최고만) */
export function rebuildDailyBestsFromPlays(plays: Play[]): DailyBest[] {
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

/** 로드·가져오기 시 plays 기준으로 Daily Best 재동기화 */
export function normalizeAppData(data: AppData): AppData {
  const charts = Array.isArray(data.charts) ? data.charts : []
  const plays = (Array.isArray(data.plays) ? data.plays : []).filter(
    (p) => !isDiscardAccuracy(p.accuracy),
  )
  return sanitizeAppData({
    charts,
    plays,
    dailyBests: [],
    suppressedKeys: Array.isArray(data.suppressedKeys)
      ? data.suppressedKeys
      : undefined,
  })
}
