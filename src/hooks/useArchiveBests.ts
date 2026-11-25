import { useCallback, useEffect, useRef } from 'react'
import {
  archiveKey,
  fetchAllArchiveBests,
  lookupBest,
  resolveArchiveBest,
  type ArchiveBestMap,
} from '../lib/archiveApi'
import type { LiveBridgeEvent } from '../types'

/** V-Archive 최고 기록 캐시. 차트에 없는 값만 나중에 채운다. */
export function useArchiveBests({
  setupDone,
  apiToken,
  nickname,
  setArchiveBest,
  applyArchiveBests,
}: {
  setupDone: boolean
  apiToken: string
  nickname: string
  setArchiveBest: (chartId: string, score: number) => void
  applyArchiveBests: (bests: Map<string, number>) => void
}) {
  const archiveBestsRef = useRef<ArchiveBestMap | null>(null)
  const archivePendingRef = useRef(new Set<string>())

  const syncArchiveBests = useCallback(
    async (token: string, name: string) => {
      const { nickname: resolved, bests } = await fetchAllArchiveBests({
        token,
        nickname: name || undefined,
      })
      archiveBestsRef.current = bests
      applyArchiveBests(bests)
      return resolved
    },
    [applyArchiveBests],
  )

  useEffect(() => {
    if (!setupDone || !apiToken) return
    void syncArchiveBests(apiToken, nickname).catch(() => {
      /* 네트워크 실패 시 다음 저장/재시도에서 처리 */
    })
  }, [setupDone, apiToken, nickname, syncArchiveBests])

  const refreshArchiveBest = useCallback(
    (
      chartId: string,
      title: string,
      button: LiveBridgeEvent['button'],
      difficulty: LiveBridgeEvent['difficulty'],
      name?: string | null,
    ) => {
      const cached = lookupBest(archiveBestsRef.current, button, difficulty, title)
      if (cached != null) setArchiveBest(chartId, cached)

      return (async () => {
        const best = await resolveArchiveBest(title, button, difficulty, name || nickname)
        if (best == null) return
        setArchiveBest(chartId, best)
        const map = archiveBestsRef.current ?? new Map()
        map.set(archiveKey(button, difficulty, title), best)
        archiveBestsRef.current = map
      })()
    },
    [setArchiveBest, nickname],
  )

  return { archiveBestsRef, archivePendingRef, syncArchiveBests, refreshArchiveBest }
}
