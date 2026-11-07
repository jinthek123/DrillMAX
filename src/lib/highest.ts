import type { Play } from '../types'

/**
 * Highest = archive PB ∪ (미갱신이 아닌 로컬 기록).
 * [미갱신] 점수는 PB를 못 이긴 값이므로 Highest에 쓰지 않음.
 */
export function computeHighest(
  plays: Array<Pick<Play, 'accuracy' | 'status'>> | null | undefined,
  archiveBest?: number | null,
): number | null {
  let fromPlays: number | null = null
  if (plays && plays.length > 0) {
    const eligible = plays
      .filter((p) => p.status !== '미갱신')
      .map((p) => p.accuracy)
    if (eligible.length > 0) fromPlays = Math.max(...eligible)
  }

  const fromArchive = archiveBest ?? null
  if (fromPlays == null && fromArchive == null) return null
  return Math.max(fromPlays ?? 0, fromArchive ?? 0)
}
