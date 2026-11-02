import { useMemo, useState } from 'react'
import { parseVArchiveLog } from '../lib/parseLog'
import type { ParsedLogPlay } from '../types'

interface ImportLogModalProps {
  open: boolean
  onClose: () => void
  onImport: (plays: ParsedLogPlay[], dateYmd: string) => number
}

export function ImportLogModal({ open, onClose, onImport }: ImportLogModalProps) {
  const [text, setText] = useState('')
  const [dateYmd, setDateYmd] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const [message, setMessage] = useState<string | null>(null)

  const preview = useMemo(() => parseVArchiveLog(text), [text])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal modal-wide"
        role="dialog"
        aria-labelledby="import-log-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="import-log-title">V-ARCHIVE 로그 붙여넣기</h2>
        <p className="modal-hint">
          클라이언트 로그에서 <code>[미갱신]</code> / <code>[성공]</code> 줄을
          그대로 붙여넣으면 모든 플레이가 저장됩니다. ([달성]만 남기고
          버려지는 값 포함)
        </p>

        <label className="field">
          <span>플레이 날짜</span>
          <input
            type="date"
            value={dateYmd}
            onChange={(e) => setDateYmd(e.target.value)}
          />
        </label>

        <label className="field">
          <span>로그</span>
          <textarea
            rows={8}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setMessage(null)
            }}
            placeholder={`[15:42:23][미갱신][2일전][티어24등](SC 12.3) 4B SC 곡제목(99.92 %)\n[15:42:11][성공] 4B SC 다른곡(99.96 %)`}
          />
        </label>

        {preview.length > 0 && (
          <div className="import-preview">
            <strong>인식 {preview.length}건</strong>
            <ul>
              {preview.slice(0, 8).map((p, i) => (
                <li key={`${p.time}-${p.title}-${i}`}>
                  {p.time} [{p.status}] {p.button} {p.difficulty} {p.title}{' '}
                  ({p.accuracy.toFixed(2)}%)
                </li>
              ))}
              {preview.length > 8 && <li>…외 {preview.length - 8}건</li>}
            </ul>
          </div>
        )}

        {message && <p className="modal-msg">{message}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            닫기
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={preview.length === 0}
            onClick={() => {
              const n = onImport(preview, dateYmd)
              setMessage(`${n}건 저장됨 (중복 제외)`)
              if (n > 0) {
                setText('')
              }
            }}
          >
            가져오기
          </button>
        </div>
      </div>
    </div>
  )
}
