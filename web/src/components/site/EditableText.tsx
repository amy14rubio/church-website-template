import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteEditMode } from '@/contexts/SiteEditModeContext'
import { useSiteTextValue } from '@/contexts/SiteTextContext'
import { setSiteText } from '@/lib/siteText'

// Inline-editable text for a Pastor/Co-admin in edit mode — click
// straight into the heading/paragraph and type, like a Google Doc,
// instead of swapping to a separate input (which broke text-align and
// added its own chrome). Saves automatically on blur. Renders as plain
// static text for everyone else. Not wired up to Quiénes somos'
// long-form history/vision/statement of faith yet — that copy mixes
// bold/italic emphasis a plain text field would flatten; revisit with a
// richer editor if that needs to change often.
export function EditableText({
  slotKey,
  fallback,
  as = 'span',
  multiline = false,
  className = '',
  style,
}: {
  slotKey: string
  fallback: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  multiline?: boolean
  className?: string
  style?: CSSProperties
}) {
  const { appUser } = useAuth()
  const { editMode } = useSiteEditMode()
  const value = useSiteTextValue(slotKey, fallback)
  const isEditor = (appUser?.role === 'admin' || appUser?.role === 'coAdmin') && editMode

  const Tag = as

  if (!isEditor) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    )
  }

  async function commit(event: FocusEvent<HTMLElement>) {
    const next = (event.currentTarget.textContent ?? '').trim()
    if (next === '') {
      event.currentTarget.textContent = value
      return
    }
    if (next === value.trim() || !appUser) return
    await setSiteText(slotKey, next, appUser.uid)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.currentTarget.textContent = value
      event.currentTarget.blur()
    } else if (!multiline && event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  // stopPropagation matters here — this text can sit inside a Link (e.g.
  // SiteHeader's brand name), and without it, clicking to place the
  // cursor would also trigger that Link's navigation. Cursor placement
  // itself happens on mousedown, before this fires, so it's unaffected.
  function handleClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation()
  }

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      title="Clic para editar"
      style={style}
      className={`${className} cursor-text rounded outline-none hover:bg-(--site-maroon)/10`}
    >
      {value}
    </Tag>
  )
}
