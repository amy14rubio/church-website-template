import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HeaderProfileMenu } from '@/components/layout/HeaderProfileMenu';
import { HamburgerIcon } from '@/components/ui/icons';
import { useAuth } from '@/contexts/AuthContext';
import { rememberSitePage } from '@/lib/lastSitePage';

// "Eventos" maps to the calendar app itself, since that's this church's
// actual events page.
const NAV_LINKS = [
  { label: 'Inicio', to: '/' },
  { label: 'Quiénes somos', to: '/quienes-somos' },
  { label: 'Eventos', to: '/calendario' },
];

const CONTACT_LINK = { label: 'Contáctenos', to: '/contactenos' };

// The old combined /ministerios page was split into one page per
// ministry (see each page's own note) — Ministerios is now purely a
// dropdown trigger with no destination page of its own, matching the
// redesign call: clicking the word itself does nothing, only these
// items navigate anywhere.
const MINISTERIOS_LINKS = [
  { label: 'Escuela de discipulado', to: '/escuela-discipulado' },
  { label: 'Ministerio de Ayuda', to: '/ministerio-de-ayuda' },
  { label: 'Ministerio de Alabanza', to: '/ministerio-de-alabanza' },
  { label: 'Escuela Dominical', to: '/escuela-dominical' },
  { label: 'Ministerio de Jovenes', to: '/ministerio-de-jovenes' },
  { label: 'Ministerio de Teatro', to: '/ministerio-de-teatro' },
];

const chevronDown = (
  <svg
    viewBox='0 0 12 12'
    width='10'
    height='10'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.5'
  >
    <path d='M2.5 4.5 6 8l3.5-3.5' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
);

function MinisteriosDropdown({ overlay }: { overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = MINISTERIOS_LINKS.some((item) => item.to === pathname);

  return (
    <div className='relative'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className={[
          'no-press-anim flex cursor-pointer items-center gap-1 border-b-2 pb-1',
          isActive
            ? overlay
              ? 'border-white text-white'
              : 'border-(--site-maroon) text-(--site-maroon)'
            : '',
          !isActive
            ? overlay
              ? 'border-transparent text-white/90 hover:border-white hover:text-white'
              : 'border-transparent text-(--site-text) hover:border-(--site-maroon) hover:text-(--site-maroon)'
            : '',
        ].join(' ')}
      >
        MINISTERIOS
        {chevronDown}
      </button>

      {open && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setOpen(false)} />
          <div className='absolute top-full left-0 z-50 mt-2 w-64 rounded-lg bg-(--site-bg) py-2 normal-case shadow-lg ring-1 ring-(--site-border)'>
            {MINISTERIOS_LINKS.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className='block px-4 py-2 text-sm font-medium text-(--site-text) hover:bg-(--site-placeholder)/10 hover:text-(--site-maroon)'
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  const [ministeriosOpen, setMinisteriosOpen] = useState(false);
  const { pathname } = useLocation();
  const linkClasses = 'rounded-md px-2 py-2 hover:bg-(--site-placeholder)/10';

  return (
    <>
      {/* Closes the menu on an outside click/tap — same backdrop pattern
          as MinisteriosDropdown above. The panel itself is `absolute`
          (positioned against the header, which is always `relative` or
          `sticky` — see SiteHeader) so it floats over the page instead of
          pushing everything below it down when it opens. */}
      <div className='fixed inset-0 z-40 md:hidden' onClick={onNavigate} />
      <nav className='absolute inset-x-0 top-full z-50 border-t border-(--site-border) bg-(--site-bg) px-4 py-3 shadow-lg md:hidden'>
        <div className='flex flex-col gap-1 text-sm font-medium tracking-wide text-(--site-text) uppercase'>
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={onNavigate}
              className={[linkClasses, item.to === pathname ? 'text-(--site-maroon)' : ''].join(' ')}
            >
              {item.label}
            </Link>
          ))}

          <button
            type='button'
            onClick={() => setMinisteriosOpen((v) => !v)}
            className={[
              linkClasses,
              'no-press-anim flex cursor-pointer items-center justify-between uppercase',
            ].join(' ')}
          >
            Ministerios
            <span className={ministeriosOpen ? 'rotate-180' : ''}>{chevronDown}</span>
          </button>
          {ministeriosOpen && (
            <div className='ml-3 flex flex-col gap-1 border-l border-(--site-border) pl-3 normal-case'>
              {MINISTERIOS_LINKS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={onNavigate}
                  className='rounded-md px-2 py-2 text-sm font-medium text-(--site-text-muted) hover:bg-(--site-placeholder)/10 hover:text-(--site-maroon)'
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <Link
            to={CONTACT_LINK.to}
            onClick={onNavigate}
            className={[linkClasses, CONTACT_LINK.to === pathname ? 'text-(--site-maroon)' : ''].join(
              ' ',
            )}
          >
            {CONTACT_LINK.label}
          </Link>
        </div>
      </nav>
    </>
  );
}

// The public site's own nav bar — separate from the app's utility
// `Header` (used on Login/Profile/Admin) since this one needs the fuller
// marketing-site link set and a fixed brand look that doesn't follow the
// calendar's switchable [data-theme] system. See index.css's --site-*
// tokens.
//
// `floating` (Home page only) makes the header sit transparently over
// the hero video (sticky, so it stays reachable for the rest of the
// page too) until scrolled roughly past the hero's height, at which
// point it flips to the normal solid look. Every other page renders it
// with floating unset, which keeps today's plain static/solid header.
export function SiteHeader({ floating = false }: { floating?: boolean } = {}) {
  const { firebaseUser } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    rememberSitePage(pathname);
  }, [pathname]);

  // Closing on every navigation (rather than relying on each link's own
  // onClick) also covers the profile menu's links (Configuración, etc.),
  // which live outside this menu but still change the route.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!floating) return;
    const threshold = window.innerHeight * 0.75;
    function handleScroll() {
      setScrolledPastHero(window.scrollY > threshold);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [floating]);

  // While the mobile menu is open, the header row always matches its
  // dropdown's own solid white background (see MobileMenu) instead of
  // staying transparent-over-the-hero — otherwise opening it over a
  // still-floating header reads as two mismatched panels stacked on top
  // of each other instead of one menu.
  const overlay = floating && !scrolledPastHero && !mobileOpen;
  const activeLinkClass = overlay
    ? 'border-white text-white'
    : 'border-(--site-maroon) text-(--site-maroon)';
  const idleLinkClass = overlay
    ? 'border-transparent text-white/90 hover:border-white hover:text-white'
    : 'border-transparent text-(--site-text) hover:border-(--site-maroon) hover:text-(--site-maroon)';

  return (
    <header
      className={[
        floating ? 'sticky top-0 z-30' : 'relative',
        // A bottom-border box model would add real height on top of this
        // header's h-20, which the Home page's `-mt-20` hero wrapper (see
        // HomePage.tsx) doesn't account for — that 1px mismatch used to
        // show up as a thin white line at the very top of the page (the
        // page's own background peeking through between the header's
        // transparent overlay state and the hero image starting 1px too
        // low). A box-shadow draws the same hairline without taking up
        // any layout space, so the header's real height is always exactly
        // h-20 in both states.
        mobileOpen ? '' : 'transition-[background-color,box-shadow] duration-300',
        overlay
          ? 'bg-transparent shadow-none'
          : 'bg-(--site-bg) shadow-[0_1px_0_0_var(--site-border)]',
      ].join(' ')}
    >
      <div className='flex h-20 items-center justify-between gap-4 px-4 sm:px-8'>
        {/* Mobile-only: hamburger sits on the left with nothing else in the
            bar besides the login/account area on the right (see below) —
            same minimal, logo-free layout as the calendar's own mobile
            header. `md:hidden` removes it (and the logo below reappears)
            once the real desktop nav takes over. */}
        <button
          type='button'
          onClick={() => setMobileOpen((v) => !v)}
          aria-label='Menú'
          title='Menú'
          className={[
            'cursor-pointer rounded-full p-2 md:hidden',
            overlay
              ? 'text-white hover:bg-white/10'
              : 'text-(--site-text) hover:bg-(--site-placeholder)/10',
          ].join(' ')}
        >
          <HamburgerIcon />
        </button>

        <Link to='/' className='hidden shrink-0 items-center gap-3 md:flex'>
          <img
            src='/logo.png'
            alt='Iglesia'
            className='h-10 w-10 object-contain'
          />
        </Link>

        <nav className='hidden items-center gap-6 text-sm font-medium tracking-wide uppercase md:flex'>
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={[
                'border-b-2 pb-1',
                item.to === pathname ? activeLinkClass : idleLinkClass,
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
          <MinisteriosDropdown overlay={overlay} />
          <Link
            to={CONTACT_LINK.to}
            className={[
              'border-b-2 pb-1',
              CONTACT_LINK.to === pathname ? activeLinkClass : idleLinkClass,
            ].join(' ')}
          >
            {CONTACT_LINK.label}
          </Link>
        </nav>

        <div className='flex shrink-0 items-center gap-2'>
          {firebaseUser ? (
            <HeaderProfileMenu />
          ) : (
            <Link
              to='/iniciar-sesion'
              className='rounded-md bg-(--site-maroon) px-4 py-2 text-sm font-medium text-(--site-maroon-contrast) hover:bg-(--site-maroon-dark)'
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>

      {mobileOpen && <MobileMenu onNavigate={() => setMobileOpen(false)} />}
    </header>
  );
}
