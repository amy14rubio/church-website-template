import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { importYoutubeContent } from '@/lib/siteMedia'
import type { YoutubeSelection } from '@/lib/youtube'
import type { ImageFocalPoint, YoutubeKind } from '@/types/models'

// Assigns a YouTube video or playlist to a named slot on the public site
// — imports it into the media library first if it isn't there yet
// (idempotent), then points the slot at it. One write covers both "add
// to library" and "place it here" in a single admin click.
export async function assignYoutubeSlot(
  slotKey: string,
  selection: YoutubeSelection,
  uid: string,
): Promise<void> {
  const mediaId = await importYoutubeContent(selection, uid)
  const youtubeId = selection.kind === 'video' ? selection.video.videoId : selection.playlist.playlistId
  const title = selection.kind === 'video' ? selection.video.title : selection.playlist.title

  await setDoc(doc(db, 'sitePlacements', slotKey), {
    slotKey,
    mediaId,
    youtubeId,
    youtubeKind: selection.kind,
    imageUrl: null,
    title,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })
}

// What PhotoPickerModal hands back regardless of which tab a pick came
// from (live Facebook, a fresh upload, or the library) — it's already
// resolved to a real siteMedia doc by that point (importing it first if
// needed), so placing it is always this one plain write.
export interface MediaSelection {
  id: string
  url: string
  caption: string
}

// Merge (not a plain overwrite) specifically so re-uploading/re-picking
// the clip in a slot that already has a linkedYoutubeId (see
// setLinkedYoutubeVideo) doesn't wipe that link out — a plain setDoc
// would drop any field not included in this write. focalPoint IS
// explicitly reset to null here (unlike linkedYoutubeId) since a crop
// tuned for the previous photo has no meaningful relationship to
// whatever new photo replaces it.
export async function assignMediaSlot(slotKey: string, media: MediaSelection, uid: string): Promise<void> {
  await setDoc(
    doc(db, 'sitePlacements', slotKey),
    {
      slotKey,
      mediaId: media.id,
      youtubeId: null,
      youtubeKind: null,
      imageUrl: media.url,
      title: media.caption,
      focalPoint: null,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

// See ImageFocalPoint's own doc comment (src/types/models.ts) — a
// purely cosmetic, non-destructive adjustment, so this is a merge write
// exactly like setLinkedYoutubeVideo, touching nothing else on the
// placement. `focalPoint: null` clears back to the default (centered,
// no zoom).
export async function setImageFocalPoint(slotKey: string, focalPoint: ImageFocalPoint | null): Promise<void> {
  await setDoc(doc(db, 'sitePlacements', slotKey), { focalPoint }, { merge: true })
}

// Points a placement's title text at a YouTube video/playlist purely as
// a reference link — independent of whatever actually plays in that
// slot (see the home teachings carousel, which self-hosts its own clip
// for playback via assignMediaSlot above and uses this only so viewers
// can click through to the full sermon). Also overwrites `title` with
// the linked video/playlist's own title — the whole point of linking is
// to point at a specific sermon, so the label should read as that
// sermon's real title rather than whatever caption happened to be typed
// in at upload time. `link: null` clears the link (without touching
// title, since there's no clear "revert to" value once it's been
// overwritten) without touching the rest of the placement.
export async function setLinkedYoutubeVideo(
  slotKey: string,
  link: { id: string; kind: YoutubeKind; title: string } | null,
): Promise<void> {
  await setDoc(
    doc(db, 'sitePlacements', slotKey),
    {
      linkedYoutubeId: link?.id ?? null,
      linkedYoutubeKind: link?.kind ?? null,
      ...(link ? { title: link.title } : {}),
    },
    { merge: true },
  )
}

export async function clearPlacement(slotKey: string): Promise<void> {
  await deleteDoc(doc(db, 'sitePlacements', slotKey))
}

// Like clearPlacement, but for a slot whose title/link is meant to
// outlive whatever media is placed there (the home teachings carousel's
// self-hosted clip vs. its independent "watch the full sermon on
// YouTube" link — see setLinkedYoutubeVideo above). A plain deleteDoc
// would wipe linkedYoutubeId/linkedYoutubeKind/title along with the
// video, breaking that independence the moment someone removes the clip.
// Merge-clears only the video/media fields, leaving everything else
// (including title, since it may currently hold the linked video's own
// title rather than an upload caption) untouched. `mediaId` is left as
// whatever it was — it's required (never null) on SitePlacement and
// isn't read for any rendering decision, only kept as bookkeeping of
// which siteMedia doc was last placed here.
export async function clearMediaKeepingLink(slotKey: string): Promise<void> {
  await setDoc(
    doc(db, 'sitePlacements', slotKey),
    {
      youtubeId: null,
      youtubeKind: null,
      imageUrl: null,
      focalPoint: null,
    },
    { merge: true },
  )
}
