export function joinPath(dir: string, file: string): string {
  const trimmed = dir.replace(/[/\\]+$/, '')
  const sep = trimmed.includes('\\') ? '\\' : '/'
  return `${trimmed}${sep}${file}`
}
