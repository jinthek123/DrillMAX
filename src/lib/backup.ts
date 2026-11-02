import { open } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import type { AppData } from '../types'
import { exportJson } from './storage'

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function defaultBackupName(): string {
  return `rhythmform-backup-${new Date().toISOString().slice(0, 10)}.json`
}

function joinPath(dir: string, file: string): string {
  const trimmed = dir.replace(/[/\\]+$/, '')
  const sep = trimmed.includes('\\') ? '\\' : '/'
  return `${trimmed}${sep}${file}`
}

/** 백업 폴더 선택 (디렉터리) */
export async function pickBackupDir(
  current?: string,
): Promise<string | null> {
  if (!isTauri()) return null
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath: current || undefined,
    title: '백업 폴더 선택',
  })
  if (typeof selected === 'string' && selected) return selected
  return null
}

/** 지정 폴더에 JSON 백업 저장 */
export async function saveBackupToDir(
  data: AppData,
  dir: string,
): Promise<string> {
  const json = exportJson(data)
  const name = defaultBackupName()

  if (isTauri()) {
    const path = joinPath(dir, name)
    await writeTextFile(path, json)
    return path
  }

  // 브라우저/개발: 다운로드로 폴백
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  return name
}
