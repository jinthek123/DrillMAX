interface LiveBadgeProps {
  enabled: boolean
  onToggle: () => void
  recording: boolean
  onRecordingChange: (recording: boolean) => void
  bridgeUp: boolean
  clientOnline: boolean
  nickname: string | null
  lastError: string | null
}

export function LiveBadge({
  enabled,
  onToggle,
  recording,
  onRecordingChange,
  bridgeUp,
  clientOnline,
  nickname,
  lastError,
}: LiveBadgeProps) {
  const linked = enabled && bridgeUp && clientOnline
  let detail = '꺼짐'
  if (enabled && !bridgeUp) detail = '브리지 대기'
  else if (enabled && bridgeUp && !clientOnline) detail = '클라이언트 미감지'
  else if (linked) detail = nickname ? `${nickname} 수신중` : '수신중'

  return (
    <div className="live-badge">
      <div className="live-row">
        <button
          type="button"
          className={`live-toggle${linked ? ' on' : ''}`}
          onClick={onToggle}
          title={lastError ?? 'V-ARCHIVE 캡쳐+업로드 로그 자동 수집'}
        >
          <span className={`live-dot${linked ? ' pulse' : ''}`} />
          LIVE {linked ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          className={`rec-toggle${recording ? ' on' : ''}`}
          aria-label={recording ? '기록 중지' : '기록 시작'}
          title={recording ? '기록 중지' : '기록 시작'}
          onClick={() => onRecordingChange(!recording)}
        >
          {recording ? (
            <span className="rec-mark" />
          ) : (
            <svg className="rec-play" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M3.8 3.5L3.8 8.5Q3.8 10.2 5.23 9.29L8.97 6.91Q10.4 6 8.97 5.09L5.23 2.71Q3.8 1.8 3.8 3.5Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
      </div>
      <span className="live-detail">{detail}</span>
    </div>
  )
}
