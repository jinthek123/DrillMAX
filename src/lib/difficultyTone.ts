import type { Difficulty } from '../types'

/** 배지 색 구간. SC는 게임 표기 레벨이고 floor와 다를 수 있다. */
export type DifficultyTone = 'nm' | 'hd' | 'mx' | 'sc-1' | 'sc-6' | 'sc-11' | 'sc'

export function difficultyTone(
  difficulty: Difficulty,
  level: number | null | undefined,
): DifficultyTone {
  if (difficulty === 'NM') return 'nm'
  if (difficulty === 'HD') return 'hd'
  if (difficulty === 'MX') return 'mx'
  if (typeof level !== 'number' || !Number.isFinite(level)) return 'sc'
  if (level <= 5) return 'sc-1'
  if (level <= 10) return 'sc-6'
  return 'sc-11'
}
