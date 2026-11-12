import { useEffect, useRef, useState } from 'react'
import { bridgeUrl } from '../lib/bridgeUrl'
import type { ButtonMode, Difficulty, LiveBridgeEvent } from '../types'

interface BridgeHealth {
  clientOnline: boolean
  nickname: string | null
  lastError: string | null
}

interface UseLiveBridgeOptions {
  enabled: boolean
  onEvent: (ev: LiveBridgeEvent) => string
}

interface SnapshotPlay {
  time: string
  status: '미갱신' | '성공'
  button: ButtonMode
  difficulty: Difficulty
  title: string
  accuracy: number
  maxCombo?: boolean
  raw: string
}

export function useLiveBridge({ enabled, onEvent }: UseLiveBridgeOptions) {
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
    if (!enabled) return

    let cancelled = false
    // 스냅샷은 앱 세션당 1회만 — LIVE 토글마다 전체 재수집하지 않음

    function ingest(ev: LiveBridgeEvent) {
      if (seenRef.current.has(ev.id)) {
        // MaxCombo 배너가 늦게 잡힌 경우 업그레이드만 재시도
        if (ev.maxCombo) onEvent(ev)
        return
      }
      seenRef.current.add(ev.id)
      sinceRef.current = ev.at > sinceRef.current ? ev.at : sinceRef.current
      // [미갱신] 시 PB 조회는 App.onLiveEvent → refreshArchiveBest
      onEvent(ev)
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
      for (const p of [...json.plays].reverse()) {
        ingest({
          id: `snap-${p.time}-${p.status}-${p.button}-${p.difficulty}-${p.title}-${p.accuracy}`,
          at: new Date().toISOString(),
          time: p.time,
          status: p.status,
          button: p.button,
          difficulty: p.difficulty,
          title: p.title,
          accuracy: p.accuracy,
          maxCombo: p.maxCombo,
          raw: p.raw,
        })
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
        setBridgeUp((up) => (up ? up : true))
        setHealth((prev) =>
          prev.clientOnline === json.clientOnline &&
          prev.nickname === json.nickname &&
          prev.lastError === json.lastError
            ? prev
            : {
                clientOnline: json.clientOnline,
                nickname: json.nickname,
                lastError: json.lastError,
              },
        )

        if (json.clientOnline) {
          await syncSnapshot()
        }

        for (const ev of json.events) {
          ingest(ev)
        }
      } catch {
        if (!cancelled) {
          setBridgeUp((up) => (up ? false : up))
          setHealth((h) =>
            h.lastError === '브리지 연결 실패 — 앱을 다시 실행해 주세요'
              ? h
              : {
                  ...h,
                  lastError: '브리지 연결 실패 — 앱을 다시 실행해 주세요',
                },
          )
        }
      }
    }

    void poll()
    const id = window.setInterval(() => void poll(), 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, onEvent])

  return { health, bridgeUp }
}
