import { useEffect, useState } from 'react'
import {
  fetchSongCatalog,
  isCacheFresh,
  loadCachedSongs,
  type SongEntry,
} from '../lib/songCatalog'

export function useSongCatalog() {
  const [songs, setSongs] = useState<SongEntry[]>(() => loadCachedSongs())
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    () => (loadCachedSongs().length > 0 ? 'ready' : 'idle'),
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

  return { songs, status }
}
