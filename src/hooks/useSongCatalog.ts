import { useEffect, useMemo, useState } from 'react'
import {
  buildSongIndex,
  fetchSongCatalog,
  isCacheFresh,
  loadCachedSongs,
  type SongEntry,
  type SongIndex,
} from '../lib/songCatalog'

const EMPTY_INDEX: SongIndex = { byName: new Map(), entries: [] }

export function useSongCatalog() {
  const [songs, setSongs] = useState<SongEntry[]>(() => loadCachedSongs())
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    () => (songs.length > 0 ? 'ready' : 'idle'),
  )
  const index = useMemo(
    () => (songs.length > 0 ? buildSongIndex(songs) : EMPTY_INDEX),
    [songs],
  )

  useEffect(() => {
    let cancelled = false
    const cached = loadCachedSongs()

    async function load() {
      if (isCacheFresh() && cached.length > 0) {
        setSongs(cached)
        setStatus('ready')
        return
      }

      setStatus(cached.length > 0 ? 'ready' : 'loading')
      try {
        const next = await fetchSongCatalog()
        if (cancelled) return
        setSongs(next)
        setStatus('ready')
      } catch {
        if (cancelled) return
        if (cached.length > 0) {
          setSongs(cached)
          setStatus('ready')
        } else {
          setStatus('error')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { songs, index, status }
}
