import { useState } from 'react'
import { validateApiToken } from '../lib/archiveApi'

interface ApiSetupModalProps {
  open: boolean
  initialToken?: string
  initialNickname?: string
  required?: boolean
  onClose?: () => void
  onSave: (apiToken: string, nickname: string) => void | Promise<void>
}

export function ApiSetupModal({
  open,
  initialToken = '',
  initialNickname = '',
  required = false,
  onClose,
  onSave,
}: ApiSetupModalProps) {
  const [token, setToken] = useState(initialToken)
  const [nickname, setNickname] = useState(initialNickname)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  if (!open) return null

  async function handleSave() {
    const t = token.trim()
    if (!t) {
      setMsg('Open API 조회 토큰을 입력하세요.')
      setOk(false)
      return
    }
    setBusy(true)
    setMsg(null)
    const result = await validateApiToken(t)
    if (!result.ok) {
      setBusy(false)
      setOk(false)
      setMsg(result.message ?? '토큰 검증 실패')
      return
    }
    const nick = result.nickname || nickname.trim()
    try {
      await onSave(t, nick)
      setOk(true)
      setMsg(result.message ?? '저장됨')
      setNickname(nick)
    } catch (e) {
      setOk(false)
      setMsg(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal modal-wide"
        role="dialog"
        aria-labelledby="api-setup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="api-setup-title">V-ARCHIVE API 연동</h2>
        <p className="modal-hint">
          클라이언트 로그만으로는 예전에 저장해 둔 최고기록(예: 99.67%)을 알 수
          없습니다. V-ARCHIVE 마이페이지에서 발급한{' '}
          <strong>Open API 조회 토큰</strong>을 넣으면 DrillMAX가 PB를
          불러옵니다.
        </p>

        <ol className="setup-steps">
          <li>
            <a
              href="https://v-archive.net/"
              target="_blank"
              rel="noreferrer"
            >
              v-archive.net
            </a>{' '}
            로그인 → 마이페이지
          </li>
          <li>
            <strong>Open API 조회 토큰</strong> 발급 / 복사
          </li>
          <li>아래에 붙여넣고 저장</li>
        </ol>

        <label className="field">
          <span>Open API 조회 토큰</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="마이페이지에서 복사한 토큰"
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              setMsg(null)
              setOk(false)
            }}
            autoFocus
          />
        </label>

        <label className="field">
          <span>닉네임 (선택 · 토큰으로 자동 확인됨)</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임"
          />
        </label>

        {msg && (
          <p className={`modal-msg${ok ? '' : ' error'}`}>{msg}</p>
        )}

        <div className="modal-actions">
          {!required && onClose && (
            <button type="button" className="btn-ghost" onClick={onClose}>
              닫기
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !token.trim()}
            onClick={() => void handleSave()}
          >
            {busy ? '확인 중…' : '저장하고 PB 불러오기'}
          </button>
        </div>
      </div>
    </div>
  )
}
