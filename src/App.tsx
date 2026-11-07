import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  archiveKey,
  fetchAllArchiveBests,
  lookupBest,
  resolveArchiveBest,
  type ArchiveBestMap,
} from './lib/archiveApi'
import { shouldFetchArchiveBest } from './lib/archiveRefresh'
import { AddChartModal } from './components/AddChartModal'
import { ApiSetupModal } from './components/ApiSetupModal'
import { BackupModal } from './components/BackupModal'
import { ImportLogModal } from './components/ImportLogModal'
import { AppTabs, type AppTabId } from './components/AppTabs'
import { LiveBadge } from './components/LiveBadge'
import { AiRecommendPanel } from './components/AiRecommendPanel'
import { OverviewPanel } from './components/OverviewPanel'
import { PlayPanel } from './components/PlayPanel'
import { Sidebar } from './components/Sidebar'
import {
  applyTheme,
  loadSettings,
  saveSettings,
  type ThemeMode,
} from './lib/settings'
import { pickBackupDir } from './lib/backup'
import {
  loadDrillMaxFile,
  scheduleAutoPersist,
} from './lib/autoPersist'
import { useAppData } from './hooks/useAppData'
import { useLiveBridge } from './hooks/useLiveBridge'
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
    replaceAll,
  } = useAppData()
  const { songs, status: catalogStatus } = useSongCatalog()

  const [settings, setSettings] = useState(() => loadSettings())
  const [apiSetupOpen, setApiSetupOpen] = useState(() => !loadSettings().setupDone)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [backupMsg, setBackupMsg] = useState<string | null>(null)
  const [liveEnabled, setLiveEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState<AppTabId>('overview')
  const [hydrated, setHydrated] = useState(false)
  const archiveBestsRef = useRef<ArchiveBestMap | null>(null)

  // Tauri: drillMax.json 자동 로드
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const fromFile = await loadDrillMaxFile(settings.backupDir || undefined)
      if (!cancelled && fromFile && (fromFile.charts.length > 0 || fromFile.plays.length > 0)) {
        replaceAll(fromFile)
      }
      if (!cancelled) setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
    // 최초 1회 + 폴더 변경 시
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.backupDir])

  // Tauri: drillMax.json 자동 저장 (songs.json 정렬 레이블)
  useEffect(() => {
    if (!hydrated) return
    scheduleAutoPersist(data, {
      backupDir: settings.backupDir || undefined,
      nickname: settings.nickname || undefined,
      catalog: songs,
    })
  }, [data, settings.backupDir, settings.nickname, songs, hydrated])

  const openChartTab = useCallback(
    (id: string) => {
      setSelectedId(id)
      setActiveTab('chart')
    },
    [setSelectedId],
  )

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

  /** 네트워크로 해당 곡 PB 조회·반영 (캐시 즉시 반영 후 API 갱신) */
  const refreshArchiveBest = useCallback(
    (
      chartId: string,
      title: string,
      button: LiveBridgeEvent['button'],
      difficulty: LiveBridgeEvent['difficulty'],
      nickname?: string | null,
    ) => {
      const cached = lookupBest(
        archiveBestsRef.current,
        button,
        difficulty,
        title,
      )
      if (cached != null) setArchiveBest(chartId, cached)

      void (async () => {
        const best = await resolveArchiveBest(
          title,
          button,
          difficulty,
          nickname || settings.nickname,
        )
        if (best == null) return
        setArchiveBest(chartId, best)
        const map = archiveBestsRef.current ?? new Map()
        map.set(archiveKey(button, difficulty, title), best)
        archiveBestsRef.current = map
      })()
    },
    [setArchiveBest, settings.nickname],
  )

  const onLiveEvent = useCallback(
    (ev: LiveBridgeEvent) => {
      const chartId = ingestLiveEvent(ev)
      if (!chartId) return chartId

      const cached = lookupBest(
        archiveBestsRef.current,
        ev.button,
        ev.difficulty,
        ev.title,
      )
      const chartPb =
        data.charts.find((c) => c.id === chartId)?.archiveBest ?? cached

      if (shouldFetchArchiveBest(ev.status, chartPb)) {
        refreshArchiveBest(
          chartId,
          ev.title,
          ev.button,
          ev.difficulty,
          settings.nickname,
        )
      } else if (cached != null) {
        setArchiveBest(chartId, cached)
      }
      return chartId
    },
    [
      data.charts,
      ingestLiveEvent,
      setArchiveBest,
      refreshArchiveBest,
      settings.nickname,
    ],
  )

  const { health, bridgeUp } = useLiveBridge({
    enabled: liveEnabled && settings.setupDone,
    onEvent: onLiveEvent,
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
        onSelect={openChartTab}
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
      <div className="workspace">
        <AppTabs active={activeTab} onChange={setActiveTab} />
        {activeTab === 'overview' && (
          <OverviewPanel
            data={data}
            onOpenChart={openChartTab}
            onOpenImport={() => setImportOpen(true)}
            onExport={() => {
              setBackupMsg(null)
              setBackupOpen(true)
            }}
          />
        )}
        {activeTab === 'chart' && (
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
              setBackupMsg(null)
              setBackupOpen(true)
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
        )}
        {activeTab === 'ai' && <AiRecommendPanel />}
      </div>

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
            setActiveTab('chart')
          }
        }}
        songs={songs}
        catalogStatus={catalogStatus}
        knownTitles={knownTitles}
      />
      <ImportLogModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(plays, dateYmd) => {
          const { added, needArchive } = importLogPlays(plays, dateYmd)
          for (const t of needArchive) {
            refreshArchiveBest(
              t.chartId,
              t.title,
              t.button,
              t.difficulty,
              settings.nickname,
            )
          }
          return { added }
        }}
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

      <BackupModal
        open={backupOpen}
        backupDir={settings.backupDir}
        message={backupMsg}
        onClose={() => {
          setBackupOpen(false)
          setBackupMsg(null)
        }}
        onPickFolder={() => {
          void (async () => {
            try {
              const dir = await pickBackupDir(settings.backupDir || undefined)
              if (!dir) return
              const next = { ...settings, backupDir: dir }
              saveSettings(next)
              setSettings(next)
              setBackupMsg(`자동 저장 폴더: ${dir}\\drillMax.json`)
            } catch (e) {
              setBackupMsg(
                e instanceof Error ? e.message : '폴더를 선택하지 못했습니다.',
              )
            }
          })()
        }}
      />
    </div>
  )
}
