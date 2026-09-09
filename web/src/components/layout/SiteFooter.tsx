import { BlurInText, useBlurInReveal } from '@/components/site/BlurInText';
import { FacebookIcon, YoutubeIcon } from '@/components/ui/icons';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };

// Shared across every public site page (see index.css's --site-*
// tokens). Redesigned (savor.it-inspired) around a large blurred-into-
// focus wordmark, with a bottom row bookending copyright and social
// buttons beneath it — copyright above icons on mobile (plain flex-col,
// matching DOM order), copyright-left/icons-right on desktop
// (sm:justify-between). The mailing address used to live here too but
// was dropped in favor of ContactPage's own "contact-address" slot,
// which is the only remaining place it's shown/edited. No inner
// max-width wrapper — both the wordmark and the bottom row stretch
// across the full viewport (padding-only edges) so it reads as wide and
// spacious rather than a centered column like the rest of the site's
// content.
// Staggered so the whole footer reads as one cascading entrance rather
// than everything blurring into focus at once — the wordmark leads
// (delay 0, via BlurInText itself), then copyright, then each social
// icon a beat after the other.
const COPYRIGHT_DELAY = 300;
const FACEBOOK_DELAY = 500;
const YOUTUBE_DELAY = 650;

export function SiteFooter() {
  const copyrightRef = useBlurInReveal<HTMLParagraphElement>(COPYRIGHT_DELAY);
  const facebookRef = useBlurInReveal<HTMLAnchorElement>(FACEBOOK_DELAY);
  const youtubeRef = useBlurInReveal<HTMLAnchorElement>(YOUTUBE_DELAY);

  return (
    <footer className='bg-(--site-maroon) px-3 py-8 pt-16 text-white sm:px-12 sm:pt-60 lg:px-20'>
      <div className='text-center sm:text-left'>
        <BlurInText
          text='Iglesia'
          className='block text-3xl font-bold uppercase sm:text-8xl '
          style={headingStyle}
        />
      </div>

      <div className='mt-3 sm:mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between'>
        <p
          ref={copyrightRef}
          className='text-center text-[0.4rem] text-white/80 sm:text-sm'
          style={{ opacity: 0, filter: 'blur(14px)' }}
        >
          Copyright © {new Date().getFullYear()} Iglesia · Developed by [Your Name]
        </p>

        <div className='flex gap-4'>
          <a
            ref={facebookRef}
            href='https://www.facebook.com/your-church-page'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Facebook'
            style={{ opacity: 0, filter: 'blur(14px)' }}
            className='flex h-12 w-12 items-center justify-center rounded-full bg-white text-(--site-maroon) transition-transform duration-100 ease-out active:scale-95'
          >
            <FacebookIcon size={24} />
          </a>
          <a
            ref={youtubeRef}
            href='https://www.youtube.com/@your-church-handle'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='YouTube'
            style={{ opacity: 0, filter: 'blur(14px)' }}
            className='flex h-12 w-12 items-center justify-center rounded-full bg-white text-(--site-maroon) transition-transform duration-100 ease-out active:scale-95'
          >
            <YoutubeIcon size={24} />
          </a>
        </div>
      </div>
    </footer>
  );
}
