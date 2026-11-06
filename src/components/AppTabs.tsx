export type AppTabId = 'overview' | 'chart' | 'ai'

const TABS: { id: AppTabId; label: string }[] = [
  { id: 'overview', label: '전체 성과' },
  { id: 'chart', label: '단일 곡 기록' },
  { id: 'ai', label: 'AI 추천' },
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
          className={`app-tab${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
