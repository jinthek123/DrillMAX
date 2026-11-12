interface LiveBadgeProps {
  enabled: boolean
  onToggle: () => void
  bridgeUp: boolean
  clientOnline: boolean
  nickname: string | null
  lastError: string | null
}

export function LiveBadge({
  enabled,
  onToggle,
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
      <button
        type="button"
        className={`live-toggle${linked ? ' on' : ''}`}
        onClick={onToggle}
        title={lastError ?? 'V-ARCHIVE 캡쳐+업로드 로그 자동 수집'}
      >
        <span className={`live-dot${linked ? ' pulse' : ''}`} />
        LIVE {linked ? 'ON' : 'OFF'}
      </button>
      <span className="live-detail">{detail}</span>
    </div>
  )
}
