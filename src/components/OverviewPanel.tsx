import { useMemo, useState } from 'react'
import type { AppData, ButtonMode } from '../types'
import { DAILY_BEST_KEEP_DAYS } from '../lib/dailyBest'
import {
  buildChartOverview,
  summarizeOverview,
  type ButtonFilter,
  type ChartOverviewRow,
} from '../lib/overviewStats'
import { DailyBestCard } from './DailyBestCard'

type SortKey = 'title' | 'best' | 'plays' | 'latest' | 'pending'

interface OverviewPanelProps {
  data: AppData
  onOpenChart: (chartId: string) => void
  onOpenImport: () => void
  onExport: () => void
}

const BUTTONS: ButtonFilter[] = ['ALL', '4B', '5B', '6B', '8B']

function sortRows(rows: ChartOverviewRow[], key: SortKey): ChartOverviewRow[] {
  const copy = rows.slice()
  copy.sort((a, b) => {
    switch (key) {
      case 'best':
        return (b.highest ?? -1) - (a.highest ?? -1)
      case 'plays':
        return b.playCount - a.playCount
      case 'pending':
        return b.pendingCount - a.pendingCount
      case 'latest': {
        const at = a.latest ? new Date(a.latest.playedAt).getTime() : 0
        const bt = b.latest ? new Date(b.latest.playedAt).getTime() : 0
        return bt - at
      }
      case 'title':
      default:
        return `${a.chart.button}${a.chart.difficulty}${a.chart.title}`.localeCompare(
          `${b.chart.button}${b.chart.difficulty}${b.chart.title}`,
          'ko',
        )
    }
  })
  return copy
}

export function OverviewPanel({
  data,
  onOpenChart,
  onOpenImport,
  onExport,
}: OverviewPanelProps) {
  const [button, setButton] = useState<ButtonFilter>('ALL')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('latest')

  const allRows = useMemo(() => buildChartOverview(data), [data])
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

  const filteredChartIds = useMemo(
    () => new Set(filtered.map((r) => r.chart.id)),
    [filtered],
  )

  const summary = useMemo(
    () => summarizeOverview(filtered, data.plays, filteredChartIds),
    [filtered, data.plays, filteredChartIds],
  )
  const rows = useMemo(() => sortRows(filtered, sortKey), [filtered, sortKey])

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
            <option value="latest">최근 플레이</option>
            <option value="best">Best 높은 순</option>
            <option value="plays">플레이 많은 순</option>
            <option value="pending">미갱신 많은 순</option>
            <option value="title">이름</option>
          </select>
        </label>
      </section>

      <section className="daily-best-list" aria-label="Daily Best">
        {rows.length === 0 ? (
          <p className="muted overview-empty">
            {data.charts.length === 0
              ? '아직 차트가 없습니다. LIVE·로그·차트 추가로 기록을 쌓아 보세요.'
              : '필터에 맞는 차트가 없습니다.'}
          </p>
        ) : (
          rows.map((r) => (
            <DailyBestCard
              key={r.chart.id}
              chart={r.chart}
              latest={r.latest}
              highest={r.highest}
              dailyBests={data.dailyBests}
              onOpen={() => onOpenChart(r.chart.id)}
            />
          ))
        )}
      </section>
    </main>
  )
}
