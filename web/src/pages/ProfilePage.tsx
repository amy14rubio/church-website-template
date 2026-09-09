import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ImageFocalPointModal } from '@/components/site/ImageFocalPointModal';
import { Avatar } from '@/components/ui/Avatar';
import { LogoutIcon, PhotoIcon, TrashIcon } from '@/components/ui/icons';
import { Switch } from '@/components/ui/Switch';
import { useModalScrollLock } from '@/hooks/useModalScrollLock';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db, functions } from '@/firebase/config';
import { requestMinistryAccess } from '@/lib/ministryAccess';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPermission,
  isPushSupported,
  type PushPermission,
} from '@/lib/pushNotifications';
import { assertUploadableImage, removeProfilePicture, uploadProfilePicture } from '@/lib/profilePicture';
import { ROLE_LABELS } from '@/lib/roles';
import type { ImageFocalPoint } from '@/types/models';

const inputClasses =
  'mt-1 w-full rounded-md border border-(--border) bg-(--surface-alt) px-3 py-2 text-sm focus:border-(--accent) focus:outline-none';
// Same field, no top margin — for a row where the margin already comes
// from the row's own layout (e.g. an input sitting next to its Guardar
// button) instead of stacking under its own label.
const inlineInputClasses =
  'w-full rounded-md border border-(--border) bg-(--surface-alt) px-3 py-2 text-sm focus:border-(--accent) focus:outline-none';

function isRequiresRecentLogin(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === 'auth/requires-recent-login'
  );
}

function isWrongPassword(err: unknown): boolean {
  if (typeof err !== 'object' || err === null || !('code' in err)) return false;
  return err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential';
}

// A plain confirm dialog rather than a "type DELETE to confirm" style
// gate — the deletion itself runs server-side with no separate re-auth
// step (see handleDeleteAccount), so this dialog is the only friction
// standing between a click and an irreversible action, and needs to say
// so plainly rather than relying on an extra typed word to convey that.
function DeleteAccountModal({
  deleting,
  error,
  onConfirm,
  onClose,
}: {
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useModalScrollLock();

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4' onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className='w-full max-w-sm rounded-lg bg-(--surface) p-6'
      >
        <h2 className='text-lg font-semibold text-(--text)'>Eliminar cuenta</h2>
        <p className='mt-2 text-sm text-(--text-muted)'>
          Esta acción es permanente y no se puede deshacer. Se eliminará tu perfil, tu correo
          guardado y tus confirmaciones de asistencia a eventos.
        </p>
        {error && <p className='mt-2 text-sm text-(--danger)'>{error}</p>}
        <div className='mt-4 flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            disabled={deleting}
            className='cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-(--text) hover:bg-(--surface-alt) disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={deleting}
            className='cursor-pointer rounded-md bg-(--danger) px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60'
          >
            {deleting ? 'Eliminando…' : 'Eliminar cuenta'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ProfilePage() {
  const { firebaseUser, appUser } = useAuth();
  const navigate = useNavigate();

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  // The file the user just picked, waiting on the crop step below before
  // it actually becomes the profile picture — see handlePhotoChange/
  // handleSaveCroppedPhoto. Cancelling the crop modal just discards this;
  // nothing is uploaded until "Guardar" there.
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; url: string } | null>(null);

  const [name, setName] = useState(appUser?.name ?? '');
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [email, setEmail] = useState(firebaseUser?.email ?? '');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaved, setEmailSaved] = useState(false);

  const [requestingAccess, setRequestingAccess] = useState(false);
  const [requestAccessError, setRequestAccessError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // When Firebase rejects the email change as "too old a session," this
  // holds the action to retry once the user re-enters their current
  // password — rather than asking for it up front every time, which would
  // be unnecessary friction most of the time. The password form below
  // doesn't need this: it always asks for the current password up front,
  // since changing a password without confirming it is the confusing part.
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthSubmitting, setReauthSubmitting] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // null while still checking (both isPushSupported and getPushPermission
  // are async — permission checks always are on native) — the toggle
  // stays hidden until these resolve rather than flashing an "on" state
  // that might immediately need to flip to "unsupported."
  const [pushSupported, setPushSupported] = useState<boolean | null>(null);
  const [pushPermission, setPushPermission] = useState<PushPermission | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    void isPushSupported().then(setPushSupported);
    void getPushPermission().then(setPushPermission);
  }, []);

  if (!firebaseUser || !appUser) return null;
  // TypeScript's narrowing above doesn't carry into the closures defined
  // below (they could run after a re-render), so capture non-null locals
  // once here instead of re-checking in every handler.
  const currentUser = firebaseUser;
  const currentAppUser = appUser;

  async function runWithReauth(action: () => Promise<void>, onNeedsReauth: () => void) {
    try {
      await action();
    } catch (err) {
      if (isRequiresRecentLogin(err)) {
        setPendingAction(() => action);
        onNeedsReauth();
        return;
      }
      throw err;
    }
  }

  // Doesn't upload anything yet — just validates the picked file and
  // hands it to the crop step below (see the ImageFocalPointModal
  // rendered near the bottom of this component). Nothing actually
  // becomes the profile picture until that modal's own "Guardar".
  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoError(null);
    try {
      assertUploadableImage(file);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
      return;
    }
    setPendingPhoto({ file, url: URL.createObjectURL(file) });
  }

  function handleCancelCrop() {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.url);
    setPendingPhoto(null);
  }

  async function handleSaveCroppedPhoto(focalPoint: ImageFocalPoint) {
    if (!pendingPhoto) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      await uploadProfilePicture(pendingPhoto.file, currentAppUser.uid, focalPoint);
      URL.revokeObjectURL(pendingPhoto.url);
      setPendingPhoto(null);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      await removeProfilePicture(currentAppUser.uid);
    } catch {
      setPhotoError('No se pudo quitar la foto.');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleRequestMinistryAccess() {
    setRequestAccessError(null);
    setRequestingAccess(true);
    try {
      await requestMinistryAccess(currentAppUser.uid);
    } catch {
      setRequestAccessError('No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setRequestingAccess(false);
    }
  }

  // Never flips the switch on optimistically — it only reflects "on"
  // once enablePushNotifications has actually resolved with a real,
  // saved token (see the switch's own `checked` expression below). If the
  // browser's real permission prompt gets ignored/dismissed rather than
  // explicitly allowed or blocked, this simply resolves to 'denied' and
  // the switch stays off, same as an explicit block.
  async function handleTogglePush(next: boolean) {
    setPushError(null);

    if (!next) {
      setPushBusy(true);
      try {
        await disablePushNotifications(currentAppUser.uid);
        setPushPermission(await getPushPermission());
      } catch {
        setPushError('No se pudo desactivar. Intenta de nuevo.');
      } finally {
        setPushBusy(false);
      }
      return;
    }

    // Already blocked at the OS/browser level — requesting again would
    // just silently no-op here (neither platform re-shows its own prompt
    // after an explicit block), so there's nothing to await; go straight
    // to showing the "you blocked this" message instead.
    if ((await getPushPermission()) === 'denied') {
      setPushPermission('denied');
      return;
    }

    setPushBusy(true);
    try {
      const result = await enablePushNotifications(currentAppUser.uid);
      const permission = await getPushPermission();
      setPushPermission(permission);
      if (result === 'unsupported') {
        setPushError('Tu navegador no admite notificaciones push.');
      } else if (result === 'denied' && permission !== 'denied') {
        // Permission is still 'default' (prompt was dismissed rather than
        // explicitly blocked) but the token step itself failed.
        setPushError('No se pudo activar. Intenta de nuevo.');
      }
    } catch {
      setPushError('No se pudo activar. Intenta de nuevo.');
    } finally {
      setPushBusy(false);
    }
  }

  async function handleSaveName(event: FormEvent) {
    event.preventDefault();
    setNameError(null);
    setNameSaved(false);
    if (!name.trim()) {
      setNameError('El nombre no puede estar vacío.');
      return;
    }
    setNameSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', currentAppUser.uid), {
        name: name.trim(),
        updatedAt: serverTimestamp(),
      });
      setNameSaved(true);
    } catch {
      setNameError('No se pudo guardar el nombre. Intenta de nuevo.');
    } finally {
      setNameSubmitting(false);
    }
  }

  async function handleSaveEmail(event: FormEvent) {
    event.preventDefault();
    setEmailError(null);
    setEmailSaved(false);
    if (!email.trim()) {
      setEmailError('El correo no puede estar vacío.');
      return;
    }
    setEmailSubmitting(true);
    try {
      await runWithReauth(
        async () => {
          await updateEmail(currentUser, email.trim());
          // Own doc, own write — see firestore.rules' users/{uid}/private/
          // {docId} for why this lives apart from the rest of the profile.
          // setDoc/merge rather than updateDoc since an account that
          // existed before this split may not have this doc yet.
          await setDoc(
            doc(db, 'users', currentAppUser.uid, 'private', 'profile'),
            { email: email.trim() },
            { merge: true },
          );
          setEmailSaved(true);
        },
        () => setEmailError('Por seguridad, confirma tu contraseña actual para cambiar el correo.'),
      );
    } catch {
      setEmailError('No se pudo cambiar el correo. Verifica que sea válido e intenta de nuevo.');
    } finally {
      setEmailSubmitting(false);
    }
  }

  // Always confirms the current password up front, rather than only
  // reacting to a "session too old" error after the fact — the whole
  // point is that submitting this form actually changes the password in
  // one step, with no separate confirmation round-trip.
  async function handleSavePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (!currentUser.email) return;
    setPasswordSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(
        isWrongPassword(err)
          ? 'La contraseña actual es incorrecta.'
          : 'No se pudo cambiar la contraseña. Intenta de nuevo.',
      );
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleReauthSubmit(event: FormEvent) {
    event.preventDefault();
    if (!currentUser.email || !pendingAction) return;
    setReauthError(null);
    setReauthSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, reauthPassword);
      await reauthenticateWithCredential(currentUser, credential);
      const action = pendingAction;
      setPendingAction(null);
      setReauthPassword('');
      await action();
    } catch {
      setReauthError('Contraseña incorrecta. Intenta de nuevo.');
    } finally {
      setReauthSubmitting(false);
    }
  }

  // Runs entirely server-side (see functions/src/index.ts's deleteAccount)
  // — no client-side re-auth step needed here regardless of whether this
  // account signed in with a password or Google.
  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeletingAccount(true);
    try {
      await httpsCallable(functions, 'deleteAccount')({});
      // The account is already gone server-side at this point — this
      // just tears down the client's own local session immediately,
      // rather than leaving it looking signed-in until the next token
      // refresh discovers the user no longer exists.
      await signOut(auth);
      navigate('/');
    } catch {
      setDeleteError('No se pudo eliminar la cuenta. Intenta de nuevo.');
      setDeletingAccount(false);
    }
  }

  return (
    <div className='mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6'>
      <div className='flex items-center gap-4 rounded-xl bg-(--surface-alt) p-4'>
        <div className='relative shrink-0'>
          <Avatar
            name={appUser.name}
            uid={appUser.uid}
            photoURL={appUser.photoURL}
            focalPoint={appUser.photoFocalPoint}
            size='lg'
          />
          <button
            type='button'
            onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading}
            aria-label='Cambiar foto de perfil'
            title='Cambiar foto de perfil'
            className='absolute -right-1 -bottom-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-(--accent) text-(--accent-contrast) shadow hover:bg-(--accent-hover) disabled:opacity-60'
          >
            <PhotoIcon />
          </button>
          <input
            ref={photoInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handlePhotoChange}
          />
        </div>
        <div>
          <h1 className='text-lg font-semibold text-(--text)'>{appUser.name}</h1>
          <p className='text-sm text-(--text-muted)'>{firebaseUser.email}</p>
          <span className='mt-2 inline-block rounded-full bg-(--surface) px-2.5 py-1 text-xs font-medium text-(--text-muted)'>
            {ROLE_LABELS[appUser.role]}
          </span>

          {photoUploading && <p className='mt-2 text-xs text-(--text-muted)'>Subiendo…</p>}
          {photoError && <p className='mt-2 text-xs text-(--danger)'>{photoError}</p>}
          {appUser.photoURL && !photoUploading && (
            <button
              type='button'
              onClick={handleRemovePhoto}
              className='mt-2 block cursor-pointer text-xs font-medium text-(--danger) hover:underline'
            >
              Quitar foto
            </button>
          )}
        </div>
      </div>

      {pushSupported && (
        <>
          <h2 className='mt-8 text-xl font-bold text-(--text)'>Notificaciones</h2>
          <div className='mt-4'>
            <Switch
              checked={pushPermission === 'granted' && Boolean(appUser.fcmToken)}
              onChange={handleTogglePush}
              label='Avisarme si se cancela un evento'
            />
            {pushBusy ? (
              <p className='mt-1 text-xs font-medium text-(--text-muted)'>Un momento…</p>
            ) : (
              <p className='mt-1 text-xs text-(--text-muted)'>
                Recibe una notificación si un evento se cancela. En iPhone, esto solo funciona si
                primero agregas este sitio a tu pantalla de inicio.
              </p>
            )}
            {pushPermission === 'denied' && (
              <p className='mt-2 text-xs text-(--danger)'>
                Bloqueaste las notificaciones para este sitio en tu navegador. Para activarlas,
                búscalas en la configuración del sitio de tu navegador (por ejemplo, el ícono de
                candado junto a la dirección) y vuelve a intentarlo aquí.
              </p>
            )}
            {pushError && <p className='mt-2 text-xs text-(--danger)'>{pushError}</p>}
          </div>
        </>
      )}

      {/* Ministry-calendar access is a plain church member's only path to
          it — a request/pending state here, nowhere in the calendar
          itself (see MinistryAccessPromptModal's own note). Once
          approved, role stops being 'member' and this whole section goes
          away on its own. Moved here (and given its own real button,
          rather than the small text link this used to be next to the
          role badge) since that was too easy to miss entirely. */}
      {appUser.role === 'member' && (
        <>
          <h2 className='mt-8 text-xl font-bold text-(--text)'>Solicitar acceso</h2>
          <div className='mt-4'>
            {appUser.ministryAccessRequestStatus === 'pending' ? (
              <span className='inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800'>
                Pendiente de aprobación
              </span>
            ) : (
              <>
                <p className='text-sm text-(--text-muted)'>
                  Si colaboras en algún ministerio, solicita acceso aquí para ver un calendario
                  interno, así te mantienes al tanto de actividades y evitas conflictos de
                  horario. Un administrador revisará tu solicitud antes de darte acceso.
                </p>
                <button
                  type='button'
                  onClick={handleRequestMinistryAccess}
                  disabled={requestingAccess}
                  className='mt-2 cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60'
                >
                  {requestingAccess ? 'Enviando…' : 'Solicitar acceso al calendario'}
                </button>
              </>
            )}
            {requestAccessError && (
              <p className='mt-2 text-sm text-(--danger)'>{requestAccessError}</p>
            )}
          </div>
        </>
      )}

      <h2 className='mt-8 text-xl font-bold text-(--text)'>Editar perfil</h2>

      <div className='mt-4 space-y-6'>
        <div>
          <label htmlFor='name' className='text-sm font-medium text-(--text-muted)'>
            Nombre
          </label>
          <form onSubmit={handleSaveName} className='mt-1 flex items-start gap-2'>
            <input
              id='name'
              type='text'
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameSaved(false);
              }}
              className={inlineInputClasses}
            />
            <button
              type='submit'
              disabled={nameSubmitting}
              className='shrink-0 cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60'
            >
              Guardar
            </button>
          </form>
          {nameError && <p className='mt-2 text-sm text-(--danger)'>{nameError}</p>}
          {nameSaved && <p className='mt-2 text-sm text-emerald-600'>Nombre actualizado.</p>}
        </div>

        <div>
          <label htmlFor='email' className='text-sm font-medium text-(--text-muted)'>
            Correo
          </label>
          <form onSubmit={handleSaveEmail} className='mt-1 flex items-start gap-2'>
            <input
              id='email'
              type='email'
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailSaved(false);
              }}
              className={inlineInputClasses}
            />
            <button
              type='submit'
              disabled={emailSubmitting}
              className='shrink-0 cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60'
            >
              Guardar
            </button>
          </form>
          {emailError && <p className='mt-2 text-sm text-(--danger)'>{emailError}</p>}
          {emailSaved && <p className='mt-2 text-sm text-emerald-600'>Correo actualizado.</p>}
        </div>

        <div>
          <label className='text-sm font-medium text-(--text-muted)'>Contraseña</label>
          <form
            onSubmit={handleSavePassword}
            className='mt-1 space-y-2 rounded-lg bg-(--surface-alt) p-3'
          >
            <div>
              <label htmlFor='currentPassword' className='text-xs text-(--text-muted)'>
                Contraseña actual
              </label>
              <input
                id='currentPassword'
                type='password'
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordSaved(false);
                }}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor='newPassword' className='text-xs text-(--text-muted)'>
                Nueva contraseña
              </label>
              <input
                id='newPassword'
                type='password'
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordSaved(false);
                }}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor='confirmPassword' className='text-xs text-(--text-muted)'>
                Confirmar nueva contraseña
              </label>
              <input
                id='confirmPassword'
                type='password'
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordSaved(false);
                }}
                className={inputClasses}
              />
            </div>
            <div className='pt-1'>
              <button
                type='submit'
                disabled={passwordSubmitting}
                className='cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60'
              >
                Cambiar contraseña
              </button>
            </div>
          </form>
          {passwordError && <p className='mt-2 text-sm text-(--danger)'>{passwordError}</p>}
          {passwordSaved && (
            <p className='mt-2 text-sm text-emerald-600'>Contraseña actualizada.</p>
          )}
        </div>

        <div className='flex flex-wrap gap-2 border-t border-(--border) pt-6'>
          <button
            type='button'
            onClick={() => signOut(auth)}
            className='flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-(--danger) hover:bg-(--surface-alt)'
          >
            <LogoutIcon />
            Cerrar sesión
          </button>
          <button
            type='button'
            onClick={() => setShowDeleteConfirm(true)}
            className='flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-(--danger) hover:bg-(--surface-alt)'
          >
            <TrashIcon />
            Eliminar cuenta
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteAccountModal
          deleting={deletingAccount}
          error={deleteError}
          onConfirm={handleDeleteAccount}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteError(null);
          }}
        />
      )}

      {pendingAction && (
        <div className='mt-6 rounded-md border border-amber-200 bg-amber-50 p-4'>
          <form onSubmit={handleReauthSubmit}>
            <label htmlFor='reauthPassword' className='block text-sm font-medium text-(--text)'>
              Confirma tu contraseña actual
            </label>
            <input
              id='reauthPassword'
              type='password'
              required
              autoFocus
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              className={inputClasses}
            />
            {reauthError && <p className='mt-2 text-sm text-(--danger)'>{reauthError}</p>}
            <div className='mt-3 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setPendingAction(null);
                  setReauthPassword('');
                  setReauthError(null);
                }}
                className='cursor-pointer rounded-md bg-(--surface) px-3 py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover)'
              >
                Cancelar
              </button>
              <button
                type='submit'
                disabled={reauthSubmitting}
                className='cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60'
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingPhoto && (
        <ImageFocalPointModal
          imageUrl={pendingPhoto.url}
          aspectRatio={1}
          initial={null}
          onSave={handleSaveCroppedPhoto}
          onClose={handleCancelCrop}
        />
      )}
    </div>
  );
}
