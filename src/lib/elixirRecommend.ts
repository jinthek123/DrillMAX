import { hangCatalog, type HangSong } from './hangCatalog'
import type { ButtonMode, Difficulty } from '../types'

const FLOOR_LIMIT = 3
const REST_FLOOR_DROP = 2
const PICK_SIZE = 5
const REST_SIZE = 5
const REST_LOWER_COUNT = 2
const REST_LOWER_SPAN = 10

export interface TagChip {
  name: string
  score: number
}

export interface RecommendPick {
  title: string
  pattern: string
  level?: number
  floorName: string
  floorDelta: number
  titleJacket?: string
  sharedTags: TagChip[]
  tags: TagChip[]
}

export interface ElixirRecommendation {
  button: string
  title: string
  pattern: string
  level?: number
  floorName: string
  titleJacket?: string
  tags: TagChip[]
  picks: RecommendPick[]
  rests: RecommendPick[]
}

function tagsOf(raw: Record<string, number> | undefined): Map<string, number> {
  const tags = new Map<string, number>()
  if (!raw) return tags
  for (const [name, score] of Object.entries(raw)) {
    if (!name.trim() || !Number.isFinite(score) || score <= 0) continue
    tags.set(name, score)
  }
  return tags
}

function chips(tags: Map<string, number>): TagChip[] {
  return [...tags.entries()]
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'))
}

function similarity(seed: Map<string, number>, other: Map<string, number>): number {
  let dot = 0
  let seedNorm = 0
  let otherNorm = 0
  for (const score of seed.values()) seedNorm += score * score
  for (const score of other.values()) otherNorm += score * score
  if (seedNorm === 0 || otherNorm === 0) return 0
  for (const [name, score] of seed) {
    const otherScore = other.get(name)
    if (otherScore == null) continue
    dot += score * otherScore
  }
  return dot / Math.sqrt(seedNorm * otherNorm)
}

const TAG3_FLOOR_WORTH = 2
const COSINE_WEIGHT = 0.45

/** 서로 상수 3인 태그 개수. 1·2와 깨진 큰 숫자는 넣지 않는다. */
function sharedTag3Count(seed: Map<string, number>, other: Map<string, number>): number {
  let count = 0
  for (const [name, score] of seed) {
    if (score === 3 && other.get(name) === 3) count += 1
  }
  return count
}

/**
 * 추천 적합도. 클수록 앞.
 * 가까운 층이 기본이고, 상수 3을 하나 공유하면 약 0.2층 떨어진 것까지 같은 층보다 앞선다.
 * 유사도는 그 차이를 뒤집지 못할 만큼만 더한다.
 */
function recommendFit(row: RankedSong): number {
  return row.sharedTag3 * TAG3_FLOOR_WORTH + row.score * COSINE_WEIGHT - Math.abs(row.floorDelta)
}

function sharedTags(seed: Map<string, number>, other: Map<string, number>): TagChip[] {
  const shared = new Map<string, number>()
  for (const [name, score] of other) {
    if (!seed.has(name)) continue
    shared.set(name, score)
  }
  return chips(shared)
}

interface RankedSong {
  song: HangSong
  tags: Map<string, number>
  score: number
  sharedTag3: number
  floorDelta: number
}

function restTagBlocked(row: RankedSong): boolean {
  return (row.tags.get('연타') ?? 0) >= 1 || (row.tags.get('따닥') ?? 0) >= 2
}

function byTitle(a: RankedSong, b: RankedSong): number {
  return a.song.title.localeCompare(b.song.title, 'ko')
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }
  return copy
}

function rollRandom(title: string, pattern: string, roll: number, salt: number) {
  let state = salt >>> 0
  const text = `${title}|${pattern}|${roll}`
  for (let i = 0; i < text.length; i++) {
    state = Math.imul(state ^ text.charCodeAt(i), 16777619)
  }
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rankSongs(songs: HangSong[], seed: HangSong, seedTags: Map<string, number>): RankedSong[] {
  return songs
    .filter((song) => (song.title !== seed.title || song.pattern !== seed.pattern) && Number.isFinite(song.floor))
    .map((song) => {
      const tags = tagsOf(song.tags)
      return {
        song,
        tags,
        score: similarity(seedTags, tags),
        sharedTag3: sharedTag3Count(seedTags, tags),
        floorDelta: song.floor - seed.floor,
      }
    })
}

function toPick(seedTags: Map<string, number>, row: RankedSong): RecommendPick {
  return {
    title: row.song.title,
    pattern: row.song.pattern,
    level: row.song.level,
    floorName: row.song.floorName,
    floorDelta: row.floorDelta,
    titleJacket: row.song.title_jacket,
    sharedTags: sharedTags(seedTags, row.tags),
    tags: chips(row.tags),
  }
}

function nearestFloor(rows: RankedSong[], floor: number, below: boolean): number | null {
  let nearest: number | null = null
  for (const row of rows) {
    if (below ? row.song.floor >= floor : row.song.floor > floor) continue
    if (nearest == null || row.song.floor > nearest) nearest = row.song.floor
  }
  return nearest
}

export function recommendForChart(
  chart: {
    title: string
    button: ButtonMode
    pattern: Difficulty
  },
  rolls?: { picks?: number; rests?: number },
): ElixirRecommendation {
  const file = hangCatalog(chart.button)
  const seedSong = file.songs.find(
    (song) => song.title === chart.title && song.pattern === chart.pattern,
  )
  if (!seedSong) {
    return {
      button: chart.button,
      title: chart.title,
      pattern: chart.pattern,
      floorName: '',
      tags: [],
      picks: [],
      rests: [],
    }
  }
  const seedTags = tagsOf(seedSong.tags)
  const ranked = rankSongs(file.songs, seedSong, seedTags)
  const eligible = ranked.filter((row) => Math.abs(row.floorDelta) <= FLOOR_LIMIT)
  const pickRoll = rolls?.picks ?? 0
  const picks = (
    pickRoll === 0
      ? eligible
          .slice()
          .sort((a, b) => recommendFit(b) - recommendFit(a) || byTitle(a, b))
      : shuffle(
          eligible,
          rollRandom(seedSong.title, seedSong.pattern, pickRoll, 1),
        )
  ).slice(0, PICK_SIZE)
  const restAnchor = nearestFloor(ranked, seedSong.floor - REST_FLOOR_DROP, false)
  const restFloor =
    restAnchor == null ? null : (nearestFloor(ranked, restAnchor, true) ?? restAnchor)
  const lowerCandidate = restFloor == null ? null : nearestFloor(ranked, restFloor, true)
  const lowerFloor =
    restFloor != null &&
    lowerCandidate != null &&
    restFloor - lowerCandidate <= REST_LOWER_SPAN
      ? lowerCandidate
      : null
  const restRoll = rolls?.rests ?? 0
  const pickRest = (pool: RankedSong[], count: number, salt: number) => {
    if (count <= 0 || pool.length === 0) return []
    const random = rollRandom(seedSong.title, seedSong.pattern, restRoll, salt)
    const ordered =
      restRoll === 0
        ? shuffle(pool, random).sort((a, b) => a.score - b.score)
        : shuffle(pool, random)
    return ordered.slice(0, count)
  }
  const mainPool =
    restFloor == null
      ? []
      : ranked.filter((row) => row.song.floor === restFloor && !restTagBlocked(row))
  const lowerPool =
    lowerFloor == null
      ? []
      : ranked.filter((row) => row.song.floor === lowerFloor && !restTagBlocked(row))
  const lowerCount = Math.min(REST_LOWER_COUNT, lowerPool.length, REST_SIZE)
  const main = pickRest(mainPool, REST_SIZE - lowerCount, 2)
  const lower = pickRest(lowerPool, REST_SIZE - main.length, 3)
  const rests = [...main, ...lower]

  return {
    button: chart.button,
    title: seedSong.title,
    pattern: seedSong.pattern,
    level: seedSong.level,
    floorName: seedSong.floorName,
    titleJacket: seedSong.title_jacket,
    tags: chips(seedTags),
    picks: picks.map((row) => toPick(seedTags, row)),
    rests: rests.map((row) => toPick(seedTags, row)),
  }
}

export function floorGapParen(delta: number): string {
  if (delta === 0) return '(±0)'
  const gap = (Math.abs(delta) / 10).toFixed(1)
  return delta > 0 ? `(+${gap})` : `(-${gap})`
}
