import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteEditMode } from '@/contexts/SiteEditModeContext'
import { useSiteTextValue } from '@/contexts/SiteTextContext'
import { setSiteText } from '@/lib/siteText'

function toEmbedUrl(url: string): string | null {
  const match = url.trim().match(/instagram\.com\/(reel|p)\/([^/?#]+)/)
  return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed` : null
}

// A real, live embed of one specific Instagram reel/post — an iframe
// pointed at Instagram's own public embed endpoint
// (instagram.com/reel/{id}/embed), the same mechanism any blog uses to
// embed a single post. No API key, login, or app review needed; the
// admin just pastes the reel's normal public URL and this renders the
// actual Instagram content, not a static thumbnail.
export function InstagramReelEmbed({ slotKey }: { slotKey: string }) {
  const { appUser } = useAuth()
  const { editMode } = useSiteEditMode()
  const isEditor = (appUser?.role === 'admin' || appUser?.role === 'coAdmin') && editMode
  const url = useSiteTextValue(slotKey, '')
  const [draft, setDraft] = useState(url)
  useEffect(() => setDraft(url), [url])
  const embedUrl = url ? toEmbedUrl(url) : null

  async function handleBlur() {
    const next = draft.trim()
    if (!appUser || next === url) return
    await setSiteText(slotKey, next, appUser.uid)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-9/16 w-full overflow-hidden rounded-md bg-(--site-placeholder)">
        {embedUrl ? (
          <iframe src={embedUrl} className="h-full w-full" scrolling="no" allow="encrypted-media" title="Reel de Instagram" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-white/70">
            {isEditor ? 'Pega el link del reel abajo' : 'Reel de Instagram'}
          </div>
        )}
      </div>
      {isEditor && (
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={handleBlur}
          placeholder="https://www.instagram.com/reel/..."
          className="rounded border border-(--site-dark-border) bg-transparent px-2 py-1 text-xs text-(--site-dark-text)"
        />
      )}
    </div>
  )
}
