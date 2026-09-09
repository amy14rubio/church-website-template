import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// Wraps routes that require an authenticated ministry account (e.g. a
// future role-management screen for the Pastor). Not needed for the
// calendar itself — CalendarView already adapts its query to the
// visitor's auth state per firestore.rules.
export function ProtectedRoute() {
  const { firebaseUser, loading } = useAuth()

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-(--text-muted)">Cargando…</div>
  }

  if (!firebaseUser) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  return <Outlet />
}
