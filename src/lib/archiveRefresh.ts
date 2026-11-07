/**
 * LIVE/로그 이후 PB API를 칠지.
 * - [성공]: PB가 갱신됐을 수 있음 → 조회
 * - [미갱신]: 차트에 PB가 아직 없을 때(첫 미갱신)만 조회
 */
export function shouldFetchArchiveBest(
  status: '미갱신' | '성공' | undefined,
  archiveBest: number | null | undefined,
): boolean {
  if (status === '성공') return true
  if (status === '미갱신' && (archiveBest == null || archiveBest <= 0)) {
    return true
  }
  return false
}
