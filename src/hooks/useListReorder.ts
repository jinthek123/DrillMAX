import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const EDGE_PX = 64

export interface RowDrag {
  id: string
  from: number
  to: number
  startY: number
  dy: number
  slot: number
  tops: number[]
  heights: number[]
  scrollTop: number
  scroller: HTMLElement | null
}

function nearestIndex(y: number, tops: number[], heights: number[]) {
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < tops.length; i++) {
    const mid = tops[i] + heights[i] / 2
    const dist = Math.abs(y - mid)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

export function cardShift(index: number, drag: RowDrag | null) {
  if (!drag) return 0
  if (index === drag.from) return drag.dy
  if (drag.from < drag.to && index > drag.from && index <= drag.to) {
    return -drag.slot
  }
  if (drag.to < drag.from && index >= drag.to && index < drag.from) {
    return drag.slot
  }
  return 0
}

function scrollableAncestor(node: HTMLElement | null): HTMLElement | null {
  let el: HTMLElement | null = node
  while (el) {
    const oy = getComputedStyle(el).overflowY
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return el
    }
    el = el.parentElement
  }
  return null
}

/** 가장자리에 살짝 걸치면 천천히, 더 밀어 넣으면 빨라진다. */
function edgeSpeed(pointerY: number, scroller: HTMLElement) {
  const rect = scroller.getBoundingClientRect()
  const intoBottom = EDGE_PX - (rect.bottom - pointerY)
  const intoTop = EDGE_PX - (pointerY - rect.top)
  if (intoBottom > 0) {
    const t = Math.min(intoBottom / EDGE_PX, 1.35)
    return 1.5 + t * t * 10
  }
  if (intoTop > 0) {
    const t = Math.min(intoTop / EDGE_PX, 1.35)
    return -(1.5 + t * t * 10)
  }
  return 0
}

export function useListReorder(
  ids: string[],
  gap: number,
  onReorder: (orderedIds: string[]) => void,
) {
  const [drag, setDrag] = useState<RowDrag | null>(null)
  const listRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<RowDrag | null>(null)
  const pointerY = useRef(0)
  const frame = useRef(0)
  const running = useRef(false)
  const flipFrom = useRef<Map<string, number> | null>(null)
  const idsRef = useRef(ids)
  idsRef.current = ids

  const setListNode = (node: HTMLElement | null) => {
    listRef.current = node
  }

  const sync = (clientY: number) => {
    const prev = dragRef.current
    if (!prev) return
    const scrollDelta = prev.scroller
      ? prev.scroller.scrollTop - prev.scrollTop
      : 0
    const to = nearestIndex(clientY + scrollDelta, prev.tops, prev.heights)
    const dy = clientY - prev.startY + scrollDelta
    if (to === prev.to && dy === prev.dy) return
    const next = { ...prev, to, dy }
    dragRef.current = next
    setDrag(next)
  }

  const tick = () => {
    if (!running.current) return
    const prev = dragRef.current
    const scroller = prev?.scroller
    if (prev && scroller) {
      const speed = edgeSpeed(pointerY.current, scroller)
      if (speed !== 0) {
        const before = scroller.scrollTop
        const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
        const nextTop = Math.min(max, Math.max(0, before + speed))
        if (nextTop !== before) {
          scroller.scrollTop = nextTop
          sync(pointerY.current)
        }
      }
    }
    frame.current = requestAnimationFrame(tick)
  }

  const stop = () => {
    running.current = false
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = 0
  }

  useEffect(() => stop, [])

  const signature = ids.join('\0')
  useLayoutEffect(() => {
    const from = flipFrom.current
    const list = listRef.current
    if (!from || !list) return
    flipFrom.current = null
    list.querySelectorAll<HTMLElement>('[data-chart-id]').forEach((node) => {
      const id = node.dataset.chartId
      if (!id) return
      const before = from.get(id)
      if (before == null) return
      const dy = before - node.getBoundingClientRect().top
      if (Math.abs(dy) < 1) return
      node.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: 'none' }],
        { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      )
    })
  }, [signature])

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return
    const list = listRef.current
    if (!list) return
    const cards = [...list.querySelectorAll<HTMLElement>('[data-chart-id]')]
    const from = cards.findIndex((node) => node.dataset.chartId === id)
    if (from < 0) return
    const rects = cards.map((node) => node.getBoundingClientRect())
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* 캡처할 포인터가 없으면 버튼 위 이동만 따라간다 */
    }
    const scroller = scrollableAncestor(list)
    const next: RowDrag = {
      id,
      from,
      to: from,
      startY: event.clientY,
      dy: 0,
      slot: rects[from].height + gap,
      tops: rects.map((rect) => rect.top),
      heights: rects.map((rect) => rect.height),
      scrollTop: scroller?.scrollTop ?? 0,
      scroller,
    }
    pointerY.current = event.clientY
    dragRef.current = next
    setDrag(next)
    stop()
    running.current = true
    frame.current = requestAnimationFrame(tick)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    pointerY.current = event.clientY
    sync(event.clientY)
  }

  const endDrag = (commit: boolean) => {
    stop()
    const current = dragRef.current
    dragRef.current = null
    const list = listRef.current
    if (commit && current && current.to !== current.from && list) {
      const tops = new Map<string, number>()
      list.querySelectorAll<HTMLElement>('[data-chart-id]').forEach((node) => {
        const id = node.dataset.chartId
        if (id) tops.set(id, node.getBoundingClientRect().top)
      })
      flipFrom.current = tops
      const next = idsRef.current.slice()
      const [moved] = next.splice(current.from, 1)
      if (moved) next.splice(current.to, 0, moved)
      onReorder(next)
    }
    setDrag(null)
  }

  return { drag, setListNode, beginDrag, moveDrag, endDrag }
}
