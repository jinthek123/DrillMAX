import type { AppData } from '../types'

const STORAGE_KEY = 'rhythmform-data-v1'

const EMPTY: AppData = { charts: [], plays: [] }

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw) as AppData
    return {
      charts: Array.isArray(parsed.charts) ? parsed.charts : [],
      plays: Array.isArray(parsed.plays) ? parsed.plays : [],
    }
  } catch {
    return structuredClone(EMPTY)
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function importJson(raw: string): AppData {
  const parsed = JSON.parse(raw) as AppData
  if (!Array.isArray(parsed.charts) || !Array.isArray(parsed.plays)) {
    throw new Error('잘못된 JSON 형식입니다.')
  }
  return parsed
}
