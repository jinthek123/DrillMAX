import type { AppData, ButtonMode, Chart, Play } from '../types'
import { isPerfectPlay } from '../types'
import { computeHighest } from './highest'

export type ButtonFilter = 'ALL' | ButtonMode

export interface ChartOverviewRow {
  chart: Chart
  playCount: number
  archiveBest: number | null
  highest: number | null
  latest: Play | null
  /** 마지막 플레이 시각. 플레이가 없으면 null */
  latestAt: number | null
  ppCount: number
  mcCount: number
  pendingCount: number
  acc999Count: number
  acc998Count: number
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
    const plays = byChart.get(chart.id) ?? []
    const archiveBest = chart.archiveBest ?? null
    const highest = computeHighest(plays, archiveBest)
    let latest: Play | null = null
    let latestAt: number | null = null
    let ppCount = 0
    let mcCount = 0
    let pendingCount = 0
    let acc999Count = 0
    let acc998Count = 0
    for (const p of plays) {
      const at = Date.parse(p.playedAt)
      if (Number.isFinite(at) && (latestAt == null || at >= latestAt)) {
        latestAt = at
        latest = p
      }
      if (isPerfectPlay(p.accuracy, p.maxCombo)) ppCount += 1
      else if (p.maxCombo) mcCount += 1
      if (p.status === '미갱신') pendingCount += 1
      if (p.accuracy >= 99.9) acc999Count += 1
      if (p.accuracy >= 99.8) acc998Count += 1
    }
    return {
      chart,
      playCount: plays.length,
      archiveBest,
      highest,
      latest,
      latestAt,
      ppCount,
      mcCount,
      pendingCount,
      acc999Count,
      acc998Count,
    }
  })
}

export function summarizeOverview(rows: ChartOverviewRow[]): OverviewSummary {
  let playCount = 0
  let ppCount = 0
  let mcCount = 0
  let acc999Count = 0
  let acc998Count = 0

  for (const row of rows) {
    playCount += row.playCount
    ppCount += row.ppCount
    mcCount += row.mcCount
    acc999Count += row.acc999Count
    acc998Count += row.acc998Count
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
