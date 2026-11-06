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
import type { DailyBest } from '../types'
import {
  buildYScale,
  chartAxisTick,
  chartTooltipStyle,
  formatYTick,
} from '../lib/chartScale'
import {
  DAILY_BEST_KEEP_DAYS,
  dailyBestSeriesForChart,
} from '../lib/dailyBest'
import { HighestReferenceLine } from './ShortHighestMark'

interface DailyBestSparklineProps {
  chartId: string
  dailyBests: DailyBest[] | undefined
  highest?: number | null
}

function SparkDot({
  cx,
  cy,
  payload,
}: {
  cx?: number
  cy?: number
  payload?: { accuracy: number | null }
}) {
  if (cx == null || cy == null || payload?.accuracy == null) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill="var(--score-line)"
      stroke="var(--panel)"
      strokeWidth={1.5}
    />
  )
}

function DailyBestSparklineInner({
  chartId,
  dailyBests,
  highest,
}: DailyBestSparklineProps) {
  const data = useMemo(
    () => dailyBestSeriesForChart(dailyBests, chartId, DAILY_BEST_KEEP_DAYS),
    [dailyBests, chartId],
  )

  const pointCount = useMemo(
    () => data.filter((d) => d.accuracy != null).length,
    [data],
  )

  const scale = useMemo(() => {
    const vals = data
      .map((d) => d.accuracy)
      .filter((v): v is number => v != null)
    if (vals.length === 0) {
      return { yMin: 0, yMax: 100, ticks: undefined, fine: false }
    }
    return buildYScale(Math.min(...vals), Math.max(...vals, highest ?? 0))
  }, [data, highest])

  const xTicks = useMemo(
    () =>
      data
        .filter((d) => {
          const day = Number(d.date.slice(8, 10))
          return Number.isFinite(day) && day % 2 === 0
        })
        .map((d) => d.label),
    [data],
  )

  if (pointCount === 0) {
    return <div className="daily-spark-empty" aria-hidden />
  }

  return (
    <div className="daily-spark">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--grid)" strokeDasharray="3 6" />
          <XAxis
            dataKey="label"
            type="category"
            padding={{ left: 4, right: 4 }}
            ticks={xTicks}
            interval={0}
            minTickGap={20}
            tick={{ ...chartAxisTick, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
          />
          <YAxis
            domain={[scale.yMin, scale.yMax]}
            ticks={scale.ticks}
            tickFormatter={(v: number) => formatYTick(v, scale.fine)}
            tick={{ ...chartAxisTick, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
            width={scale.fine ? 48 : 42}
          />
          <Tooltip
            contentStyle={{ ...chartTooltipStyle, fontSize: 12 }}
            formatter={(value) =>
              value == null
                ? ['—', 'Daily Best']
                : [`${Number(value).toFixed(2)}%`, 'Daily Best']
            }
            labelFormatter={(label) => String(label)}
          />
          {highest != null && <HighestReferenceLine highest={highest} />}
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="var(--score-line)"
            strokeWidth={2.25}
            connectNulls={false}
            dot={(props) => (
              <SparkDot
                cx={props.cx}
                cy={props.cy}
                payload={props.payload as { accuracy: number | null }}
              />
            )}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export const DailyBestSparkline = memo(DailyBestSparklineInner)
