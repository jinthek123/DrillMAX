import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import type { AppData } from '../types'
import type { SongEntry } from './songCatalog'
import { isTauri } from './bridgeUrl'
import { readAppDataJson, writeAppDataJson } from './persist'

const FILE_NAME = 'drillMax.json'

declare const __DRILLMAX_DATA_FILE__: string

function joinPath(dir: string, file: string): string {
  const trimmed = dir.replace(/[/\\]+$/, '')
  const sep = trimmed.includes('\\') ? '\\' : '/'
  return `${trimmed}${sep}${file}`
}

function toWindowsPath(filePath: string): string {
  const trimmed = filePath.trim()
  if (!trimmed) return ''
  return trimmed.includes('\\') ? trimmed : trimmed.replace(/\//g, '\\')
}

/** 이 저장소를 연 곳의 data/drillMax.json. 소스에는 PC별 절대경로를 적지 않는다. */
function repoDataFile(): string {
  const injected = toWindowsPath(__DRILLMAX_DATA_FILE__ ?? '')
  if (injected) return injected
  return `data\\${FILE_NAME}`
}

/**
 * 저장 경로.
 * 데이터 폴더를 지정하면 그곳, 아니면 저장소의 data/drillMax.json.
 */
export async function resolvePersistPath(
  backupDir?: string,
): Promise<{ path: string; baseDir?: BaseDirectory } | null> {
  if (!isTauri()) return null
  if (backupDir?.trim()) {
    return { path: joinPath(backupDir.trim(), FILE_NAME) }
  }
  return { path: repoDataFile() }
}

export async function loadDrillMaxFile(
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

export async function saveDrillMaxFile(
  data: AppData,
  opts?: {
    backupDir?: string
    nickname?: string
    catalog?: SongEntry[]
  },
): Promise<string | null> {
  if (!isTauri()) return null

  const json = writeAppDataJson(data, {
    nickname: opts?.nickname,
    catalog: opts?.catalog,
  })
  const target = await resolvePersistPath(opts?.backupDir)
  if (!target) return null

  const parent = target.path.replace(/[/\\][^/\\]+$/, '')
  if (parent && parent !== target.path) {
    try {
      await mkdir(parent, { recursive: true })
    } catch {
      /* already exists */
    }
  }

  await writeTextFile(
    target.path,
    json,
    target.baseDir != null ? { baseDir: target.baseDir } : undefined,
  )
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
    void saveDrillMaxFile(job.data, job).catch(() => {
      /* 자동저장 실패는 UI를 막지 않음 */
    })
  }, 600)
}
