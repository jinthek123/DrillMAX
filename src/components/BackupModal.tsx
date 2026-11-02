interface BackupModalProps {
  open: boolean
  backupDir: string
  busy?: boolean
  message?: string | null
  onClose: () => void
  onPickFolder: () => void
  onConfirm: () => void
}

export function BackupModal({
  open,
  backupDir,
  busy = false,
  message = null,
  onClose,
  onPickFolder,
  onConfirm,
}: BackupModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-labelledby="backup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="backup-title">백업</h2>
        <p className="modal-hint">백업하시겠습니까?</p>

        <label className="field">
          <span>백업 폴더</span>
          <div className="backup-path-row">
            <input
              className="mono"
              readOnly
              value={backupDir || '(아직 지정되지 않음)'}
              title={backupDir || undefined}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={onPickFolder}
              disabled={busy}
            >
              폴더 선택
            </button>
          </div>
        </label>

        {message && <p className="modal-msg">{message}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? '저장 중…' : '백업'}
          </button>
        </div>
      </div>
    </div>
  )
}
