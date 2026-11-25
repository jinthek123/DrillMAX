import { useCallback, useEffect, useMemo, useState } from 'react'
import { lookupBest } from './lib/archiveApi'
import { shouldFetchArchiveBest } from './lib/archiveRefresh'
import { compareChartOrder } from './lib/chartIdentity'
import { AddChartModal } from './components/AddChartModal'
import { ApiSetupModal } from './components/ApiSetupModal'
import { BackupModal } from './components/BackupModal'
import { ImportLogModal } from './components/ImportLogModal'
import { AppTabs, type AppTabId } from './components/AppTabs'
import { InfoPanel } from './components/InfoPanel'
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
import { scheduleAutoPersist } from './lib/autoPersist'
import { useAppData } from './hooks/useAppData'
import { useArchiveBests } from './hooks/useArchiveBests'
import { useLiveBridge } from './hooks/useLiveBridge'
import { useRecordFile } from './hooks/useRecordFile'
import { useSongCatalog } from './hooks/useSongCatalog'
import { chartFloorName, chartLevel } from './lib/songCatalog'
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
    reorderCharts,
    addPlay,
    deletePlay,
    importLogPlays,
    ingestLiveEvent,
    setArchiveBest,
    applyArchiveBests,
    importFromJsonText,
    replaceAll,
  } = useAppData()
  const { songs, index: songIndex, status: catalogStatus } = useSongCatalog()

  const [settings, setSettings] = useState(() => loadSettings())
  const [apiSetupOpen, setApiSetupOpen] = useState(() => !loadSettings().setupDone)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [backupMsg, setBackupMsg] = useState<string | null>(null)
  const [liveEnabled, setLiveEnabled] = useState(true)
  const [recording, setRecording] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTabId>('overview')
  const hydrated = useRecordFile(settings.backupDir, replaceAll)
  const { archiveBestsRef, archivePendingRef, syncArchiveBests, refreshArchiveBest } =
    useArchiveBests({
      setupDone: settings.setupDone,
      apiToken: settings.apiToken,
      nickname: settings.nickname,
      setArchiveBest,
      applyArchiveBests,
    })

  // Tauri: drillMax.json 자동 저장 (songs.json 정렬 레이블)
  useEffect(() => {
    if (!hydrated) return
    scheduleAutoPersist(data, {
      backupDir: settings.backupDir || undefined,
      nickname: settings.nickname || undefined,
      catalog: songs,
    })
  }, [data, settings.backupDir, settings.nickname, songs, hydrated])

  const openBackup = useCallback(() => {
    setBackupMsg(null)
    setBackupOpen(true)
  }, [])

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

  const knownTitles = useMemo(
    () => [...new Set(data.charts.map((c) => c.title))],
    [data.charts],
  )

  const onLiveEvent = useCallback(
    (ev: LiveBridgeEvent) => {
      const { chartId, archiveBest } = ingestLiveEvent(ev)
      if (!chartId) return ''
      // 차트에 PB가 아직 없을 때만. 캐시에 있어도 차트 자신은 비어 있으면 조회한다.
      if (
        shouldFetchArchiveBest(ev.status, archiveBest) &&
        !archivePendingRef.current.has(chartId)
      ) {
        archivePendingRef.current.add(chartId)
        void refreshArchiveBest(
          chartId,
          ev.title,
          ev.button,
          ev.difficulty,
          settings.nickname,
        ).finally(() => {
          archivePendingRef.current.delete(chartId)
        })
      }
      return chartId
    },
    [ingestLiveEvent, refreshArchiveBest, settings.nickname],
  )

  const { health, bridgeUp } = useLiveBridge({
    enabled: liveEnabled && settings.setupDone,
    recording,
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
      [...data.charts].sort(compareChartOrder),
    [data.charts],
  )

  return (
    <div className="app-shell">
      <div className="bg-grid" aria-hidden />
      <Sidebar
        charts={sortedCharts}
        songIndex={songIndex}
        selectedId={selectedId}
        playCounts={playCounts}
        onSelect={setSelectedId}
        onAdd={() => setAddOpen(true)}
        onDelete={deleteChart}
        onReorder={reorderCharts}
        onOpenApiSettings={() => setApiSetupOpen(true)}
        theme={settings.theme}
        onThemeChange={setTheme}
        liveSlot={
          <LiveBadge
            enabled={liveEnabled}
            onToggle={() => setLiveEnabled((v) => !v)}
            recording={recording}
            onRecordingChange={setRecording}
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
            songIndex={songIndex}
            onOpenChart={openChartTab}
            selectedId={selectedId}
            onOpenImport={() => setImportOpen(true)}
            onExport={openBackup}
            onReorder={reorderCharts}
          />
        )}
        {activeTab === 'chart' && (
          <PlayPanel
            chart={selectedChart}
            level={selectedChart ? chartLevel(songIndex, selectedChart) : undefined}
            floorName={selectedChart ? chartFloorName(songIndex, selectedChart) : undefined}
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
            onExport={openBackup}
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
        {activeTab === 'ai' && (
          <AiRecommendPanel
            charts={sortedCharts}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
        {activeTab === 'info' && <InfoPanel />}
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
        songIndex={songIndex}
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
