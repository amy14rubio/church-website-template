import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { MediaUploadThumbnail } from '@/components/site/MediaUploadThumbnail'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaUpload } from '@/hooks/useMediaUpload'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { useSiteMedia } from '@/hooks/useSiteMedia'
import { uploadSiteMedia } from '@/lib/siteMedia'
import type { MediaSelection } from '@/lib/sitePlacements'
import type { SiteMedia } from '@/types/models'

// A focused picker for filling one background-video slot (currently just
// the home page's hero) — much smaller than PhotoPickerModal since
// there's no Facebook/Instagram video browsing built yet, just
// "Biblioteca" (any video already uploaded before) and "Subir" (upload a
// fresh clip directly, same MediaUploadThumbnail preview PhotoPickerModal
// uses for photos). No caption/description field — a slot's title comes
// from whichever YouTube video it's linked to (see setLinkedYoutubeVideo
// in HomeTeachingsCarousel), not from a caption typed in at upload time.
// Resolves to an already-in-library { id, url, caption } before calling
// onSelect, same contract as PhotoPickerModal.
export function VideoPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (selection: MediaSelection) => void | Promise<void>
  onClose: () => void
}) {
  const { appUser } = useAuth()
  const [tab, setTab] = useState<'library' | 'upload'>('library')
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const media = useSiteMedia()
  const libraryVideos = media.filter((item) => item.type === 'video')

  const upload = useMediaUpload()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useModalScrollLock()

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
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir el video.')
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
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-lg bg-(--site-bg) p-4 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--site-text)">Elegir un video</h2>
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
          <button type="button" onClick={() => setTab('upload')} className={tabClasses(tab === 'upload')}>
            Subir
          </button>
        </div>

        {tab === 'library' && (
          <>
            {libraryVideos.length === 0 && (
              <p className="mt-4 text-sm text-(--site-text-muted)">Todavía no has subido ningún video.</p>
            )}
            {libraryVideos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {libraryVideos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePickLibrary(item)}
                    disabled={selectingId !== null}
                    className="cursor-pointer overflow-hidden rounded-lg border border-(--site-border) text-left hover:ring-2 hover:ring-(--site-maroon) disabled:opacity-60"
                  >
                    <video src={item.url} preload="metadata" muted playsInline className="aspect-video w-full object-cover" />
                    {item.caption && <p className="line-clamp-1 p-2 text-xs text-(--site-text)">{item.caption}</p>}
                    {selectingId === item.id && <p className="p-2 text-sm text-(--site-text)">Agregando…</p>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'upload' && (
          <form onSubmit={handleUpload} className="mt-4 flex flex-col items-center gap-3">
            <MediaUploadThumbnail
              upload={upload}
              accept="video/*"
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
      </div>
    </div>,
    document.body,
  )
}
