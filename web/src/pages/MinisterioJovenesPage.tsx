import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot';
import { EditableText } from '@/components/site/EditableText';
import { InstagramReelEmbed } from '@/components/site/InstagramReelEmbed';
import { PhotoMarquee } from '@/components/site/PhotoMarquee';
import { useScrollLag } from '@/hooks/useScrollLag';
import { useSitePlacements } from '@/hooks/useSitePlacements';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };
const SUBTLE_PHOTO_LAG_PX = 50;
const SUBTLE_TEXT_LAG_PX = 30;

// "The Christ Generation" — the church's youth ministry sub-brand.
// Rebuilt per the second hand-drawn sketch: an auto-scrolling photo
// marquee up top (PhotoMarquee), intro copy, then two age-group
// sections with mirrored text/image layout (DOM-order swap, not
// `order-*` classes — see MinisterioAyudaPage's note on why), and
// finally 4 real embedded Instagram reels (InstagramReelEmbed). Content
// (and its "cg-" slot-key prefix) was originally built at a separate
// /the-christ-generation route/file, then moved here per the user's
// call to keep this ministry's real content at its existing
// /ministerio-de-jovenes route/nav link instead of adding a second one
// — that route/file is now retired. This replaces the old simple
// intro-photo + PhotoGrid layout entirely.
export function MinisterioJovenesPage() {
  const placements = useSitePlacements();
  const introLag = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_TEXT_LAG_PX, {
    centered: true,
  });
  const row19Lag = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
    secondLayerMaxPx: SUBTLE_TEXT_LAG_PX,
  });
  const rowAdolescentesLag = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
    secondLayerMaxPx: SUBTLE_TEXT_LAG_PX,
  });

  return (
    <div
      className='flex min-h-screen flex-col bg-(--site-dark-bg)'
      style={{ fontFamily: 'var(--site-font-body)' }}
    >
      <SiteHeader />

      <section className='px-4 py-12 sm:px-6'>
        <div className='flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3'>
          <img
            src='/logo-jovenes.webp'
            alt=''
            className='h-16 w-16 shrink-0 object-contain sm:h-14 sm:w-14'
          />
          <EditableText
            slotKey='cg-h1'
            as='h1'
            className='text-center text-3xl font-bold text-(--site-dark-text) uppercase'
            style={headingStyle}
            fallback='[Nombre del grupo de jóvenes]'
          />
        </div>
      </section>

      <section ref={introLag.containerRef} className='px-4 sm:px-6'>
        <div ref={introLag.layerRef}>
          <EditableText
            slotKey='cg-intro'
            as='p'
            multiline
            className='mx-auto max-w-4xl text-center text-lg text-(--site-dark-text-muted)'
            fallback='[Descripción del ministerio de jóvenes]'
          />
        </div>
      </section>
      <div className='mt-5 py-10'>
        <PhotoMarquee slotPrefix='cg-marquee' />
      </div>

      <section className='px-4 py-10 sm:px-6'>
        <div
          ref={row19Lag.containerRef}
          className='mx-auto grid max-w-4xl items-center gap-8 sm:grid-cols-[1fr_3fr]'
        >
          <div ref={row19Lag.secondLayerRef} className='order-2 sm:order-0'>
            <EditableText
              slotKey='cg-19-h2'
              as='h2'
              className='text-left text-2xl font-bold text-(--site-dark-text) uppercase'
              style={headingStyle}
              fallback='Reunión de 19+'
            />
            <EditableText
              slotKey='cg-19-text'
              as='p'
              multiline
              className='mt-2 text-lg text-(--site-dark-text-muted)'
              fallback='[Descripción de la reunión de 19+]'
            />
          </div>
          <div ref={row19Lag.layerRef} className='order-1 sm:order-0'>
            <EditablePhotoSlot
              slotKey='cg-19-photo'
              placement={placements.get('cg-19-photo')}
              className='aspect-5/3 rounded-md'
            />
          </div>
        </div>
      </section>

      <section className='px-4 py-10 sm:px-6'>
        <div
          ref={rowAdolescentesLag.containerRef}
          className='mx-auto grid max-w-4xl items-center gap-8 sm:grid-cols-[3fr_1fr]'
        >
          <div ref={rowAdolescentesLag.layerRef} className='order-1 sm:order-0'>
            <EditablePhotoSlot
              slotKey='cg-adolescentes-photo'
              placement={placements.get('cg-adolescentes-photo')}
              className='aspect-5/3 rounded-md'
            />
          </div>
          <div ref={rowAdolescentesLag.secondLayerRef} className='order-2 sm:order-0'>
            <EditableText
              slotKey='cg-adolescentes-h2'
              as='h2'
              className='text-left text-2xl font-bold text-(--site-dark-text) uppercase sm:text-right'
              style={headingStyle}
              fallback='Reunión de Adolescentes'
            />
            <EditableText
              slotKey='cg-adolescentes-text'
              as='p'
              multiline
              className='text-left text-lg text-(--site-dark-text-muted) sm:text-right'
              fallback='[Descripción de la reunión de adolescentes]'
            />
          </div>
        </div>
      </section>

      <section className='px-4 py-12 sm:px-6'>
        <EditableText
          slotKey='cg-instagram-h2'
          as='h2'
          className='text-center text-2xl font-bold text-(--site-dark-text) uppercase'
          style={headingStyle}
          fallback='Visita Nuestra Página de Instagram'
        />
        {/* 1 featured reel on mobile, all 3 side by side on desktop — the
            2nd/3rd stay mounted (just hidden) below sm rather than being
            left out of the DOM, so their own edit-mode inputs (see
            InstagramReelEmbed) are always reachable once an admin
            resizes/rotates without losing whatever they'd typed. */}
        <div className='mx-auto mt-8 max-w-xs sm:max-w-4xl'>
          <div className='sm:grid sm:grid-cols-3 sm:gap-4'>
            <InstagramReelEmbed slotKey='cg-instagram-reel-0' />
            <div className='hidden sm:block'>
              <InstagramReelEmbed slotKey='cg-instagram-reel-1' />
            </div>
            <div className='hidden sm:block'>
              <InstagramReelEmbed slotKey='cg-instagram-reel-2' />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
