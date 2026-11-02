import { memo, useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Play } from '../types'
import { isPerfectPlay } from '../types'
import { formatTimeAxis } from '../lib/parseLog'

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
  // PP = 빨강 계열, MC = 초록
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

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function buildYScale(min: number, max: number) {
  // 99.9% 이상 구간: 0.02 단위
  const useFine = max >= 99.9 && min >= 99.5

  if (useFine) {
    const step = 0.02
    const pad = Math.max(step * 2, (max - min) * 0.25)
    let yMin = Math.floor((min - pad) / step) * step
    let yMax = Math.ceil((max + pad) / step) * step
    yMin = Math.max(0, round2(yMin))
    yMax = Math.min(100, round2(yMax))

    const ticks: number[] = []
    for (let v = yMin; v <= yMax + 1e-9; v = round2(v + step)) {
      ticks.push(v)
    }
    // 눈금이 너무 많으면 간격 넓히기
    const shown =
      ticks.length <= 12
        ? ticks
        : ticks.filter((_, i) => i % Math.ceil(ticks.length / 10) === 0)

    return { yMin, yMax, ticks: shown, fine: true as const }
  }

  const pad = Math.max(0.35, (max - min) * 0.22)
  const yMin = Math.max(0, Math.floor((min - pad) * 10) / 10)
  const yMax = Math.min(100, Math.ceil((max + pad) * 10) / 10)
  return { yMin, yMax, ticks: undefined as number[] | undefined, fine: false as const }
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
      return { yMin: 0, yMax: 100, ticks: undefined, fine: false as const }
    }
    const values = data.map((d) => d.accuracy)
    const min = Math.min(...values)
    const max = Math.max(...values, highest ?? 0)
    return buildYScale(min, max)
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
            tick={{
              fill: 'var(--muted)',
              fontSize: 13,
              fontFamily: 'var(--font-display)',
            }}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
          />
          <YAxis
            domain={[scale.yMin, scale.yMax]}
            ticks={scale.ticks}
            tickFormatter={(v: number) =>
              scale.fine || v >= 99.9 ? v.toFixed(2) : v.toFixed(1)
            }
            tick={{
              fill: 'var(--muted)',
              fontSize: 13,
              fontFamily: 'var(--font-display)',
            }}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
            width={scale.fine ? 52 : 48}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontFamily: 'var(--font)',
              fontSize: 13,
              color: 'var(--ink)',
              boxShadow: 'var(--shadow)',
            }}
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
          {highest != null && (
            <ReferenceLine
              y={highest}
              stroke="var(--record)"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `Highest Record ${highest.toFixed(2)}%`,
                position: 'insideTopRight',
                fill: 'var(--record)',
                fontSize: 12,
                fontFamily: 'var(--font)',
              }}
            />
          )}
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
