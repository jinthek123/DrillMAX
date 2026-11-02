import type { ThemeMode } from '../lib/settings'

interface ThemeToggleProps {
  theme: ThemeMode
  onChange: (theme: ThemeMode) => void
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => onChange(next)}
      title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
    >
      {theme === 'dark' ? '라이트' : '다크'}
    </button>
  )
}
