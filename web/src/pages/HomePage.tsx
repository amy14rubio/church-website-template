import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EditableText } from '@/components/site/EditableText';
import { HomeEventsCarousel } from '@/components/site/HomeEventsCarousel';
import { HomeHeroCarousel } from '@/components/site/HomeHeroCarousel';
import { HomeTeachingsCarousel } from '@/components/site/HomeTeachingsCarousel';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useScrollLag } from '@/hooks/useScrollLag';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };

const TEXT_PARALLAX_MAX_PX = 80;
const HERO_TEXT_LAG_PX = 30;

// Deliberately not a real link — wire this up to your own PayPal/Venmo/
// Stripe donation page before deploying. Left non-functional on purpose
// rather than pointing anywhere, real or placeholder-looking.
const DONATE_LINK = '[Agrega tu enlace de pago — PayPal, Venmo, etc.]';

// The hero sits at the very top of the page (no scroll distance above
// it to "enter from below" through), but the centered sweep still reads
// fine here — see useScrollLag's own note on 'centered' thresholds. Kept
// small (HERO_TEXT_LAG_PX) since this text sits over a busy photo
// carousel and shouldn't distract from it.
function HeroSection({ children }: { children: ReactNode }) {
  const { containerRef, layerRef } = useScrollLag<HTMLDivElement, HTMLDivElement>(
    HERO_TEXT_LAG_PX,
    { centered: true },
  );
  return (
    <div
      ref={containerRef}
      className='relative flex min-h-screen items-end justify-start overflow-hidden text-left'
    >
      <HomeHeroCarousel />

      {/* pointer-events-none so this purely decorative dimming layer never
          blocks clicks to whichever hero photo's edit controls underneath —
          see EditablePhotoSlot's note on the same gotcha. */}
      <div className='pointer-events-none absolute inset-0 bg-black/30' />

      <div
        ref={layerRef}
        className='relative z-10 flex max-w-full flex-col items-start gap-2 px-6 pt-16 pb-8 sm:max-w-[75%] sm:px-12 sm:py-16 md:px-20'
      >
        {children}
      </div>
    </div>
  );
}

// A plain white-background text section whose heading sweeps up then
// down as it passes through screen-center — the same "lag" parallax the
// hero's background used to have, moved onto the text instead now that
// the hero itself (a photo carousel) stays still, and upgraded from a
// one-directional drift to the centered sweep used everywhere else now.
function LagTextSection({ className, children }: { className?: string; children: ReactNode }) {
  // The outer div is a plain, untranslated wrapper used only to measure
  // scroll progress (translating the same element being measured would
  // feed back into that measurement) — the actual <section>, background
  // and border included, is the layer that drifts.
  const { containerRef, layerRef } = useScrollLag<HTMLDivElement, HTMLElement>(
    TEXT_PARALLAX_MAX_PX,
    { centered: true },
  );
  return (
    <div ref={containerRef}>
      <section
        ref={layerRef}
        className={`mx-auto px-4 py-24 text-center sm:px-6 sm:py-32 ${className ?? ''}`}
      >
        {children}
      </section>
    </div>
  );
}

// The public marketing home page — ported from the church's previous
// GoDaddy site. The hero is an auto-advancing, crossfading photo carousel
// (see HeroSection/HomeHeroCarousel) — no manual nav controls, purely on
// a timer. Other photos are click-to-fill (EditablePhotoSlot). Headings
// and copy are inline-editable — EditableText. The nav floats
// transparently over the hero (SiteHeader's `floating` prop) and turns
// solid once scrolled past it — the -mt-20 on the hero wrapper cancels
// out the header's own flow height (h-20) so the carousel still starts at
// the very top of the page, underneath the floating nav.
export function HomePage() {
  return (
    <div
      className='flex min-h-screen flex-col bg-(--site-bg)'
      style={{ fontFamily: 'var(--site-font-body)' }}
    >
      <SiteHeader floating />

      <div className='-mt-20'>
        <HeroSection>
          <div className='flex w-full flex-col items-start gap-4 sm:w-[85vw] sm:flex-row sm:items-end sm:justify-between sm:gap-0'>
            <div>
              <EditableText
                slotKey='home-hero-subtitle'
                as='p'
                className='text-base text-white/90 sm:text-lg'
                fallback='[Tu lema aquí]'
              />
              <EditableText
                slotKey='home-hero-title'
                as='h1'
                className='max-w-none text-2xl font-bold text-white uppercase sm:max-w-2xl sm:text-4xl'
                style={headingStyle}
                fallback='Bienvenidos a la Iglesia'
              />
            </div>
            {/* Hidden on mobile — the hero here is a photo carousel, and
                between this button and the heading text there wasn't much
                screen left to actually see it on a phone-sized viewport;
                Horarios y ubicación is a click away in the nav anyway. */}
            <Link
              to='/contactenos'
              className='mt-4 hidden rounded-md bg-white px-6 py-3 text-sm font-semibold tracking-wide text-(--site-text) uppercase transition-transform duration-100 ease-out hover:bg-white/90 active:scale-95 sm:block'
            >
              Horarios y ubicación
            </Link>
          </div>
        </HeroSection>
      </div>

      <LagTextSection className='border-b border-(--site-border)'>
        <EditableText
          slotKey='home-about-title'
          as='h2'
          className='text-4xl wrap-break-word font-bold text-(--site-maroon) uppercase sm:text-6xl'
          style={headingStyle}
          fallback='Un lugar de crecimiento espiritual'
        />
      </LagTextSection>

      <HomeTeachingsCarousel />

      <LagTextSection>
        <EditableText
          slotKey='home-seat-title'
          as='h2'
          className='text-4xl wrap-break-word font-bold text-(--site-maroon) uppercase sm:text-6xl'
          style={headingStyle}
          fallback='Te guardamos un asiento!'
        />
      </LagTextSection>

      <HomeEventsCarousel />

      {/* Slot keys keep their original "home-donate-*" names from when this
          lived here before — briefly moved to the Contact page and back.
          White background + maroon text, matching the other plain text
          sections above (LagTextSection) instead of its old dark
          photo-background look. */}
      <LagTextSection>
        <div className='mx-auto flex w-[90vw] flex-col items-center gap-4'>
          <EditableText
            slotKey='home-donate-title'
            as='h2'
            className='text-4xl wrap-break-word font-bold text-(--site-maroon) uppercase sm:text-6xl'
            style={headingStyle}
            fallback='Ayúdanos a difundir el evangelio'
          />
          <EditableText
            slotKey='home-donate-body'
            as='p'
            multiline
            className='text-2xl text-(--site-text)'
            fallback='“Pues todo es tuyo, y de lo recibido de tu mano te damos” · 1 Crónicas 29:14'
          />
          {/* <EditableText
            slotKey='home-donate-verse'
            as='p'
            className='text-xl text-(--site-text-muted)'
            fallback='...Pues todo es tuyo, y de lo recibido de tu mano te damos.'
          /> */}

          <a href={DONATE_LINK} target='_blank' rel='noopener noreferrer'>
            <button
              type='button'
              className='cursor-pointer mt-4 rounded-md bg-(--site-maroon) px-8 py-3 text-xl font-semibold tracking-wide text-(--site-maroon-contrast) uppercase hover:bg-(--site-maroon-dark)'
            >
              Donar ahora [agregar enlace]
            </button>
          </a>
        </div>
      </LagTextSection>

      <SiteFooter />
    </div>
  );
}
