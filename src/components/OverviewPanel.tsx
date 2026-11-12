import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AppData, ButtonMode } from '../types'
import { DAILY_BEST_KEEP_DAYS } from '../lib/dailyBest'
import {
  buildChartOverview,
  summarizeOverview,
  type ButtonFilter,
  type ChartOverviewRow,
} from '../lib/overviewStats'
import { compareChartOrder } from '../lib/chartIdentity'
import { DailyBestCard } from './DailyBestCard'

type SortKey = 'manual' | 'title' | 'best' | 'plays' | 'latest' | 'pending'

interface OverviewPanelProps {
  data: AppData
  onOpenChart: (chartId: string) => void
  onOpenImport: () => void
  onExport: () => void
  onReorder: (orderedIds: string[]) => void
}

const BUTTONS: ButtonFilter[] = ['ALL', '4B', '5B', '6B', '8B']
const LIST_GAP = 12

interface RowDrag {
  id: string
  from: number
  to: number
  startY: number
  dy: number
  slot: number
  tops: number[]
  heights: number[]
}

function nearestIndex(clientY: number, tops: number[], heights: number[]) {
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < tops.length; i++) {
    const mid = tops[i] + heights[i] / 2
    const dist = Math.abs(clientY - mid)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

function cardShift(index: number, drag: RowDrag | null) {
  if (!drag) return 0
  if (index === drag.from) return drag.dy
  if (drag.from < drag.to && index > drag.from && index <= drag.to) {
    return -drag.slot
  }
  if (drag.to < drag.from && index >= drag.to && index < drag.from) {
    return drag.slot
  }
  return 0
}

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
      case 'manual':
        return compareChartOrder(a.chart, b.chart)
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
  onReorder,
}: OverviewPanelProps) {
  const [button, setButton] = useState<ButtonFilter>('ALL')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('latest')
  const [drag, setDrag] = useState<RowDrag | null>(null)
  const listRef = useRef<HTMLElement>(null)
  const dragRef = useRef<RowDrag | null>(null)
  const flipFrom = useRef<Map<string, number> | null>(null)

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

  const filteredChartIds = useMemo(
    () => new Set(filtered.map((r) => r.chart.id)),
    [filtered],
  )

  const summary = useMemo(
    () => summarizeOverview(filtered, data.plays, filteredChartIds),
    [filtered, data.plays, filteredChartIds],
  )
  const rows = useMemo(() => sortRows(filtered, sortKey), [filtered, sortKey])

  useLayoutEffect(() => {
    const from = flipFrom.current
    const list = listRef.current
    if (!from || !list) return
    flipFrom.current = null
    list.querySelectorAll<HTMLElement>('[data-chart-id]').forEach((node) => {
      const id = node.dataset.chartId
      if (!id) return
      const before = from.get(id)
      if (before == null) return
      const dy = before - node.getBoundingClientRect().top
      if (Math.abs(dy) < 1) return
      node.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: 'none' }],
        { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      )
    })
  }, [rows])

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return
    const list = listRef.current
    if (!list) return
    const cards = [...list.querySelectorAll<HTMLElement>('[data-chart-id]')]
    const from = cards.findIndex((node) => node.dataset.chartId === id)
    if (from < 0) return
    const rects = cards.map((node) => node.getBoundingClientRect())
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* 캡처할 포인터가 없으면 버튼 위 이동만 따라간다 */
    }
    const next: RowDrag = {
      id,
      from,
      to: from,
      startY: event.clientY,
      dy: 0,
      slot: rects[from].height + LIST_GAP,
      tops: rects.map((rect) => rect.top),
      heights: rects.map((rect) => rect.height),
    }
    dragRef.current = next
    setDrag(next)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const prev = dragRef.current
    if (!prev) return
    const to = nearestIndex(event.clientY, prev.tops, prev.heights)
    const dy = event.clientY - prev.startY
    if (to === prev.to && dy === prev.dy) return
    const next = { ...prev, to, dy }
    dragRef.current = next
    setDrag(next)
  }

  const endDrag = (commit: boolean) => {
    const current = dragRef.current
    dragRef.current = null
    const list = listRef.current
    if (commit && current && current.to !== current.from && list) {
      const tops = new Map<string, number>()
      list.querySelectorAll<HTMLElement>('[data-chart-id]').forEach((node) => {
        const id = node.dataset.chartId
        if (id) tops.set(id, node.getBoundingClientRect().top)
      })
      flipFrom.current = tops
      const ids = rows.map((row) => row.chart.id)
      const next = ids.slice()
      const [moved] = next.splice(current.from, 1)
      next.splice(current.to, 0, moved)
      onReorder(next)
      setSortKey('manual')
    }
    setDrag(null)
  }

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
            <option value="manual">내 순서</option>
            <option value="latest">최근 플레이</option>
            <option value="best">Best 높은 순</option>
            <option value="plays">플레이 많은 순</option>
            <option value="pending">미갱신 많은 순</option>
            <option value="title">이름</option>
          </select>
        </label>
      </section>

      <section
        ref={listRef}
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
              latest={r.latest}
              highest={r.highest}
              dailyBests={dailyByChart.get(r.chart.id)}
              lifted={drag?.id === r.chart.id}
              sliding={drag != null && drag.id !== r.chart.id}
              shiftY={cardShift(index, drag)}
              onGripPointerDown={(event) => beginDrag(event, r.chart.id)}
              onGripPointerMove={moveDrag}
              onGripPointerUp={() => endDrag(true)}
              onGripPointerCancel={() => endDrag(false)}
              onOpen={() => onOpenChart(r.chart.id)}
            />
          ))
        )}
      </section>
    </main>
  )
}
