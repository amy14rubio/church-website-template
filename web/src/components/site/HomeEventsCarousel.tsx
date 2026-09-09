import { animate, onScroll } from 'animejs';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot';
import { getMobileParallaxScale } from '@/hooks/useScrollLag';
import { useUpcomingPublicEvents } from '@/hooks/useUpcomingPublicEvents';
import { useSitePlacements } from '@/hooks/useSitePlacements';
import {
  formatEventMonthAbbr,
  formatEventStartTimeCompact,
  formatEventWeekdayAbbr,
} from '@/lib/dateTime';

// Locations are stored as full "street, city, state zip" addresses (for
// the calendar's own detail views) — the list just wants the
// city/borough itself ("Anytown", "Brooklyn"), not the street or state
// zip, so this takes the second comma-separated part rather than
// needing a separate field just for this one display.
function locationArea(location: string): string {
  const parts = location.split(',').map((part) => part.trim());
  return parts[1] ?? location;
}

// A plain list of upcoming public events (replacing an earlier
// one-at-a-time card carousel) — every row is a link straight into the
// calendar with that exact event's details already open (via
// CalendarPage's ?eventId= handling), so "tell me more" is one click
// instead of a second search. Data comes straight from the calendar
// (useUpcomingPublicEvents) — there's nothing here for an admin to place
// or edit; showing fewer than 10 rows when fewer than 10 public events
// exist is just the natural result of that live query.
export function HomeEventsCarousel() {
  const events = useUpcomingPublicEvents();
  const placements = useSitePlacements();
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Foreground parallax to match the hero/teachings sections — the
  // heading/list drifts up slightly slower than the page scrolls past
  // this section, since there's no background image here for the
  // effect to apply to instead.
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

  return (
    <section
      ref={sectionRef}
      className='relative overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-24 lg:py-32'
    >
      <div className='absolute inset-0'>
        <EditablePhotoSlot
          slotKey='home-events-bg'
          placement={placements.get('home-events-bg')}
          className='h-full w-full'
        />
      </div>
      <div className='pointer-events-none absolute inset-0 bg-black/60' />

      <div ref={contentRef} className='relative z-10'>
        {/* <h2 className='text-4xl font-bold text-white uppercase sm:text-6xl' style={headingStyle}>
          Visítanos!
        </h2> */}

        {events.length === 0 ? (
          <p className='mx-auto max-w-md text-white/80'>
            Pronto anunciaremos nuestros próximos eventos.
          </p>
        ) : (
          <div className='mx-auto w-full max-w-xl text-left'>
            {events.map((event) => {
              const start = event.startDateTime.toDate();
              return (
                <Link
                  key={event.id}
                  to={`/calendario?eventId=${event.id}`}
                  className='flex items-center gap-3 border-b border-dashed border-white/30 py-6 transition-transform duration-200 last:border-b-0 hover:scale-105 sm:gap-6 sm:py-10'
                >
                  <div className='flex w-16 shrink-0 flex-col items-center leading-none text-white sm:w-24'>
                    <span className='text-5sm font-semibold tracking-wide uppercase'>
                      {formatEventWeekdayAbbr(start)}
                    </span>
                    <span className='text-xl font-bold tracking-wide uppercase sm:text-3xl'>
                      {formatEventMonthAbbr(start)}
                    </span>
                    <span className='text-xl font-bold sm:text-3xl'>{start.getDate()}</span>
                  </div>
                  {/* min-w-0 is what actually lets truncate below do its job
                      on a flex item — but only because the ancestor above
                      is a real w-full (not w-fit), which gives this row a
                      hard width to truncate against instead of growing to
                      fit whatever the untruncated title's natural width
                      would be (see this component's own history: w-fit let
                      long titles blow right past the viewport on mobile). */}
                  <div className='min-w-0 max-w-md flex-1'>
                    <h3 className='truncate text-2xl font-bold text-white sm:text-4xl'>{event.title}</h3>
                    <p className='mt-1 truncate text-base text-white/70 sm:text-xl'>
                      {formatEventStartTimeCompact(start)}
                      {event.location && ` • ${locationArea(event.location)}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
