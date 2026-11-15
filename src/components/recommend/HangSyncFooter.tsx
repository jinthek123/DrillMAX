import { useEffect, useState } from 'react'
import hang2botMark from '../../assets/hang2bot-mark.png'
import { openExternalLink } from '../../lib/externalLink'
import { subscribeHangCatalog } from '../../lib/hangCatalog'
import {
  hangSyncUsedToday,
  loadSavedHangCatalogs,
  readHangSync,
  refreshHangCatalogs,
  type HangSyncStatus,
} from '../../lib/hang2botSync'

const SYNC_NOTE: Record<HangSyncStatus, string> = {
  limited: '오늘은 이미 확인했습니다',
  unchanged: '이미 최신 상수입니다',
  updated: '최신 상수를 반영했습니다',
  partial: '일부만 반영했습니다',
  failed: '불러오지 못했습니다. 기존 상수를 유지합니다',
}

export function useHangCatalogVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const unsubscribe = subscribeHangCatalog(() => setVersion((current) => current + 1))
    void loadSavedHangCatalogs()
    return unsubscribe
  }, [])
  return version
}

export function HangSyncFooter() {
  const [syncing, setSyncing] = useState(false)
  const [syncLocked, setSyncLocked] = useState(() => hangSyncUsedToday())
  const [syncNote, setSyncNote] = useState(() => {
    const saved = readHangSync()
    return saved ? SYNC_NOTE[saved.status] : ''
  })

  async function refreshConstants() {
    if (syncing || syncLocked) return
    setSyncing(true)
    const status = await refreshHangCatalogs()
    setSyncLocked(true)
    setSyncNote(SYNC_NOTE[status])
    setSyncing(false)
  }

  return (
    <div className="recommend-footer">
      <p className="recommend-source">
        ※ 각 패턴 상수의 자세한 정보는 "
        <a
          className="hang2bot-inline"
          href="https://hang2bot.vercel.app/"
          target="_blank"
          rel="noreferrer"
          onClick={openExternalLink}
        >
          <img src={hang2botMark} alt="행이봇" />
        </a>
        " 에서 확인이 가능합니다.
      </p>
      <div className="hang-sync">
        {syncNote && (
          <p className="hang-sync-note" aria-live="polite">
            {syncNote}
          </p>
        )}
        <button
          type="button"
          className="hang-sync-btn"
          disabled={syncing || syncLocked}
          onClick={() => void refreshConstants()}
        >
          {syncing ? '불러오는 중' : '최신 행이봇 상수 불러오기'}
        </button>
      </div>
    </div>
  )
}
