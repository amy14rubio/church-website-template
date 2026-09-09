import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'

export type MediaUploadKind = 'image' | 'video'

// Adapted from a reference `useImageUpload` hook, generalized to also
// cover video (site uploads accept either — see assertUploadableFile) so
// an admin sees a real local preview of whichever file they just picked
// before it's actually uploaded to Storage, rather than a bare OS file
// input that gives no feedback about what (if anything) got selected.
// Exposes the raw `file` too (the reference hook only exposed a preview
// URL) since callers here need the actual File to hand to uploadSiteMedia.
export function useMediaUpload() {
  const previewRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [kind, setKind] = useState<MediaUploadKind | null>(null)

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = URL.createObjectURL(selected)
    previewRef.current = url
    setFile(selected)
    setPreviewUrl(url)
    setKind(selected.type.startsWith('video/') ? 'video' : 'image')
  }, [])

  const handleRemove = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setFile(null)
    setPreviewUrl(null)
    setKind(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  return { file, previewUrl, kind, fileInputRef, handleThumbnailClick, handleFileChange, handleRemove }
}
