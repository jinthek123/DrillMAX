import { ReferenceLine } from 'recharts'

/** ReferenceLine shape: 전체 가로 대신 좌측 짧은 Highest 선 */
export function shortHighestShape(props: {
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  stroke?: string
  strokeWidth?: number | string
}) {
  const { x1, x2, y1, stroke = 'var(--record)', strokeWidth = 2 } = props
  if (
    x1 == null ||
    x2 == null ||
    y1 == null ||
    !Number.isFinite(x1) ||
    !Number.isFinite(x2) ||
    !Number.isFinite(y1)
  ) {
    return <g />
  }

  const left = Math.min(x1, x2)
  const xEnd = left + 36

  return (
    <g className="highest-mark" pointerEvents="none">
      <line
        x1={left}
        y1={y1}
        x2={xEnd}
        y2={y1}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <text
        x={xEnd + 5}
        y={y1}
        fill={stroke}
        fontSize={11}
        fontFamily="var(--font)"
        fontWeight={600}
        dominantBaseline="middle"
      >
        Highest
      </text>
    </g>
  )
}

/** 짧은 Highest 기준선 (단일 곡 / 전체 성과 공통) */
export function HighestReferenceLine({ highest }: { highest: number }) {
  return (
    <ReferenceLine
      y={highest}
      stroke="var(--record)"
      strokeWidth={2}
      ifOverflow="extendDomain"
      shape={shortHighestShape}
    />
  )
}
