// Tracks the last public-site page (Home, Quiénes somos, Ministerios,
// etc.) the user was on, so the app-side pages (Calendar, Configuración,
// Medios del sitio) can send the logo click back to wherever they came
// from instead of always hard-coding "/". Session-scoped — this is about
// "where you just were," not a durable preference.
const KEY = 'lastSitePage'

// SiteHeader now also renders on these app-shell routes (Layout.tsx), but
// they aren't real "public site" pages — remembering one here would make
// the logo/"Regresar" links send someone back to e.g. /perfil instead of
// wherever they actually were on the public site before signing in.
const APP_SHELL_PATHS = new Set(['/iniciar-sesion', '/perfil', '/administracion', '/medios'])

export function rememberSitePage(pathname: string): void {
  if (APP_SHELL_PATHS.has(pathname)) return
  sessionStorage.setItem(KEY, pathname)
}

export function getLastSitePage(): string {
  return sessionStorage.getItem(KEY) ?? '/'
}
