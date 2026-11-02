declare global {
  interface Window {
    rhythmform?: {
      isDesktop?: boolean
      bridgeBaseUrl?: string
    }
    __TAURI_INTERNALS__?: unknown
  }
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** Vite 개발: /bridge 프록시 · Tauri: 로컬 브리지 직접 */
export function bridgeUrl(path: string): string {
  const base =
    window.rhythmform?.bridgeBaseUrl ??
    (isTauri() ? 'http://127.0.0.1:5174' : undefined)
  const suffix = path.startsWith('/') ? path : `/${path}`
  if (base) return `${base.replace(/\/$/, '')}${suffix}`
  return `/bridge${suffix}`
}
