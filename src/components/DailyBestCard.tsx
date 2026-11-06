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
}

export function DailyBestCard({
  chart,
  latest,
  highest,
  dailyBests,
  onOpen,
}: DailyBestCardProps) {
  const pp = latest != null && isPerfectPlay(latest.accuracy, latest.maxCombo)
  const mc = latest != null && !pp && !!latest.maxCombo

  return (
    <button type="button" className="daily-best-card" onClick={onOpen}>
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
  )
}
