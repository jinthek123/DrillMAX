/** 정확도 등 소수 2자리 반올림 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
