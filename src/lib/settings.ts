export type ThemeMode = 'light' | 'dark'

export interface AppSettings {
  apiToken: string
  nickname: string
  setupDone: boolean
  theme: ThemeMode
}

const KEY = 'rhythmform-settings-v1'

const EMPTY: AppSettings = {
  apiToken: '',
  nickname: '',
  setupDone: false,
  theme: 'dark',
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    const theme = parsed.theme === 'light' ? 'light' : 'dark'
    return {
      apiToken: typeof parsed.apiToken === 'string' ? parsed.apiToken : '',
      nickname: typeof parsed.nickname === 'string' ? parsed.nickname : '',
      setupDone: Boolean(parsed.setupDone && parsed.apiToken),
      theme,
    }
  } catch {
    return { ...EMPTY }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme)
}
