import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { AutoPhotoCarousel } from '@/components/site/AutoPhotoCarousel';
import { EditableText } from '@/components/site/EditableText';
import { PhotoCollage } from '@/components/site/PhotoCollage';
import { useScrollLag } from '@/hooks/useScrollLag';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };
const SUBTLE_PHOTO_LAG_PX = 50;
const SUBTLE_TEXT_LAG_PX = 30;

// Simplified per the user's follow-up: just a description (no separate
// intro photo — dropped `ministries-alabanza-intro-photo` entirely) and,
// below it, a mixed/scattered photo collage (PhotoCollage) instead of
// the plain uniform PhotoGrid this used to have.
export function MinisterioAlabanzaPage() {
  const introLag = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_TEXT_LAG_PX, {
    centered: true,
  });
  const collageLag = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
  });

  return (
    <div
      className='flex min-h-screen flex-col bg-(--site-dark-bg)'
      style={{ fontFamily: 'var(--site-font-body)' }}
    >
      <SiteHeader />

      <section className='px-4 py-12 sm:px-6'>
        <EditableText
          slotKey='ministries-alabanza-h1'
          as='h1'
          className='text-center text-3xl font-bold text-(--site-dark-text) uppercase'
          style={headingStyle}
          fallback='Ministerio de Alabanza'
        />
      </section>

      <div ref={introLag.containerRef} className='px-4 relative sm:px-6 '>
        <div ref={introLag.layerRef} className='mx-auto max-w-4xl '>
          <EditableText
            slotKey='ministries-alabanza-intro-1'
            as='p'
            multiline
            className='text-center text-lg text-(--site-dark-text-muted)'
            fallback='[Descripción del Ministerio de Alabanza]'
          />
        </div>
      </div>

      {/* Full-bleed exception, breaking out of the page's normal
          max-w-4xl content column — `left-1/2 -translate-x-1/2` centers
          a w-[95vw] box on the viewport regardless of this section's own
          (unpadded) container, since that container is itself full page
          width with no narrower ancestor between it and the viewport.
          The collage's 7 small scattered tiles read fine on desktop but
          are too small to make out on a phone-width screen — mobile gets
          an AutoPhotoCarousel instead, pointed at PhotoCollage's own
          `${prefix}-0..6` tile keys (via its `slotKeys` prop) so it's
          literally the same 7 admin-placed photos, just presented one at
          a time instead of scattered. */}
      <div
        ref={collageLag.containerRef}
        className='relative py-10 left-1/2 w-[95vw] -translate-x-1/2 mb-16'
      >
        <div ref={collageLag.layerRef}>
          <div className='hidden sm:block'>
            <PhotoCollage slotPrefix='ministries-alabanza-photo' />
          </div>
          <div className='sm:hidden'>
            <AutoPhotoCarousel
              slotKeys={Array.from({ length: 7 }, (_, i) => `ministries-alabanza-photo-${i}`)}
              className='aspect-5/3 rounded-md'
              ignoreFocalPoint
            />
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
