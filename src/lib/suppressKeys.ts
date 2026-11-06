import type { ButtonMode, Chart, Difficulty, Play } from '../types'
import { round2 } from './math'

const MAX_SUPPRESSED = 500

/** LIVE/로그 재수집 시 동일 플레이로 볼 지문 */
export function playFingerprint(
  button: ButtonMode,
  difficulty: Difficulty,
  title: string,
  accuracy: number,
  timeHms: string,
): string {
  return `${button}|${difficulty}|${title}|${round2(accuracy)}|${timeHms}`
}

export function fingerprintFromPlay(play: Play, chart: Chart): string {
  const d = new Date(play.playedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return playFingerprint(
    chart.button,
    chart.difficulty,
    chart.title,
    play.accuracy,
    time,
  )
}

export function addSuppressedKeys(
  existing: string[] | undefined,
  keys: string[],
): string[] {
  const set = new Set(existing ?? [])
  for (const k of keys) {
    if (k) set.add(k)
  }
  const next = [...set]
  if (next.length > MAX_SUPPRESSED) {
    return next.slice(next.length - MAX_SUPPRESSED)
  }
  return next
}

export function isSuppressed(
  suppressed: string[] | undefined,
  key: string,
): boolean {
  return Boolean(suppressed?.includes(key))
}
