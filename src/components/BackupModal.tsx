interface BackupModalProps {
  open: boolean
  backupDir: string
  message?: string | null
  onClose: () => void
  onPickFolder: () => void
}

export function BackupModal({
  open,
  backupDir,
  message = null,
  onClose,
  onPickFolder,
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
        <h2 id="backup-title">데이터 폴더</h2>
        <p className="modal-hint">
          성적은 <code>data/drillMax.json</code> 에 자동 저장됩니다. 다른
          폴더를 지정하면 그 위치를 사용합니다.
        </p>

        <label className="field">
          <span>저장 폴더 (선택)</span>
          <div className="backup-path-row">
            <input
              className="mono"
              readOnly
              value={backupDir || '(data 폴더 · 자동)'}
              title={backupDir || undefined}
            />
            <button type="button" className="btn-ghost" onClick={onPickFolder}>
              폴더 선택
            </button>
          </div>
        </label>

        {message && <p className="modal-msg">{message}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
