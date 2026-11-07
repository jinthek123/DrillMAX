import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { importJson, loadData, saveData } from '../lib/storage'
import {
  appendPlay,
  normalizeAppData,
  sanitizeAppData,
} from '../lib/dailyBest'
import { shouldFetchArchiveBest } from '../lib/archiveRefresh'
import { atLocalDateTime, localDateKey } from '../lib/dates'
import {
  createChart,
  findChart,
  isNearDuplicatePlay,
} from '../lib/chartIdentity'
import { computeHighest } from '../lib/highest'
import { round2 } from '../lib/math'
import {
  addSuppressedKeys,
  fingerprintFromPlay,
  isSuppressed,
  playFingerprint,
} from '../lib/suppressKeys'
import type {
  AppData,
  ButtonMode,
  Difficulty,
  LiveBridgeEvent,
  ParsedLogPlay,
  Play,
} from '../types'
import { todayAt } from '../lib/parseLog'

function uid(): string {
  return crypto.randomUUID()
}

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [latestLive, setLatestLive] = useState<Play | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    saveData(data)
  }, [data])

  useEffect(() => {
    if (selectedId && !data.charts.some((c) => c.id === selectedId)) {
      setSelectedId(data.charts[0]?.id ?? null)
    } else if (!selectedId && data.charts.length > 0) {
      setSelectedId(data.charts[0].id)
    }
  }, [data.charts, selectedId])

  const selectedChart = useMemo(
    () => data.charts.find((c) => c.id === selectedId) ?? null,
    [data.charts, selectedId],
  )

  const selectedPlays = useMemo(() => {
    if (!selectedId) return []
    return data.plays
      .filter((p) => p.chartId === selectedId)
      .slice()
      .sort(
        (a, b) =>
          new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime(),
      )
  }, [data.plays, selectedId])

  const highest = useMemo(
    () => computeHighest(selectedPlays, selectedChart?.archiveBest),
    [selectedPlays, selectedChart],
  )

  const latestPlay = useMemo(() => {
    if (selectedPlays.length === 0) return null
    return selectedPlays[selectedPlays.length - 1]
  }, [selectedPlays])

  const addChart = useCallback(
    (title: string, button: ButtonMode, difficulty: Difficulty) => {
      const trimmed = title.trim()
      if (!trimmed) return null

      const existing = findChart(data.charts, trimmed, button, difficulty)
      if (existing) {
        setSelectedId(existing.id)
        return existing.id
      }

      const chart = createChart(trimmed, button, difficulty, uid())
      setData((prev) => ({ ...prev, charts: [...prev.charts, chart] }))
      setSelectedId(chart.id)
      return chart.id
    },
    [data.charts],
  )

  const deleteChart = useCallback((chartId: string) => {
    setData((prev) => {
      const chart = prev.charts.find((c) => c.id === chartId)
      const keys =
        chart == null
          ? []
          : prev.plays
              .filter((p) => p.chartId === chartId)
              .map((p) => fingerprintFromPlay(p, chart))
      return sanitizeAppData({
        charts: prev.charts.filter((c) => c.id !== chartId),
        plays: prev.plays.filter((p) => p.chartId !== chartId),
        dailyBests: (prev.dailyBests ?? []).filter((d) => d.chartId !== chartId),
        suppressedKeys: addSuppressedKeys(prev.suppressedKeys, keys),
      })
    })
  }, [])

  const addPlay = useCallback(
    (
      chartId: string,
      accuracy: number,
      playedAt: string,
      opts?: {
        maxCombo?: boolean
        source?: Play['source']
        status?: Play['status']
      },
    ) => {
      const rounded = round2(accuracy)
      if (rounded <= 0 || rounded > 100) return

      const play: Play = {
        id: uid(),
        chartId,
        accuracy: rounded,
        playedAt,
        maxCombo: rounded >= 100 ? true : opts?.maxCombo,
        source: opts?.source ?? 'manual',
        status: opts?.status,
      }
      setData((prev) => appendPlay(prev, play).data)
    },
    [],
  )

  const setArchiveBest = useCallback((chartId: string, score: number) => {
    setData((prev) => ({
      ...prev,
      charts: prev.charts.map((c) =>
        c.id === chartId
          ? {
              ...c,
              archiveBest: Math.max(c.archiveBest ?? 0, score),
            }
          : c,
      ),
    }))
  }, [])

  const applyArchiveBests = useCallback((bests: Map<string, number>) => {
    setData((prev) => ({
      ...prev,
      charts: prev.charts.map((c) => {
        const score = bests.get(`${c.button}|${c.difficulty}|${c.title}`)
        if (score == null) return c
        return {
          ...c,
          archiveBest: Math.max(c.archiveBest ?? 0, score),
        }
      }),
    }))
  }, [])

  const deletePlay = useCallback((playId: string) => {
    setData((prev) => {
      const play = prev.plays.find((p) => p.id === playId)
      const chart =
        play != null
          ? prev.charts.find((c) => c.id === play.chartId)
          : undefined
      const keys =
        play && chart ? [fingerprintFromPlay(play, chart)] : []
      const plays = prev.plays.filter((p) => p.id !== playId)
      const dailyBests =
        play == null
          ? prev.dailyBests
          : (prev.dailyBests ?? []).filter(
              (d) =>
                !(
                  d.chartId === play.chartId &&
                  d.date === localDateKey(play.playedAt)
                ),
            )
      return sanitizeAppData({
        ...prev,
        plays,
        dailyBests,
        suppressedKeys: addSuppressedKeys(prev.suppressedKeys, keys),
      })
    })
  }, [])

  const importLogPlays = useCallback(
    (parsed: ParsedLogPlay[], dateBase?: string) => {
      let next = dataRef.current
      let added = 0
      let firstNewChartId: string | null = null
      const needArchive: Array<{
        chartId: string
        button: ParsedLogPlay['button']
        difficulty: ParsedLogPlay['difficulty']
        title: string
      }> = []
      const archiveSeen = new Set<string>()

      for (const item of parsed) {
        let chart = findChart(
          next.charts,
          item.title,
          item.button,
          item.difficulty,
        )
        if (!chart) {
          chart = createChart(
            item.title,
            item.button,
            item.difficulty,
            uid(),
          )
          next = { ...next, charts: [...next.charts, chart] }
          if (!firstNewChartId) firstNewChartId = chart.id
        }

        const playedAt = dateBase
          ? atLocalDateTime(dateBase, item.time)
          : todayAt(item.time)

        const fp = playFingerprint(
          item.button,
          item.difficulty,
          item.title,
          item.accuracy,
          item.time,
        )
        if (isSuppressed(next.suppressedKeys, fp)) continue

        if (
          isNearDuplicatePlay(
            next.plays,
            chart.id,
            item.accuracy,
            playedAt,
            1000,
          ) >= 0
        ) {
          continue
        }

        const play: Play = {
          id: uid(),
          chartId: chart.id,
          accuracy: item.accuracy,
          playedAt,
          maxCombo: item.maxCombo || item.accuracy >= 100 || undefined,
          source: 'log',
          status: item.status,
        }
        const applied = appendPlay(next, play)
        next = applied.data
        if (applied.accepted) {
          added += 1
          const key = chart.id
          if (
            !archiveSeen.has(key) &&
            shouldFetchArchiveBest(item.status, chart.archiveBest)
          ) {
            archiveSeen.add(key)
            needArchive.push({
              chartId: chart.id,
              button: item.button,
              difficulty: item.difficulty,
              title: item.title,
            })
          }
        }
      }

      dataRef.current = next
      setData(next)

      if (firstNewChartId) setSelectedId(firstNewChartId)
      else if (parsed[0]) {
        const match = findChart(
          next.charts,
          parsed[0].title,
          parsed[0].button,
          parsed[0].difficulty,
        )
        if (match) setSelectedId(match.id)
      }

      return { added, needArchive }
    },
    [],
  )

  const ingestLiveEvent = useCallback((ev: LiveBridgeEvent) => {
    let chartId = ''
    let acceptedPlay: Play | null = null

    setData((prev) => {
      const fp = playFingerprint(
        ev.button,
        ev.difficulty,
        ev.title,
        ev.accuracy,
        ev.time,
      )
      if (isSuppressed(prev.suppressedKeys, fp)) {
        const existing = findChart(
          prev.charts,
          ev.title,
          ev.button,
          ev.difficulty,
        )
        chartId = existing?.id ?? ''
        if (existing) setSelectedId(existing.id)
        return prev
      }

      let charts = [...prev.charts]
      let chart = findChart(charts, ev.title, ev.button, ev.difficulty)
      if (!chart) {
        chart = createChart(ev.title, ev.button, ev.difficulty, uid())
        charts.push(chart)
      }
      chartId = chart.id

      const playedAt = todayAt(ev.time)
      // 동일 LIVE 이벤트 중복(2초)만 스킵 — 그날의 다른 플레이는 모두 보관
      const dupIdx = isNearDuplicatePlay(
        prev.plays,
        chart.id,
        ev.accuracy,
        playedAt,
        2000,
      )
      if (dupIdx >= 0) {
        if (ev.maxCombo && !prev.plays[dupIdx].maxCombo) {
          const plays = prev.plays.map((p, i) =>
            i === dupIdx ? { ...p, maxCombo: true } : p,
          )
          acceptedPlay = plays[dupIdx]
          setSelectedId(chart.id)
          return {
            ...prev,
            charts,
            plays,
          }
        }
        setSelectedId(chart.id)
        return charts !== prev.charts ? { ...prev, charts } : prev
      }

      const play: Play = {
        id: uid(),
        chartId: chart.id,
        accuracy: ev.accuracy,
        playedAt,
        maxCombo: ev.maxCombo || ev.accuracy >= 100 || undefined,
        source: 'live',
        status: ev.status,
      }
      const applied = appendPlay({ ...prev, charts }, play)
      if (applied.accepted) acceptedPlay = play
      setSelectedId(chart.id)
      return applied.data
    })

    if (acceptedPlay) setLatestLive(acceptedPlay)
    return chartId
  }, [])

  const replaceAll = useCallback((next: AppData) => {
    const normalized = normalizeAppData(next)
    setData(normalized)
    setSelectedId(normalized.charts[0]?.id ?? null)
  }, [])

  const importFromJsonText = useCallback(
    (raw: string) => {
      replaceAll(importJson(raw))
    },
    [replaceAll],
  )

  return {
    data,
    selectedId,
    setSelectedId,
    selectedChart,
    selectedPlays,
    highest,
    latestPlay,
    latestLive,
    addChart,
    deleteChart,
    addPlay,
    deletePlay,
    importLogPlays,
    ingestLiveEvent,
    setArchiveBest,
    applyArchiveBests,
    importFromJsonText,
    replaceAll,
  }
}

