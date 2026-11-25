import type { AppData, ButtonMode, Chart, Play } from '../types'
import { round2 } from './math'
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
  /** 마지막으로 기록을 넘긴 점수 차이. 없으면 0 */
  recordGain: number
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
    const recordGain = latestRecordGain(plays, archiveBest)
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
      recordGain,
      acc999Count,
      acc998Count,
    }
  })
}

/** 아카이브 최고기록에서 시작해, 미갱신이 아닌 플레이가 기록을 넘길 때마다 차이를 남긴다. */
function latestRecordGain(plays: Play[], archiveBest: number | null): number {
  const ordered = plays.slice().sort((a, b) => Date.parse(a.playedAt) - Date.parse(b.playedAt))
  let record = archiveBest
  let gain = 0
  for (const play of ordered) {
    if (play.status === '미갱신') continue
    if (record == null || !Number.isFinite(record)) {
      record = play.accuracy
      continue
    }
    if (play.accuracy > record) {
      gain = round2(play.accuracy - record)
      record = play.accuracy
    }
  }
  return gain
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
