import type { ButtonMode, Difficulty, ParsedLogPlay } from '../types'
import { atLocalDateTime, formatMonthDay, localDateKey } from './dates'

export { formatMonthDay as formatMonthDayAxis, localDateKey as localDayKey }

const BUTTONS: ButtonMode[] = ['4B', '5B', '6B', '8B']
const DIFFS: Difficulty[] = ['NM', 'HD', 'MX', 'SC']

function isButton(v: string): v is ButtonMode {
  return (BUTTONS as string[]).includes(v)
}

function isDiff(v: string): v is Difficulty {
  return (DIFFS as string[]).includes(v)
}

/**
 * V-ARCHIVE 클라이언트 로그에서 [미갱신]/[성공] 플레이 라인을 추출합니다.
 * 예:
 * [15:42:23][미갱신][2일전][티어24등](SC 12.3) 4B SC 곡제목(99.92 %)
 * [15:42:11][성공] 4B SC 곡제목(99.96 %)
 */
export function parseVArchiveLog(text: string): ParsedLogPlay[] {
  const results: ParsedLogPlay[] = []
  const lines = text.split(/\r?\n/)

  const pattern =
    /\[(\d{2}:\d{2}:\d{2})\]\[(미갱신|성공)\](?:\[[^\]]*\])*(?:\([^)]*\))?\s*(\dB)\s+(NM|HD|MX|SC)\s+(.+?)\s*\((\d+(?:\.\d+)?)\s*%\)/u

  /** 캡쳐 결과: `4B SC 99.72% (MaxCombo)` */
  const flagRe =
    /(\dB)\s+(NM|HD|MX|SC)\s+(\d+(?:\.\d+)?)\s*%\s*\(\s*(Max\s*Combo|Perfect\s*Play|PP|MC)\s*\)/gi
  const mcFlags = new Set<string>()
  for (const m of text.matchAll(flagRe)) {
    const acc = Math.round(Number.parseFloat(m[3]) * 100) / 100
    mcFlags.add(`${m[1].toUpperCase()}|${m[2].toUpperCase()}|${acc}`)
  }

  for (const line of lines) {
    const m = line.match(pattern)
    if (!m) continue

    const [, time, status, button, difficulty, titleRaw, acc] = m
    if (!isButton(button) || !isDiff(difficulty)) continue

    const title = titleRaw.trim()
    const accuracy = Math.round(Number.parseFloat(acc) * 100) / 100
    if (!title || Number.isNaN(accuracy) || accuracy <= 0) continue

    const maxCombo =
      accuracy >= 100 ||
      mcFlags.has(`${button}|${difficulty}|${accuracy}`) ||
      /\((?:Max\s*Combo|Perfect\s*Play|PP|MC)\)/i.test(line)

    results.push({
      time,
      button,
      difficulty,
      title,
      accuracy,
      status: status as '미갱신' | '성공',
      maxCombo: maxCombo || undefined,
    })
  }

  return results
}

/** 오늘 날짜 + HH:MM:SS → ISO 문자열 */
export function todayAt(timeHms: string): string {
  return atLocalDateTime(localDateKey(), timeHms)
}

export function formatChartLabel(
  button: string,
  difficulty: string,
  title: string,
): string {
  return `${button} ${difficulty} — ${title}`
}

export function formatTimeAxis(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 축이 빽빽할 때 HH:MM */
export function formatTimeAxisShort(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${localDateKey(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
