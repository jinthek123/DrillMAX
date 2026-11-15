import { difficultyTone } from '../lib/difficultyTone'
import type { Difficulty } from '../types'

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
        {difficulty}
      </span>
    </span>
  )
}
