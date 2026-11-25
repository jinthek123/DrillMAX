import { useEffect, useState } from 'react'
import { loadDrillMaxFile } from '../lib/autoPersist'
import type { AppData } from '../types'

/** 기록 파일을 읽고, 차트나 플레이가 있을 때만 메모리에 반영한다. */
export function useRecordFile(
  backupDir: string,
  replaceAll: (data: AppData) => void,
) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const fromFile = await loadDrillMaxFile(backupDir || undefined)
      if (!cancelled && fromFile && (fromFile.charts.length > 0 || fromFile.plays.length > 0)) {
        replaceAll(fromFile)
      }
      if (!cancelled) setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [backupDir, replaceAll])

  return hydrated
}
