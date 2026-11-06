import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import type { AppData } from '../types'
import type { SongEntry } from './songCatalog'
import { readAppDataJson, writeAppDataJson } from './persist'

const FILE_NAME = 'rhythmForm.json'

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function joinPath(dir: string, file: string): string {
  const trimmed = dir.replace(/[/\\]+$/, '')
  const sep = trimmed.includes('\\') ? '\\' : '/'
  return `${trimmed}${sep}${file}`
}

/** 저장 경로: backupDir 우선, 없으면 앱 데이터 폴더 */
export async function resolvePersistPath(
  backupDir?: string,
): Promise<{ path: string; baseDir?: BaseDirectory } | null> {
  if (!isTauri()) return null
  if (backupDir?.trim()) {
    return { path: joinPath(backupDir.trim(), FILE_NAME) }
  }
  return { path: FILE_NAME, baseDir: BaseDirectory.AppData }
}

export async function loadRhythmFormFile(
  backupDir?: string,
): Promise<AppData | null> {
  if (!isTauri()) return null
  try {
    const target = await resolvePersistPath(backupDir)
    if (!target) return null
    const ok = await exists(
      target.path,
      target.baseDir != null ? { baseDir: target.baseDir } : undefined,
    )
    if (!ok) return null
    const raw = await readTextFile(
      target.path,
      target.baseDir != null ? { baseDir: target.baseDir } : undefined,
    )
    return readAppDataJson(raw)
  } catch {
    return null
  }
}

export async function saveRhythmFormFile(
  data: AppData,
  opts?: {
    backupDir?: string
    nickname?: string
    catalog?: SongEntry[]
  },
): Promise<string | null> {
  if (!isTauri()) {
    // 브라우저: localStorage 는 별도로 유지. 파일 자동저장은 Tauri 전용.
    return null
  }

  const json = writeAppDataJson(data, {
    nickname: opts?.nickname,
    catalog: opts?.catalog,
  })
  const target = await resolvePersistPath(opts?.backupDir)
  if (!target) return null

  if (target.baseDir != null) {
    try {
      await mkdir('', { baseDir: target.baseDir, recursive: true })
    } catch {
      /* already exists */
    }
    await writeTextFile(target.path, json, { baseDir: target.baseDir })
    return `AppData/${target.path}`
  }

  await writeTextFile(target.path, json)
  return target.path
}

let timer: ReturnType<typeof setTimeout> | null = null
let pending: {
  data: AppData
  backupDir?: string
  nickname?: string
  catalog?: SongEntry[]
} | null = null

/** 디바운스 자동 저장 */
export function scheduleAutoPersist(
  data: AppData,
  opts?: {
    backupDir?: string
    nickname?: string
    catalog?: SongEntry[]
  },
): void {
  pending = {
    data,
    backupDir: opts?.backupDir,
    nickname: opts?.nickname,
    catalog: opts?.catalog,
  }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    const job = pending
    pending = null
    timer = null
    if (!job) return
    void saveRhythmFormFile(job.data, job).catch(() => {
      /* 자동저장 실패는 UI를 막지 않음 */
    })
  }, 600)
}
