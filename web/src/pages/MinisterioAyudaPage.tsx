import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot';
import { EditableText } from '@/components/site/EditableText';
import { useScrollLag } from '@/hooks/useScrollLag';
import { useSitePlacements } from '@/hooks/useSitePlacements';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };
const SUBTLE_PHOTO_LAG_PX = 50;
const SUBTLE_TEXT_LAG_PX = 30;

// Simplified per the hand-drawn layout: two photo+text pairings (photo
// alternates sides). No "Escuela de Discipulado" preview here — that
// lives at its own full /escuela-discipulado page already.
export function MinisterioAyudaPage() {
  const placements = useSitePlacements();
  const row1 = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
    secondLayerMaxPx: SUBTLE_TEXT_LAG_PX,
  });
  const row2 = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
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
        <EditableText
          slotKey='ministries-ayuda-h1'
          as='h1'
          className='text-center text-3xl font-bold text-(--site-dark-text) uppercase'
          style={headingStyle}
          fallback='Ministerio de Ayuda'
        />
      </section>

      <div ref={row1.containerRef} className='px-4 py-10 sm:px-6'>
        <div className='mx-auto grid max-w-4xl items-center gap-8 sm:grid-cols-[2fr_1fr]'>
          <div ref={row1.layerRef} className='order-1 sm:order-0'>
            <EditablePhotoSlot
              slotKey='ministries-ayuda-intro-photo'
              placement={placements.get('ministries-ayuda-intro-photo')}
              className='aspect-5/3 rounded-md'
            />
          </div>
          <div ref={row1.secondLayerRef} className='order-2 sm:order-0'>
            <EditableText
              slotKey='ministries-ayuda-intro'
              as='p'
              multiline
              className='text-lg text-(--site-dark-text-muted)'
              fallback='[Descripción del Ministerio de Ayuda]'
            />
          </div>
        </div>
      </div>

      <div ref={row2.containerRef} className='px-4 py-10 sm:px-6 mb-16'>
        <div className='mx-auto grid max-w-4xl items-center gap-8 sm:grid-cols-[1fr_3fr]'>
          <div ref={row2.secondLayerRef} className='order-2 sm:order-0'>
            <EditableText
              slotKey='ministries-ayuda-secondary'
              as='p'
              multiline
              className='text-lg text-(--site-dark-text-muted)'
              fallback='[Llamado a la acción para unirse al ministerio]'
            />
          </div>
          <div ref={row2.layerRef} className='order-1 sm:order-0'>
            <EditablePhotoSlot
              slotKey='ministries-ayuda-secondary-photo'
              placement={placements.get('ministries-ayuda-secondary-photo')}
              className='aspect-5/3 rounded-md'
            />
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
