/** 로컬 달력 날짜 YYYY-MM-DD */
export function localDateKey(input: Date | string = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 축 라벨 MM/DD */
export function formatMonthDay(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

export function isLocalMidnight(input: Date | string): boolean {
  const d = typeof input === 'string' ? new Date(input) : input
  return (
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0
  )
}

/** 로컬 날짜(YYYY-MM-DD) + HH:MM:SS → ISO */
export function atLocalDateTime(dateYmd: string, timeHms: string): string {
  const [y, m, d] = dateYmd.split('-').map(Number)
  const [hh, mm, ss] = timeHms.split(':').map(Number)
  return new Date(
    y,
    (m ?? 1) - 1,
    d ?? 1,
    hh ?? 0,
    mm ?? 0,
    ss ?? 0,
  ).toISOString()
}
