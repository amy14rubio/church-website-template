import { AnchoredPopover } from '@/components/ui/AnchoredPopover'
import { THEME_LABELS, THEMES, useTheme, type Theme } from '@/contexts/ThemeContext'

// Small representative swatches for each theme's picker card — kept as a
// plain JS lookup (mirroring the CSS custom properties in index.css)
// since a card needs to preview a theme's colors without switching
// data-theme just to render its own option.
const THEME_SWATCHES: Record<Theme, { bg: string; surface: string; accent: string; border: string }> = {
  default: { bg: '#f8fafc', surface: '#ffffff', accent: '#2563eb', border: '#e5e7eb' },
  'google-light': { bg: '#ffffff', surface: '#ffffff', accent: '#1a73e8', border: '#dadce0' },
  'google-dark': { bg: '#202124', surface: '#292a2d', accent: '#8ab4f8', border: '#3c4043' },
  'apple-light': { bg: '#f2f2f7', surface: '#ffffff', accent: '#007aff', border: '#d1d1d6' },
  'apple-dark': { bg: '#000000', surface: '#1c1c1e', accent: '#0a84ff', border: '#38383a' },
  'outlook-light': { bg: '#faf9f8', surface: '#ffffff', accent: '#0078d4', border: '#edebe9' },
  'outlook-dark': { bg: '#1b1a19', surface: '#252423', accent: '#479ef5', border: '#3b3a39' },
  minimalism: { bg: '#fafafa', surface: '#ffffff', accent: '#262626', border: '#e0e0e0' },
}

export function ThemeModal({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme()

  return (
    <AnchoredPopover anchorRect={null} onClose={onClose}>
      <div className="w-full rounded-xl bg-(--surface) p-6 text-(--text) shadow-lg md:w-[35vw] md:min-w-[360px]">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Pantalla</h2>
          <button onClick={onClose} aria-label="Cerrar" className="shrink-0 cursor-pointer text-(--text-faint) hover:text-(--text-muted)">
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-(--text-muted)">Elige cómo se ve la aplicación.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {THEMES.map((option) => {
            const swatch = THEME_SWATCHES[option]
            const selected = theme === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                className={[
                  'flex cursor-pointer flex-col gap-2 rounded-lg border p-2 text-left transition-colors',
                  selected ? 'border-(--accent) ring-1 ring-(--accent)' : 'border-(--border) hover:bg-(--surface-hover)',
                ].join(' ')}
              >
                <div
                  className="flex h-12 items-center gap-1.5 rounded-md border p-1.5"
                  style={{ backgroundColor: swatch.bg, borderColor: swatch.border }}
                >
                  <div className="h-full flex-1 rounded-sm" style={{ backgroundColor: swatch.surface }} />
                  <div className="h-full w-3 rounded-sm" style={{ backgroundColor: swatch.accent }} />
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {selected && <span className="text-(--accent)">✓</span>}
                  {THEME_LABELS[option]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover)"
          >
            Listo
          </button>
        </div>
      </div>
    </AnchoredPopover>
  )
}
