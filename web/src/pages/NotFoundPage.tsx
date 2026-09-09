import { Link } from 'react-router-dom';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };

// The wildcard route (see App.tsx's path="*") — before this existed, an
// unmatched URL under a real domain just rendered a blank page, since
// react-router has no fallback of its own and nothing else here does
// either. Built in the site's own visual language (SiteHeader/SiteFooter,
// the maroon brand palette) rather than a generic error-page look, so a
// mistyped link still feels like part of the same church site instead of
// a dead end.
export function NotFoundPage() {
  return (
    <div
      className='flex min-h-screen flex-col bg-(--site-bg)'
      style={{ fontFamily: 'var(--site-font-body)' }}
    >
      <SiteHeader />

      <section className='flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:px-6'>
        <span
          className='text-8xl font-bold text-(--site-maroon) sm:text-9xl'
          style={headingStyle}
        >
          404
        </span>
        <p className='max-w-md text-lg text-(--site-text-muted)'>
          La página que buscas pudo haber sido movida, cambiada de nombre o ya no existe.
        </p>
        <Link
          to='/'
          className='rounded-md bg-(--site-maroon) px-6 py-3 text-sm font-semibold tracking-wide text-(--site-maroon-contrast) uppercase hover:bg-(--site-maroon-dark)'
        >
          Volver al inicio
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
