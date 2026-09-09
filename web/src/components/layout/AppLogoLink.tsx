import { useNavigate } from 'react-router-dom'
import { getLastSitePage } from '@/lib/lastSitePage'

// The church logo used across the app's own pages (Configuración, Medios
// del sitio, Calendario) — clicking it returns to whichever public site
// page the user was last on (see lastSitePage.ts), not always Home,
// since that's the more natural "take me back" behavior than dropping
// them on the homepage every time.
export function AppLogoLink({ className }: { className?: string }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(getLastSitePage())}
      aria-label="Volver al sitio de la iglesia"
      title="Volver al sitio de la iglesia"
      className={`cursor-pointer ${className ?? ''}`}
    >
      <img src="/logo.png" alt="Iglesia" className="h-10 w-10 object-contain" />
    </button>
  )
}
