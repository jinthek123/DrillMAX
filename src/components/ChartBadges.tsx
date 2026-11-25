import { difficultyTone } from '../lib/difficultyTone'
import type { Difficulty } from '../types'

function difficultyLabel(difficulty: string, level?: number) {
  if (typeof level !== 'number' || !Number.isFinite(level)) return difficulty
  return `${difficulty}${Math.trunc(level)}`
}

export function ChartBadges({
  button,
  difficulty,
  level,
}: {
  button: string
  difficulty: string
  level?: number
}) {
  return (
    <span className="chart-badges">
      <span className="chart-badge" data-button={button}>
        {button}
      </span>
      <span
        className="chart-badge"
        data-tone={difficultyTone(difficulty as Difficulty, level)}
      >
        {difficultyLabel(difficulty, level)}
      </span>
    </span>
  )
}
