/** 로컬 플레이 최고 ∪ V-ARCHIVE PB */
export function computeHighest(
  playAccuracies: number[] | null | undefined,
  archiveBest?: number | null,
): number | null {
  const fromPlays =
    playAccuracies && playAccuracies.length > 0
      ? Math.max(...playAccuracies)
      : null
  const fromArchive = archiveBest ?? null
  if (fromPlays == null && fromArchive == null) return null
  return Math.max(fromPlays ?? 0, fromArchive ?? 0)
}
