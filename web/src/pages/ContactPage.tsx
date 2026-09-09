import { useState, type FormEvent } from 'react';
import { EditableText } from '@/components/site/EditableText';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useSiteTextValue } from '@/contexts/SiteTextContext';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };

const DEFAULT_ADDRESS = '[Dirección de la iglesia]';

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_CONTACT_ENDPOINT;

const fieldClasses =
  'w-full rounded-md bg-(--site-placeholder)/10 px-4 py-3 text-sm text-(--site-text) outline-none';

// "Contáctenos" — ported from the previous GoDaddy site. The map is a
// real embed, and follows the same editable address text below it (so
// editing the address can't drift out of sync with the pin on the map).
// The Ubicación card's own "Ver direcciones" link and the map below both
// read off that same address, so they can never disagree with each other.
// The message form posts to its own Formspree endpoint (separate from
// the header's "Enviar comentarios" feedback form, which goes to the
// developer instead of the church — see FeedbackModal).
export function ContactPage() {
  const address = useSiteTextValue('contact-address', DEFAULT_ADDRESS);
  const mapsEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!FORMSPREE_ENDPOINT) {
      setError('El formulario no está configurado todavía.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!response.ok) throw new Error('Formspree request failed');
      setSent(true);
    } catch {
      setError('No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className='flex min-h-screen flex-col bg-(--site-bg)'
      style={{ fontFamily: 'var(--site-font-body)' }}
    >
      <SiteHeader />

      <section className='px-4 pt-12 pb-8 sm:px-6'>
        <EditableText
          slotKey='contact-h1'
          as='h1'
          className='text-center text-3xl font-bold text-(--site-maroon) uppercase'
          style={{ fontFamily: 'var(--site-font-heading)' }}
          fallback='Contáctenos'
        />
      </section>

      <div className='mx-auto flex w-full max-w-3xl flex-col gap-1 px-4 pb-16 text-center text-(--site-text) sm:px-6'>
        <p>
          <EditableText
            slotKey='contact-schedule'
            as='span'
            multiline
            fallback='[Horario de servicios]'
          />
        </p>
        <p>
          {'Y puedes encontrarnos en '}
          <EditableText slotKey='contact-address' as='span' fallback={DEFAULT_ADDRESS} />
          {' ('}
          <a
            href={directionsUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='text-(--site-maroon) hover:underline'
          >
            ver direcciones
          </a>
          {').'}
        </p>
      </div>

      <div className='mx-auto grid w-full max-w-5xl gap-10 px-4 pb-16 sm:px-6 md:grid-cols-2'>
        <div className='flex flex-col gap-4'>
          <EditableText
            slotKey='contact-form-heading'
            as='h2'
            className='text-2xl font-bold text-(--site-text)'
            style={headingStyle}
            fallback='¡Envía un mensaje!'
          />
          {sent ? (
            <p className='text-sm text-(--site-text-muted)'>¡Gracias! Tu mensaje fue enviado.</p>
          ) : (
            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
              <input
                type='text'
                required
                placeholder='Name*'
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClasses}
              />
              <input
                type='email'
                required
                placeholder='Email*'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClasses}
              />
              <textarea
                required
                placeholder='Message*'
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className={fieldClasses}
              />
              {error && <p className='text-sm text-(--danger)'>{error}</p>}
              <button
                type='submit'
                disabled={submitting}
                className='mt-2 cursor-pointer rounded-md bg-black py-3 text-sm font-semibold tracking-wide text-white uppercase hover:bg-black/85 disabled:opacity-60'
              >
                {submitting ? 'Enviando…' : 'Enviar'}
              </button>
            </form>
          )}
        </div>

        <div className='h-80 w-full overflow-hidden rounded-lg border border-(--site-border) md:h-auto'>
          <iframe
            title='Ubicación de Iglesia'
            src={mapsEmbedSrc}
            className='h-full w-full border-0'
            loading='lazy'
          />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
