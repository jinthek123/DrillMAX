declare global {
  interface Window {
    drillmax?: {
      isDesktop?: boolean
      bridgeBaseUrl?: string
    }
    __TAURI_INTERNALS__?: unknown
  }
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** Vite 개발: /bridge 프록시 · Tauri: 로컬 브리지 직접 */
export function bridgeUrl(path: string): string {
  const base =
    window.drillmax?.bridgeBaseUrl ??
    (isTauri() ? 'http://127.0.0.1:5174' : undefined)
  const suffix = path.startsWith('/') ? path : `/${path}`
  if (base) return `${base.replace(/\/$/, '')}${suffix}`
  return `/bridge${suffix}`
}

/**
 * V-ARCHIVE 공개 API/DB — 브리지 `/proxy/*` 경유 (웹뷰 CORS 회피).
 * path 예: `/api/v2/...`, `/db/v2/songs.json`
 */
export function archiveUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return bridgeUrl(`/proxy${suffix}`)
}
