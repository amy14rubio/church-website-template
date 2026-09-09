import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { AutoPhotoCarousel } from '@/components/site/AutoPhotoCarousel';
import { EditableText } from '@/components/site/EditableText';
import { EditableYoutubeSlot } from '@/components/site/EditableYoutubeSlot';
import { useScrollLag } from '@/hooks/useScrollLag';
import { useSitePlacements } from '@/hooks/useSitePlacements';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };
const SUBTLE_PHOTO_LAG_PX = 50;
const SUBTLE_TEXT_LAG_PX = 30;

// This page's content was changed from the original "Ministerio de
// Teatro" copy to "Mensaje de Vida" — the route (/ministerio-de-teatro),
// this file's name, AND the nav label (see SiteHeader's
// MINISTERIOS_LINKS) all deliberately still say "Ministerio de Teatro";
// only the on-page content itself is "Mensaje de Vida" now. Simple first
// pass per the hand-drawn layout: intro text, two side-by-side photos,
// one full-width featured video below.
export function MinisterioTeatroPage() {
  const placements = useSitePlacements();
  const introLag = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_TEXT_LAG_PX, {
    centered: true,
  });
  const photo1Lag = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
    secondLayerMaxPx: SUBTLE_TEXT_LAG_PX,
  });
  const photo2Lag = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
    secondLayerMaxPx: SUBTLE_TEXT_LAG_PX,
  });
  const videoLag = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
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
          slotKey='mensaje-vida-h1'
          as='h1'
          className='text-center text-3xl font-bold text-(--site-dark-text) uppercase'
          style={headingStyle}
          fallback='Mensaje de Vida'
        />
      </section>

      <div ref={introLag.containerRef} className='px-4  sm:px-6'>
        <div ref={introLag.layerRef} className='mx-auto max-w-4xl text-center'>
          <EditableText
            slotKey='mensaje-vida-intro'
            as='p'
            multiline
            className='text-lg text-(--site-dark-text-muted)'
            fallback='[Descripción de este ministerio]'
          />
        </div>
      </div>

      <div className='px-4 mt-5 py-10 sm:px-6'>
        <div className='mx-auto grid max-w-4xl gap-8 sm:grid-cols-2'>
          <div ref={photo1Lag.containerRef} className='text-center'>
            <div ref={photo1Lag.secondLayerRef}>
              <EditableText
                slotKey='mensaje-vida-photos-1-title'
                as='h2'
                className='mb-3 text-2xl font-bold text-(--site-dark-text) uppercase'
                fallback='Fotos destacadas'
              />
            </div>
            <div ref={photo1Lag.layerRef}>
              <AutoPhotoCarousel
                slotPrefix='mensaje-vida-photos-1'
                className='aspect-5/3 rounded-md'
              />
            </div>
          </div>
          <div ref={photo2Lag.containerRef} className='text-center'>
            <div ref={photo2Lag.secondLayerRef}>
              <EditableText
                slotKey='mensaje-vida-photos-2-title'
                as='h2'
                className='mb-3 text-2xl font-bold text-(--site-dark-text) uppercase'
                fallback='Más fotos'
              />
            </div>
            <div ref={photo2Lag.layerRef}>
              <AutoPhotoCarousel
                slotPrefix='mensaje-vida-photos-2'
                className='aspect-5/3 rounded-md'
              />
            </div>
          </div>
        </div>
      </div>

      {/* Closing video, exempt from the row rhythm above (bare vertical
          margin only) — matches EscuelaDominicalPage's own video block,
          which breaks the same pattern intentionally. Horizontal padding
          still applies though: with no px-* at all, the video touched
          both edges of the screen on mobile once the viewport got
          narrower than max-w-4xl. */}
      <div ref={videoLag.containerRef} className='mx-auto mt-8 mb-16 max-w-4xl w-full px-4 sm:mt-20 sm:px-6'>
        <div ref={videoLag.layerRef}>
          <EditableYoutubeSlot
            slotKey='mensaje-vida-video'
            fallbackTitle='Video destacado'
            placement={placements.get('mensaje-vida-video')}
            mobileWatchLink
          />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
