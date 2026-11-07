import type { Play } from '../types'
import { isPerfectPlay } from '../types'
import { isLocalMidnight } from './dates'
import {
  formatMonthDayAxis,
  formatTimeAxis,
  formatTimeAxisShort,
  localDayKey,
} from './parseLog'

export interface ProgressPoint {
  axisKey: string
  label: string
  showLabel: boolean
  /** null = 날짜 경계 스페이서 */
  accuracy: number | null
  full?: string
  dayBreak: boolean
  maxCombo?: boolean
  perfectPlay?: boolean
}

function maxTimeLabels(playCount: number): number {
  if (playCount <= 6) return playCount
  if (playCount <= 10) return 6
  return 5
}

function neighborShowsLabel(rows: ProgressPoint[], index: number): boolean {
  return Boolean(rows[index - 1]?.showLabel || rows[index + 1]?.showLabel)
}

/**
 * 날짜 라벨은 항상 표시한다.
 * 시각은 날짜·다른 시각과 이웃하지 않을 때만, 최대 maxTime개.
 */
function withVisibleLabels(
  rows: ProgressPoint[],
  maxTime: number,
): ProgressPoint[] {
  for (const row of rows) row.showLabel = row.dayBreak

  const playIdx: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.accuracy == null || row.dayBreak) continue
    if (neighborShowsLabel(rows, i)) continue
    playIdx.push(i)
  }

  const pick = new Set<number>()
  if (playIdx.length <= maxTime) {
    for (const i of playIdx) pick.add(i)
  } else {
    pick.add(playIdx[0])
    pick.add(playIdx[playIdx.length - 1])
    const inner = maxTime - 2
    for (let k = 1; k <= inner; k++) {
      const j = Math.round((k / (inner + 1)) * (playIdx.length - 1))
      pick.add(playIdx[j])
    }
  }

  for (const i of [...pick].sort((a, b) => a - b)) {
    if (neighborShowsLabel(rows, i)) continue
    rows[i].showLabel = true
  }
  return rows
}

/**
 * 단일 곡 차트 시리즈.
 * - 기록: 시각 라벨. 바로 옆 칸에 날짜가 있으면 시각은 숨긴다.
 * - 날짜 변경: 점과 점 사이 MM/DD (정각 기록은 그 점에 MM/DD)
 */
export function buildProgressPoints(plays: Play[]): ProgressPoint[] {
  const dense = plays.length > 8
  const timeFmt = dense ? formatTimeAxisShort : formatTimeAxis
  const rows: ProgressPoint[] = []
  let prevDay: string | null = null

  plays.forEach((p, i) => {
    const day = localDayKey(p.playedAt)
    const dayChanged = prevDay != null && day !== prevDay
    const atMidnight = isLocalMidnight(p.playedAt)

    if (dayChanged && !atMidnight) {
      rows.push({
        axisKey: `day:${day}:${i}`,
        label: formatMonthDayAxis(p.playedAt),
        showLabel: true,
        accuracy: null,
        dayBreak: true,
      })
    }

    rows.push({
      axisKey: `${i}:${p.id}`,
      label:
        dayChanged && atMidnight
          ? formatMonthDayAxis(p.playedAt)
          : timeFmt(p.playedAt),
      showLabel: true,
      accuracy: p.accuracy,
      full: p.playedAt,
      dayBreak: dayChanged && atMidnight,
      maxCombo: p.maxCombo,
      perfectPlay: isPerfectPlay(p.accuracy, p.maxCombo),
    })
    prevDay = day
  })

  return withVisibleLabels(rows, maxTimeLabels(plays.length))
}
