import { useEffect, useMemo, useState } from 'react'
import { recommendForChart } from '../lib/elixirRecommend'
import { focusHangCatalog } from '../lib/hangCatalog'
import { ensureHangCatalog } from '../lib/hang2botSync'
import type { Chart } from '../types'
import { Hang2botName } from './Hang2botName'
import { HangSyncFooter, useHangCatalogVersion } from './recommend/HangSyncFooter'
import { RecommendColumns } from './recommend/RecommendColumns'
import { SeedCarousel } from './recommend/SeedCarousel'

export function AiRecommendPanel({
  charts,
  selectedId,
  onSelect,
}: {
  charts: Chart[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const selectedIndex = charts.findIndex((chart) => chart.id === selectedId)
  const index = selectedIndex >= 0 ? selectedIndex : 0
  const chart = charts[index]
  const catalogVersion = useHangCatalogVersion()
  const [rollState, setRollState] = useState({ id: '', picks: 0, rests: 0 })
  const [loadedButton, setLoadedButton] = useState('')
  const chartId = chart?.id ?? ''
  const rolls =
    rollState.id === chartId ? rollState : { id: chartId, picks: 0, rests: 0 }
  const catalogReady = chart != null && loadedButton === chart.button

  useEffect(() => {
    if (!chart) return
    let cancel = false
    const button = chart.button
    void ensureHangCatalog(button).finally(() => {
      if (cancel) return
      focusHangCatalog(button)
      setLoadedButton(button)
    })
    return () => {
      cancel = true
    }
  }, [chart, catalogVersion])

  const recommendation = useMemo(
    () =>
      chart && catalogReady
        ? recommendForChart(
            {
              title: chart.title,
              button: chart.button,
              pattern: chart.difficulty,
            },
            { picks: rolls.picks, rests: rolls.rests },
          )
        : null,
    [chart, catalogReady, rolls.picks, rolls.rests, catalogVersion],
  )

  useEffect(() => {
    if (selectedIndex >= 0 || !charts[0]) return
    onSelect(charts[0].id)
  }, [charts, onSelect, selectedIndex])

  const { button, picks, rests } = recommendation ?? {
    button: chart?.button ?? '',
    picks: [],
    rests: [],
  }

  return (
    <main className="main recommend-main">
      {chart ? (
        <SeedCarousel
          charts={charts}
          index={index}
          recommendation={recommendation}
          onSelect={onSelect}
        />
      ) : (
        <header className="main-head">
          <p className="main-meta">왼쪽 목록의 곡을 여기서 고릅니다.</p>
        </header>
      )}

      {chart && catalogReady && recommendation && !recommendation.floorName ? (
        <div className="recommend-unassigned">
          <p>
            아직 <Hang2botName /> 상수가 배정되지 않았습니다.
          </p>
        </div>
      ) : !chart || catalogReady ? (
        <RecommendColumns
          button={button}
          picks={picks}
          rests={rests}
          onRerollPicks={() =>
            setRollState({
              id: chartId,
              picks: rolls.picks + 1,
              rests: rolls.rests,
            })
          }
          onRerollRests={() =>
            setRollState({
              id: chartId,
              picks: rolls.picks,
              rests: rolls.rests + 1,
            })
          }
        />
      ) : null}
      <HangSyncFooter />
    </main>
  )
}
