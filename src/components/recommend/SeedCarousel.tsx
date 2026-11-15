import { useRef, useState } from 'react'
import type { ElixirRecommendation, TagChip } from '../../lib/elixirRecommend'
import type { Chart } from '../../types'
import { Hang2botName } from '../Hang2botName'
import { SeedFaceMeta, TagList } from './RecommendColumns'

const SWIPE_THRESHOLD = 48

type Place = 'far-left' | 'left' | 'center' | 'right' | 'far-right'

function placeOf(delta: number): Place | null {
  if (delta === 0) return 'center'
  if (delta === -1) return 'left'
  if (delta === 1) return 'right'
  if (delta === -2) return 'far-left'
  if (delta === 2) return 'far-right'
  return null
}

function circularDelta(itemIndex: number, index: number, length: number) {
  let delta = itemIndex - index
  if (delta > length / 2) delta -= length
  if (delta < -length / 2) delta += length
  return delta
}

function SeedCard({
  chart,
  place,
  tags,
  floorName,
  level,
  onChoose,
}: {
  chart: Chart
  place: Place
  tags: TagChip[]
  floorName: string
  level?: number
  onChoose?: () => void
}) {
  const body = (
    <>
      <div className="seed-face-copy">
        {place === 'center' && (
          <p className="eyebrow">
            <Hang2botName /> x DrillMAX
          </p>
        )}
        <h1>{chart.title}</h1>
        {place === 'center' && (
          <SeedFaceMeta
            button={chart.button}
            pattern={chart.difficulty}
            level={level}
            floorName={floorName}
          />
        )}
      </div>
      {place === 'center' && tags.length > 0 && <TagList tags={tags} />}
    </>
  )
  return (
    <div className="seed-orbit" data-place={place}>
      {place === 'center' ? (
        <article className="seed-face">{body}</article>
      ) : (
        <button type="button" className="seed-face" onClick={onChoose}>
          {body}
        </button>
      )}
    </div>
  )
}

export function SeedCarousel({
  charts,
  index,
  recommendation,
  onSelect,
}: {
  charts: Chart[]
  index: number
  recommendation: ElixirRecommendation | null
  onSelect: (id: string) => void
}) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragOrigin = useRef<number | null>(null)
  const suppressClick = useRef(false)
  const chart = charts[index]

  function go(nextIndex: number) {
    if (charts.length < 2) return
    const wrapped = ((nextIndex % charts.length) + charts.length) % charts.length
    const next = charts[wrapped]
    if (!next || next.id === chart?.id) return
    onSelect(next.id)
  }

  return (
    <div className="seed-carousel">
      <button
        type="button"
        className="seed-nav"
        aria-label="이전 곡"
        disabled={charts.length < 2}
        onClick={() => go(index - 1)}
      >
        ‹‹
      </button>
      <div
        className={`seed-stage${dragging ? ' is-dragging' : ''}`}
        style={{ ['--drag' as string]: `${(-dragX * 0.17).toFixed(2)}deg` }}
        onPointerDown={(event) => {
          dragOrigin.current = event.clientX
          setDragging(true)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (dragOrigin.current == null) return
          setDragX(event.clientX - dragOrigin.current)
        }}
        onPointerUp={(event) => {
          if (dragOrigin.current == null) return
          const delta = event.clientX - dragOrigin.current
          dragOrigin.current = null
          suppressClick.current = Math.abs(delta) > 6
          setDragging(false)
          setDragX(0)
          if (delta <= -SWIPE_THRESHOLD) go(index + 1)
          else if (delta >= SWIPE_THRESHOLD) go(index - 1)
        }}
        onPointerCancel={() => {
          dragOrigin.current = null
          setDragging(false)
          setDragX(0)
        }}
      >
        {charts.map((item, itemIndex) => {
          const place = placeOf(circularDelta(itemIndex, index, charts.length))
          if (!place) return null
          const active = place === 'center' ? recommendation : null
          return (
            <SeedCard
              key={item.id}
              chart={item}
              place={place}
              tags={active?.tags ?? []}
              floorName={active?.floorName ?? ''}
              level={active?.level}
              onChoose={
                place === 'left' || place === 'right'
                  ? () => {
                      if (suppressClick.current) return
                      onSelect(item.id)
                    }
                  : undefined
              }
            />
          )
        })}
      </div>
      <button
        type="button"
        className="seed-nav"
        aria-label="다음 곡"
        disabled={charts.length < 2}
        onClick={() => go(index + 1)}
      >
        ››
      </button>
    </div>
  )
}
