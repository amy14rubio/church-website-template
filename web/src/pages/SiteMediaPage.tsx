import { useState, type FormEvent } from 'react'
import { MediaUploadThumbnail } from '@/components/site/MediaUploadThumbnail'
import { BookmarkIcon, FacebookIcon, InstagramIcon, TrashIcon } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaUpload } from '@/hooks/useMediaUpload'
import { useSiteMedia } from '@/hooks/useSiteMedia'
import { useSitePlacements } from '@/hooks/useSitePlacements'
import { useSocialConnections } from '@/hooks/useSocialConnections'
import { useYoutubePage } from '@/hooks/useYoutubePage'
import { fetchFacebookPagePhotos, type FacebookPhoto } from '@/lib/facebookPhotos'
import { fetchInstagramAccountPhotos, type InstagramPhoto } from '@/lib/instagramPhotos'
import { deleteSiteMedia, importFacebookPhoto, importInstagramPhoto, importYoutubeContent, uploadSiteMedia } from '@/lib/siteMedia'
import { startFacebookConnect, startInstagramConnect } from '@/lib/socialConnections'
import { fetchChannelPlaylists, fetchChannelVideos, youtubeWatchUrl, type YoutubePlaylist, type YoutubeVideo } from '@/lib/youtube'
import type { SiteMedia } from '@/types/models'

const SOURCE_LABELS = {
  upload: 'Subida directa',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
}

// A full-size view of one picture — used everywhere a picture (never a
// video/YouTube thumbnail, per the "only for pictures" call) is browsed,
// with the same save/remove action available at this size too. 'bookmark'
// mode toggles library membership (Facebook/Instagram/YouTube imports —
// removing just means "unsaved", it isn't destructive); 'delete' mode is
// for direct uploads, which only ever have a delete action since there's
// no "unsaved" state to return to.
function PhotoLightbox({
  imageUrl,
  caption,
  action,
  onClose,
}: {
  imageUrl: string
  caption: string
  action:
    | { kind: 'bookmark'; saved: boolean; onToggle: () => void; disabled: boolean }
    | { kind: 'delete'; onDelete: () => void; disabled: boolean }
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="relative max-h-[90vh] max-w-2xl">
        <img src={imageUrl} alt={caption} className="max-h-[90vh] w-auto rounded-lg object-contain" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
        >
          ✕
        </button>
        {action.kind === 'bookmark' ? (
          <button
            type="button"
            onClick={action.onToggle}
            disabled={action.disabled}
            aria-label={action.saved ? 'Quitar de la biblioteca' : 'Guardar en la biblioteca'}
            title={action.saved ? 'Quitar de la biblioteca' : 'Guardar en la biblioteca'}
            className="absolute bottom-3 right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-70"
          >
            <BookmarkIcon filled={action.saved} />
          </button>
        ) : (
          <button
            type="button"
            onClick={action.onDelete}
            disabled={action.disabled}
            aria-label="Eliminar"
            title="Eliminar"
            className="absolute bottom-3 right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-70"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  )
}

// Shows a preview grid of everything uploaded directly (not
// imported/saved from elsewhere) right under the upload form — these
// only ever have a delete action (TrashIcon), never a bookmark, since
// there's no "unsaved" state to return an upload to.
function UploadTab({
  uploads,
  onUploaded,
  onDelete,
  deletingId,
}: {
  uploads: SiteMedia[]
  onUploaded: () => void
  onDelete: (id: string, storagePath: string | null) => void
  deletingId: string | null
}) {
  const { appUser } = useAuth()
  const upload = useMediaUpload()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedItem, setExpandedItem] = useState<SiteMedia | null>(null)

  async function handleUpload(event: FormEvent) {
    event.preventDefault()
    const file = upload.file
    if (!file || !appUser) return

    setUploading(true)
    setError(null)
    try {
      await uploadSiteMedia(file, '', appUser.uid)
      upload.handleRemove()
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-4">
      <form
        onSubmit={handleUpload}
        className="flex flex-col items-center gap-3 rounded-lg border border-(--border) bg-(--surface) p-4"
      >
        <MediaUploadThumbnail
          upload={upload}
          boxClassName="border-(--border) text-(--text-muted) hover:bg-(--surface-hover)"
        />
        {error && <p className="text-sm text-(--danger)">{error}</p>}
        <button
          type="submit"
          disabled={uploading || !upload.file}
          className="cursor-pointer rounded-md bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60"
        >
          {uploading ? 'Subiendo…' : 'Subir'}
        </button>
      </form>

      {uploads.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {uploads.map((item) => (
            <div key={item.id} className="relative overflow-hidden rounded-lg border border-(--border) bg-(--surface)">
              {item.type === 'image' ? (
                <button type="button" onClick={() => setExpandedItem(item)} className="block w-full cursor-pointer">
                  <img src={item.url} alt={item.caption} className="aspect-square w-full object-cover" />
                </button>
              ) : (
                <video src={item.url} className="aspect-square w-full object-cover" muted />
              )}
              <button
                type="button"
                onClick={() => onDelete(item.id, item.storagePath)}
                disabled={deletingId === item.id}
                aria-label="Eliminar"
                title="Eliminar"
                className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-70"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {expandedItem && (
        <PhotoLightbox
          imageUrl={expandedItem.url}
          caption={expandedItem.caption}
          onClose={() => setExpandedItem(null)}
          action={{
            kind: 'delete',
            disabled: deletingId === expandedItem.id,
            onDelete: () => {
              onDelete(expandedItem.id, expandedItem.storagePath)
              setExpandedItem(null)
            },
          }}
        />
      )}
    </div>
  )
}

function YoutubeTab({
  mediaByYoutubeId,
  onImported,
  onDelete,
}: {
  mediaByYoutubeId: Map<string, SiteMedia>
  onImported: () => void
  onDelete: (id: string, storagePath: string | null) => void
}) {
  const { appUser } = useAuth()
  const [subTab, setSubTab] = useState<'video' | 'playlist'>('video')
  const [importingId, setImportingId] = useState<string | null>(null)

  const videos = useYoutubePage(fetchChannelVideos, subTab === 'video')
  const playlists = useYoutubePage(fetchChannelPlaylists, subTab === 'playlist')

  async function handleImportVideo(video: YoutubeVideo) {
    if (!appUser) return
    setImportingId(video.videoId)
    try {
      await importYoutubeContent({ kind: 'video', video }, appUser.uid)
      onImported()
    } finally {
      setImportingId(null)
    }
  }

  async function handleImportPlaylist(playlist: YoutubePlaylist) {
    if (!appUser) return
    setImportingId(playlist.playlistId)
    try {
      await importYoutubeContent({ kind: 'playlist', playlist }, appUser.uid)
      onImported()
    } finally {
      setImportingId(null)
    }
  }

  const subTabClasses = (active: boolean) =>
    [
      'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium',
      active ? 'bg-(--accent) text-(--accent-contrast)' : 'text-(--text-muted) hover:bg-(--surface-hover)',
    ].join(' ')

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button type="button" onClick={() => setSubTab('video')} className={subTabClasses(subTab === 'video')}>
          Videos
        </button>
        <button type="button" onClick={() => setSubTab('playlist')} className={subTabClasses(subTab === 'playlist')}>
          Listas de reproducción
        </button>
      </div>

      {subTab === 'video' && (
        <>
          {videos.error && <p className="mt-4 text-sm text-(--danger)">{videos.error}</p>}
          {!videos.items && !videos.error && (
            <p className="mt-4 text-sm text-(--text-muted)">Cargando videos…</p>
          )}
          {videos.items && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {videos.items.map((video) => {
                const existing = mediaByYoutubeId.get(video.videoId)
                const label = existing ? 'Quitar de la biblioteca' : 'Guardar en la biblioteca'
                return (
                  <div key={video.videoId} className="overflow-hidden rounded-lg border border-(--border) bg-(--surface)">
                    <div className="relative">
                      <a href={youtubeWatchUrl(video.videoId, 'video')} target="_blank" rel="noopener noreferrer">
                        <img src={video.thumbnailUrl} alt={video.title} className="aspect-video w-full object-cover" />
                      </a>
                      <button
                        type="button"
                        onClick={() => (existing ? onDelete(existing.id, existing.storagePath) : handleImportVideo(video))}
                        disabled={importingId === video.videoId}
                        aria-label={label}
                        title={label}
                        className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-70"
                      >
                        <BookmarkIcon filled={existing !== undefined} />
                      </button>
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-sm text-(--text)">{video.title}</p>
                    </div>
                  </div>
                )
              })}
              {videos.hasMore && (
                <button
                  type="button"
                  onClick={videos.loadMore}
                  disabled={videos.loadingMore}
                  className="col-span-full mt-2 cursor-pointer rounded-md border border-(--border) py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60"
                >
                  {videos.loadingMore ? 'Cargando…' : 'Cargar más'}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {subTab === 'playlist' && (
        <>
          {playlists.error && <p className="mt-4 text-sm text-(--danger)">{playlists.error}</p>}
          {!playlists.items && !playlists.error && (
            <p className="mt-4 text-sm text-(--text-muted)">Cargando listas de reproducción…</p>
          )}
          {playlists.items && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {playlists.items.map((playlist) => {
                const existing = mediaByYoutubeId.get(playlist.playlistId)
                const label = existing ? 'Quitar de la biblioteca' : 'Guardar en la biblioteca'
                return (
                  <div
                    key={playlist.playlistId}
                    className="overflow-hidden rounded-lg border border-(--border) bg-(--surface)"
                  >
                    <div className="relative">
                      <a href={youtubeWatchUrl(playlist.playlistId, 'playlist')} target="_blank" rel="noopener noreferrer">
                        <img src={playlist.thumbnailUrl} alt={playlist.title} className="aspect-video w-full object-cover" />
                      </a>
                      <button
                        type="button"
                        onClick={() => (existing ? onDelete(existing.id, existing.storagePath) : handleImportPlaylist(playlist))}
                        disabled={importingId === playlist.playlistId}
                        aria-label={label}
                        title={label}
                        className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-70"
                      >
                        <BookmarkIcon filled={existing !== undefined} />
                      </button>
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-sm text-(--text)">{playlist.title}</p>
                      <p className="text-xs text-(--text-muted)">{playlist.itemCount} videos</p>
                    </div>
                  </div>
                )
              })}
              {playlists.hasMore && (
                <button
                  type="button"
                  onClick={playlists.loadMore}
                  disabled={playlists.loadingMore}
                  className="col-span-full mt-2 cursor-pointer rounded-md border border-(--border) py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60"
                >
                  {playlists.loadingMore ? 'Cargando…' : 'Cargar más'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Facebook is wired to the real OAuth flow (functions/src/index.ts).
// Once connected, this tab doubles as a browser over the Page's own
// photos — clicking the bookmark just saves/unsaves it to the library
// (importFacebookPhoto is idempotent; unsaving goes through the same
// onDelete as everywhere else, so a photo in use elsewhere on the site
// still gets the usage warning). Saving doesn't place it anywhere;
// placing happens later from any page's picker via its "Biblioteca" tab.
// Instagram gets its own tab once that Meta app integration exists.
function FacebookTab({
  mediaByFacebookPhotoId,
  onSaved,
  onDelete,
}: {
  mediaByFacebookPhotoId: Map<string, SiteMedia>
  onSaved: () => void
  onDelete: (id: string, storagePath: string | null) => void
}) {
  const { appUser } = useAuth()
  const connections = useSocialConnections()
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [expandedPhoto, setExpandedPhoto] = useState<FacebookPhoto | null>(null)
  const connection = connections.get('facebook')
  const photos = useYoutubePage(fetchFacebookPagePhotos, connection?.connected === true)

  async function handleConnect() {
    setConnecting(true)
    setConnectError(null)
    try {
      await startFacebookConnect()
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'No se pudo iniciar la conexión con Facebook.')
      setConnecting(false)
    }
  }

  async function handleSave(photo: FacebookPhoto) {
    if (!appUser) return
    setSavingId(photo.id)
    try {
      await importFacebookPhoto(photo)
      onSaved()
    } finally {
      setSavingId(null)
    }
  }

  function handleToggle(photo: FacebookPhoto) {
    const existing = mediaByFacebookPhotoId.get(photo.id)
    if (existing) onDelete(existing.id, existing.storagePath)
    else void handleSave(photo)
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-(--border) bg-(--surface) p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface-alt) text-(--text-muted)">
            <FacebookIcon />
          </span>
          <div>
            <p className="text-sm font-medium text-(--text)">Facebook</p>
            <p className="text-xs text-(--text-muted)">
              {connection?.connected ? `Conectado como ${connection.accountName}` : 'No conectado'}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={connecting}
          onClick={handleConnect}
          className="shrink-0 cursor-pointer rounded-md border border-(--border) px-3 py-1.5 text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60"
        >
          {connecting ? 'Conectando…' : connection?.connected ? 'Reconectar' : 'Conectar'}
        </button>
      </div>
      {connectError && <p className="mt-2 text-sm text-(--danger)">{connectError}</p>}
      {!connection?.connected && (
        <p className="mt-2 text-xs text-(--text-muted)">
          Al conectar, se abrirá la pantalla de permisos de Facebook — inicia sesión con la cuenta que administra la
          página de la iglesia y acepta los permisos.
        </p>
      )}

      {connection?.connected && (
        <>
          {photos.error && <p className="mt-4 text-sm text-(--danger)">{photos.error}</p>}
          {!photos.items && !photos.error && <p className="mt-4 text-sm text-(--text-muted)">Cargando fotos…</p>}
          {photos.items && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {photos.items.map((photo) => {
                const existing = mediaByFacebookPhotoId.get(photo.id)
                const label = existing ? 'Quitar de la biblioteca' : 'Guardar en la biblioteca'
                return (
                  <div key={photo.id} className="relative overflow-hidden rounded-lg border border-(--border) bg-(--surface)">
                    <button type="button" onClick={() => setExpandedPhoto(photo)} className="block w-full cursor-pointer">
                      <img src={photo.url} alt={photo.caption} className="aspect-square w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(photo)}
                      disabled={savingId === photo.id}
                      aria-label={label}
                      title={label}
                      className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-70"
                    >
                      <BookmarkIcon filled={existing !== undefined} />
                    </button>
                  </div>
                )
              })}
              {photos.hasMore && (
                <button
                  type="button"
                  onClick={photos.loadMore}
                  disabled={photos.loadingMore}
                  className="col-span-full mt-2 cursor-pointer rounded-md border border-(--border) py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60"
                >
                  {photos.loadingMore ? 'Cargando…' : 'Cargar más'}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {expandedPhoto && (
        <PhotoLightbox
          imageUrl={expandedPhoto.url}
          caption={expandedPhoto.caption}
          onClose={() => setExpandedPhoto(null)}
          action={{
            kind: 'bookmark',
            saved: mediaByFacebookPhotoId.has(expandedPhoto.id),
            disabled: savingId === expandedPhoto.id,
            onToggle: () => handleToggle(expandedPhoto),
          }}
        />
      )}
    </div>
  )
}

// Same shape as FacebookTab — Instagram (via Facebook Login for
// Business) authenticates through the same Facebook account that
// manages the Page, since the Instagram professional account is reached
// through its link to that Page rather than a separate Instagram login.
function InstagramTab({
  mediaByInstagramMediaId,
  onSaved,
  onDelete,
}: {
  mediaByInstagramMediaId: Map<string, SiteMedia>
  onSaved: () => void
  onDelete: (id: string, storagePath: string | null) => void
}) {
  const { appUser } = useAuth()
  const connections = useSocialConnections()
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [expandedPhoto, setExpandedPhoto] = useState<InstagramPhoto | null>(null)
  const connection = connections.get('instagram')
  const photos = useYoutubePage(fetchInstagramAccountPhotos, connection?.connected === true)

  async function handleConnect() {
    setConnecting(true)
    setConnectError(null)
    try {
      await startInstagramConnect()
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'No se pudo iniciar la conexión con Instagram.')
      setConnecting(false)
    }
  }

  async function handleSave(photo: InstagramPhoto) {
    if (!appUser) return
    setSavingId(photo.id)
    try {
      await importInstagramPhoto(photo)
      onSaved()
    } finally {
      setSavingId(null)
    }
  }

  function handleToggle(photo: InstagramPhoto) {
    const existing = mediaByInstagramMediaId.get(photo.id)
    if (existing) onDelete(existing.id, existing.storagePath)
    else void handleSave(photo)
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-(--border) bg-(--surface) p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface-alt) text-(--text-muted)">
            <InstagramIcon />
          </span>
          <div>
            <p className="text-sm font-medium text-(--text)">Instagram</p>
            <p className="text-xs text-(--text-muted)">
              {connection?.connected ? `Conectado como ${connection.accountName}` : 'No conectado'}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={connecting}
          onClick={handleConnect}
          className="shrink-0 cursor-pointer rounded-md border border-(--border) px-3 py-1.5 text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60"
        >
          {connecting ? 'Conectando…' : connection?.connected ? 'Reconectar' : 'Conectar'}
        </button>
      </div>
      {connectError && <p className="mt-2 text-sm text-(--danger)">{connectError}</p>}
      {!connection?.connected && (
        <p className="mt-2 text-xs text-(--text-muted)">
          Al conectar, se abrirá la pantalla de permisos de Facebook — inicia sesión con la cuenta que administra la
          página de la iglesia (la cuenta de Instagram debe estar vinculada a esa página) y acepta los permisos.
        </p>
      )}

      {connection?.connected && (
        <>
          {photos.error && <p className="mt-4 text-sm text-(--danger)">{photos.error}</p>}
          {!photos.items && !photos.error && <p className="mt-4 text-sm text-(--text-muted)">Cargando fotos…</p>}
          {photos.items && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {photos.items.map((photo) => {
                const existing = mediaByInstagramMediaId.get(photo.id)
                const label = existing ? 'Quitar de la biblioteca' : 'Guardar en la biblioteca'
                return (
                  <div key={photo.id} className="relative overflow-hidden rounded-lg border border-(--border) bg-(--surface)">
                    <button type="button" onClick={() => setExpandedPhoto(photo)} className="block w-full cursor-pointer">
                      <img src={photo.url} alt={photo.caption} className="aspect-square w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(photo)}
                      disabled={savingId === photo.id}
                      aria-label={label}
                      title={label}
                      className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-70"
                    >
                      <BookmarkIcon filled={existing !== undefined} />
                    </button>
                  </div>
                )
              })}
              {photos.hasMore && (
                <button
                  type="button"
                  onClick={photos.loadMore}
                  disabled={photos.loadingMore}
                  className="col-span-full mt-2 cursor-pointer rounded-md border border-(--border) py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60"
                >
                  {photos.loadingMore ? 'Cargando…' : 'Cargar más'}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {expandedPhoto && (
        <PhotoLightbox
          imageUrl={expandedPhoto.url}
          caption={expandedPhoto.caption}
          onClose={() => setExpandedPhoto(null)}
          action={{
            kind: 'bookmark',
            saved: mediaByInstagramMediaId.has(expandedPhoto.id),
            disabled: savingId === expandedPhoto.id,
            onToggle: () => handleToggle(expandedPhoto),
          }}
        />
      )}
    </div>
  )
}

// The admin/co-admin media library — lets an admin add photos/videos for
// the public website without touching code. Uploads go straight from the
// browser to Firebase Storage (storage.rules enforces who can write) and
// land in the library immediately; YouTube import reads the channel's
// public videos and playlists (no OAuth needed — see src/lib/youtube.ts)
// and only ever stores the id, embedding the real thing rather than
// re-hosting it. Facebook connects via real OAuth (functions/src/index.ts)
// — its tab doubles as a browser for saving Page photos to the library.
// Instagram connects the same way (via Facebook Login for Business,
// reusing the church's Facebook account since the linked Instagram
// professional account is reached through the Page it's connected to).
// A page's own picker (see PhotoPickerModal) then reads from that same
// library via its "Biblioteca" tab (all image types, not just one
// source), so admins aren't stuck paging through a live feed every time
// they fill a slot — and can even upload a fresh photo right there.
export function SiteMediaPage() {
  const media = useSiteMedia()
  const placements = useSitePlacements()
  const [tab, setTab] = useState<'upload' | 'youtube' | 'facebook' | 'instagram' | 'library'>('upload')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; storagePath: string | null; usageCount: number } | null>(
    null,
  )
  const [expandedLibraryItem, setExpandedLibraryItem] = useState<SiteMedia | null>(null)

  function handleDelete(id: string, storagePath: string | null) {
    const usageCount = [...placements.values()].filter((placement) => placement.mediaId === id).length
    if (usageCount > 0) {
      setPendingDelete({ id, storagePath, usageCount })
      return
    }
    void performDelete(id, storagePath)
  }

  async function performDelete(id: string, storagePath: string | null) {
    setDeletingId(id)
    try {
      await deleteSiteMedia(id, storagePath)
    } finally {
      setDeletingId(null)
    }
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return
    const { id, storagePath } = pendingDelete
    setPendingDelete(null)
    await performDelete(id, storagePath)
  }

  const mediaByYoutubeId = new Map(media.filter((item) => item.youtubeId).map((item) => [item.youtubeId!, item]))
  const mediaByFacebookPhotoId = new Map(media.filter((item) => item.facebookPhotoId).map((item) => [item.facebookPhotoId!, item]))
  const mediaByInstagramMediaId = new Map(media.filter((item) => item.instagramMediaId).map((item) => [item.instagramMediaId!, item]))
  const uploadedMedia = media.filter((item) => item.source === 'upload')

  const tabClasses = (active: boolean) =>
    [
      'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium',
      active ? 'bg-(--accent) text-(--accent-contrast)' : 'text-(--text-muted) hover:bg-(--surface-hover)',
    ].join(' ')

  return (
    <div className="mx-auto max-w-3xl flex-1 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-(--text)">Medios del sitio</h1>
      <p className="mt-1 text-sm text-(--text-muted)">
        Agrega fotos, videos o contenido de YouTube y Facebook para el sitio público de la iglesia. Lo que guardes en
        la Biblioteca queda disponible para elegir al editar cualquier página.
      </p>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setTab('upload')} className={tabClasses(tab === 'upload')}>
          Subir archivo
        </button>
        <button type="button" onClick={() => setTab('youtube')} className={tabClasses(tab === 'youtube')}>
          YouTube
        </button>
        <button type="button" onClick={() => setTab('facebook')} className={tabClasses(tab === 'facebook')}>
          Facebook
        </button>
        <button type="button" onClick={() => setTab('instagram')} className={tabClasses(tab === 'instagram')}>
          Instagram
        </button>
        <button type="button" onClick={() => setTab('library')} className={tabClasses(tab === 'library')}>
          Biblioteca
        </button>
      </div>

      {tab === 'upload' && (
        <UploadTab uploads={uploadedMedia} onUploaded={() => setTab('upload')} onDelete={handleDelete} deletingId={deletingId} />
      )}
      {tab === 'youtube' && (
        <YoutubeTab mediaByYoutubeId={mediaByYoutubeId} onImported={() => {}} onDelete={handleDelete} />
      )}
      {tab === 'facebook' && (
        <FacebookTab mediaByFacebookPhotoId={mediaByFacebookPhotoId} onSaved={() => {}} onDelete={handleDelete} />
      )}
      {tab === 'instagram' && (
        <InstagramTab mediaByInstagramMediaId={mediaByInstagramMediaId} onSaved={() => {}} onDelete={handleDelete} />
      )}

      {tab === 'library' && (
        <div className="mt-4">
          <p className="text-xs text-(--text-muted)">
            Si eliminas algo que está en uso en el sitio público, también se quitará de esas páginas.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {media.map((item) => {
              const isUpload = item.source === 'upload'
              const label = isUpload ? 'Eliminar' : 'Quitar de la biblioteca'
              return (
                <div key={item.id} className="relative overflow-hidden rounded-lg border border-(--border) bg-(--surface)">
                  {item.source === 'youtube' ? (
                    <a
                      href={youtubeWatchUrl(item.youtubeId!, item.youtubeKind!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block"
                    >
                      <img src={item.url} alt={item.caption} className="aspect-video w-full object-cover" />
                      <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {item.youtubeKind === 'playlist' ? 'Lista de YouTube' : 'YouTube'}
                      </span>
                    </a>
                  ) : item.type === 'image' ? (
                    <button type="button" onClick={() => setExpandedLibraryItem(item)} className="block w-full cursor-pointer">
                      <img src={item.url} alt={item.caption} className="aspect-square w-full object-cover" />
                    </button>
                  ) : (
                    <video src={item.url} className="aspect-square w-full object-cover" muted />
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.storagePath)}
                    disabled={deletingId === item.id}
                    aria-label={label}
                    title={label}
                    className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-70"
                  >
                    {isUpload ? <TrashIcon /> : <BookmarkIcon filled />}
                  </button>
                  <div className="p-2">
                    <p className="truncate text-xs text-(--text-muted)">{SOURCE_LABELS[item.source]}</p>
                    {item.caption && <p className="mt-0.5 truncate text-sm text-(--text)">{item.caption}</p>}
                  </div>
                </div>
              )
            })}
          </div>

          {media.length === 0 && <p className="mt-4 text-center text-sm text-(--text-muted)">Aún no hay medios.</p>}
        </div>
      )}

      {expandedLibraryItem && (
        <PhotoLightbox
          imageUrl={expandedLibraryItem.url}
          caption={expandedLibraryItem.caption}
          onClose={() => setExpandedLibraryItem(null)}
          action={
            expandedLibraryItem.source === 'upload'
              ? {
                  kind: 'delete',
                  disabled: deletingId === expandedLibraryItem.id,
                  onDelete: () => {
                    handleDelete(expandedLibraryItem.id, expandedLibraryItem.storagePath)
                    setExpandedLibraryItem(null)
                  },
                }
              : {
                  kind: 'bookmark',
                  saved: true,
                  disabled: deletingId === expandedLibraryItem.id,
                  onToggle: () => {
                    handleDelete(expandedLibraryItem.id, expandedLibraryItem.storagePath)
                    setExpandedLibraryItem(null)
                  },
                }
          }
        />
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPendingDelete(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-(--surface) p-5"
          >
            <h2 className="text-base font-semibold text-(--text)">¿Eliminar de la biblioteca?</h2>
            <p className="mt-2 text-sm text-(--text-muted)">
              Esto está en uso en {pendingDelete.usageCount} {pendingDelete.usageCount === 1 ? 'lugar' : 'lugares'} del
              sitio público. Al eliminarlo de la biblioteca, también se quitará de esos lugares.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="cursor-pointer rounded-md border border-(--border) px-3 py-1.5 text-sm font-medium text-(--text) hover:bg-(--surface-hover)"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmPendingDelete}
                className="cursor-pointer rounded-md bg-(--danger) px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
