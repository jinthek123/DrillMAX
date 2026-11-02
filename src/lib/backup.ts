import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import type { AppData } from '../types'
import { exportJson } from './storage'

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function defaultBackupName(): string {
  return `rhythmform-backup-${new Date().toISOString().slice(0, 10)}.json`
}

/** Tauri 패키지: 저장 대화상자 · 브라우저/개발: 다운로드 링크 */
export async function downloadBackup(data: AppData): Promise<void> {
  const json = exportJson(data)
  const name = defaultBackupName()

  if (isTauri()) {
    const path = await save({
      defaultPath: name,
      filters: [{ name: 'JSON', extensions: ['json'] }],
      title: 'RhythmForm 백업 저장',
    })
    if (!path) return
    await writeTextFile(path, json)
    return
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
