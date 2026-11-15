import { message } from '@tauri-apps/plugin-dialog'
import { useState } from 'react'
import { checkAppUpdate, currentAppVersion, installAppUpdate } from '../lib/appUpdate'
import { isTauri } from '../lib/bridgeUrl'

async function showNotice(text: string, kind: 'warning' | 'error') {
  if (!isTauri()) {
    window.alert(text)
    return
  }
  await message(text, { title: 'DrillMAX', kind, buttons: { ok: '확인' } })
}

export function UpdateCheckButton() {
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'check' | 'install'>('idle')

  async function onClick() {
    if (busy) return
    setBusy(true)
    setPhase('check')
    try {
      const report = await checkAppUpdate(await currentAppVersion())
      if (report.state === 'current') {
        await showNotice('이미 최신 버전입니다.', 'warning')
        return
      }
      if (report.state !== 'available') {
        await showNotice(report.detail || '업데이트를 확인하지 못했습니다.', 'error')
        return
      }
      if (!isTauri()) {
        await showNotice('설치된 앱에서 업데이트할 수 있습니다.', 'error')
        return
      }
      setPhase('install')
      const installed = await installAppUpdate()
      if (installed.state === 'current') {
        await showNotice('이미 최신 버전입니다.', 'warning')
        return
      }
      if (installed.state === 'failed') {
        await showNotice(installed.detail || '설치 파일을 받지 못했습니다.', 'error')
      }
    } catch {
      await showNotice('업데이트를 확인하지 못했습니다.', 'error')
    } finally {
      setBusy(false)
      setPhase('idle')
    }
  }

  const label = phase === 'install' ? '업데이트 중' : phase === 'check' ? '확인 중' : 'Update 확인'

  return (
    <button type="button" className="btn-ghost update-check" disabled={busy} onClick={() => void onClick()}>
      {label}
    </button>
  )
}
