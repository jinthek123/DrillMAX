import type { AppData, ButtonMode, Chart, Play } from '../types'
import { isPerfectPlay } from '../types'
import { computeHighest } from './highest'

export type ButtonFilter = 'ALL' | ButtonMode

export interface ChartOverviewRow {
  chart: Chart
  playCount: number
  best: number | null
  archiveBest: number | null
  highest: number | null
  latest: Play | null
  ppCount: number
  mcCount: number
  pendingCount: number
}

export interface OverviewSummary {
  chartCount: number
  playCount: number
  ppCount: number
  mcCount: number
  /** accuracy >= 99.9 */
  acc999Count: number
  /** accuracy >= 99.8 */
  acc998Count: number
}

export function buildChartOverview(data: AppData): ChartOverviewRow[] {
  const byChart = new Map<string, Play[]>()
  for (const p of data.plays) {
    const list = byChart.get(p.chartId)
    if (list) list.push(p)
    else byChart.set(p.chartId, [p])
  }

  return data.charts.map((chart) => {
    const plays = (byChart.get(chart.id) ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime(),
      )
    const accuracies = plays.map((p) => p.accuracy)
    const best = accuracies.length > 0 ? Math.max(...accuracies) : null
    const archiveBest = chart.archiveBest ?? null
    // Highest: 미갱신 점수 제외 + archive PB
    const highest = computeHighest(plays, archiveBest)
    let ppCount = 0
    let mcCount = 0
    let pendingCount = 0
    for (const p of plays) {
      if (isPerfectPlay(p.accuracy, p.maxCombo)) ppCount += 1
      else if (p.maxCombo) mcCount += 1
      if (p.status === '미갱신') pendingCount += 1
    }
    return {
      chart,
      playCount: plays.length,
      best,
      archiveBest,
      highest,
      latest: plays.length > 0 ? plays[plays.length - 1] : null,
      ppCount,
      mcCount,
      pendingCount,
    }
  })
}

export function summarizeOverview(
  rows: ChartOverviewRow[],
  plays: Play[],
  chartIds?: Set<string>,
): OverviewSummary {
  let playCount = 0
  let ppCount = 0
  let mcCount = 0
  let acc999Count = 0
  let acc998Count = 0

  for (const p of plays) {
    if (chartIds && !chartIds.has(p.chartId)) continue
    playCount += 1
    if (isPerfectPlay(p.accuracy, p.maxCombo)) ppCount += 1
    else if (p.maxCombo) mcCount += 1
    if (p.accuracy >= 99.9) acc999Count += 1
    if (p.accuracy >= 99.8) acc998Count += 1
  }

  return {
    chartCount: rows.length,
    playCount,
    ppCount,
    mcCount,
    acc999Count,
    acc998Count,
  }
}
