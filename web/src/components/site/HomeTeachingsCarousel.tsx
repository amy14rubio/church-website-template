import { animate, onScroll } from 'animejs';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { VideoPickerModal } from '@/components/site/VideoPickerModal';
import { YoutubeVideoPickerModal } from '@/components/site/YoutubeVideoPickerModal';
import { RepeatIcon, SpeakerIcon, TrashIcon } from '@/components/ui/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteEditMode } from '@/contexts/SiteEditModeContext';
import { getMobileParallaxScale } from '@/hooks/useScrollLag';
import { useSitePlacements } from '@/hooks/useSitePlacements';
import {
  assignMediaSlot,
  clearMediaKeepingLink,
  setLinkedYoutubeVideo,
  type MediaSelection,
} from '@/lib/sitePlacements';
import type { YoutubeSelection } from '@/lib/youtube';
import type { SitePlacement } from '@/types/models';

// "video" -> a normal watch link; "playlist" -> the playlist's own page.
function youtubeWatchUrl(id: string, kind: 'video' | 'playlist'): string {
  return kind === 'playlist'
    ? `https://www.youtube.com/playlist?list=${id}`
    : `https://www.youtube.com/watch?v=${id}`;
}

const SLOT_COUNT = 5;
const ADVANCE_MS = 60000;
const CROSSFADE_MS = 800;
// Audio fades out then in sequentially rather than crossfading alongside
// the visual transition — the two halves split the same overall window
// so the outgoing clip is fully silent before the incoming one starts
// ramping up, instead of both being audible together for a moment.
const AUDIO_FADE_MS = CROSSFADE_MS / 2;
// A self-hosted clip should start playing almost immediately — this is
// just a safety net in case the `playing` event never fires for some
// reason, so a slide doesn't get stuck showing nothing.
const REVEAL_FALLBACK_MS = 4000;

// HTMLMediaElement.volume throws if set even slightly outside [0, 1] —
// an eased tween can overshoot that boundary by a hair of floating-point
// error right at either end, which would otherwise throw mid-fade and
// silently abort the rest of that animation (including the onComplete
// that hands off to the next phase).
function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

const headingStyle = { fontFamily: 'var(--site-font-heading)' };

interface Slot {
  key: string;
  placement: SitePlacement | undefined;
}

// 5 click-to-fill video slots (same underlying assignMediaSlot/
// sitePlacements mechanism as the hero's own background video — see
// EditableVideoBackground — an admin uploads a short clip or picks one
// already in the library), presented as a full-screen, hero-like
// background carousel: one slide plays at a time, autoplaying muted
// (browser autoplay policy requires this) for at least ADVANCE_MS before
// crossfading to the next, with a separate icon-only unmute toggle for
// anyone who wants sound.
//
// Sound is a persistent PREFERENCE (preferMuted), separate from whether
// it's actually applied — an IntersectionObserver (inView) tracks
// whether the section itself is scrolled into view, and the video is
// force-muted whenever it isn't, regardless of preference, without
// forgetting that preference: scrolling back in restores it. Advancing
// to the next slide keeps whatever sound preference was already set —
// only being scrolled off-screen pauses the auto-advance. The preference
// itself always starts back at muted on a fresh page load.
//
// All 5 slots are always part of the rotation for everyone, matching
// EditablePhotoSlot's own convention elsewhere on the site — an empty
// slot is a plain placeholder (the section's own dark background) for a
// regular visitor, and only gets the "+ Agregar video" trigger for an
// admin in edit mode.
//
// The slot's own title, separately, can link out to the full sermon on
// YouTube (setLinkedYoutubeVideo) — the uploaded clip is what actually
// plays here, the link is just a reference an admin points at whichever
// of their channel's videos this excerpt came from, so viewers can click
// through for the whole thing. The two are independent: changing one
// never touches the other (see assignMediaSlot's merge write).
//
// Two alternating <video> layers rather than one — the incoming clip
// loads into whichever layer isn't currently visible and only takes over
// (crossfading in while the outgoing layer crossfades out) once it's
// confirmed actually playing, so there's never a flash of the previous
// frame or a blank layer. Unlike an embedded YouTube player, a plain
// <video> element supports object-fit: cover directly and needs no
// title-card/chrome workarounds, no captions module, and no seek-cost
// concerns — it's just ours, so every slide always restarts cleanly at
// 0:00.
export function HomeTeachingsCarousel() {
  const { appUser } = useAuth();
  const { editMode } = useSiteEditMode();
  const placements = useSitePlacements();
  const isEditor = (appUser?.role === 'admin' || appUser?.role === 'coAdmin') && editMode;

  const slotKeys = Array.from({ length: SLOT_COUNT }, (_, i) => `home-teachings-${i}`);
  const visibleSlots: Slot[] = slotKeys.map((key) => ({ key, placement: placements.get(key) }));

  const [index, setIndex] = useState(0);
  const [preferMuted, setPreferMuted] = useState(true);
  const [inView, setInView] = useState(false);
  const [pickerSlotKey, setPickerSlotKey] = useState<string | null>(null);
  const [linkPickerSlotKey, setLinkPickerSlotKey] = useState<string | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const videoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const activeLayerRef = useRef(0);

  useEffect(() => {
    setIndex(0);
  }, [visibleSlots.length]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Foreground parallax — the heading/title/dots block drifts up
  // slightly slower than the page scrolls past this section, giving it
  // a bit of depth against the background video.
  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!section || !content) return;
    const scale = getMobileParallaxScale();
    const anim = animate(content, {
      translateY: [30 * scale, -30 * scale],
      ease: 'linear',
      autoplay: onScroll({ target: section, sync: true, enter: 'top top', leave: 'top bottom' }),
    });
    return () => {
      anim.revert();
    };
  }, []);

  const activeSlot: Slot | undefined = visibleSlots[index] ?? visibleSlots[0];
  const activeVideoUrl = activeSlot?.placement?.imageUrl ?? null;

  useEffect(() => {
    if (visibleSlots.length <= 1 || !inView) return;
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % visibleSlots.length);
    }, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, inView, visibleSlots.length]);

  // Applies whatever the sound preference already was as soon as the
  // section comes back into view (unmuting only if that preference was
  // unmuted) — scrolling out always force-mutes without touching the
  // preference itself, so it's there to restore.
  useEffect(() => {
    const video = videoRefs[activeLayerRef.current].current;
    if (!video) return;
    if (!inView) {
      video.muted = true;
    } else if (!preferMuted) {
      video.muted = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  useEffect(() => {
    if (!activeVideoUrl) return;
    let cancelled = false;
    let revealed = false;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const hasExisting = !!videoRefs[activeLayerRef.current].current?.src;
    const targetLayer = hasExisting ? 1 - activeLayerRef.current : activeLayerRef.current;
    // The incoming clip always loads muted regardless of preference —
    // see fadeInIncoming below, which is the only place sound actually
    // gets turned on, ramped in step with the visual crossfade rather
    // than switching on the instant the (hidden, still-loading) clip is
    // set up.
    const shouldPlayAudible = !preferMuted && inView;

    const video = videoRefs[targetLayer].current;
    if (!video) return;

    // Ramps the incoming clip's volume up from 0 — called only once any
    // outgoing clip has already ramped all the way down to 0 (see reveal
    // below), so the two are never both audible at once, just a clean
    // silent handoff in between rather than a simultaneous crossfade.
    function fadeInIncoming() {
      if (cancelled || !shouldPlayAudible || !video) return;
      video.muted = false;
      video.volume = 0;
      const volume = { v: 0 };
      animate(volume, {
        v: 1,
        duration: AUDIO_FADE_MS,
        ease: 'outQuad',
        onUpdate: () => {
          video.volume = clampVolume(volume.v);
        },
      });
    }

    function reveal() {
      if (revealed || cancelled || !video) return;
      revealed = true;
      if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);

      animate(video, { opacity: [0, 1], duration: CROSSFADE_MS, ease: 'outQuad' });

      if (targetLayer !== activeLayerRef.current) {
        const outgoing = videoRefs[activeLayerRef.current].current;
        if (outgoing) {
          animate(outgoing, {
            opacity: [1, 0],
            duration: CROSSFADE_MS,
            ease: 'outQuad',
            onComplete: () => {
              outgoing.pause();
              outgoing.removeAttribute('src');
              outgoing.load();
            },
          });
          const outgoingVolume = { v: outgoing.volume };
          animate(outgoingVolume, {
            v: 0,
            duration: AUDIO_FADE_MS,
            ease: 'outQuad',
            onUpdate: () => {
              outgoing.volume = clampVolume(outgoingVolume.v);
            },
            onComplete: fadeInIncoming,
          });
        } else {
          fadeInIncoming();
        }
      } else {
        fadeInIncoming();
      }
      activeLayerRef.current = targetLayer;
    }

    video.muted = true;
    video.volume = 1;
    video.src = activeVideoUrl;
    video.load();
    video.addEventListener('playing', reveal);
    void video.play().catch(() => {});
    fallbackTimeoutId = setTimeout(reveal, REVEAL_FALLBACK_MS);

    return () => {
      cancelled = true;
      video.removeEventListener('playing', reveal);
      if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
    };
    // preferMuted/inView are deliberately excluded — they're only read
    // here to decide whether THIS reveal's fade-in should happen, not to
    // retrigger the whole effect. Toggling mute or scrolling in/out must
    // go through toggleMute()/the dedicated inView effect instead:
    // rerunning this effect for either would see hasExisting === true and
    // incorrectly swap to the other (empty) layer, reloading and
    // crossfading to the SAME clip just because sound was toggled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, activeVideoUrl]);

  // An admin clearing the active slot (Quitar) has nothing else telling
  // either layer to stop — without this, whichever clip was already
  // playing just keeps looping in the background forever, since the
  // effect above only ever runs when there IS a video to load.
  useEffect(() => {
    if (activeVideoUrl) return;
    videoRefs.forEach((ref) => {
      const video = ref.current;
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.style.opacity = '0';
    });
    activeLayerRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVideoUrl]);

  function toggleMute() {
    const video = videoRefs[activeLayerRef.current].current;
    if (!video) return;
    if (preferMuted) {
      video.muted = false;
      setPreferMuted(false);
    } else {
      video.muted = true;
      setPreferMuted(true);
    }
  }

  async function handlePick(selection: MediaSelection) {
    if (!appUser || !pickerSlotKey) return;
    await assignMediaSlot(pickerSlotKey, selection, appUser.uid);
    setPickerSlotKey(null);
  }

  async function handleClear(event: MouseEvent) {
    event.stopPropagation();
    if (!activeSlot) return;
    // Keeps linkedYoutubeId/linkedYoutubeKind/title intact — see
    // clearMediaKeepingLink's own note on why this can't be a plain
    // clearPlacement here.
    await clearMediaKeepingLink(activeSlot.key);
  }

  async function handleLinkYoutube(selection: YoutubeSelection) {
    if (!linkPickerSlotKey) return;
    const id = selection.kind === 'video' ? selection.video.videoId : selection.playlist.playlistId;
    const title = selection.kind === 'video' ? selection.video.title : selection.playlist.title;
    await setLinkedYoutubeVideo(linkPickerSlotKey, { id, kind: selection.kind, title });
    setLinkPickerSlotKey(null);
  }

  return (
    <section ref={sectionRef} className="relative flex min-h-[85vh] items-end overflow-hidden bg-(--site-dark-bg)">
      {/* Always mounted, never conditionally on activeVideoUrl — src/
          muted/volume are all set imperatively via refs above, so React
          never re-diffs them; an empty <video> with no src already looks
          identical to the section's own dark background, so there's no
          separate placeholder needed. Both default to opacity-0 — even
          the very first clip ever loaded is hidden until the `playing`
          event confirms it's actually rendering frames, not just
          buffering. */}
      <video ref={videoRefs[0]} playsInline loop className="absolute inset-0 h-full w-full object-cover opacity-0" />
      <video ref={videoRefs[1]} playsInline loop className="absolute inset-0 h-full w-full object-cover opacity-0" />

      {/* Heavier toward the bottom, where the heading/title/controls sit,
          so they stay legible over whatever's playing behind them. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {isEditor && (
        <>
          {!activeVideoUrl && <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-white/30" />}
          <div className="absolute top-4 right-4 z-20 flex gap-1">
            {activeVideoUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => setPickerSlotKey(activeSlot!.key)}
                  title="Cambiar video"
                  aria-label="Cambiar video"
                  className="cursor-pointer rounded bg-black/70 p-1 text-white hover:bg-black/85"
                >
                  <RepeatIcon />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  title="Quitar video"
                  aria-label="Quitar video"
                  className="cursor-pointer rounded bg-black/70 p-1 text-white hover:bg-black/85"
                >
                  <TrashIcon />
                </button>
              </>
            ) : (
              activeSlot && (
                <button
                  type="button"
                  onClick={() => setPickerSlotKey(activeSlot.key)}
                  className="cursor-pointer rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-black/85"
                >
                  + Agregar video
                </button>
              )
            )}
          </div>
        </>
      )}

      {activeVideoUrl && (
        <div className="absolute top-4 left-4 z-20">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={preferMuted ? 'Activar sonido' : 'Silenciar'}
            title={preferMuted ? 'Activar sonido' : 'Silenciar'}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85"
          >
            <SpeakerIcon muted={preferMuted} />
          </button>
        </div>
      )}

      <div ref={contentRef} className="relative z-10 flex w-full flex-col gap-5 px-6 pb-12 sm:px-12">
        <h2 className="text-3xl font-bold text-white uppercase sm:text-4xl" style={headingStyle}>
          Nuestras Enseñanzas
        </h2>

        {/* The link and the self-hosted clip are independent (see
            setLinkedYoutubeVideo/clearMediaKeepingLink) — for an editor,
            this is always here to click regardless of whether either one
            is set yet, since there's otherwise no way to attach a sermon
            link before a video's been uploaded. A plain visitor only ever
            sees this once there's a real title to show, same as before. */}
        {(isEditor ? activeSlot : activeSlot?.placement?.title) && (
          <div className="h-6 max-w-md overflow-hidden text-left">
            {isEditor ? (
              <button
                key={activeSlot!.key}
                type="button"
                onClick={() => setLinkPickerSlotKey(activeSlot!.key)}
                className="animate-[slide-up-in_0.4s_ease-out] block cursor-pointer truncate text-sm font-medium text-white/90 underline decoration-white/40 underline-offset-2 hover:text-white"
              >
                {activeSlot?.placement?.title || 'Vincular video de YouTube'}
              </button>
            ) : activeSlot?.placement?.linkedYoutubeId ? (
              <a
                key={activeSlot.key + activeSlot.placement.title}
                href={youtubeWatchUrl(activeSlot.placement.linkedYoutubeId, activeSlot.placement.linkedYoutubeKind ?? 'video')}
                target="_blank"
                rel="noopener noreferrer"
                className="animate-[slide-up-in_0.4s_ease-out] block truncate text-sm font-medium text-white/90 underline decoration-white/40 underline-offset-2 hover:text-white"
              >
                {activeSlot.placement.title}
              </a>
            ) : (
              <p
                key={activeSlot!.key + activeSlot!.placement!.title}
                className="animate-[slide-up-in_0.4s_ease-out] truncate text-sm font-medium text-white/90"
              >
                {activeSlot!.placement!.title}
              </p>
            )}
          </div>
        )}

        {visibleSlots.length > 1 && (
          <div className="hidden justify-end gap-2 sm:flex">
            {visibleSlots.map((slot, i) => (
              <button
                key={slot.key}
                type="button"
                aria-label={`Ir al video ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 cursor-pointer rounded-full ${i === index ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        )}
      </div>

      {pickerSlotKey && <VideoPickerModal onSelect={handlePick} onClose={() => setPickerSlotKey(null)} />}
      {linkPickerSlotKey && (
        <YoutubeVideoPickerModal onSelect={handleLinkYoutube} onClose={() => setLinkPickerSlotKey(null)} />
      )}
    </section>
  );
}
