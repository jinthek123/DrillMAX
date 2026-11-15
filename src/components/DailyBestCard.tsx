import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Chart, DailyBest, Play } from '../types'
import { isPerfectPlay } from '../types'
import { formatDateTime } from '../lib/parseLog'
import { DailyBestSparkline } from './DailyBestSparkline'

const TITLE_FONT_MIN_PX = 11

function columnGap(el: HTMLElement) {
  const n = Number.parseFloat(getComputedStyle(el).columnGap)
  return Number.isFinite(n) ? n : 0
}

/** 기본 글자 크기에서 곡명이 날짜·점수·배지 자리를 침범할 때만 true */
function nameOverflows(head: HTMLElement, name: HTMLElement) {
  const title = name.parentElement
  if (!title || head.clientWidth <= 0) return false
  const headStyle = getComputedStyle(head)
  const padX =
    (Number.parseFloat(headStyle.paddingLeft) || 0) +
    (Number.parseFloat(headStyle.paddingRight) || 0)
  let used = 0
  const titleKids = [...title.children]
  for (const child of titleKids) {
    if (child === name) continue
    used += (child as HTMLElement).offsetWidth
  }
  if (titleKids.length > 1) used += columnGap(title) * (titleKids.length - 1)
  const headKids = [...head.children]
  for (const child of headKids) {
    if (child === title) continue
    used += (child as HTMLElement).offsetWidth
  }
  if (headKids.length > 1) used += columnGap(head) * (headKids.length - 1)
  const available = head.clientWidth - padX - used
  return name.scrollWidth > available + 1
}

function useShrinkTitle(label: string) {
  const headRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const head = headRef.current
    const name = nameRef.current
    if (!head || !name) return

    const fit = () => {
      name.style.fontSize = ''
      const base = Number.parseFloat(getComputedStyle(name).fontSize)
      if (!Number.isFinite(base) || !nameOverflows(head, name)) return
      let size = base
      while (size > TITLE_FONT_MIN_PX && nameOverflows(head, name)) {
        size = Math.max(
          TITLE_FONT_MIN_PX,
          Math.round((size - 0.5) * 10) / 10,
        )
        name.style.fontSize = `${size}px`
        if (size === TITLE_FONT_MIN_PX) break
      }
    }

    fit()
    let lastWidth = head.clientWidth
    const observer = new ResizeObserver(() => {
      const width = head.clientWidth
      if (Math.abs(width - lastWidth) < 0.5) return
      lastWidth = width
      fit()
    })
    observer.observe(head)
    return () => observer.disconnect()
  }, [label])

  return { headRef, nameRef }
}

interface DailyBestCardProps {
  chart: Chart
  latest: Play | null
  highest: number | null
  dailyBests: DailyBest[] | undefined
  onOpen: () => void
  lifted?: boolean
  sliding?: boolean
  shiftY?: number
  onGripPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onGripPointerMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onGripPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onGripPointerCancel?: (event: ReactPointerEvent<HTMLButtonElement>) => void
}

export function DailyBestCard({
  chart,
  latest,
  highest,
  dailyBests,
  onOpen,
  lifted = false,
  sliding = false,
  shiftY = 0,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
  onGripPointerCancel,
}: DailyBestCardProps) {
  const pp = latest != null && isPerfectPlay(latest.accuracy, latest.maxCombo)
  const mc = latest != null && !pp && !!latest.maxCombo
  const { headRef, nameRef } = useShrinkTitle(chart.title)

  return (
    <article
      className={`daily-best-card${lifted ? ' is-lifted' : ''}${sliding ? ' is-shifting' : ''}`}
      data-chart-id={chart.id}
      style={lifted || sliding ? { transform: `translateY(${shiftY}px)` } : undefined}
    >
      {onGripPointerDown && (
      <button
        type="button"
        className="order-handle"
        aria-label="순서 변경"
        title="끌어서 순서 변경"
        onClick={(event) => event.preventDefault()}
        onPointerDown={onGripPointerDown}
        onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerUp}
        onPointerCancel={onGripPointerCancel}
      >
        <svg className="order-grip" viewBox="0 0 14 18" aria-hidden>
          {[0, 1, 2].flatMap((row) =>
            [0, 1].map((col) => (
              <circle
                key={`${row}-${col}`}
                cx={3 + col * 6}
                cy={3 + row * 6}
                r="1.45"
                fill="currentColor"
              />
            )),
          )}
        </svg>
      </button>
      )}
      <button type="button" className="daily-best-card-body" onClick={onOpen}>
      <div className="daily-best-card-head" ref={headRef}>
        <span className="daily-best-card-title">
          <span className={`button-tint-${chart.button}`}>
            {chart.button} {chart.difficulty}
          </span>
          <span className="daily-best-card-sep">—</span>
          <span className="daily-best-card-name" ref={nameRef}>
            {chart.title}
          </span>
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
    </article>
  )
}
