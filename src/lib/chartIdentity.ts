import type { ButtonMode, Chart, Difficulty } from '../types'

export function findChart(
  charts: Chart[],
  title: string,
  button: ButtonMode,
  difficulty: Difficulty,
): Chart | undefined {
  return charts.find(
    (c) =>
      c.title === title && c.button === button && c.difficulty === difficulty,
  )
}

export function createChart(
  title: string,
  button: ButtonMode,
  difficulty: Difficulty,
  id: string = crypto.randomUUID(),
): Chart {
  return {
    id,
    title,
    button,
    difficulty,
    createdAt: new Date().toISOString(),
  }
}

/** 동일 곡·점수·근접 시각 플레이인지 (로그/LIVE 중복 스킵) */
export function isNearDuplicatePlay(
  plays: Array<{ chartId: string; accuracy: number; playedAt: string }>,
  chartId: string,
  accuracy: number,
  playedAt: string,
  windowMs: number,
): number {
  const t = new Date(playedAt).getTime()
  return plays.findIndex(
    (p) =>
      p.chartId === chartId &&
      p.accuracy === accuracy &&
      Math.abs(new Date(p.playedAt).getTime() - t) < windowMs,
  )
}
