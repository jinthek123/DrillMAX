import { useCallback, useEffect, useMemo, useState } from 'react'
import { importJson, loadData, saveData } from '../lib/storage'
import type {
  AppData,
  ButtonMode,
  Chart,
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

  const highest = useMemo(() => {
    const fromPlays =
      selectedPlays.length > 0
        ? Math.max(...selectedPlays.map((p) => p.accuracy))
        : null
    const fromArchive = selectedChart?.archiveBest ?? null
    if (fromPlays == null && fromArchive == null) return null
    return Math.max(fromPlays ?? 0, fromArchive ?? 0)
  }, [selectedPlays, selectedChart])

  const latestPlay = useMemo(() => {
    if (selectedPlays.length === 0) return null
    return selectedPlays[selectedPlays.length - 1]
  }, [selectedPlays])

  const addChart = useCallback(
    (title: string, button: ButtonMode, difficulty: Difficulty) => {
      const trimmed = title.trim()
      if (!trimmed) return null

      const existing = data.charts.find(
        (c) =>
          c.title === trimmed &&
          c.button === button &&
          c.difficulty === difficulty,
      )
      if (existing) {
        setSelectedId(existing.id)
        return existing.id
      }

      const chart: Chart = {
        id: uid(),
        title: trimmed,
        button,
        difficulty,
        createdAt: new Date().toISOString(),
      }
      setData((prev) => ({ ...prev, charts: [...prev.charts, chart] }))
      setSelectedId(chart.id)
      return chart.id
    },
    [data.charts],
  )

  const deleteChart = useCallback((chartId: string) => {
    setData((prev) => ({
      charts: prev.charts.filter((c) => c.id !== chartId),
      plays: prev.plays.filter((p) => p.chartId !== chartId),
    }))
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
      const rounded = Math.round(accuracy * 100) / 100
      if (rounded < 0 || rounded > 100) return

      // 100%는 PP → Max Combo 자동
      const maxCombo = rounded >= 100 ? true : opts?.maxCombo

      const play: Play = {
        id: uid(),
        chartId,
        accuracy: rounded,
        playedAt,
        maxCombo,
        source: opts?.source ?? 'manual',
        status: opts?.status,
      }
      setData((prev) => ({ ...prev, plays: [...prev.plays, play] }))
      if (opts?.source === 'live') setLatestLive(play)
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
    setData((prev) => ({
      ...prev,
      plays: prev.plays.filter((p) => p.id !== playId),
    }))
  }, [])

  const importLogPlays = useCallback(
    (parsed: ParsedLogPlay[], dateBase?: string) => {
      let added = 0
      setData((prev) => {
        let charts = [...prev.charts]
        let plays = [...prev.plays]
        let firstNewChartId: string | null = null

        for (const item of parsed) {
          let chart = charts.find(
            (c) =>
              c.title === item.title &&
              c.button === item.button &&
              c.difficulty === item.difficulty,
          )
          if (!chart) {
            chart = {
              id: uid(),
              title: item.title,
              button: item.button,
              difficulty: item.difficulty,
              createdAt: new Date().toISOString(),
            }
            charts.push(chart)
            if (!firstNewChartId) firstNewChartId = chart.id
          }

          const playedAt = dateBase
            ? combineDateAndTime(dateBase, item.time)
            : todayAt(item.time)

          const dup = plays.some(
            (p) =>
              p.chartId === chart!.id &&
              p.accuracy === item.accuracy &&
              Math.abs(
                new Date(p.playedAt).getTime() - new Date(playedAt).getTime(),
              ) < 1000,
          )
          if (dup) continue

          plays.push({
            id: uid(),
            chartId: chart.id,
            accuracy: item.accuracy,
            playedAt,
            source: 'log',
            status: item.status,
          })
          added += 1
        }

        if (firstNewChartId) setSelectedId(firstNewChartId)
        else if (parsed[0]) {
          const match = charts.find(
            (c) =>
              c.title === parsed[0].title &&
              c.button === parsed[0].button &&
              c.difficulty === parsed[0].difficulty,
          )
          if (match) setSelectedId(match.id)
        }

        return { charts, plays }
      })
      return added
    },
    [],
  )

  const ingestLiveEvent = useCallback((ev: LiveBridgeEvent) => {
    let chartId = ''
    let play: Play | null = null

    setData((prev) => {
      let charts = [...prev.charts]
      let plays = [...prev.plays]

      let chart = charts.find(
        (c) =>
          c.title === ev.title &&
          c.button === ev.button &&
          c.difficulty === ev.difficulty,
      )
      if (!chart) {
        chart = {
          id: uid(),
          title: ev.title,
          button: ev.button,
          difficulty: ev.difficulty,
          createdAt: new Date().toISOString(),
        }
        charts.push(chart)
      }
      chartId = chart.id

      const playedAt = todayAt(ev.time)
      const dup = plays.some(
        (p) =>
          p.chartId === chart!.id &&
          p.accuracy === ev.accuracy &&
          Math.abs(
            new Date(p.playedAt).getTime() - new Date(playedAt).getTime(),
          ) < 2000,
      )
      if (dup) {
        setSelectedId(chart.id)
        return prev
      }

      play = {
        id: uid(),
        chartId: chart.id,
        accuracy: ev.accuracy,
        playedAt,
        source: 'live',
        status: ev.status,
      }
      plays.push(play)
      setSelectedId(chart.id)
      return { charts, plays }
    })

    if (play) setLatestLive(play)
    return chartId
  }, [])

  const replaceAll = useCallback((next: AppData) => {
    setData(next)
    setSelectedId(next.charts[0]?.id ?? null)
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
  }
}

function combineDateAndTime(dateYmd: string, timeHms: string): string {
  const [y, m, d] = dateYmd.split('-').map(Number)
  const [hh, mm, ss] = timeHms.split(':').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, ss ?? 0).toISOString()
}
