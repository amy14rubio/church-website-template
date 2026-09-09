// Small hand-drawn line icons (no icon library dependency), sized for use
// next to a form row instead of a text label. Each is 20x20, stroke-based,
// currentColor — matches the app's existing icon style (see
// DatePickerPopover's chevrons).

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 8h14M7 2v4M13 2v4" strokeLinecap="round" />
    </svg>
  )
}

export function PhotoIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <circle cx="7" cy="8" r="1.5" />
      <path d="m3.5 15 4.5-4.5 2.5 2.5 3-3.5 3 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ClockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 6.25v4l2.75 1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LocationIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M10 18s5.5-5 5.5-9.5A5.5 5.5 0 0 0 4.5 8.5C4.5 13 10 18 10 18Z"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.25" r="2" />
    </svg>
  )
}

export function EmailIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path d="M3 5.5 10 11 17 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DirectionsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2.5 16.5 16 10 12.5 3.5 16Z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7.5" cy="6.5" r="3" />
      <path d="M2 17v-1.5A3.5 3.5 0 0 1 5.5 12h4A3.5 3.5 0 0 1 13 15.5V17" strokeLinecap="round" />
      <path d="M13.5 6.75a3 3 0 0 1 0 5.5" strokeLinecap="round" />
      <path d="M14.5 12.05A3.5 3.5 0 0 1 18 15.5V17" strokeLinecap="round" />
    </svg>
  )
}

export function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1.5 10S5 3.5 10 3.5 18.5 10 18.5 10 15 16.5 10 16.5 1.5 10 1.5 10Z" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  )
}

// A short paragraph of lines (ragged right edge) — same idea as Google
// Calendar's description-field icon.
export function DescriptionIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 5h14M3 10h14M3 15h9" strokeLinecap="round" />
    </svg>
  )
}

export function RepeatIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.5 2.5 17 5l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9.5v-1a3 3 0 0 1 3-3h11" strokeLinecap="round" />
      <path d="M5.5 17.5 3 15l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 10.5v1a3 3 0 0 1-3 3H3" strokeLinecap="round" />
    </svg>
  )
}

export function EditIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M13.5 2.5a1.9 1.9 0 0 1 2.7 2.7L6 15.4l-3.5 1 1-3.5 10-10.4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5 5.5 5.7 16a1.5 1.5 0 0 0 1.5 1.4h5.6a1.5 1.5 0 0 0 1.5-1.4l.7-10.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MoreVerticalIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" stroke="none">
      <circle cx="10" cy="4.5" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="10" cy="15.5" r="1.4" />
    </svg>
  )
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="2.5" width="15" height="15" rx="4" />
      <circle cx="10" cy="10" r="3.5" />
      <circle cx="14.5" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 3.5v13M3.5 10h13" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3.5 5.5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="2.75" />
      <path
        d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ChatIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M3 9.5c0-3.31 3.13-6 7-6s7 2.69 7 6-3.13 6-7 6c-.86 0-1.68-.13-2.44-.38L4 16.5l1.14-3.24A5.7 5.7 0 0 1 3 9.5Z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function HamburgerIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round" />
    </svg>
  )
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16.5 12.3A6.75 6.75 0 0 1 7.7 3.5a7 7 0 1 0 8.8 8.8Z" strokeLinejoin="round" />
    </svg>
  )
}

export function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="24"
      height="24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.5l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L10 2.5Z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 17.5H4.5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1H8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 14l4-4-4-4M17 10H7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// A folded-ribbon bookmark, same outline/filled toggle as StarIcon — used
// as the "save to library" control (Medios del sitio's YouTube/Facebook
// tabs) instead of a text button, filled once the item's already saved.
export function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 3.5h8a1 1 0 0 1 1 1v12l-5-3.2-5 3.2v-12a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
    </svg>
  )
}

export function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="currentColor" stroke="none">
      <path d="M13.5 6.5H12c-.55 0-1 .3-1 1V9h2.4l-.3 2.2H11V17H8.6v-5.8H7V9h1.6V7.2C8.6 5.4 9.7 4 11.8 4h1.7v2.5Z" />
    </svg>
  )
}

// The play triangle is cut out via fill-rule rather than given its own
// color, so it reads correctly on whatever sits behind this icon (a
// solid badge, a colored background, etc.) instead of assuming white.
export function YoutubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="currentColor" stroke="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 8a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 18 8v4a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 12V8Zm6.5-.2v4.4l4-2.2-4-2.2Z"
      />
    </svg>
  )
}

// Two overlapping crop-corner brackets — used for the "adjust framing"
// (focal point/zoom) button on a placed photo (see EditablePhotoSlot,
// ImageFocalPointModal).
export function CropIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2v11a1 1 0 0 0 1 1h11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 18V7a1 1 0 0 0-1-1H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The standard four-color Google "G" mark — used only for the "Continuar
// con Google" sign-in button (LoginPage), which per Google's own brand
// guidelines needs the real multi-color logo rather than a currentColor
// glyph like every other icon here.
export function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18">
      <path fill="#4285F4" d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 3-4.32 3-7.31Z" />
      <path fill="#34A853" d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.24-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H1.06v2.59A10 10 0 0 0 10 20Z" />
      <path fill="#FBBC05" d="M4.41 11.9a6 6 0 0 1 0-3.8V5.51H1.06a10 10 0 0 0 0 8.98l3.35-2.59Z" />
      <path fill="#EA4335" d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 10 0 10 10 0 0 0 1.06 5.51l3.35 2.59C5.2 5.74 7.4 3.98 10 3.98Z" />
    </svg>
  )
}

// A speaker glyph — sound waves when unmuted, a slash through the
// speaker when muted. Used as an icon-only mute/unmute toggle (e.g. the
// home teachings carousel's background video) instead of a text label.
export function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7.5h2.5L9.5 4v12l-4-3.5H3v-5Z" strokeLinejoin="round" />
      {muted ? (
        <path d="M13 7.5l4 5M17 7.5l-4 5" strokeLinecap="round" />
      ) : (
        <>
          <path d="M12.3 7.3a3.3 3.3 0 0 1 0 5.4" strokeLinecap="round" />
          <path d="M14.5 5.2a6.4 6.4 0 0 1 0 9.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
