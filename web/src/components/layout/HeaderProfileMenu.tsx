import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { FeedbackModal } from '@/components/layout/FeedbackModal';
import { Avatar } from '@/components/ui/Avatar';
import {
  ChatIcon,
  EditIcon,
  EyeIcon,
  GearIcon,
  LogoutIcon,
  PhotoIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useSiteEditMode } from '@/contexts/SiteEditModeContext';
import { auth } from '@/firebase/config';

const menuItemClasses =
  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-(--text) hover:bg-(--surface-hover)';
const menuItemButtonClasses = `${menuItemClasses} cursor-pointer`;

export function HeaderProfileMenu() {
  const { appUser, firebaseUser } = useAuth();
  const { editMode, toggleEditMode } = useSiteEditMode();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  if (!firebaseUser) return null;

  // On mobile there's no room for (and less need of) the full admin
  // menu — tapping the avatar goes straight to Settings, which is where
  // logging out now lives too (see ProfilePage). Desktop keeps the
  // dropdown with everything.
  if (!isDesktop) {
    return (
      <Link to='/perfil' aria-label='Tu cuenta' title='Tu cuenta' className='rounded-full'>
        <Avatar
          name={appUser?.name ?? firebaseUser.email ?? '?'}
          uid={firebaseUser.uid}
          photoURL={appUser?.photoURL}
          focalPoint={appUser?.photoFocalPoint}
        />
      </Link>
    );
  }

  return (
    <div className='relative'>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label='Tu cuenta'
        title='Tu cuenta'
        className='cursor-pointer rounded-full'
      >
        <Avatar
          name={appUser?.name ?? firebaseUser.email ?? '?'}
          uid={firebaseUser.uid}
          photoURL={appUser?.photoURL}
          focalPoint={appUser?.photoFocalPoint}
        />
      </button>

      {open && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setOpen(false)} />
          <div className='absolute top-full right-0 z-50 mt-2 w-64 rounded-xl bg-(--surface) p-2 shadow-lg ring-1 ring-(--border)'>
            {(appUser?.role === 'admin' || appUser?.role === 'coAdmin') && (
              <Link to='/administracion' onClick={() => setOpen(false)} className={menuItemClasses}>
                <UsersIcon />
                Administración
              </Link>
            )}
            {(appUser?.role === 'admin' || appUser?.role === 'coAdmin') && (
              <Link to='/medios' onClick={() => setOpen(false)} className={menuItemClasses}>
                <PhotoIcon />
                Medios del sitio
              </Link>
            )}
            {(appUser?.role === 'admin' || appUser?.role === 'coAdmin') && (
              <button
                type='button'
                onClick={() => {
                  toggleEditMode();
                  setOpen(false);
                }}
                className={menuItemButtonClasses}
              >
                {editMode ? <EyeIcon /> : <EditIcon />}
                {editMode ? 'Ver en vivo' : 'Entrar en modo edición'}
              </button>
            )}
            <Link to='/perfil' onClick={() => setOpen(false)} className={menuItemClasses}>
              <GearIcon />
              Configuración
            </Link>
            <button
              type='button'
              onClick={() => {
                setOpen(false);
                setShowFeedback(true);
              }}
              className={menuItemButtonClasses}
            >
              <ChatIcon />
              Ayuda y sugerencias
            </button>
            <hr className='my-1 border-(--border)' />
            <button type='button' onClick={() => signOut(auth)} className={menuItemButtonClasses}>
              <LogoutIcon />
              Cerrar sesión
            </button>
          </div>
        </>
      )}

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
}
