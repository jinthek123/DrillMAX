import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './bridgeUrl'

declare const __APP_VERSION__: string

const LATEST_URL = 'https://api.github.com/repos/jinthek123/DrillMAX/releases/latest'

export type UpdateState = 'current' | 'available' | 'installing' | 'failed'

export interface UpdateReport {
  state: UpdateState
  detail: string
}

export function parseVersion(raw: string): [number, number, number] | null {
  const core = raw.trim().replace(/^[vV]/, '').split(/[-+]/)[0] ?? ''
  const parts = core.split('.')
  if (parts.length < 2 || parts.length > 3) return null
  const numbers = parts.map((part) => Number(part))
  if (numbers.some((value) => !Number.isInteger(value) || value < 0)) return null
  return [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 0]
}

function compareVersion(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < 3; index += 1) {
    const a = left[index] ?? 0
    const b = right[index] ?? 0
    if (a !== b) return a < b ? -1 : 1
  }
  return 0
}

export async function currentAppVersion(): Promise<string> {
  if (isTauri()) {
    try {
      return await getVersion()
    } catch {
      /* 브라우저 미리보기는 패키지 버전으로 비교한다. */
    }
  }
  return __APP_VERSION__
}

export async function checkAppUpdate(current: string): Promise<UpdateReport> {
  const mine = parseVersion(current)
  if (!mine) return { state: 'failed', detail: '업데이트를 확인하지 못했습니다.' }
  let response: Response
  try {
    response = await fetch(LATEST_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    })
  } catch {
    return { state: 'failed', detail: '업데이트를 확인하지 못했습니다.' }
  }
  if (!response.ok) return { state: 'failed', detail: '업데이트를 확인하지 못했습니다.' }
  let body: { tag_name?: unknown; assets?: { name?: unknown }[] }
  try {
    body = await response.json()
  } catch {
    return { state: 'failed', detail: '업데이트를 확인하지 못했습니다.' }
  }
  const latest = parseVersion(String(body.tag_name ?? ''))
  if (!latest) return { state: 'failed', detail: '업데이트를 확인하지 못했습니다.' }
  if (compareVersion(latest, mine) <= 0) return { state: 'current', detail: '' }
  const assets = Array.isArray(body.assets) ? body.assets : []
  const setup = assets.some(
    (asset) => typeof asset?.name === 'string' && /^DrillMAX_.+_x64-setup\.exe$/.test(asset.name),
  )
  if (!setup) return { state: 'failed', detail: '설치 파일을 찾지 못했습니다.' }
  return { state: 'available', detail: '' }
}

export async function installAppUpdate(): Promise<UpdateReport> {
  return invoke<UpdateReport>('install_app_update')
}
