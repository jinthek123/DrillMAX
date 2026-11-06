import { normalizeAppData } from './dailyBest'
import {
  parsePersistedJson,
  stringifyRhythmForm,
  toRhythmFormFile,
} from './rhythmFormJson'
import type { SongEntry } from './songCatalog'
import type { AppData } from '../types'

/** JSON 문자열 → 정규화된 AppData */
export function readAppDataJson(raw: string): AppData {
  return normalizeAppData(parsePersistedJson(raw))
}

/** AppData → rhythmForm.json 문자열 */
export function writeAppDataJson(
  data: AppData,
  opts?: { nickname?: string; catalog?: SongEntry[] },
): string {
  return stringifyRhythmForm(toRhythmFormFile(data, opts))
}
