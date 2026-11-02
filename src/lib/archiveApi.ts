import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import type { ButtonMode, Difficulty } from '../types'

export interface ArchiveRecord {
  name: string
  pattern: string
  score: number
  maxCombo?: boolean
  button?: number
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 패키지된 Tauri에선 CORS에 막히지 않도록 플러그인 fetch 사용 */
async function appFetch(url: string, init?: RequestInit): Promise<Response> {
  if (!isTauri()) return fetch(url, init)

  const headers: Record<string, string> = {}
  if (init?.headers) {
    const h = new Headers(init.headers)
    h.forEach((value, key) => {
      headers[key] = value
    })
  }
  return tauriFetch(url, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body,
  })
}

interface ArchiveResponse {
  success?: boolean
  nickname?: string
  records?: ArchiveRecord[]
  data?: ArchiveRecord[]
}

const BUTTONS: ButtonMode[] = ['4B', '5B', '6B', '8B']

function buttonNumber(button: ButtonMode): number {
  return Number(button.replace('B', ''))
}

export function archiveKey(
  button: ButtonMode,
  difficulty: Difficulty,
  title: string,
): string {
  return `${button}|${difficulty}|${title}`
}

function extractRecords(json: unknown): ArchiveRecord[] {
  if (!json || typeof json !== 'object') return []
  if (Array.isArray(json)) return json as ArchiveRecord[]
  const obj = json as Record<string, unknown>
  for (const key of ['records', 'data', 'list', 'patterns']) {
    const v = obj[key]
    if (Array.isArray(v)) return v as ArchiveRecord[]
  }
  for (const v of Object.values(obj)) {
    if (
      Array.isArray(v) &&
      v[0] &&
      typeof v[0] === 'object' &&
      'name' in (v[0] as object)
    ) {
      return v as ArchiveRecord[]
    }
  }
  return []
}

async function fetchButtonRecords(
  button: ButtonMode,
  opts: { token?: string; nickname?: string },
): Promise<{ nickname: string | null; records: ArchiveRecord[] }> {
  const btn = buttonNumber(button)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  let url: string
  if (opts.token?.trim()) {
    url = `https://v-archive.net/api/v2/open-token/archive/button/${btn}`
    headers.Authorization = opts.token.trim()
  } else if (opts.nickname?.trim()) {
    url = `https://v-archive.net/api/v2/archive/${encodeURIComponent(opts.nickname.trim())}/button/${btn}`
  } else {
    throw new Error('API 토큰 또는 닉네임이 필요합니다.')
  }

  const res = await appFetch(url, { headers })
  if (!res.ok) {
    throw new Error(`기록 조회 실패 (${button}, HTTP ${res.status})`)
  }
  const json = (await res.json()) as ArchiveResponse
  if (json.success === false) {
    throw new Error('토큰이 유효하지 않거나 기록을 찾을 수 없습니다.')
  }
  return {
    nickname: json.nickname ?? opts.nickname ?? null,
    records: extractRecords(json),
  }
}

/** 토큰 유효성 검사 (4B 한 번 조회) */
export async function validateApiToken(token: string): Promise<{
  ok: boolean
  nickname: string | null
  message?: string
}> {
  try {
    const { nickname, records } = await fetchButtonRecords('4B', { token })
    return {
      ok: true,
      nickname,
      message: `연결됨 · 4B 기록 ${records.length}건`,
    }
  } catch (e) {
    return {
      ok: false,
      nickname: null,
      message: e instanceof Error ? e.message : '검증 실패',
    }
  }
}

export type ArchiveBestMap = Map<string, number>

/** 4/5/6/8B 전체 PB를 맵으로 가져옴 */
export async function fetchAllArchiveBests(opts: {
  token?: string
  nickname?: string
}): Promise<{ nickname: string | null; bests: ArchiveBestMap }> {
  const bests: ArchiveBestMap = new Map()
  let nickname: string | null = null

  for (const button of BUTTONS) {
    const result = await fetchButtonRecords(button, opts)
    if (result.nickname) nickname = result.nickname
    for (const r of result.records) {
      const diff = String(r.pattern || '').toUpperCase() as Difficulty
      if (!r.name || typeof r.score !== 'number') continue
      if (!['NM', 'HD', 'MX', 'SC'].includes(diff)) continue
      const key = archiveKey(button, diff, r.name)
      const score = Math.round(r.score * 100) / 100
      const prev = bests.get(key)
      if (prev == null || score > prev) bests.set(key, score)
    }
  }

  return { nickname, bests }
}

export async function fetchArchiveBest(
  title: string,
  button: ButtonMode,
  difficulty: Difficulty,
  opts: { token?: string; nickname?: string },
): Promise<number | null> {
  const { records } = await fetchButtonRecords(button, {
    ...opts,
    // pattern filter optional - fetch all and find
  })
  const hit = records.find(
    (r) =>
      r.name === title && String(r.pattern).toUpperCase() === difficulty,
  )
  if (!hit || typeof hit.score !== 'number') return null
  return Math.round(hit.score * 100) / 100
}

export function lookupBest(
  bests: ArchiveBestMap | null | undefined,
  button: ButtonMode,
  difficulty: Difficulty,
  title: string,
): number | null {
  if (!bests) return null
  return bests.get(archiveKey(button, difficulty, title)) ?? null
}
