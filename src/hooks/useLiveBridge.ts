import { useEffect, useRef, useState } from 'react'
import { fetchArchiveBest } from '../lib/archiveApi'
import { bridgeUrl } from '../lib/bridgeUrl'
import type { ButtonMode, Difficulty, LiveBridgeEvent } from '../types'
import { loadSettings } from '../lib/settings'

interface BridgeHealth {
  clientOnline: boolean
  nickname: string | null
  lastError: string | null
}

interface UseLiveBridgeOptions {
  enabled: boolean
  onEvent: (ev: LiveBridgeEvent) => string
  onNeedArchiveBest: (
    chartId: string,
    ev: LiveBridgeEvent,
    nickname: string,
  ) => void
}

interface SnapshotPlay {
  time: string
  status: '미갱신' | '성공'
  button: ButtonMode
  difficulty: Difficulty
  title: string
  accuracy: number
  raw: string
}

export function useLiveBridge({
  enabled,
  onEvent,
  onNeedArchiveBest,
}: UseLiveBridgeOptions) {
  const [health, setHealth] = useState<BridgeHealth>({
    clientOnline: false,
    nickname: null,
    lastError: null,
  })
  const [bridgeUp, setBridgeUp] = useState(false)
  const sinceRef = useRef<string>(new Date().toISOString())
  const seenRef = useRef<Set<string>>(new Set())
  const syncedSnapshotRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      syncedSnapshotRef.current = false
      return
    }

    let cancelled = false

    function ingest(ev: LiveBridgeEvent, nickname: string | null) {
      if (seenRef.current.has(ev.id)) return
      seenRef.current.add(ev.id)
      sinceRef.current = ev.at > sinceRef.current ? ev.at : sinceRef.current
      const chartId = onEvent(ev)
      if (ev.status === '미갱신' && nickname && chartId) {
        onNeedArchiveBest(chartId, ev, nickname)
      }
    }

    async function syncSnapshot() {
      if (syncedSnapshotRef.current) return
      const res = await fetch(bridgeUrl('/api/snapshot'))
      if (!res.ok) return
      const json = (await res.json()) as {
        nickname: string | null
        plays: SnapshotPlay[]
      }
      syncedSnapshotRef.current = true
      // 최신 캡쳐가 위에 있으므로 시간순으로 넣기 위해 reverse
      for (const p of [...json.plays].reverse()) {
        ingest(
          {
            id: `snap-${p.time}-${p.status}-${p.button}-${p.difficulty}-${p.title}-${p.accuracy}`,
            at: new Date().toISOString(),
            time: p.time,
            status: p.status,
            button: p.button,
            difficulty: p.difficulty,
            title: p.title,
            accuracy: p.accuracy,
            raw: p.raw,
          },
          json.nickname,
        )
      }
    }

    async function poll() {
      try {
        const res = await fetch(
          bridgeUrl(
            `/api/events?since=${encodeURIComponent(sinceRef.current)}`,
          ),
        )
        if (!res.ok) throw new Error(`bridge ${res.status}`)
        const json = (await res.json()) as {
          clientOnline: boolean
          nickname: string | null
          lastError: string | null
          events: LiveBridgeEvent[]
          serverTime: string
        }
        if (cancelled) return
        setBridgeUp(true)
        setHealth({
          clientOnline: json.clientOnline,
          nickname: json.nickname,
          lastError: json.lastError,
        })

        if (json.clientOnline) {
          await syncSnapshot()
        }

        for (const ev of json.events) {
          ingest(ev, json.nickname)
        }
      } catch {
        if (!cancelled) {
          setBridgeUp(false)
          setHealth((h) => ({
            ...h,
            lastError: '브리지 연결 실패 — 앱을 다시 실행해 주세요',
          }))
        }
      }
    }

    void poll()
    const id = window.setInterval(() => void poll(), 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, onEvent, onNeedArchiveBest])

  return { health, bridgeUp }
}

export async function resolveArchiveBest(
  nickname: string,
  ev: LiveBridgeEvent,
): Promise<number | null> {
  try {
    const settings = loadSettings()
    return await fetchArchiveBest(ev.title, ev.button, ev.difficulty, {
      token: settings.apiToken || undefined,
      nickname: settings.nickname || nickname || undefined,
    })
  } catch {
    return null
  }
}
