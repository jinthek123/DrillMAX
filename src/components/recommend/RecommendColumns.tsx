import { floorGapParen, type RecommendPick, type TagChip } from '../../lib/elixirRecommend'
import { ChartBadges } from '../ChartBadges'
import { Hang2botName } from '../Hang2botName'

function StairIcon() {
  return (
    <svg className="stair-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 16V12H6V8H10V4H14V16H2Z" fill="currentColor" />
    </svg>
  )
}

function FloorMark({ floorName, delta }: { floorName: string; delta?: number }) {
  return (
    <span className="floor-mark">
      <StairIcon />
      <span className="mono">{floorName}</span>
      {delta != null && <span className="floor-gap">{floorGapParen(delta)}</span>}
    </span>
  )
}

export function TagList({ tags }: { tags: TagChip[] }) {
  return (
    <div className="recommend-tags">
      {tags.map((tag) => (
        <span key={tag.name} className="recommend-tag">
          {tag.name} {tag.score}
        </span>
      ))}
    </div>
  )
}

function RerollIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M13.2 8.2a5.2 5.2 0 1 1-1.5-3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11.4 1.8v3.3H8.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SectionHead({
  title,
  canReroll,
  onReroll,
}: {
  title: string
  canReroll: boolean
  onReroll: () => void
}) {
  return (
    <div className="recommend-section-head">
      <h2>
        <Hang2botName /> {title}
      </h2>
      <button
        type="button"
        className="reroll-btn"
        aria-label={`${title} 다시 뽑기`}
        title="다시 뽑기"
        onClick={onReroll}
        disabled={!canReroll}
      >
        <RerollIcon />
      </button>
    </div>
  )
}

function RecommendColumn({
  title,
  button,
  picks,
  tagsFor,
}: {
  title: string
  button: string
  picks: RecommendPick[]
  tagsFor: (pick: RecommendPick) => TagChip[]
}) {
  return (
    <section className="recommend-section" aria-label={`행이봇 ${title}`}>
      <ol className="recommend-list">
        {picks.map((pick, index) => (
          <li key={`${pick.title}-${pick.pattern}`} className="recommend-card">
            <div className="recommend-card-head">
              <span className="recommend-rank">{index + 1}</span>
              <div>
                <strong>{pick.title}</strong>
                <p className="main-meta recommend-mode-line">
                  <ChartBadges
                    button={button}
                    difficulty={pick.pattern}
                    level={pick.level}
                  />
                  <FloorMark floorName={pick.floorName} delta={pick.floorDelta} />
                </p>
              </div>
            </div>
            <TagList tags={tagsFor(pick)} />
          </li>
        ))}
      </ol>
    </section>
  )
}

export function RecommendColumns({
  button,
  picks,
  rests,
  onRerollPicks,
  onRerollRests,
}: {
  button: string
  picks: RecommendPick[]
  rests: RecommendPick[]
  onRerollPicks: () => void
  onRerollRests: () => void
}) {
  return (
    <div className="recommend-board">
      <div className="recommend-heads">
        <SectionHead
          title="상수 기반 추천곡"
          canReroll={picks.length > 0}
          onReroll={onRerollPicks}
        />
        <SectionHead
          title="상수 기반 쉬는곡"
          canReroll={rests.length > 0}
          onReroll={onRerollRests}
        />
      </div>
      <div className="recommend-columns">
        <RecommendColumn
          title="상수 기반 추천곡"
          button={button}
          picks={picks}
          tagsFor={(pick) => pick.sharedTags}
        />
        <RecommendColumn
          title="상수 기반 쉬는곡"
          button={button}
          picks={rests}
          tagsFor={(pick) => pick.tags}
        />
      </div>
    </div>
  )
}

export function SeedFaceMeta({
  button,
  pattern,
  level,
  floorName,
}: {
  button: string
  pattern: string
  level?: number
  floorName: string
}) {
  return (
    <p className="main-meta recommend-mode-line">
      <ChartBadges button={button} difficulty={pattern} level={level} />
      {floorName ? <FloorMark floorName={floorName} /> : null}
    </p>
  )
}