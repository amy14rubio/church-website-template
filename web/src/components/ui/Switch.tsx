interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center gap-2"
    >
      <span
        className={[
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-(--accent)' : 'bg-(--border)',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-3.5 w-3.5 transform rounded-full bg-(--surface) transition-transform',
            checked ? 'translate-x-4' : 'translate-x-1',
          ].join(' ')}
        />
      </span>
      <span className="text-sm text-(--text)">{label}</span>
    </button>
  )
}
