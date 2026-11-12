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
  if (plays) {
    for (const p of plays) {
      if (p.status === '미갱신') continue
      if (fromPlays == null || p.accuracy > fromPlays) fromPlays = p.accuracy
    }
  }

  const fromArchive = archiveBest ?? null
  if (fromPlays == null && fromArchive == null) return null
  return Math.max(fromPlays ?? 0, fromArchive ?? 0)
}
