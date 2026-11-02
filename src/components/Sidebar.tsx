import type { ReactNode } from 'react'
import type { ThemeMode } from '../lib/settings'
import type { Chart } from '../types'
import { formatChartLabel } from '../lib/parseLog'
import { ThemeToggle } from './ThemeToggle'

interface SidebarProps {
  charts: Chart[]
  selectedId: string | null
  playCounts: Record<string, number>
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onOpenApiSettings?: () => void
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  liveSlot?: ReactNode
}

export function Sidebar({
  charts,
  selectedId,
  playCounts,
  onSelect,
  onAdd,
  onDelete,
  onOpenApiSettings,
  theme,
  onThemeChange,
  liveSlot,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand-row">
          <img className="brand-icon" src="./icon.png" alt="" />
          <div>
            <span className="brand">RhythmForm</span>
            <p className="brand-sub">for DJMAX RESPECT V</p>
          </div>
        </div>
        {liveSlot}
        <ThemeToggle theme={theme} onChange={onThemeChange} />
      </div>

      <button type="button" className="btn-primary sidebar-add" onClick={onAdd}>
        + 차트 추가
      </button>
      {onOpenApiSettings && (
        <button
          type="button"
          className="btn-ghost sidebar-add"
          onClick={onOpenApiSettings}
        >
          API 키 설정
        </button>
      )}

      <ul className="chart-list">
        {charts.length === 0 && (
          <li className="chart-empty">아직 차트가 없습니다</li>
        )}
        {charts.map((c) => {
          const active = c.id === selectedId
          return (
            <li key={c.id}>
              <button
                type="button"
                className={`chart-item${active ? ' active' : ''}`}
                onClick={() => onSelect(c.id)}
              >
                <span className="chart-item-label">
                  {formatChartLabel(c.button, c.difficulty, c.title)}
                </span>
                <span className="chart-item-meta">
                  {playCounts[c.id] ?? 0}회
                </span>
              </button>
              {active && (
                <button
                  type="button"
                  className="chart-delete"
                  title="차트 삭제"
                  onClick={() => {
                    if (
                      confirm(
                        `"${c.title}" 차트와 기록을 모두 삭제할까요?`,
                      )
                    ) {
                      onDelete(c.id)
                    }
                  }}
                >
                  삭제
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
