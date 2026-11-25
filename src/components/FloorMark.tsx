import { floorGapParen } from '../lib/elixirRecommend'

export const EMPTY_FLOOR = '-'

function StairIcon() {
  return (
    <svg className="stair-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 16V12H6V8H10V4H14V16H2Z" fill="currentColor" />
    </svg>
  )
}

export function FloorMark({ floorName, delta }: { floorName: string; delta?: number }) {
  const empty = floorName === EMPTY_FLOOR
  return (
    <span className="floor-mark">
      <StairIcon />
      <span className={empty ? 'floor-empty mono' : 'mono'}>{floorName}</span>
      {delta != null && <span className="floor-gap">{floorGapParen(delta)}</span>}
    </span>
  )
}
