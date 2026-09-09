import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { AutoPhotoCarousel } from '@/components/site/AutoPhotoCarousel';
import { EditableText } from '@/components/site/EditableText';
import { EditableYoutubeSlot } from '@/components/site/EditableYoutubeSlot';
import { useScrollLag } from '@/hooks/useScrollLag';
import { useSitePlacements } from '@/hooks/useSitePlacements';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };
const ROW_LAG_PX = 120;
const TEXT_LAG_PX = 100;

// Renamed from "Ministerio de Niños y Bebes" — rebuilt per the second
// hand-drawn sketch: three alternating text/image rows, each image
// drifting via useScrollLag (a plain page scroll, no pinned/sticky
// mechanic — the user's explicit "simple parallax drift" choice), ending
// in one full-viewport video. Replaces the old two-video grid and single
// intro photo.
export function EscuelaDominicalPage() {
  const placements = useSitePlacements();
  const row1 = useScrollLag<HTMLDivElement, HTMLDivElement>(ROW_LAG_PX, {
    centered: true,
    secondLayerMaxPx: TEXT_LAG_PX,
  });
  const row2 = useScrollLag<HTMLDivElement, HTMLDivElement>(ROW_LAG_PX, {
    centered: true,
    secondLayerMaxPx: TEXT_LAG_PX,
  });
  const row3 = useScrollLag<HTMLDivElement, HTMLDivElement>(ROW_LAG_PX, {
    centered: true,
    secondLayerMaxPx: TEXT_LAG_PX,
  });
  const videoRow = useScrollLag<HTMLDivElement, HTMLDivElement>(ROW_LAG_PX, { centered: true });

  return (
    <div
      className='flex min-h-screen flex-col bg-(--site-dark-bg)'
      style={{ fontFamily: 'var(--site-font-body)' }}
    >
      <SiteHeader />

      <section className='px-4 py-12 sm:px-6'>
        <EditableText
          slotKey='ministries-ninos-h1'
          as='h1'
          className='text-center text-3xl font-bold text-(--site-dark-text) uppercase'
          style={headingStyle}
          fallback='[Nombre del ministerio infantil]'
        />
      </section>

      <div ref={row1.containerRef} className='px-4 py-10 sm:px-6'>
        <div className='mx-auto grid max-w-4xl items-start gap-8 sm:grid-cols-[1fr_3fr]'>
          <div ref={row1.secondLayerRef} className='order-2 sm:order-0'>
            <EditableText
              slotKey='ministries-ninos-row-1-title'
              as='h2'
              className='text-2xl font-bold text-(--site-dark-text) uppercase'
              fallback='[Título — parte 1]'
            />
            <EditableText
              slotKey='ministries-ninos-row-1-text'
              as='p'
              multiline
              className='mt-3 text-lg text-(--site-dark-text-muted)'
              fallback='[Descripción — parte 1]'
            />
          </div>
          <div ref={row1.layerRef} className='order-1 sm:order-0'>
            <AutoPhotoCarousel slotPrefix='ministries-ninos-row-1-photo' count={7} className='aspect-5/3 rounded-md' />
          </div>
        </div>
      </div>

      <div ref={row2.containerRef} className='px-4 py-10 sm:px-6'>
        <div className='mx-auto grid max-w-4xl items-center gap-8 sm:grid-cols-[3fr_1fr]'>
          <div ref={row2.layerRef} className='order-1 sm:order-0'>
            <AutoPhotoCarousel slotPrefix='ministries-ninos-row-2-photo' count={7} className='aspect-5/3 rounded-md' />
          </div>
          <div ref={row2.secondLayerRef} className='order-2 sm:order-0'>
            <EditableText
              slotKey='ministries-ninos-row-2-title'
              as='h2'
              className='text-2xl font-bold text-(--site-dark-text) uppercase'
              fallback='[Título — parte 2]'
            />
            <EditableText
              slotKey='ministries-ninos-row-2-text'
              as='p'
              multiline
              className='mt-3 text-lg text-(--site-dark-text-muted)'
              fallback='[Descripción — parte 2]'
            />
          </div>
        </div>
      </div>

      <div ref={row3.containerRef} className='px-4 py-10 sm:px-6'>
        <div className='mx-auto grid max-w-4xl items-center gap-8 sm:grid-cols-[1fr_3fr]'>
          <div ref={row3.secondLayerRef} className='order-2 sm:order-0'>
            <EditableText
              slotKey='ministries-ninos-row-3-title'
              as='h2'
              className='text-2xl font-bold text-(--site-dark-text) uppercase'
              fallback='[Título — parte 3]'
            />
            <EditableText
              slotKey='ministries-ninos-row-3-text'
              as='p'
              multiline
              className='mt-3 text-lg text-(--site-dark-text-muted)'
              fallback='[Descripción — parte 3]'
            />
          </div>
          <div ref={row3.layerRef} className='order-1 sm:order-0'>
            <AutoPhotoCarousel slotPrefix='ministries-ninos-row-3-photo' count={7} className='aspect-5/3 rounded-md' />
          </div>
        </div>
      </div>

      <div ref={videoRow.containerRef} className='px-4 mt-20 mb-16 sm:px-6'>
        <div ref={videoRow.layerRef}>
          <EditableYoutubeSlot
            slotKey='ministries-ninos-momentos-video'
            fallbackTitle='[Título del video]'
            placement={placements.get('ministries-ninos-momentos-video')}
            boxClassName='mx-auto max-w-4xl aspect-5/3 rounded-md mt-4'
            mobileWatchLink
          />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
