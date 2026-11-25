import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AppData, ButtonMode } from '../types'
import { DAILY_BEST_KEEP_DAYS } from '../lib/dailyBest'
import {
  buildChartOverview,
  summarizeOverview,
  type ButtonFilter,
  type ChartOverviewRow,
} from '../lib/overviewStats'
import { compareChartOrder } from '../lib/chartIdentity'
import { chartFloorName, type SongIndex } from '../lib/songCatalog'
import { DailyBestCard } from './DailyBestCard'
import { cardShift, useListReorder } from '../hooks/useListReorder'

type SortKey =
  | 'manual'
  | 'dashboard'
  | 'title'
  | 'oldest'
  | 'plays'
  | 'latest'
  | 'pending'
  | 'gainDesc'
  | 'gainAsc'

interface OverviewPanelProps {
  data: AppData
  songIndex: SongIndex
  onOpenChart: (chartId: string) => void
  selectedId?: string | null
  onOpenImport: () => void
  onExport: () => void
  onReorder: (orderedIds: string[]) => void
}

const BUTTONS: ButtonFilter[] = ['ALL', '4B', '5B', '6B', '8B']

function sortRows(rows: ChartOverviewRow[], key: SortKey): ChartOverviewRow[] {
  const copy = rows.slice()
  copy.sort((a, b) => {
    switch (key) {
      case 'plays':
        return b.playCount - a.playCount
      case 'pending':
        return b.pendingCount - a.pendingCount
      case 'gainDesc':
        return b.recordGain - a.recordGain
      case 'gainAsc':
        return a.recordGain - b.recordGain
      case 'latest':
        return (b.latestAt ?? 0) - (a.latestAt ?? 0)
      case 'oldest':
        return (
          (a.latestAt ?? Number.POSITIVE_INFINITY) -
          (b.latestAt ?? Number.POSITIVE_INFINITY)
        )
      case 'manual':
      case 'dashboard':
        return compareChartOrder(a.chart, b.chart)
      case 'title':
      default:
        return (
          a.chart.button.localeCompare(b.chart.button) ||
          a.chart.difficulty.localeCompare(b.chart.difficulty) ||
          a.chart.title.localeCompare(b.chart.title, 'ko')
        )
    }
  })
  return copy
}

export function OverviewPanel({
  data,
  songIndex,
  onOpenChart,
  selectedId = null,
  onOpenImport,
  onExport,
  onReorder,
}: OverviewPanelProps) {
  const [button, setButton] = useState<ButtonFilter>('ALL')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('latest')

  const allRows = useMemo(() => buildChartOverview(data), [data])
  const dailyByChart = useMemo(() => {
    const map = new Map<string, NonNullable<AppData['dailyBests']>>()
    for (const row of data.dailyBests ?? []) {
      const list = map.get(row.chartId)
      if (list) list.push(row)
      else map.set(row.chartId, [row])
    }
    return map
  }, [data.dailyBests])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter((r) => {
      if (button !== 'ALL' && r.chart.button !== (button as ButtonMode)) {
        return false
      }
      if (!q) return true
      return r.chart.title.toLowerCase().includes(q)
    })
  }, [allRows, button, query])

  const summary = useMemo(() => summarizeOverview(filtered), [filtered])
  const rows = useMemo(() => sortRows(filtered, sortKey), [filtered, sortKey])
  const sawSelection = useRef(false)
  useEffect(() => {
    if (!sawSelection.current) {
      sawSelection.current = true
      return
    }
    if (!selectedId) return
    const node = document.querySelector<HTMLElement>(
      `.daily-best-list [data-chart-id="${CSS.escape(selectedId)}"]`,
    )
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  const { drag, setListNode, beginDrag, moveDrag, endDrag } = useListReorder(
    rows.map((row) => row.chart.id),
    12,
    (orderedIds) => {
      onReorder(orderedIds)
      setSortKey((key) => (key === 'dashboard' ? 'dashboard' : 'manual'))
    },
  )

  return (
    <main className="main overview-main">
      <header className="main-head">
        <div>
          <p className="eyebrow">Tracking</p>
          <h1>전체 성과</h1>
          <p className="main-meta">
            월간 일 최고기록(Daily Best) 그래프 · 최근 {DAILY_BEST_KEEP_DAYS}일
          </p>
        </div>
        <div className="main-actions">
          <button type="button" className="btn-ghost" onClick={onOpenImport}>
            로그 가져오기
          </button>
          <button type="button" className="btn-ghost" onClick={onExport}>
            데이터 폴더
          </button>
        </div>
      </header>

      <section className="overview-kpis" aria-label="분류">
        <div className="overview-kpi">
          <span className="score-label">차트</span>
          <span className="score-value mono">{summary.chartCount}</span>
        </div>
        <div className="overview-kpi">
          <span className="score-label">플레이</span>
          <span className="score-value mono">{summary.playCount}</span>
        </div>
        <div className="overview-kpi accent-pp">
          <span className="score-label">PP</span>
          <span className="score-value mono">{summary.ppCount}</span>
        </div>
        <div className="overview-kpi accent-mc">
          <span className="score-label">MC</span>
          <span className="score-value mono">{summary.mcCount}</span>
        </div>
        <div className="overview-kpi accent-999">
          <span className="score-label">99.9</span>
          <span className="score-value mono">{summary.acc999Count}</span>
        </div>
        <div className="overview-kpi accent-998">
          <span className="score-label">99.8</span>
          <span className="score-value mono">{summary.acc998Count}</span>
        </div>
      </section>

      <section className="overview-toolbar" aria-label="필터">
        <div className="overview-filters">
          {BUTTONS.map((b) => (
            <button
              key={b}
              type="button"
              className={`filter-chip${button === b ? ' active' : ''}`}
              data-button={b === 'ALL' ? undefined : b}
              onClick={() => setButton(b)}
            >
              {b === 'ALL' ? '전체' : b}
            </button>
          ))}
        </div>
        <label className="overview-search field">
          <span className="sr-only">곡 검색</span>
          <input
            type="search"
            placeholder="곡 제목 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="overview-sort field">
          <span>정렬</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="manual">사용자 지정 순서</option>
            <option value="dashboard">대시보드 순서</option>
            <option value="latest">최근 플레이</option>
            <option value="oldest">가장 오래된 플레이</option>
            <option value="plays">플레이 많은 순</option>
            <option value="pending">미갱신 많은 순</option>
            <option value="gainDesc">기록 갱신 폭 높은 순</option>
            <option value="gainAsc">기록 갱신 폭 낮은 순</option>
            <option value="title">이름</option>
          </select>
        </label>
      </section>

      <section
        ref={setListNode}
        className={`daily-best-list${drag ? ' is-reordering' : ''}`}
        aria-label="Daily Best"
      >
        {rows.length === 0 ? (
          <p className="muted overview-empty">
            {data.charts.length === 0
              ? '아직 차트가 없습니다. LIVE·로그·차트 추가로 기록을 쌓아 보세요.'
              : '필터에 맞는 차트가 없습니다.'}
          </p>
        ) : (
          rows.map((r, index) => (
            <DailyBestCard
              key={r.chart.id}
              chart={r.chart}
              floorName={chartFloorName(songIndex, r.chart)}
              latest={r.latest}
              highest={r.highest}
              dailyBests={dailyByChart.get(r.chart.id)}
              lifted={drag?.id === r.chart.id}
              sliding={drag != null && drag.id !== r.chart.id}
              shiftY={cardShift(index, drag)}
              selected={r.chart.id === selectedId}
              onOpen={() => onOpenChart(r.chart.id)}
              onGripPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) =>
                beginDrag(event, r.chart.id)
              }
              onGripPointerMove={moveDrag}
              onGripPointerUp={() => endDrag(true)}
              onGripPointerCancel={() => endDrag(false)}
            />
          ))
        )}
      </section>
    </main>
  )
}
