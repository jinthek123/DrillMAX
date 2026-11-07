import { memo, useMemo } from 'react'
import {
  CartesianGrid,
  DefaultZIndexes,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Play } from '../types'
import {
  EMPTY_Y_SCALE,
  buildYScale,
  chartAxisTick,
  chartTooltipStyle,
  formatYTick,
} from '../lib/chartScale'
import {
  buildProgressPoints,
  type ProgressPoint,
} from '../lib/progressChartData'
import { HighestReferenceLine } from './ShortHighestMark'

interface ProgressChartProps {
  plays: Play[]
  highest: number | null
}

function dotFill(payload?: ProgressPoint): string {
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
  payload?: ProgressPoint
  active?: boolean
}) {
  if (cx == null || cy == null || payload?.accuracy == null) return null
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

function AxisTick({
  x,
  y,
  point,
}: {
  x: number
  y: number
  point: ProgressPoint
}) {
  return (
    <text
      x={x}
      y={y}
      dy={14}
      textAnchor="middle"
      fill={point.dayBreak ? 'var(--accent)' : chartAxisTick.fill}
      fontSize={12}
      fontFamily={chartAxisTick.fontFamily}
      fontWeight={point.dayBreak ? 700 : 400}
    >
      {point.label}
    </text>
  )
}

function ProgressChartInner({ plays, highest }: ProgressChartProps) {
  const data = useMemo(() => buildProgressPoints(plays), [plays])

  const scale = useMemo(() => {
    const values = data
      .map((d) => d.accuracy)
      .filter((v): v is number => v != null)
    if (values.length === 0) return EMPTY_Y_SCALE
    return buildYScale(
      Math.min(...values),
      Math.max(...values, highest ?? 0),
    )
  }, [data, highest])

  if (plays.length === 0) {
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
          margin={{ top: 20, right: 36, left: 12, bottom: 20 }}
        >
          <CartesianGrid
            stroke="var(--grid)"
            strokeDasharray="3 6"
            vertical={false}
          />
          <XAxis
            dataKey="axisKey"
            type="category"
            padding={{ left: 12, right: 12 }}
            interval={0}
            tick={(props) => {
              const x = Number(props.x)
              const y = Number(props.y)
              const idx =
                typeof props.index === 'number' ? props.index : -1
              const point = idx >= 0 ? data[idx] : undefined
              if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                !point?.showLabel
              ) {
                return <g />
              }
              return <AxisTick x={x} y={y} point={point} />
            }}
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
              const point = item?.payload as ProgressPoint | undefined
              if (point?.accuracy == null) return null
              const tag = point.perfectPlay
                ? ' · PP'
                : point.maxCombo
                  ? ' · MC'
                  : ''
              return [`${Number(value).toFixed(2)}%${tag}`, 'Accuracy']
            }}
            labelFormatter={(_label, payload) => {
              const point = payload?.[0]?.payload as ProgressPoint | undefined
              if (!point?.full) return ''
              return new Date(point.full).toLocaleString('ko-KR')
            }}
          />
          {data.map((d) => (
            <ReferenceLine
              key={`v-${d.axisKey}`}
              x={d.axisKey}
              stroke="color-mix(in srgb, var(--axis) 45%, var(--bg0))"
              strokeDasharray={d.dayBreak ? undefined : '3 6'}
              strokeWidth={d.dayBreak ? 1.5 : 1}
              zIndex={DefaultZIndexes.grid}
            />
          ))}
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="var(--score-line)"
            strokeWidth={2.25}
            connectNulls
            zIndex={DefaultZIndexes.line}
            dot={(props) => (
              <ChartDot
                cx={props.cx}
                cy={props.cy}
                payload={props.payload as ProgressPoint}
              />
            )}
            activeDot={(props) => (
              <ChartDot
                cx={props.cx}
                cy={props.cy}
                payload={props.payload as ProgressPoint}
                active
              />
            )}
            isAnimationActive={false}
          />
          {highest != null && <HighestReferenceLine highest={highest} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export const ProgressChart = memo(ProgressChartInner)
