import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useIsDesktop } from '@/hooks/useIsDesktop';

// A plain viewport-relative rect — built from a clicked event chip's
// getBoundingClientRect(), or from react-big-calendar's slot click/select
// coordinates (see CalendarView/CalendarPage).
export interface AnchorRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

const GAP = 12;
const MARGIN = 8;
const VERTICAL_ANCHOR_OFFSET_RATIO = 0.75;

interface AnchoredPopoverProps {
  anchorRect: AnchorRect | null;
  onClose: () => void;
  children: ReactNode;
  panelWidth?: number;
}

// Google Calendar-style event popover: on desktop it floats next to
// whatever was clicked (flipping to the other side if it wouldn't fit),
// and dismisses on an outside click. On narrow screens there's no room
// beside the click point, so it becomes a bottom drawer instead. Without
// an anchor point at all (e.g. no click coordinate was available), it
// falls back to the plain centered modal this replaced.
export function AnchoredPopover({
  anchorRect,
  onClose,
  children,
  panelWidth = 384,
}: AnchoredPopoverProps) {
  const isDesktop = useIsDesktop();
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useLayoutEffect(() => {
    if (!isDesktop || !anchorRect) {
      setPosition(null);
      return;
    }

    function recompute() {
      const panel = panelRef.current;
      if (!panel || !anchorRect) return;
      const panelHeight = panel.offsetHeight;
      const spaceRight = window.innerWidth - anchorRect.right;
      const spaceLeft = anchorRect.left;
      const placeRight = spaceRight >= panelWidth + GAP || spaceRight >= spaceLeft;

      let left = placeRight ? anchorRect.right + GAP : anchorRect.left - panelWidth - GAP;
      left = Math.min(Math.max(left, MARGIN), window.innerWidth - panelWidth - MARGIN);

      // Top-aligning exactly to the click point put most of the panel
      // below it, which read as too low on the page. Pulling the anchor
      // up by a fraction of the panel's own height keeps the click point
      // nearer the top of the panel instead of flush with its edge. For a
      // click near the top of the calendar this same math can push the
      // panel above the page header — clamp the lower bound to the
      // header's own bottom edge (rather than the raw viewport top) so it
      // never ends up hidden behind/above the nav bar.
      const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
      const minTop = Math.max(MARGIN, headerBottom + MARGIN);
      let top = anchorRect.top - panelHeight * VERTICAL_ANCHOR_OFFSET_RATIO;
      top = Math.min(Math.max(top, minTop), window.innerHeight - panelHeight - MARGIN);

      setPosition({ top, left });
    }

    recompute();
    window.addEventListener('resize', recompute);
    const observer = panelRef.current ? new ResizeObserver(recompute) : null;
    if (panelRef.current && observer) observer.observe(panelRef.current);
    return () => {
      window.removeEventListener('resize', recompute);
      observer?.disconnect();
    };
  }, [isDesktop, anchorRect, panelWidth]);

  // Slides the mobile drawer up from off-screen on mount instead of
  // popping in already in place.
  useEffect(() => {
    if (isDesktop) return;
    const raf = requestAnimationFrame(() => setDrawerOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [isDesktop]);

  if (isDesktop && anchorRect) {
    return (
      <div className='fixed inset-0 z-50' onClick={onClose}>
        <div
          ref={panelRef}
          onClick={(event) => event.stopPropagation()}
          className='fixed'
          style={{
            width: panelWidth,
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <div
        className='fixed inset-0 z-50 flex items-end justify-center bg-black/40'
        onClick={onClose}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          className={[
            // min-h forces the sheet to always feel substantial even for
            // short content — [&>*]:flex-1 makes whatever panel gets
            // passed as children actually stretch to fill it (its own
            // max-h-[90vh] still caps how tall it can grow) rather than
            // just floating at content height with backdrop showing below.
            'flex min-h-[80vh] w-full flex-col transition-transform duration-300 ease-out [&>*]:flex-1 [&>*]:min-h-0',
            drawerOpen ? 'translate-y-0' : 'translate-y-full',
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}
