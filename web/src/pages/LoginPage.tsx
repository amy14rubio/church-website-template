import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { GoogleIcon } from '@/components/ui/icons'

// signInWithPopup relies on window.open(), which doesn't behave like a
// real browser popup inside the Android app's WebView (see
// capacitor.config.ts) — it just hangs there instead of showing Google's
// sign-in screen. On native, FirebaseAuthentication.signInWithGoogle()
// drives the platform's own native Google Sign-In SDK instead, and the
// resulting ID token is bridged into the Firebase JS SDK session below
// (signInWithCredential) so the rest of the app — which only ever reads
// the JS SDK's auth state via AuthContext — behaves identically either
// way.
const isNativeApp = Capacitor.isNativePlatform()

const googleProvider = new GoogleAuthProvider()

export function LoginPage() {
  const { firebaseUser } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  if (firebaseUser) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signIn') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      navigate('/')
    } catch {
      setError(
        mode === 'signIn'
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo crear la cuenta. Verifica los datos e intenta de nuevo.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Same self-provisioning path as email/password (AuthContext reacts to
  // onAuthStateChanged regardless of which provider signed someone in) —
  // a brand-new Google account still starts as a plain 'member' with no
  // ministry-calendar access, same as anyone else. Covers both sign-in
  // and sign-up in one button, since Google itself already knows whether
  // this is a returning or brand-new account.
  async function handleGoogleSignIn() {
    setError(null)
    setGoogleSubmitting(true)
    try {
      if (isNativeApp) {
        const { credential } = await FirebaseAuthentication.signInWithGoogle()
        if (!credential?.idToken) {
          throw new Error('missing-id-token')
        }
        await signInWithCredential(auth, GoogleAuthProvider.credential(credential.idToken))
      } else {
        await signInWithPopup(auth, googleProvider)
      }
      navigate('/')
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : null
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth-cancelled' // native: user dismissed the Google account picker
      ) {
        // Not a real error — the user just closed the sign-in screen themselves.
        return
      }
      setError('No se pudo iniciar sesión con Google. Intenta de nuevo.')
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-(--bg) px-4 py-16">
      <div className="w-full max-w-sm rounded-xl bg-(--surface) p-8 shadow-sm ring-1 ring-(--border)">
        <h1 className="text-xl font-semibold text-(--text)">
          {mode === 'signIn' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h1>
        <p className="mt-1 text-sm text-(--text-muted)">Acceso para miembros del ministerio.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-(--text)">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-(--border) px-3 py-2 text-sm focus:border-(--accent) focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-(--text)">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-(--border) px-3 py-2 text-sm focus:border-(--accent) focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-(--danger)">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60"
          >
            {mode === 'signIn' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-(--border)" />
          <span className="text-xs text-(--text-muted)">O</span>
          <div className="h-px flex-1 bg-(--border)" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleSubmitting}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60"
        >
          <GoogleIcon />
          {googleSubmitting ? 'Conectando…' : 'Continuar con Google'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          className="mt-4 cursor-pointer text-sm text-(--text-muted) underline hover:text-(--text)"
        >
          {mode === 'signIn' ? '¿Eres nuevo en el ministerio? Crea una cuenta' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  )
}
