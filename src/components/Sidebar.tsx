import { ask } from '@tauri-apps/plugin-dialog'
import { useState, type ReactNode } from 'react'
import { isTauri } from '../lib/bridgeUrl'
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand-row">
          <img className="brand-icon" src="./favicon.svg" alt="" />
          <div>
            <span className="brand">DrillMAX</span>
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
                data-button={c.button}
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
                  disabled={confirmingId != null}
                  onClick={() => {
                    if (confirmingId) return
                    const id = c.id
                    const message = `"${c.title}" 차트와 기록을 모두 삭제할까요?`
                    setConfirmingId(id)
                    const pending = isTauri()
                      ? ask(message, {
                          title: '차트 삭제',
                          kind: 'warning',
                          okLabel: '삭제',
                          cancelLabel: '취소',
                        })
                      : Promise.resolve(window.confirm(message))
                    void pending
                      .then((ok) => {
                        if (ok) onDelete(id)
                      })
                      .finally(() => setConfirmingId(null))
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
