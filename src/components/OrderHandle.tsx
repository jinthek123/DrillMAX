import type { PointerEvent as ReactPointerEvent } from 'react'

interface OrderHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void
}

export function OrderHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: OrderHandleProps) {
  return (
    <button
      type="button"
      className="order-handle"
      aria-label="순서 변경"
      title="끌어서 순서 변경"
      onClick={(event) => event.preventDefault()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
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
  )
}
