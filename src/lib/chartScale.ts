import type { CSSProperties } from 'react'
import { round2 } from './math'

type YScale = {
  yMin: number
  yMax: number
  ticks: number[] | undefined
  fine: boolean
}

export const EMPTY_Y_SCALE: YScale = {
  yMin: 0,
  yMax: 100,
  ticks: undefined,
  fine: false,
}

/** 단일 곡 / 전체 성과 공통 Y축 스케일 */
export function buildYScale(min: number, max: number): YScale {
  // 99.9% 이상 구간: 0.02 단위
  const useFine = max >= 99.9 && min >= 99.5

  if (useFine) {
    const step = 0.02
    const pad = Math.max(step * 2, (max - min) * 0.25)
    let yMin = Math.floor((min - pad) / step) * step
    let yMax = Math.ceil((max + pad) / step) * step
    yMin = Math.max(0, round2(yMin))
    yMax = Math.min(100, round2(yMax))

    const ticks: number[] = []
    for (let v = yMin; v <= yMax + 1e-9; v = round2(v + step)) {
      ticks.push(v)
    }
    const shown =
      ticks.length <= 12
        ? ticks
        : ticks.filter((_, i) => i % Math.ceil(ticks.length / 10) === 0)

    return { yMin, yMax, ticks: shown, fine: true }
  }

  const pad = Math.max(0.35, (max - min) * 0.22)
  const yMin = Math.max(0, Math.floor((min - pad) * 10) / 10)
  const yMax = Math.min(100, Math.ceil((max + pad) * 10) / 10)
  return { yMin, yMax, ticks: undefined, fine: false }
}

export function formatYTick(v: number, fine: boolean): string {
  return fine || v >= 99.9 ? v.toFixed(2) : v.toFixed(1)
}

export const chartTooltipStyle: CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontFamily: 'var(--font)',
  fontSize: 13,
  color: 'var(--ink)',
  boxShadow: 'var(--shadow)',
}

export const chartAxisTick = {
  fill: 'var(--muted)',
  fontFamily: 'var(--font-display)',
} as const
