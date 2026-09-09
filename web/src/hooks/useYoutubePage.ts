import { useEffect, useState } from 'react'
import type { YoutubePage } from '@/lib/youtube'

// Shared "load more" pagination for the YouTube video/playlist pickers
// (used 4x: videos + playlists, in both the slot picker and the media
// library's YouTube tab) — fetches page 1 once `active`, accumulates
// further pages on loadMore(). `fetchPage` should be a stable reference
// (e.g. fetchChannelVideos itself) since it's only called from effects/
// callbacks, never a dependency.
export function useYoutubePage<T>(fetchPage: (pageToken?: string) => Promise<YoutubePage<T>>, active: boolean) {
  const [items, setItems] = useState<T[] | null>(null)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active || items !== null) return
    fetchPage()
      .then((page) => {
        setItems(page.items)
        setNextPageToken(page.nextPageToken)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPage is stable per caller, items is checked not depended on
  }, [active])

  async function loadMore() {
    if (!nextPageToken) return
    setLoadingMore(true)
    try {
      const page = await fetchPage(nextPageToken)
      setItems((prev) => [...(prev ?? []), ...page.items])
      setNextPageToken(page.nextPageToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar.')
    } finally {
      setLoadingMore(false)
    }
  }

  return { items, hasMore: nextPageToken !== null, loadingMore, error, loadMore }
}
