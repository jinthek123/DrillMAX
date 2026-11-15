import { Hang2botName } from './Hang2botName'

export type AppTabId = 'overview' | 'chart' | 'ai' | 'info'

const TABS: { id: AppTabId; label: string }[] = [
  { id: 'overview', label: '전체 성과' },
  { id: 'chart', label: '단일 곡 기록' },
  { id: 'ai', label: '행이봇 x DrillMAX' },
  { id: 'info', label: 'INFO' },
]

interface AppTabsProps {
  active: AppTabId
  onChange: (id: AppTabId) => void
}

export function AppTabs({ active, onChange }: AppTabsProps) {
  return (
    <nav className="app-tabs" aria-label="주요 탭">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`app-tab${tab.id === 'info' ? ' app-tab-end' : ''}${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.id === 'ai' ? (
            <>
              <Hang2botName />
              {' x DrillMAX'}
            </>
          ) : (
            tab.label
          )}
        </button>
      ))}
    </nav>
  )
}
