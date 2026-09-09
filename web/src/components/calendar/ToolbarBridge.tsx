import { useEffect } from 'react'
import type { NavigateAction, ToolbarProps, View } from 'react-big-calendar'

// The toolbar state react-big-calendar computes internally (correct
// per-view label formatting and PREV/NEXT/TODAY date math) — mirrored up
// to CalendarPageHeader so it can render Hoy/prev/next/label/view-switch
// as part of the page's own header row instead of a block inside the
// calendar widget itself.
export interface CalendarToolbarState {
  label: string
  view: View
  views: View[]
  onNavigate: (action: NavigateAction, date?: Date) => void
  onView: (view: View) => void
}

// Rendered by react-big-calendar in its `components.toolbar` slot. It
// draws nothing itself — it just forwards whatever toolbar props RBC
// computed up to the real header via onStateChange, so the *actual*
// PREV/NEXT/TODAY navigation logic (which differs per view) still lives
// in exactly one place: react-big-calendar's own implementation.
export function ToolbarBridge<TEvent extends object>(
  props: ToolbarProps<TEvent> & { onStateChange: (state: CalendarToolbarState) => void },
) {
  const { label, view, views, onNavigate, onView, onStateChange } = props
  const viewList = Array.isArray(views) ? views : (Object.keys(views) as View[])

  // Gated on [label, view] rather than every render: react-big-calendar
  // hands back new onNavigate/onView closures on renders unrelated to
  // navigation too (e.g. the events list updating), and calling
  // onStateChange on every one of those fed straight back into a parent
  // setState, which triggered another render, which fed back in again —
  // an infinite loop. label changes exactly when date/view actually
  // change, so this still always re-syncs with a fresh closure whenever
  // navigation genuinely happens, and the closure captured here is
  // already the current render's (not stale) regardless of the deps
  // array — that only controls how often the effect re-runs, not which
  // values it captures when it does.
  useEffect(() => {
    onStateChange({ label, view, views: viewList, onNavigate, onView })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, view])

  return null
}
