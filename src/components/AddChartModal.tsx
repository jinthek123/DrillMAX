import { useEffect, useMemo, useRef, useState } from 'react'
import type { ButtonMode, Difficulty } from '../types'
import {
  availableButtons,
  availableDifficulties,
  findSongExact,
  searchSongs,
  type SongEntry,
  type SongIndex,
} from '../lib/songCatalog'

const ALL_BUTTONS: ButtonMode[] = ['4B', '5B', '6B', '8B']
const ALL_DIFFS: Difficulty[] = ['NM', 'HD', 'MX', 'SC']

interface AddChartModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (title: string, button: ButtonMode, difficulty: Difficulty) => void
  songIndex: SongIndex
  catalogStatus: 'idle' | 'loading' | 'ready' | 'error'
  knownTitles?: string[]
}

export function AddChartModal({
  open,
  onClose,
  onSubmit,
  songIndex,
  catalogStatus,
  knownTitles = [],
}: AddChartModalProps) {
  const [title, setTitle] = useState('')
  const [button, setButton] = useState<ButtonMode>('4B')
  const [difficulty, setDifficulty] = useState<Difficulty>('SC')
  const [openSuggest, setOpenSuggest] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const matchedSong = useMemo(
    () => findSongExact(songIndex, title),
    [songIndex, title],
  )

  const buttonOptions = useMemo(() => {
    if (!matchedSong) return ALL_BUTTONS
    const avail = availableButtons(matchedSong)
    return avail.length > 0 ? avail : ALL_BUTTONS
  }, [matchedSong])

  const diffOptions = useMemo(() => {
    if (!matchedSong) return ALL_DIFFS
    const avail = availableDifficulties(matchedSong, button)
    return avail.length > 0 ? avail : ALL_DIFFS
  }, [matchedSong, button])

  const suggestions = useMemo(() => {
    const fromDb = searchSongs(songIndex, title, 10)
    if (fromDb.length > 0) return fromDb

    // DB 미로드·무결과 시 로컬에 있던 제목으로 보조
    const q = title.trim().toLowerCase()
    if (!q) return []
    return knownTitles
      .filter((t) => t.toLowerCase().includes(q))
      .slice(0, 8)
      .map(
        (name): SongEntry => ({
          name,
          composer: '',
          dlcCode: '',
          patterns: {},
        }),
      )
  }, [songIndex, title, knownTitles])

  useEffect(() => {
    if (!open) return
    setTitle('')
    setButton('4B')
    setDifficulty('SC')
    setOpenSuggest(false)
    setActiveIndex(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!buttonOptions.includes(button)) {
      setButton(buttonOptions[0] ?? '4B')
    }
  }, [buttonOptions, button])

  useEffect(() => {
    if (!diffOptions.includes(difficulty)) {
      setDifficulty(diffOptions[0] ?? 'SC')
    }
  }, [diffOptions, difficulty])

  useEffect(() => {
    setActiveIndex(0)
  }, [suggestions])

  if (!open) return null

  function pickSong(song: SongEntry) {
    setTitle(song.name)
    setOpenSuggest(false)
    const btns = availableButtons(song)
    const nextButton = btns.includes(button)
      ? button
      : (btns[0] ?? button)
    setButton(nextButton)
    const diffs = availableDifficulties(song, nextButton)
    if (diffs.length > 0 && !diffs.includes(difficulty)) {
      setDifficulty(diffs.includes('SC') ? 'SC' : diffs[0])
    }
    inputRef.current?.focus()
  }

  function submit() {
    if (!title.trim()) return
    onSubmit(title.trim(), button, difficulty)
    onClose()
  }

  const showList = openSuggest && suggestions.length > 0

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-labelledby="add-chart-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-chart-title">차트 추가</h2>

        <div className="field autocomplete-field">
          <span>곡 제목</span>
          <div className="autocomplete">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setOpenSuggest(true)
              }}
              onFocus={() => setOpenSuggest(true)}
              onBlur={() => {
                // 클릭 선택을 위해 약간 지연
                window.setTimeout(() => setOpenSuggest(false), 120)
              }}
              onKeyDown={(e) => {
                if (!showList) {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submit()
                  }
                  return
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActiveIndex((i) =>
                    Math.min(i + 1, suggestions.length - 1),
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActiveIndex((i) => Math.max(i - 1, 0))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  const song = suggestions[activeIndex]
                  if (song) pickSong(song)
                } else if (e.key === 'Escape') {
                  setOpenSuggest(false)
                }
              }}
              placeholder="곡 이름 검색…"
              role="combobox"
              aria-expanded={showList}
              aria-controls="song-suggest-list"
              aria-autocomplete="list"
              autoComplete="off"
            />
            {showList && (
              <ul
                id="song-suggest-list"
                className="suggest-list"
                role="listbox"
                ref={listRef}
              >
                {suggestions.map((song, i) => (
                  <li key={`${song.name}-${song.dlcCode}-${i}`} role="option">
                    <button
                      type="button"
                      className={`suggest-item${i === activeIndex ? ' active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSong(song)}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <span className="suggest-name">{song.name}</span>
                      {(song.composer || song.dlcCode) && (
                        <span className="suggest-meta">
                          {[song.composer, song.dlcCode]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="field-hint">
            {catalogStatus === 'loading' && 'V-ARCHIVE 곡 목록 불러오는 중…'}
            {catalogStatus === 'ready' &&
              `${songIndex.entries.length}곡 자동완성 준비됨 · ↑↓ 선택 · Enter`}
            {catalogStatus === 'error' &&
              '온라인 곡 목록을 못 불러왔습니다. 직접 입력은 가능합니다.'}
            {catalogStatus === 'idle' && '곡 이름을 입력하세요'}
          </p>
        </div>

        <div className="field">
          <span>버튼</span>
          <div className="mode-chips" role="group" aria-label="버튼">
            {ALL_BUTTONS.map((b) => {
              const enabled = buttonOptions.includes(b)
              return (
                <button
                  key={b}
                  type="button"
                  className={`mode-chip${button === b ? ' active' : ''}`}
                  data-button={b}
                  disabled={!enabled}
                  onClick={() => setButton(b)}
                >
                  {b}
                </button>
              )
            })}
          </div>
        </div>
        <div className="field">
          <span>난이도</span>
          <div className="mode-chips" role="group" aria-label="난이도">
            {ALL_DIFFS.map((d) => {
              const enabled = diffOptions.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  className={`mode-chip${difficulty === d ? ' active' : ''}`}
                  disabled={!enabled}
                  onClick={() => setDifficulty(d)}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn-primary" onClick={submit}>
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
