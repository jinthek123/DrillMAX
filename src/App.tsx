import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchAllArchiveBests,
  lookupBest,
  type ArchiveBestMap,
} from './lib/archiveApi'
import { AddChartModal } from './components/AddChartModal'
import { ApiSetupModal } from './components/ApiSetupModal'
import { ImportLogModal } from './components/ImportLogModal'
import { LiveBadge } from './components/LiveBadge'
import { PlayPanel } from './components/PlayPanel'
import { Sidebar } from './components/Sidebar'
import {
  applyTheme,
  loadSettings,
  saveSettings,
  type ThemeMode,
} from './lib/settings'
import { exportJson } from './lib/storage'
import { useAppData } from './hooks/useAppData'
import { resolveArchiveBest, useLiveBridge } from './hooks/useLiveBridge'
import { useSongCatalog } from './hooks/useSongCatalog'
import type { LiveBridgeEvent } from './types'
import './App.css'

export default function App() {
  const {
    data,
    selectedId,
    setSelectedId,
    selectedChart,
    selectedPlays,
    highest,
    latestPlay,
    addChart,
    deleteChart,
    addPlay,
    deletePlay,
    importLogPlays,
    ingestLiveEvent,
    setArchiveBest,
    applyArchiveBests,
    importFromJsonText,
  } = useAppData()
  const { songs, status: catalogStatus } = useSongCatalog()

  const [settings, setSettings] = useState(() => loadSettings())
  const [apiSetupOpen, setApiSetupOpen] = useState(() => !loadSettings().setupDone)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [liveEnabled, setLiveEnabled] = useState(true)
  const archiveBestsRef = useRef<ArchiveBestMap | null>(null)

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const setTheme = useCallback((theme: ThemeMode) => {
    setSettings((prev) => {
      const next = { ...prev, theme }
      saveSettings(next)
      return next
    })
  }, [])

  const syncArchiveBests = useCallback(
    async (apiToken: string, nickname: string) => {
      const { nickname: resolved, bests } = await fetchAllArchiveBests({
        token: apiToken,
        nickname: nickname || undefined,
      })
      archiveBestsRef.current = bests
      applyArchiveBests(bests)
      return resolved
    },
    [applyArchiveBests],
  )

  useEffect(() => {
    if (!settings.setupDone || !settings.apiToken) return
    void syncArchiveBests(settings.apiToken, settings.nickname).catch(() => {
      /* 네트워크 실패 시 다음 저장/재시도에서 처리 */
    })
  }, [settings.setupDone, settings.apiToken, settings.nickname, syncArchiveBests])

  const knownTitles = useMemo(
    () => [...new Set(data.charts.map((c) => c.title))],
    [data.charts],
  )

  const onLiveEvent = useCallback(
    (ev: LiveBridgeEvent) => {
      const chartId = ingestLiveEvent(ev)
      const cached = lookupBest(
        archiveBestsRef.current,
        ev.button,
        ev.difficulty,
        ev.title,
      )
      if (cached != null && chartId) {
        setArchiveBest(chartId, cached)
      }
      return chartId
    },
    [ingestLiveEvent, setArchiveBest],
  )

  const onNeedArchiveBest = useCallback(
    (chartId: string, ev: LiveBridgeEvent, nickname: string) => {
      const cached = lookupBest(
        archiveBestsRef.current,
        ev.button,
        ev.difficulty,
        ev.title,
      )
      if (cached != null) {
        setArchiveBest(chartId, cached)
        return
      }
      void (async () => {
        const best = await resolveArchiveBest(nickname, ev)
        if (best != null) setArchiveBest(chartId, best)
      })()
    },
    [setArchiveBest],
  )

  const { health, bridgeUp } = useLiveBridge({
    enabled: liveEnabled && settings.setupDone,
    onEvent: onLiveEvent,
    onNeedArchiveBest,
  })

  const playCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of data.plays) {
      map[p.chartId] = (map[p.chartId] ?? 0) + 1
    }
    return map
  }, [data.plays])

  const sortedCharts = useMemo(
    () =>
      [...data.charts].sort((a, b) =>
        `${a.button}${a.difficulty}${a.title}`.localeCompare(
          `${b.button}${b.difficulty}${b.title}`,
          'ko',
        ),
      ),
    [data.charts],
  )

  return (
    <div className="app-shell">
      <div className="bg-grid" aria-hidden />
      <Sidebar
        charts={sortedCharts}
        selectedId={selectedId}
        playCounts={playCounts}
        onSelect={setSelectedId}
        onAdd={() => setAddOpen(true)}
        onDelete={deleteChart}
        onOpenApiSettings={() => setApiSetupOpen(true)}
        theme={settings.theme}
        onThemeChange={setTheme}
        liveSlot={
          <LiveBadge
            enabled={liveEnabled}
            onToggle={() => setLiveEnabled((v) => !v)}
            bridgeUp={bridgeUp}
            clientOnline={health.clientOnline}
            nickname={health.nickname || settings.nickname || null}
            lastError={
              !settings.setupDone
                ? 'API 키 설정 필요'
                : health.lastError
            }
          />
        }
      />
      <PlayPanel
        chart={selectedChart}
        plays={selectedPlays}
        highest={highest}
        latestPlay={latestPlay}
        onAddPlay={(accuracy, playedAt, maxCombo) => {
          if (!selectedChart) return
          addPlay(selectedChart.id, accuracy, playedAt, {
            maxCombo,
            source: 'manual',
          })
        }}
        onDeletePlay={deletePlay}
        onOpenImport={() => setImportOpen(true)}
        onExport={() => {
          const blob = new Blob([exportJson(data)], {
            type: 'application/json',
          })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `rhythmform-backup-${new Date().toISOString().slice(0, 10)}.json`
          a.click()
          URL.revokeObjectURL(url)
        }}
        onImportJson={(file) => {
          const reader = new FileReader()
          reader.onload = () => {
            try {
              importFromJsonText(String(reader.result ?? ''))
            } catch {
              alert('JSON을 읽지 못했습니다.')
            }
          }
          reader.readAsText(file)
        }}
      />

      <AddChartModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(title, button, difficulty) => {
          const id = addChart(title, button, difficulty)
          if (id) {
            const cached = lookupBest(
              archiveBestsRef.current,
              button,
              difficulty,
              title,
            )
            if (cached != null) setArchiveBest(id, cached)
          }
        }}
        songs={songs}
        catalogStatus={catalogStatus}
        knownTitles={knownTitles}
      />
      <ImportLogModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(plays, dateYmd) => importLogPlays(plays, dateYmd)}
      />

      <ApiSetupModal
        open={apiSetupOpen}
        required={!settings.setupDone}
        initialToken={settings.apiToken}
        initialNickname={settings.nickname}
        onClose={
          settings.setupDone ? () => setApiSetupOpen(false) : undefined
        }
        onSave={async (apiToken, nickname) => {
          const resolved = await syncArchiveBests(apiToken, nickname)
          const next = {
            ...settings,
            apiToken,
            nickname: resolved || nickname,
            setupDone: true,
          }
          saveSettings(next)
          setSettings(next)
          setApiSetupOpen(false)
        }}
      />
    </div>
  )
}
