import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { MediaUploadThumbnail } from '@/components/site/MediaUploadThumbnail'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaUpload } from '@/hooks/useMediaUpload'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { useSiteMedia } from '@/hooks/useSiteMedia'
import { useYoutubePage } from '@/hooks/useYoutubePage'
import { fetchFacebookPagePhotos, type FacebookPhoto } from '@/lib/facebookPhotos'
import { fetchInstagramAccountPhotos, type InstagramPhoto } from '@/lib/instagramPhotos'
import { importFacebookPhoto, importInstagramPhoto, uploadSiteMedia } from '@/lib/siteMedia'
import type { MediaSelection } from '@/lib/sitePlacements'
import type { SiteMedia } from '@/types/models'

// A focused browse-and-pick modal for filling one photo slot on the
// public site. "Facebook"/"Instagram" each page through that account's
// live feed, "Subir" uploads a fresh file directly (so an admin doesn't
// have to go to Medios del sitio first), and "Biblioteca" lists
// everything already saved to the library — uploads and both social
// sources together, not just one — since it's just the admin's own
// curated list, no pagination needed there. Whichever tab a pick comes
// from, this resolves it to an already-in-library { id, url, caption }
// before calling onSelect, so the caller (EditablePhotoSlot) only ever
// needs one code path to place it — see assignMediaSlot.
export function PhotoPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (selection: MediaSelection) => void | Promise<void>
  onClose: () => void
}) {
  const { appUser } = useAuth()
  const [tab, setTab] = useState<'facebook' | 'instagram' | 'upload' | 'library'>('library')
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const photos = useYoutubePage(fetchFacebookPagePhotos, tab === 'facebook')
  const igPhotos = useYoutubePage(fetchInstagramAccountPhotos, tab === 'instagram')
  const media = useSiteMedia()
  const libraryPhotos = media.filter((item) => item.type === 'image')

  const upload = useMediaUpload()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useModalScrollLock()

  async function handlePickFacebook(photo: FacebookPhoto) {
    if (!appUser) return
    setSelectingId(photo.id)
    try {
      const media = await importFacebookPhoto(photo)
      await onSelect({ id: media.id, url: media.url, caption: photo.caption })
    } finally {
      setSelectingId(null)
    }
  }

  async function handlePickInstagram(photo: InstagramPhoto) {
    if (!appUser) return
    setSelectingId(photo.id)
    try {
      const media = await importInstagramPhoto(photo)
      await onSelect({ id: media.id, url: media.url, caption: photo.caption })
    } finally {
      setSelectingId(null)
    }
  }

  async function handlePickLibrary(item: SiteMedia) {
    setSelectingId(item.id)
    try {
      await onSelect({ id: item.id, url: item.url, caption: item.caption })
    } finally {
      setSelectingId(null)
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault()
    const file = upload.file
    if (!file || !appUser) return
    setUploading(true)
    setUploadError(null)
    try {
      const uploaded = await uploadSiteMedia(file, '', appUser.uid)
      await onSelect({ id: uploaded.id, url: uploaded.url, caption: '' })
      upload.handleRemove()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir el archivo.')
    } finally {
      setUploading(false)
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
          <h2 className="text-lg font-semibold text-(--site-text)">Elegir una foto</h2>
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
          <button type="button" onClick={() => setTab('facebook')} className={tabClasses(tab === 'facebook')}>
            Facebook
          </button>
          <button type="button" onClick={() => setTab('instagram')} className={tabClasses(tab === 'instagram')}>
            Instagram
          </button>
          <button type="button" onClick={() => setTab('upload')} className={tabClasses(tab === 'upload')}>
            Subir
          </button>
        </div>

        {tab === 'facebook' && (
          <>
            {photos.error && <p className="mt-4 text-sm text-(--site-danger)">{photos.error}</p>}
            {!photos.items && !photos.error && <p className="mt-4 text-sm text-(--site-text-muted)">Cargando fotos…</p>}
            {photos.items && photos.items.length === 0 && (
              <p className="mt-4 text-sm text-(--site-text-muted)">La página no tiene fotos todavía.</p>
            )}
            {photos.items && photos.items.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.items.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handlePickFacebook(photo)}
                    disabled={selectingId !== null}
                    className="cursor-pointer overflow-hidden rounded-lg border border-(--site-border) text-left hover:ring-2 hover:ring-(--site-maroon) disabled:opacity-60"
                  >
                    <img src={photo.url} alt={photo.caption} className="aspect-square w-full object-cover" />
                    {selectingId === photo.id && <p className="p-2 text-sm text-(--site-text)">Agregando…</p>}
                  </button>
                ))}
                {photos.hasMore && (
                  <button
                    type="button"
                    onClick={photos.loadMore}
                    disabled={photos.loadingMore}
                    className="col-span-full mt-2 cursor-pointer rounded-md border border-(--site-border) py-2 text-sm font-medium text-(--site-text) hover:bg-(--site-placeholder)/10 disabled:opacity-60"
                  >
                    {photos.loadingMore ? 'Cargando…' : 'Cargar más'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'instagram' && (
          <>
            {igPhotos.error && <p className="mt-4 text-sm text-(--site-danger)">{igPhotos.error}</p>}
            {!igPhotos.items && !igPhotos.error && <p className="mt-4 text-sm text-(--site-text-muted)">Cargando fotos…</p>}
            {igPhotos.items && igPhotos.items.length === 0 && (
              <p className="mt-4 text-sm text-(--site-text-muted)">La cuenta no tiene fotos todavía.</p>
            )}
            {igPhotos.items && igPhotos.items.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {igPhotos.items.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handlePickInstagram(photo)}
                    disabled={selectingId !== null}
                    className="cursor-pointer overflow-hidden rounded-lg border border-(--site-border) text-left hover:ring-2 hover:ring-(--site-maroon) disabled:opacity-60"
                  >
                    <img src={photo.url} alt={photo.caption} className="aspect-square w-full object-cover" />
                    {selectingId === photo.id && <p className="p-2 text-sm text-(--site-text)">Agregando…</p>}
                  </button>
                ))}
                {igPhotos.hasMore && (
                  <button
                    type="button"
                    onClick={igPhotos.loadMore}
                    disabled={igPhotos.loadingMore}
                    className="col-span-full mt-2 cursor-pointer rounded-md border border-(--site-border) py-2 text-sm font-medium text-(--site-text) hover:bg-(--site-placeholder)/10 disabled:opacity-60"
                  >
                    {igPhotos.loadingMore ? 'Cargando…' : 'Cargar más'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'upload' && (
          <form onSubmit={handleUpload} className="mt-4 flex flex-col items-center gap-3">
            <MediaUploadThumbnail
              upload={upload}
              accept="image/*"
              boxClassName="border-(--site-border) text-(--site-text-muted) hover:bg-(--site-placeholder)/10"
            />
            {uploadError && <p className="text-sm text-(--site-danger)">{uploadError}</p>}
            <button
              type="submit"
              disabled={uploading || !upload.file}
              className="cursor-pointer rounded-md bg-(--site-maroon) px-4 py-2 text-sm font-medium text-(--site-maroon-contrast) hover:bg-(--site-maroon-dark) disabled:opacity-60"
            >
              {uploading ? 'Subiendo…' : 'Subir y usar aquí'}
            </button>
          </form>
        )}

        {tab === 'library' && (
          <>
            {libraryPhotos.length === 0 && (
              <p className="mt-4 text-sm text-(--site-text-muted)">
                Todavía no has guardado fotos en la biblioteca. Ve a Medios del sitio para guardar o subir algunas.
              </p>
            )}
            {libraryPhotos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {libraryPhotos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePickLibrary(item)}
                    disabled={selectingId !== null}
                    className="cursor-pointer overflow-hidden rounded-lg border border-(--site-border) text-left hover:ring-2 hover:ring-(--site-maroon) disabled:opacity-60"
                  >
                    <img src={item.url} alt={item.caption} className="aspect-square w-full object-cover" />
                    {selectingId === item.id && <p className="p-2 text-sm text-(--site-text)">Agregando…</p>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
