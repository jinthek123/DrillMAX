import { normalizeAppData } from './dailyBest'
import {
  parsePersistedJson,
  stringifyRecord,
  toRecordFile,
} from './drillMaxJson'
import type { SongEntry } from './songCatalog'
import type { AppData } from '../types'

/** JSON 문자열 → 정규화된 AppData */
export function readAppDataJson(raw: string): AppData {
  return normalizeAppData(parsePersistedJson(raw))
}

/** AppData → 기록 파일 v2 문자열 */
export function writeAppDataJson(
  data: AppData,
  opts?: { nickname?: string; catalog?: SongEntry[] },
): string {
  return stringifyRecord(toRecordFile(data, opts))
}
