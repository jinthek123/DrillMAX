import { readAppDataJson, writeAppDataJson } from './persist'
import type { AppData } from '../types'

const STORAGE_KEY = 'drillmax-data-v1'

const EMPTY: AppData = { charts: [], plays: [], dailyBests: [] }

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY)
    return readAppDataJson(raw)
  } catch {
    return structuredClone(EMPTY)
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, writeAppDataJson(data))
}

export function exportJson(data: AppData): string {
  return writeAppDataJson(data)
}

export function importJson(raw: string): AppData {
  return readAppDataJson(raw)
}
