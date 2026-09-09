import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// Gates a route to the Pastor or Co-admins. Used for the site media
// library (which both roles curate) and Administración — that page
// internally restricts its Pastor-only sections (role/ministry
// management, per PROJECT_SPEC.md section 9) further once a Co-admin is
// in, since this route-level gate alone isn't narrow enough for it.
// firestore.rules/storage.rules independently enforce every one of these
// distinctions too; this is just the UI-side redirect.
export function StaffRoute() {
  const { firebaseUser, appUser, loading } = useAuth()

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-(--text-muted)">Cargando…</div>
  }

  if (!firebaseUser) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  if (appUser?.role !== 'admin' && appUser?.role !== 'coAdmin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
