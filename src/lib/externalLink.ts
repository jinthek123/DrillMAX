import type { MouseEvent } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { isTauri } from './bridgeUrl'

export function openExternalLink(event: MouseEvent<HTMLAnchorElement>) {
  if (!isTauri()) return
  event.preventDefault()
  void openUrl(event.currentTarget.href).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error)
    window.alert(`링크를 열지 못했습니다.\n${detail}`)
  })
}
