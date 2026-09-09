import { useState, type FormEvent } from 'react'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover'
import { StarIcon } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_FEEDBACK_ENDPOINT

const RATINGS = [1, 2, 3, 4, 5]

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { appUser, firebaseUser } = useAuth()
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!message.trim()) {
      setError('Escribe un mensaje antes de enviar.')
      return
    }
    if (!FORMSPREE_ENDPOINT) {
      setError('Los comentarios no están configurados todavía.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          rating,
          name: appUser?.name ?? null,
          email: firebaseUser?.email ?? null,
        }),
      })
      if (!response.ok) throw new Error('Formspree request failed')
      setSent(true)
    } catch {
      setError('No se pudo enviar. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnchoredPopover anchorRect={null} onClose={onClose}>
      <div className="w-full rounded-xl bg-(--surface) p-6 shadow-lg md:w-[35vw] md:min-w-[320px]">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-(--text)">Enviar comentarios</h2>
          <button onClick={onClose} aria-label="Cerrar" className="shrink-0 cursor-pointer text-(--text-faint) hover:text-(--text-muted)">
            ✕
          </button>
        </div>

        {sent ? (
          <p className="mt-4 text-sm text-(--text-muted)">¡Gracias! Tu mensaje fue enviado.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="feedbackMessage" className="block text-sm font-medium text-(--text)">
                Mensaje
              </label>
              <textarea
                id="feedbackMessage"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="¿Qué podemos mejorar?"
                className="mt-1 w-full resize-none rounded-md border border-(--border) px-3 py-2 text-sm focus:border-(--accent) focus:outline-none"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-(--text)">Calificación (opcional)</span>
              <div className="mt-1 flex gap-1" onMouseLeave={() => setHoverRating(null)}>
                {RATINGS.map((value) => {
                  const filled = value <= (hoverRating ?? rating ?? 0)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(rating === value ? null : value)}
                      onMouseEnter={() => setHoverRating(value)}
                      aria-label={`${value} de 5`}
                      className={[
                        'flex h-8 w-8 cursor-pointer items-center justify-center',
                        filled ? 'text-amber-400' : 'text-(--text-faint) hover:text-amber-300',
                      ].join(' ')}
                    >
                      <StarIcon filled={filled} />
                    </button>
                  )
                })}
              </div>
            </div>

            {error && <p className="text-sm text-(--danger)">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-md bg-(--surface-alt) px-3 py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover)"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60"
              >
                Enviar
              </button>
            </div>
          </form>
        )}
      </div>
    </AnchoredPopover>
  )
}
