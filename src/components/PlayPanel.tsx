import { useState } from 'react'
import type { Chart, Play } from '../types'
import { isPerfectPlay } from '../types'
import { formatChartLabel, formatDateTime } from '../lib/parseLog'
import { ProgressChart } from './ProgressChart'

interface PlayPanelProps {
  chart: Chart | null
  plays: Play[]
  highest: number | null
  latestPlay: Play | null
  onAddPlay: (
    accuracy: number,
    playedAt: string,
    maxCombo: boolean,
  ) => void
  onDeletePlay: (id: string) => void
  onOpenImport: () => void
  onExport: () => void
  onImportJson: (file: File) => void
}

function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function PlayPanel({
  chart,
  plays,
  highest,
  latestPlay,
  onAddPlay,
  onDeletePlay,
  onOpenImport,
  onExport,
  onImportJson,
}: PlayPanelProps) {
  const [accuracy, setAccuracy] = useState('')
  const [playedAt, setPlayedAt] = useState(nowLocalInput)
  const [maxCombo, setMaxCombo] = useState(false)

  if (!chart) {
    return (
      <main className="main empty-main">
        <div className="empty-hero">
          <h1>RhythmForm</h1>
          <p>
            LIVE를 켜 두면 V-ARCHIVE 캡쳐+업로드 직후 로그를 읽어
            [미갱신] 플레이까지 자동으로 기록합니다.
          </p>
          <div className="empty-actions">
            <button type="button" className="btn-primary" onClick={onOpenImport}>
              로그 붙여넣기
            </button>
            <button type="button" className="btn-ghost" onClick={onExport}>
              백업 JSON
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <header className="main-head">
        <div>
          <p className="eyebrow">
            {chart.button} {chart.difficulty}
          </p>
          <h1>{chart.title}</h1>
          <p className="main-meta">{plays.length}회 기록</p>
          <div className="scoreboard">
            <div className="score-card record">
              <span className="score-label">Highest Record</span>
              <span className="score-value mono">
                {highest != null ? `${highest.toFixed(2)}%` : '—'}
              </span>
              {chart.archiveBest != null && (
                <span className="score-sub">archive {chart.archiveBest.toFixed(2)}%</span>
              )}
            </div>
            <div className="score-card current">
              <span className="score-label">Current</span>
              <span className="score-value mono">
                {latestPlay != null ? `${latestPlay.accuracy.toFixed(2)}%` : '—'}
              </span>
              {latestPlay?.status && (
                <span className="score-sub">[{latestPlay.status}]</span>
              )}
            </div>
          </div>
        </div>
        <div className="main-actions">
          <button type="button" className="btn-ghost" onClick={onOpenImport}>
            로그 가져오기
          </button>
          <button type="button" className="btn-ghost" onClick={onExport}>
            백업
          </button>
          <label className="btn-ghost file-btn">
            복원
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportJson(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </header>

      <section className="chart-section" aria-label="Accuracy">
        <div className="chart-legend">
          <span className="legend-score">Accuracy</span>
          <span className="legend-record">Highest Record</span>
        </div>
        <ProgressChart plays={plays} highest={highest} />
      </section>

      <section className="entry-section">
        <h2>플레이 추가</h2>
        <form
          className="entry-form"
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number.parseFloat(accuracy)
            if (Number.isNaN(n)) return
            const iso = new Date(playedAt).toISOString()
            onAddPlay(n, iso, maxCombo)
            setAccuracy('')
            setMaxCombo(false)
            setPlayedAt(nowLocalInput())
          }}
        >
          <label className="field">
            <span>정확도 %</span>
            <input
              className="mono"
              inputMode="decimal"
              placeholder="99.92"
              value={accuracy}
              onChange={(e) => setAccuracy(e.target.value)}
              required
              step="0.01"
              min="0"
              max="100"
            />
          </label>
          <label className="field">
            <span>시각</span>
            <input
              className="mono"
              type="datetime-local"
              step="1"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              required
            />
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={maxCombo}
              onChange={(e) => setMaxCombo(e.target.checked)}
            />
            Max Combo
          </label>
          <button type="submit" className="btn-primary">
            기록
          </button>
        </form>
      </section>

      <section className="history-section">
        <h2>기록 목록</h2>
        {plays.length === 0 ? (
          <p className="muted">아직 없습니다.</p>
        ) : (
          <ul className="history-list">
            {[...plays].reverse().map((p) => {
              const pp = isPerfectPlay(p.accuracy, p.maxCombo)
              const mc = !pp && !!p.maxCombo
              return (
              <li key={p.id}>
                <span className="mono time">{formatDateTime(p.playedAt)}</span>
                <span
                  className={`mono acc${pp ? ' pp' : mc ? ' mc' : ''}`}
                >
                  {p.accuracy.toFixed(2)}%
                </span>
                {p.source === 'log' && <span className="badge soft">log</span>}
                {p.source === 'live' && <span className="badge soft">live</span>}
                {p.status === '미갱신' && (
                  <span className="badge soft">미갱신</span>
                )}
                {highest === p.accuracy && (
                  <span className="badge record">best</span>
                )}
                {pp && <span className="badge pp">PP</span>}
                {mc && <span className="badge mc">MC</span>}
                <button
                  type="button"
                  className="link-danger"
                  onClick={() => onDeletePlay(p.id)}
                >
                  삭제
                </button>
              </li>
              )
            })}
          </ul>
        )}
        <p className="sr-only">
          {formatChartLabel(chart.button, chart.difficulty, chart.title)}
        </p>
      </section>
    </main>
  )
}
