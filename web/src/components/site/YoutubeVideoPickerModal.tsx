import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { useSiteMedia } from '@/hooks/useSiteMedia'
import { useYoutubePage } from '@/hooks/useYoutubePage'
import { fetchChannelPlaylists, fetchChannelVideos, type YoutubeSelection } from '@/lib/youtube'
import type { SiteMedia } from '@/types/models'

// Reconstructs a YoutubeSelection from an already-imported library item
// so picking it can reuse the exact same onSelect → assignYoutubeSlot
// path as the Videos/Playlists tabs — importYoutubeContent is
// idempotent by youtubeId, so this just re-resolves to the same
// mediaId instead of importing a duplicate. itemCount/publishedAt are
// display-only fields the other tabs' grids use; assignYoutubeSlot
// never reads them, so placeholders here are harmless.
function toYoutubeSelection(item: SiteMedia): YoutubeSelection {
  const youtubeId = item.youtubeId ?? ''
  return item.youtubeKind === 'playlist'
    ? { kind: 'playlist', playlist: { playlistId: youtubeId, title: item.caption, thumbnailUrl: item.url, itemCount: 0 } }
    : { kind: 'video', video: { videoId: youtubeId, title: item.caption, thumbnailUrl: item.url, publishedAt: '' } }
}

function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="col-span-full mt-2 cursor-pointer rounded-md border border-(--site-border) py-2 text-sm font-medium text-(--site-text) hover:bg-(--site-placeholder)/10 disabled:opacity-60"
    >
      {loading ? 'Cargando…' : 'Cargar más'}
    </button>
  )
}

// A focused browse-and-pick modal over the church's YouTube channel —
// used wherever an admin fills a specific slot on the site (see
// EditableYoutubeSlot), as opposed to SiteMediaPage's own YouTube tab
// which browses into the general library instead of one placement.
// "Biblioteca" (the default tab) lists videos/playlists already
// imported into the library — same idea as PhotoPickerModal's own
// library tab. "Videos"/"Listas de reproducción" browse the channel
// live instead, each with its own "Cargar más" to page further back
// than the most recent batch.
export function YoutubeVideoPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (selection: YoutubeSelection) => void | Promise<void>
  onClose: () => void
}) {
  const [tab, setTab] = useState<'library' | 'video' | 'playlist'>('library')
  const [selectingId, setSelectingId] = useState<string | null>(null)

  const videos = useYoutubePage(fetchChannelVideos, tab === 'video')
  const playlists = useYoutubePage(fetchChannelPlaylists, tab === 'playlist')
  const media = useSiteMedia()
  const libraryVideos = media.filter((item) => item.type === 'video')

  // Without this, scrolling the video/playlist grid past its own top or
  // bottom edge "chains" into scrolling the page behind the backdrop.
  useModalScrollLock()

  async function handlePick(selection: YoutubeSelection) {
    const id = selection.kind === 'video' ? selection.video.videoId : selection.playlist.playlistId
    setSelectingId(id)
    try {
      await onSelect(selection)
    } finally {
      setSelectingId(null)
    }
  }

  const tabClasses = (active: boolean) =>
    [
      'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium',
      active ? 'bg-(--site-maroon) text-(--site-maroon-contrast)' : 'text-(--site-text-muted) hover:bg-(--site-placeholder)/10',
    ].join(' ')

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        data-lenis-prevent
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-lg bg-(--site-bg) p-4 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--site-text)">Elegir de YouTube</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="cursor-pointer rounded-full p-1 text-(--site-text-muted) hover:bg-(--site-placeholder)/10"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setTab('library')} className={tabClasses(tab === 'library')}>
            Biblioteca
          </button>
          <button type="button" onClick={() => setTab('video')} className={tabClasses(tab === 'video')}>
            Videos
          </button>
          <button type="button" onClick={() => setTab('playlist')} className={tabClasses(tab === 'playlist')}>
            Listas de reproducción
          </button>
        </div>

        {tab === 'library' && (
          <>
            {libraryVideos.length === 0 && (
              <p className="mt-4 text-sm text-(--site-text-muted)">
                Todavía no has guardado videos en la biblioteca. Elige uno de las pestañas Videos o Listas de
                reproducción para empezar.
              </p>
            )}
            {libraryVideos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {libraryVideos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePick(toYoutubeSelection(item))}
                    disabled={selectingId !== null}
                    className="cursor-pointer overflow-hidden rounded-lg border border-(--site-border) text-left hover:ring-2 hover:ring-(--site-maroon) disabled:opacity-60"
                  >
                    <img src={item.url} alt={item.caption} className="aspect-video w-full object-cover" />
                    <p className="line-clamp-2 p-2 text-sm text-(--site-text)">
                      {selectingId === item.youtubeId ? 'Agregando…' : item.caption}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'video' && (
          <>
            {videos.error && <p className="mt-4 text-sm text-(--site-danger)">{videos.error}</p>}
            {!videos.items && !videos.error && (
              <p className="mt-4 text-sm text-(--site-text-muted)">Cargando videos…</p>
            )}
            {videos.items && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {videos.items.map((video) => (
                  <button
                    key={video.videoId}
                    type="button"
                    onClick={() => handlePick({ kind: 'video', video })}
                    disabled={selectingId !== null}
                    className="cursor-pointer overflow-hidden rounded-lg border border-(--site-border) text-left hover:ring-2 hover:ring-(--site-maroon) disabled:opacity-60"
                  >
                    <img src={video.thumbnailUrl} alt={video.title} className="aspect-video w-full object-cover" />
                    <p className="line-clamp-2 p-2 text-sm text-(--site-text)">
                      {selectingId === video.videoId ? 'Agregando…' : video.title}
                    </p>
                  </button>
                ))}
                {videos.hasMore && <LoadMoreButton onClick={videos.loadMore} loading={videos.loadingMore} />}
              </div>
            )}
          </>
        )}

        {tab === 'playlist' && (
          <>
            {playlists.error && <p className="mt-4 text-sm text-(--site-danger)">{playlists.error}</p>}
            {!playlists.items && !playlists.error && (
              <p className="mt-4 text-sm text-(--site-text-muted)">Cargando listas de reproducción…</p>
            )}
            {playlists.items && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {playlists.items.map((playlist) => (
                  <button
                    key={playlist.playlistId}
                    type="button"
                    onClick={() => handlePick({ kind: 'playlist', playlist })}
                    disabled={selectingId !== null}
                    className="cursor-pointer overflow-hidden rounded-lg border border-(--site-border) text-left hover:ring-2 hover:ring-(--site-maroon) disabled:opacity-60"
                  >
                    <img src={playlist.thumbnailUrl} alt={playlist.title} className="aspect-video w-full object-cover" />
                    <p className="p-2 text-sm text-(--site-text)">
                      <span className="line-clamp-2">
                        {selectingId === playlist.playlistId ? 'Agregando…' : playlist.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-(--site-text-muted)">{playlist.itemCount} videos</span>
                    </p>
                  </button>
                ))}
                {playlists.hasMore && <LoadMoreButton onClick={playlists.loadMore} loading={playlists.loadingMore} />}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
