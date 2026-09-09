import { useEffect, useState } from 'react'
import { computeFocalPointStyle } from '@/lib/imageFocalPoint'
import type { ImageFocalPoint } from '@/types/models'

const SIZE_CLASSES = {
  sm: 'h-9 w-9 text-sm',
  lg: 'h-24 w-24 text-3xl',
}

// A fixed palette (not a full color wheel) so white initial text stays
// legible against it — picked deterministically so the same person
// always lands on the same color.
const PALETTE = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#d97706', '#059669', '#0891b2']

function initialColor(seed: string): string {
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return PALETTE[hash % PALETTE.length]
}

interface AvatarProps {
  name: string
  uid: string
  photoURL?: string | null
  // The crop chosen at upload time (see ProfilePage's own crop step,
  // uploadProfilePicture) — same non-destructive model as a site photo's
  // focal point. Ignored for the colored-initial fallback, which has no
  // crop of its own.
  focalPoint?: ImageFocalPoint | null
  size?: keyof typeof SIZE_CLASSES
}

type Stage = 'photo' | 'initial'

// Two-tier fallback: a real photo (uploaded — see src/lib/profilePicture.ts
// — or Google's own, copied in at first sign-in), or a plain colored
// initial if there's none (or it fails to load). Used to generate a
// DiceBear "Line Face" avatar as a middle tier here, seeded with the uid
// — dropped since it didn't read as fitting the rest of the app, and its
// removal also means one less third-party call that can fail to load
// (DiceBear's hosted API was already flaky enough in production to need
// a fallback of its own).
export function Avatar({ name, uid, photoURL, focalPoint, size = 'sm' }: AvatarProps) {
  const [stage, setStage] = useState<Stage>(photoURL ? 'photo' : 'initial')

  // A different person's Avatar can mount into the same spot (e.g. this
  // component instance reused across a re-render with new props) — reset
  // back to the top of the fallback chain rather than carrying over a
  // previous user's load failure.
  useEffect(() => {
    setStage(photoURL ? 'photo' : 'initial')
  }, [photoURL, uid])

  if (stage === 'initial') {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZE_CLASSES[size]}`}
        style={{ backgroundColor: initialColor(name || uid) }}
      >
        {name.trim() ? name.trim()[0].toUpperCase() : '?'}
      </span>
    )
  }

  return (
    <span
      className={['relative inline-block shrink-0 overflow-hidden rounded-full', SIZE_CLASSES[size]].join(' ')}
    >
      <img
        src={photoURL ?? undefined}
        alt={name}
        onError={() => setStage('initial')}
        className={focalPoint ? undefined : 'h-full w-full object-cover'}
        style={focalPoint ? computeFocalPointStyle(focalPoint, 1) : undefined}
      />
    </span>
  )
}
