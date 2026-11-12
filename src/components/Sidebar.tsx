import { ask } from '@tauri-apps/plugin-dialog'
import { useState, type ReactNode } from 'react'
import { isTauri } from '../lib/bridgeUrl'
import { difficultyTone } from '../lib/difficultyTone'
import type { ThemeMode } from '../lib/settings'
import { findSongExact, type SongIndex } from '../lib/songCatalog'
import type { Chart } from '../types'
import { ThemeToggle } from './ThemeToggle'

interface SidebarProps {
  charts: Chart[]
  songIndex: SongIndex
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
  songIndex,
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
              <div className={`chart-item${active ? ' active' : ''}`}>
                <button
                  type="button"
                  className="chart-item-main"
                  onClick={() => onSelect(c.id)}
                >
                  <span className="chart-badges">
                    <span className="chart-badge" data-button={c.button}>
                      {c.button}
                    </span>
                    <span
                      className="chart-badge"
                      data-tone={difficultyTone(
                        c.difficulty,
                        findSongExact(songIndex, c.title)?.patterns[c.button]?.[
                          c.difficulty
                        ]?.level,
                      )}
                    >
                      {c.difficulty}
                    </span>
                  </span>
                  <span className="chart-item-label">{c.title}</span>
                  <span className="chart-item-meta">
                    {playCounts[c.id] ?? 0}회
                  </span>
                </button>
              {active && (
                <button
                  type="button"
                  className="chart-delete"
                  aria-label="삭제"
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
                  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                    <path
                      d="M9 4.5h6M5.5 7.5h13M8.2 7.5l.7 11.2h6.2l.7-11.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.2 11v5M13.8 11v5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
