export type ButtonMode = '4B' | '5B' | '6B' | '8B'
export type Difficulty = 'NM' | 'HD' | 'MX' | 'SC'

export interface Chart {
  id: string
  title: string
  button: ButtonMode
  difficulty: Difficulty
  createdAt: string
  /** V-ARCHIVE에 저장된 최고기록 (미갱신 시 기준선용) */
  archiveBest?: number
}

export interface Play {
  id: string
  chartId: string
  accuracy: number
  playedAt: string
  maxCombo?: boolean
  source: 'manual' | 'log' | 'live'
  status?: '미갱신' | '성공'
}

/** 100% → Perfect Play (Max Combo 체크 없이도 PP) */
export function isPerfectPlay(accuracy: number, _maxCombo?: boolean): boolean {
  return accuracy >= 100
}

export interface AppData {
  charts: Chart[]
  plays: Play[]
}

export interface ParsedLogPlay {
  time: string
  button: ButtonMode
  difficulty: Difficulty
  title: string
  accuracy: number
  status: '미갱신' | '성공'
  maxCombo?: boolean
}

export interface LiveBridgeEvent {
  id: string
  at: string
  time: string
  status: '미갱신' | '성공'
  button: ButtonMode
  difficulty: Difficulty
  title: string
  accuracy: number
  maxCombo?: boolean
  raw: string
}
