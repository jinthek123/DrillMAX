import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Chart, DailyBest, Play } from '../types'
import { isPerfectPlay } from '../types'
import { formatDateTime } from '../lib/parseLog'
import { DailyBestSparkline } from './DailyBestSparkline'

interface DailyBestCardProps {
  chart: Chart
  latest: Play | null
  highest: number | null
  dailyBests: DailyBest[] | undefined
  onOpen: () => void
  lifted?: boolean
  sliding?: boolean
  shiftY?: number
  onGripPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onGripPointerMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onGripPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onGripPointerCancel?: (event: ReactPointerEvent<HTMLButtonElement>) => void
}

export function DailyBestCard({
  chart,
  latest,
  highest,
  dailyBests,
  onOpen,
  lifted = false,
  sliding = false,
  shiftY = 0,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
  onGripPointerCancel,
}: DailyBestCardProps) {
  const pp = latest != null && isPerfectPlay(latest.accuracy, latest.maxCombo)
  const mc = latest != null && !pp && !!latest.maxCombo

  return (
    <article
      className={`daily-best-card${lifted ? ' is-lifted' : ''}${sliding ? ' is-shifting' : ''}`}
      data-chart-id={chart.id}
      style={lifted || sliding ? { transform: `translateY(${shiftY}px)` } : undefined}
    >
      <button
        type="button"
        className="order-handle"
        aria-label="순서 변경"
        title="끌어서 순서 변경"
        onClick={(event) => event.preventDefault()}
        onPointerDown={onGripPointerDown}
        onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerUp}
        onPointerCancel={onGripPointerCancel}
      >
        <svg className="order-grip" viewBox="0 0 14 18" aria-hidden>
          {[0, 1, 2].flatMap((row) =>
            [0, 1].map((col) => (
              <circle
                key={`${row}-${col}`}
                cx={3 + col * 6}
                cy={3 + row * 6}
                r="1.45"
                fill="currentColor"
              />
            )),
          )}
        </svg>
      </button>
      <button type="button" className="daily-best-card-body" onClick={onOpen}>
      <div className="daily-best-card-head">
        <span className="daily-best-card-title">
          <span className={`button-tint-${chart.button}`}>
            {chart.button} {chart.difficulty}
          </span>
          <span className="daily-best-card-sep">—</span>
          <span>{chart.title}</span>
        </span>
        <span className="daily-best-card-meta mono">
          {latest ? formatDateTime(latest.playedAt) : '—'}
        </span>
        <span
          className={`daily-best-card-score mono${pp ? ' pp' : mc ? ' mc' : ''}`}
        >
          {latest != null ? `${latest.accuracy.toFixed(2)}%` : '—'}
        </span>
        <span className="daily-best-card-badges">
          {latest?.source === 'live' && (
            <span className="badge soft">LIVE</span>
          )}
          {latest?.status === '미갱신' && (
            <span className="badge soft">미갱신</span>
          )}
          {pp && <span className="badge pp">PP</span>}
          {mc && <span className="badge mc">MC</span>}
        </span>
      </div>
      <DailyBestSparkline
        chartId={chart.id}
        dailyBests={dailyBests}
        highest={highest}
      />
      </button>
    </article>
  )
}
