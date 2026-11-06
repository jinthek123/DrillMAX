import { memo, useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Play } from '../types'
import { isPerfectPlay } from '../types'
import {
  buildYScale,
  chartAxisTick,
  chartTooltipStyle,
  formatYTick,
} from '../lib/chartScale'
import { formatTimeAxis } from '../lib/parseLog'
import { HighestReferenceLine } from './ShortHighestMark'

interface ProgressChartProps {
  plays: Play[]
  highest: number | null
}

interface Point {
  time: string
  accuracy: number
  full: string
  maxCombo?: boolean
  perfectPlay?: boolean
}

function dotFill(payload?: Point): string {
  if (!payload) return 'var(--score-dot)'
  if (payload.perfectPlay) return 'var(--pp)'
  if (payload.maxCombo) return 'var(--mc)'
  return 'var(--score-dot)'
}

function ChartDot({
  cx,
  cy,
  payload,
  active = false,
}: {
  cx?: number
  cy?: number
  payload?: Point
  active?: boolean
}) {
  if (cx == null || cy == null) return null
  const fill = dotFill(payload)
  const r = active ? 7 : 5.5
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke="var(--chart-bg)"
      strokeWidth={2}
    />
  )
}

function ProgressChartInner({ plays, highest }: ProgressChartProps) {
  const data: Point[] = useMemo(
    () =>
      plays.map((p) => ({
        time: formatTimeAxis(p.playedAt),
        accuracy: p.accuracy,
        full: p.playedAt,
        maxCombo: p.maxCombo,
        perfectPlay: isPerfectPlay(p.accuracy, p.maxCombo),
      })),
    [plays],
  )

  const scale = useMemo(() => {
    if (data.length === 0) {
      return { yMin: 0, yMax: 100, ticks: undefined, fine: false }
    }
    const values = data.map((d) => d.accuracy)
    return buildYScale(
      Math.min(...values),
      Math.max(...values, highest ?? 0),
    )
  }, [data, highest])

  if (data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>기록이 없습니다</p>
        <span>오른쪽에서 플레이를 추가하거나 로그를 붙여넣으세요</span>
      </div>
    )
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 36, left: 12, bottom: 12 }}
        >
          <CartesianGrid stroke="var(--grid)" strokeDasharray="3 6" />
          <XAxis
            dataKey="time"
            padding={{ left: 28, right: 28 }}
            tick={{ ...chartAxisTick, fontSize: 13 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
          />
          <YAxis
            domain={[scale.yMin, scale.yMax]}
            ticks={scale.ticks}
            tickFormatter={(v: number) => formatYTick(v, scale.fine)}
            tick={{ ...chartAxisTick, fontSize: 13 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
            width={scale.fine ? 52 : 48}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value, _name, item) => {
              const point = item?.payload as Point | undefined
              const tag = point?.perfectPlay
                ? ' · PP'
                : point?.maxCombo
                  ? ' · MC'
                  : ''
              return [`${Number(value).toFixed(2)}%${tag}`, 'Accuracy']
            }}
            labelFormatter={(label, payload) => {
              const full = payload?.[0]?.payload?.full as string | undefined
              if (!full) return String(label)
              return new Date(full).toLocaleString('ko-KR')
            }}
          />
          {highest != null && <HighestReferenceLine highest={highest} />}
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="var(--score-line)"
            strokeWidth={2.25}
            dot={(props) => (
              <ChartDot
                cx={props.cx}
                cy={props.cy}
                payload={props.payload as Point}
              />
            )}
            activeDot={(props) => (
              <ChartDot
                cx={props.cx}
                cy={props.cy}
                payload={props.payload as Point}
                active
              />
            )}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export const ProgressChart = memo(ProgressChartInner)
