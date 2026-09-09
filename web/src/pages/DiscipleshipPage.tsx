import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot';
import { EditableText } from '@/components/site/EditableText';
import { useScrollLag } from '@/hooks/useScrollLag';
import { useSitePlacements } from '@/hooks/useSitePlacements';
import { slugify } from '@/lib/slugify';

const LEVELS = [
  { title: 'Discipulado Nivel I', description: '[Descripción del Nivel I]' },
  { title: 'Discipulado Nivel II', description: '[Descripción del Nivel II]' },
  { title: 'Discipulado Nivel III', description: '[Descripción del Nivel III]' },
  { title: 'Discipulado Nivel IV', description: '[Descripción del Nivel IV]' },
];

const headingStyle = { fontFamily: 'var(--site-font-heading)' };
const SUBTLE_PHOTO_LAG_PX = 50;
const SUBTLE_TEXT_LAG_PX = 30;

// List layout per the user's follow-up: each level is a row (photo +
// title + brief description) stacked vertically, not a grid of circular
// thumbnails. Photo slot keys are unchanged from the old LevelCard
// component, so any photos an admin already uploaded for each level keep
// showing up.

export function DiscipleshipPage() {
  const placements = useSitePlacements();
  // LEVELS has a fixed length (4), so calling the hook a fixed number of
  // times at the top level and indexing into the array inside the
  // .map() below stays rules-of-hooks safe — the hook itself can't be
  // called inside the map's callback.
  const lag0 = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
    secondLayerMaxPx: SUBTLE_TEXT_LAG_PX,
  });
  const lag1 = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
    secondLayerMaxPx: SUBTLE_TEXT_LAG_PX,
  });
  const lag2 = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
    secondLayerMaxPx: SUBTLE_TEXT_LAG_PX,
  });
  const lag3 = useScrollLag<HTMLDivElement, HTMLDivElement>(SUBTLE_PHOTO_LAG_PX, {
    centered: true,
    secondLayerMaxPx: SUBTLE_TEXT_LAG_PX,
  });
  const lags = [lag0, lag1, lag2, lag3];

  return (
    <div
      className='flex min-h-screen flex-col bg-(--site-dark-bg)'
      style={{ fontFamily: 'var(--site-font-body)' }}
    >
      <SiteHeader />

      <section className='px-4 py-12 sm:px-6'>
        <EditableText
          slotKey='discipleship-h1'
          as='h1'
          className='text-center text-3xl font-bold text-(--site-dark-text) uppercase'
          style={headingStyle}
          fallback='Escuela de Discipulado'
        />
      </section>

      {/* A 2x2 grid, horizontally centered — Discipulado I/II fill the
          first row, III/IV the second, purely from DOM order (LEVELS'
          own order) combined with sm:grid-cols-2, no manual placement
          needed. Each cell is its own vertical card (photo on top, title
          + description below) rather than the old horizontal row. */}
      <div className='px-4  sm:px-6'>
        <div className='mx-auto grid max-w-4xl gap-10 sm:grid-cols-2'>
          {LEVELS.map((level, i) => {
            const baseSlotKey = `discipleship-${slugify(level.title)}`;
            const lag = lags[i];
            return (
              <div key={level.title} ref={lag.containerRef} className='text-center'>
                <div ref={lag.secondLayerRef} className='mt-6'>
                  <EditableText
                    slotKey={`${baseSlotKey}-title`}
                    as='h2'
                    className='text-2xl font-bold text-(--site-dark-text) uppercase'
                    fallback={level.title}
                  />
                  <EditableText
                    slotKey={`${baseSlotKey}-description`}
                    as='p'
                    multiline
                    className='mt-2 text-lg text-(--site-dark-text-muted)'
                    fallback={level.description}
                  />
                </div>
                <div ref={lag.layerRef}>
                  <EditablePhotoSlot
                    slotKey={`${baseSlotKey}-photo`}
                    placement={placements.get(`${baseSlotKey}-photo`)}
                    className='aspect-5/3 rounded-md mt-6'
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* "Más Recursos" temporarily removed — there was never a real
          destination for it (DISCIPULADO_RESOURCES_URL was still just
          '#'). Revisit once there's an actual resources destination: a
          per-member portal, or simpler, a shared Google Drive folder of
          PDFs. */}
      <div className='mb-16' />

      <SiteFooter />
    </div>
  );
}
