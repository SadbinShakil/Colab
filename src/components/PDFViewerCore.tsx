'use client'

/**
 * PDFViewerCore.tsx
 *
 * Drop-in PDF renderer using react-pdf (pdfjs-dist, MIT/Apache-2.0).
 * Replaces the Apryse WebViewer render block inside ApryseWebViewer.tsx.
 *
 * Features:
 *  - Renders all pages, virtualized scroll
 *  - Real DOM text layer → text selection works natively
 *  - Highlights stored in React state → rendered as positioned divs
 *  - Comments attached to highlights → hover tooltip via plain onMouseEnter
 *  - Fires the same callbacks the rest of the system expects:
 *      onDocumentLoaded, onAnnotationAdd, onHighlightAdd, onTextExtracted, onAskAI
 *  - No watermarks, no license key, forever free
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

// ---------------------------------------------------------------------------
// PageErrorBoundary
// Wraps each <Page> to catch synchronous errors thrown inside react-pdf's
// internal loadPage useEffect (sendWithPromise on a destroyed worker transport).
// These happen when a Page mounts just as the PDF document changes or the
// component tree unmounts. They are benign — the next load will succeed.
// ---------------------------------------------------------------------------
class PageErrorBoundary extends React.Component<
  { children: React.ReactNode; pageNumber: number },
  { dead: boolean }
> {
  constructor(props: { children: React.ReactNode; pageNumber: number }) {
    super(props)
    this.state = { dead: false }
  }

  static getDerivedStateFromError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // Only swallow pdfjs worker lifecycle errors — these are always benign on page mount/unmount.
    // All other errors are logged and the page slot is blanked to avoid infinite render loops.
    if (!msg.includes('sendWithPromise') && !msg.includes('Worker was destroyed')) {
      console.warn('[PageErrorBoundary] Unexpected Page error:', msg)
    }
    return { dead: true }
  }

  componentDidCatch(err: unknown, _info: React.ErrorInfo) {
    // Suppress the Next.js 15 dev overlay for benign pdfjs worker errors.
    // The overlay hooks into window error/unhandledrejection events — fire a
    // synthetic error event with preventDefault() so the capture-phase listener
    // in the global suppressor below can cancel it before the overlay sees it.
    if (typeof window === 'undefined') return
    const msg = err instanceof Error ? err.message : String(err ?? '')
    const isPdfWorker = msg.includes('sendWithPromise') || msg.includes('Worker was destroyed')
    if (!isPdfWorker) return
    try {
      // Some Next.js versions check window.__NEXT_DEV_OVERLAY_IGNORED_ERRORS at throw time.
      const ignored: string[] = (window as any).__NEXT_DEV_OVERLAY_IGNORED_ERRORS ?? []
      if (!ignored.includes(msg)) ignored.push(msg)
      ;(window as any).__NEXT_DEV_OVERLAY_IGNORED_ERRORS = ignored
      // Others hook __reactFiberErrorDialog — call it with false return to suppress.
      const dialog = (window as any).__reactFiberErrorDialog
      if (typeof dialog === 'function') dialog(err)
    } catch {
      // ignore — suppression is best-effort
    }
  }

  render() {
    if (this.state.dead) return null
    return this.props.children
  }
}

// Suppress noisy but harmless react-pdf warnings.
// TextLayer styles not found: CSS is imported above; warning fires during SSR before hydration.
// TextLayer task cancelled: expected on unmount/page-change.
// Both are intercepted via console.warn AND console.error because Next.js dev overlay
// routes component-level warnings through error in development.
if (typeof window !== 'undefined') {
  const SUPPRESS = [
    'TextLayer task cancelled',
    'TextLayer styles not found',
    'sendWithPromise',
    'Worker was destroyed',
  ]
  const isSuppressed = (v: unknown) =>
    typeof v === 'string' && SUPPRESS.some(s => v.includes(s))

  const _warn = console.warn.bind(console)
  const _error = console.error.bind(console)
  console.warn = (...args: unknown[]) => {
    if (isSuppressed(args[0])) return
    _warn(...args)
  }
  console.error = (...args: unknown[]) => {
    if (isSuppressed(args[0])) return
    _error(...args)
  }

  const isPdfWorkerError = (v: unknown): boolean => {
    const msg = (v instanceof Error ? v.message : String(v ?? ''))
    return SUPPRESS.some(s => msg.includes(s))
  }

  // Capture-phase listeners fire before Next.js dev overlay listeners
  window.addEventListener('unhandledrejection', (e) => {
    if (isPdfWorkerError(e?.reason)) { e.preventDefault(); e.stopImmediatePropagation() }
  }, true)
  window.addEventListener('error', (e) => {
    if (isPdfWorkerError(e?.message ?? e?.error)) { e.preventDefault(); e.stopImmediatePropagation() }
  }, true)

  // Next.js 15 dev overlay calls __NEXT_DEV_OVERLAY_IGNORED_ERRORS or patches
  // window.__reactFiberErrorDialog. Intercept both known hooks.
  ;(window as any).__NEXT_DEV_OVERLAY_IGNORED_ERRORS = (
    (window as any).__NEXT_DEV_OVERLAY_IGNORED_ERRORS ?? []
  ).concat(SUPPRESS)

  // Also patch the legacy __reactFiberErrorDialog used by some React versions
  const _dialog = (window as any).__reactFiberErrorDialog
  ;(window as any).__reactFiberErrorDialog = (err: unknown) => {
    if (isPdfWorkerError(err)) return false   // false = suppress
    return _dialog ? _dialog(err) : true
  }

  // Next.js 15 routes error-boundary errors through onCaughtError →
  // handleClientError (next-devtools/userspace/app/errors/use-error-handler.js).
  // That function pushes to a module-scoped errorQueue and dispatches via
  // queueMicrotask to registered overlay handlers.
  // Intercept by patching the webpack module exports at runtime.
  // We do this after a short delay so the Next.js module graph is fully loaded.
  setTimeout(() => {
    try {
      // webpack exposes __webpack_require__ on window in dev builds
      const wr = (window as any).__webpack_require__
      if (typeof wr !== 'function') return
      const cache = wr.c ?? {}
      for (const id of Object.keys(cache)) {
        const mod = cache[id]?.exports
        if (!mod) continue

        // Patch handleClientError in use-error-handler (identified by export shape)
        if (typeof mod.handleClientError === 'function' && typeof mod.handleConsoleError === 'function') {
          const _origHCE = mod.handleClientError
          mod.handleClientError = (error: unknown) => {
            if (isPdfWorkerError(error)) return
            _origHCE(error)
          }
        }

        // Patch originConsoleError in intercept-console-error (captured before our patch ran)
        // It's re-exported on the errors/index module as well — patch both shapes.
        if (typeof mod.originConsoleError === 'function') {
          const _origOCE = mod.originConsoleError
          mod.originConsoleError = (...args: unknown[]) => {
            if (isPdfWorkerError(args[0]) || isPdfWorkerError(args[1])) return
            _origOCE(...args)
          }
        }
      }
    } catch {
      // suppression is best-effort — ignore if webpack internals differ
    }
  }, 0)

}

// ---------------------------------------------------------------------------
// Global styles for react-pdf text layer
// Injected via <style> tag to guarantee they apply regardless of CSS import order.
// Key fix: text layer spans must be transparent (used for selection only, not display).
// ---------------------------------------------------------------------------
const PDF_LAYER_STYLES = `
  /* Text layer — invisible but selectable */
  .react-pdf__Page__textContent {
    position: absolute !important;
    top: 0 !important; left: 0 !important;
    right: 0 !important; bottom: 0 !important;
    overflow: hidden !important;
    opacity: 1 !important;
    line-height: 1 !important;
    user-select: text !important;
  }
  .react-pdf__Page__textContent span {
    color: transparent !important;
    position: absolute !important;
    white-space: pre !important;
    cursor: text !important;
    transform-origin: 0% 0% !important;
  }
  .react-pdf__Page__textContent span::selection {
    background: rgba(99, 102, 241, 0.3) !important;
    color: transparent !important;
  }
  /* Annotation layer — hide PDF's own links/annotations, we render our own */
  .react-pdf__Page__annotations {
    display: none !important;
  }
  /* Page canvas */
  .react-pdf__Page__canvas {
    display: block !important;
    max-width: 100% !important;
  }
  .react-pdf__Page {
    position: relative !important;
    overflow: hidden !important;
  }
`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PDFHighlight {
  id: string
  pageNumber: number
  /** Rects relative to the page div (percentage-based so they survive zoom) */
  rects: Array<{ top: number; left: number; width: number; height: number }>
  /** Google-Docs-style identity color for this user (assigned by server on join) */
  userColor?: string
  text: string
  color: string
  comment: string     // empty string = no comment
  author: string
  timestamp: string
  /** True for highlights received from other collaborators — rendered with stronger visibility */
  isCollaborator?: boolean
}

export interface PDFViewerCoreHandle {
  /** Scroll to a specific page */
  goToPage: (page: number) => void
  /** Get full extracted text */
  getFullText: () => string
  /** Get current page */
  getCurrentPage: () => number
  /** Highlight a passage on a given page with an amber overlay that fades after 4s */
  highlightPassage: (page: number, needle: string) => void
  /** The scrollable container element — used by PDFMinimap to track scroll position */
  getScrollContainer: () => HTMLDivElement | null
}

interface Tooltip {
  highlight: PDFHighlight
  x: number
  y: number
}

interface CommentDraft {
  highlightId: string
  text: string
}

interface PDFViewerCoreProps {
  url: string
  scale?: number
  zoomFactor?: number
  onDocumentLoaded?: (numPages: number) => void
  onTextExtracted?: (text: string) => void
  onPageTextsExtracted?: (pageTexts: Map<number, string>) => void
  onAnnotationAdd?: (ann: {
    id: string; type: string; text: string; color: string;
    comment: string; author: string; timestamp: string; pageNumber: number
  }) => void
  onHighlightAdd?: (data: {
    pageNumber: number; text: string; color: string; annotationId: string;
    rects: Array<{ top: number; left: number; width: number; height: number }>;
    comment: string;
  }) => void
  onAskAI?: (text: string) => void
  onPrerequisiteHelp?: (text: string) => void
  onRelatedWork?: (text: string) => void
  onPageChange?: (page: number) => void
  userName?: string
  /** Used to scope localStorage persistence key */
  documentId?: string
  userId?: string
  /** External highlights from collaborators — merged with local ones */
  collaboratorHighlights?: PDFHighlight[]
}

// ---------------------------------------------------------------------------
// Highlight reasons — each has a label, color, and short key
// ---------------------------------------------------------------------------

const HIGHLIGHT_REASONS = [
  { key: 'confusion',     label: 'Confused',     color: '#fca5a5', text: 'text-red-700'     },
  { key: 'question',      label: 'Question',      color: '#fcd34d', text: 'text-amber-700'   },
  { key: 'important',     label: 'Important',     color: '#6ee7b7', text: 'text-emerald-700' },
  { key: 'understood',    label: 'Understood',    color: '#93c5fd', text: 'text-blue-700'    },
  { key: 'disagree',      label: 'Disagree',      color: '#c4b5fd', text: 'text-violet-700'  },
  { key: 'clarification', label: 'Clarification', color: '#fdba74', text: 'text-orange-700'  },
]

// Keep COLORS for any legacy references
const COLORS = HIGHLIGHT_REASONS.map(r => ({ label: r.label, value: r.color }))

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function generateId() {
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Convert a DOM Range's client rects to percentage-based rects
 * relative to the given page container element.
 */
function rangeRectsRelativeTo(
  range: Range,
  pageEl: HTMLElement
): Array<{ top: number; left: number; width: number; height: number }> {
  const pageRect = pageEl.getBoundingClientRect()
  const domRects = Array.from(range.getClientRects())
  return domRects
    .filter(r => r.width > 0 && r.height > 0)
    .map(r => ({
      top:    ((r.top    - pageRect.top)  / pageRect.height) * 100,
      left:   ((r.left   - pageRect.left) / pageRect.width)  * 100,
      width:  (r.width   / pageRect.width)  * 100,
      height: (r.height  / pageRect.height) * 100,
    }))
}

// ---------------------------------------------------------------------------
// SelectionPopup — appears above selected text
// ---------------------------------------------------------------------------

interface SelectionPopupProps {
  x: number
  y: number
  selectedText: string
  onHighlight: (color: string, reason: string) => void
  onComment: () => void
  onAskAI?: () => void
  onPrerequisiteHelp?: () => void
  onRelatedWork?: () => void
  onClose: () => void
}

function SelectionPopup({ x, y, selectedText, onHighlight, onComment, onAskAI, onPrerequisiteHelp, onRelatedWork, onClose }: SelectionPopupProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{ left: x, top: y, transform: 'translateX(-50%) translateY(-110%)', minWidth: 280 }}
    >
      {/* Reason label */}
      <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Why are you highlighting?</p>
      </div>

      {/* Reason buttons — 2 columns */}
      <div className="grid grid-cols-2 gap-1 p-2">
        {HIGHLIGHT_REASONS.map(r => (
          <button
            key={r.key}
            onClick={() => { onHighlight(r.color, r.key); onClose() }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:opacity-90 transition-opacity text-left"
            style={{ backgroundColor: r.color + '33' }}
          >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
            <span className={`text-[12px] font-semibold ${r.text}`}>{r.label}</span>
          </button>
        ))}
      </div>

      {/* Secondary actions */}
      <div className="flex items-center gap-0.5 px-2 pb-2 pt-1 border-t border-gray-100">
        <button
          title="Add a comment"
          onClick={() => { onComment(); onClose() }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <span className="text-[11px] font-medium text-amber-600">Comment</span>
        </button>
        {onAskAI && (
          <button
            title="Ask AI about this"
            onClick={() => { onAskAI(); onClose() }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            </svg>
            <span className="text-[11px] font-medium text-indigo-600">Ask AI</span>
          </button>
        )}
        {onPrerequisiteHelp && (
          <button
            title="What do I need to know first?"
            onClick={() => { onPrerequisiteHelp(); onClose() }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors"
          >
            <span className="text-[11px] font-medium text-green-600">Prerequisites</span>
          </button>
        )}
        {onRelatedWork && (
          <button
            title="Find related papers"
            onClick={() => { onRelatedWork(); onClose() }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <span className="text-[11px] font-medium text-purple-600">Related Work</span>
          </button>
        )}
        <button onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-gray-100">
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CommentModal — inline comment entry
// ---------------------------------------------------------------------------

interface CommentModalProps {
  x: number
  y: number
  onSubmit: (text: string) => void
  onCancel: () => void
}

function CommentModal({ x, y, onSubmit, onCancel }: CommentModalProps) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { taRef.current?.focus() }, [])

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onCancel])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{ left: x, top: y, transform: 'translateX(-50%)', backgroundColor: '#ffffff', color: '#111827' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-600">Add comment</span>
        <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-3">
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Share your thoughts…"
          className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-gray-400"
          rows={3}
          maxLength={500}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(text) }}
        />
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => text.trim() && onSubmit(text)}
            disabled={!text.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HighlightLayer — renders all highlights for one page
// ---------------------------------------------------------------------------

interface HighlightLayerProps {
  highlights: PDFHighlight[]
  onTooltipShow: (h: PDFHighlight, x: number, y: number) => void
  onTooltipHide: () => void
  onDeleteRequest: (highlightId: string, x: number, y: number) => void
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ---------------------------------------------------------------------------
// HighlightContextMenu — right-click menu for local highlights only
// ---------------------------------------------------------------------------

interface HighlightContextMenuProps {
  x: number
  y: number
  highlight: PDFHighlight
  onDelete: (id: string) => void
  onClose: () => void
}

function HighlightContextMenu({ x, y, highlight, onDelete, onClose }: HighlightContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Clamp to viewport so the menu never clips off-screen
  const menuWidth = 200
  const menuHeight = 110
  const left = Math.min(x, window.innerWidth - menuWidth - 8)
  const top  = Math.min(y, window.innerHeight - menuHeight - 8)

  const reasonLabel = highlight.comment && highlight.comment.length < 20
    ? highlight.comment
    : null

  return (
    <div
      ref={ref}
      className="fixed z-[10000] bg-white rounded-xl shadow-2xl border border-gray-200 w-[200px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{ left, top }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header — highlight preview */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-gray-100"
        style={{ backgroundColor: hexToRgba(highlight.color, 0.12) }}
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: highlight.color }} />
        <span className="text-[11px] font-semibold text-gray-600 truncate">
          {reasonLabel ?? `"${highlight.text?.slice(0, 28) || 'Highlight'}${(highlight.text?.length ?? 0) > 28 ? '…' : ''}"`}
        </span>
      </div>

      {/* Actions */}
      <div className="p-1">
        <button
          onClick={() => { onDelete(highlight.id); onClose() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-red-50 transition-colors group"
        >
          <svg className="w-3.5 h-3.5 text-red-400 group-hover:text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-[12px] font-medium text-gray-600 group-hover:text-red-600">Remove highlight</span>
        </button>
      </div>
    </div>
  )
}

function HighlightLayer({ highlights, onTooltipShow, onTooltipHide, onDeleteRequest }: HighlightLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {highlights.map(h =>
        h.rects.map((rect, i) => {
          const identityColor = h.userColor || '#6366f1'
          const isFirst = i === 0  // only draw the author label on first rect

          return (
            <React.Fragment key={`${h.id}-${i}`}>
              <div
                className="absolute pointer-events-auto cursor-pointer"
                style={{
                  top:    `${rect.top}%`,
                  left:   `${rect.left}%`,
                  width:  `${rect.width}%`,
                  height: `${rect.height}%`,
                  // Low-alpha fill — no blend mode so stacking never darkens text
                  // Even 4 overlapping highlights stay at ~0.25 perceived opacity
                  backgroundColor: h.isCollaborator
                    ? hexToRgba(h.color, 0.22)
                    : hexToRgba(h.color, 0.18),
                  borderRadius: 2,
                  // Collaborator: solid left border in their identity color — unmistakable even when overlapping
                  borderLeft: h.isCollaborator ? `3px solid ${identityColor}` : undefined,
                  // Local: subtle bottom underline in the reason color so the user sees their own mark
                  borderBottom: !h.isCollaborator ? `2px solid ${h.color}` : undefined,
                }}
                onMouseEnter={e => (h.comment || h.isCollaborator) && onTooltipShow(h, e.clientX, e.clientY)}
                onMouseMove={e => (h.comment || h.isCollaborator) && onTooltipShow(h, e.clientX, e.clientY)}
                onMouseLeave={onTooltipHide}
                onContextMenu={e => {
                  // Only local (own) highlights can be deleted
                  if (!h.isCollaborator) {
                    e.preventDefault()
                    e.stopPropagation()
                    onDeleteRequest(h.id, e.clientX, e.clientY)
                  }
                }}
              />
              {/* Author avatar dot — only on first rect of collaborator highlights */}
              {h.isCollaborator && isFirst && (
                <div
                  className="absolute pointer-events-none flex items-center justify-center text-white font-bold"
                  style={{
                    top:    `${rect.top}%`,
                    left:   `calc(${rect.left}% - 10px)`,
                    width:  10,
                    height: `${rect.height}%`,
                    fontSize: 8,
                    backgroundColor: identityColor,
                    borderRadius: '2px 0 0 2px',
                    zIndex: 3,
                  }}
                >
                  {(h.author?.[0] ?? '?').toUpperCase()}
                </div>
              )}
            </React.Fragment>
          )
        })
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PDFViewerCore = forwardRef<PDFViewerCoreHandle, PDFViewerCoreProps>(
  function PDFViewerCore(
    {
      url,
      scale = 1.4,
      zoomFactor = 1,
      onDocumentLoaded,
      onTextExtracted,
      onPageTextsExtracted,
      onAnnotationAdd,
      onHighlightAdd,
      onAskAI,
      onPrerequisiteHelp,
      onRelatedWork,
      onPageChange,
      userName = 'Anonymous',
      documentId,
      userId,
      collaboratorHighlights = [],
    },
    ref
  ) {
    const storageKey = documentId && userId ? `coread_highlights_${documentId}_${userId}` : null

    const [workerReady, setWorkerReady] = useState(false)
    const [numPages, setNumPages] = useState(0)
    // renderedUpTo: how many page SLOTS exist in the DOM.
    // Starts at 0 on load, jumps to currentPage+INIT_BUFFER after the worker
    // settles, then expands by EXPAND_STEP per rAF as the user scrolls down.
    // This prevents the sendWithPromise/worker-destroyed race: only a handful
    // of Page components ever mount simultaneously.
    const INIT_BUFFER = 3   // pages around currentPage to show immediately
    const EXPAND_STEP = 4   // pages to unlock per rAF expansion tick
    const [renderedUpTo, setRenderedUpTo] = useState(0)
    const expandRafRef = useRef<number | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    // Pages forced into visiblePages by imperative calls (e.g. highlightPassage)
    // independent of scroll position. Cleared once the page is actually visible.
    const forcedVisibleRef = useRef<Set<number>>(new Set())
    const [, forceUpdate] = useState(0)
    const [highlights, setHighlights] = useState<PDFHighlight[]>(() => {
      // Load persisted highlights on first render
      if (!storageKey || typeof window === 'undefined') return []
      try {
        const saved = localStorage.getItem(storageKey)
        return saved ? (JSON.parse(saved) as PDFHighlight[]) : []
      } catch {
        return []
      }
    })
    const [fullText, setFullText] = useState('')

    // Persist local highlights to localStorage whenever they change
    useEffect(() => {
      if (!storageKey) return
      try {
        localStorage.setItem(storageKey, JSON.stringify(highlights))
      } catch {
        // localStorage quota exceeded — silently skip
      }
    }, [highlights, storageKey])

    // Set worker after mount so the browser environment is fully ready
    useEffect(() => {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      setWorkerReady(true)
    }, [])

    // Selection state
    const [selectionPopup, setSelectionPopup] = useState<{
      x: number; y: number; text: string; range: Range; pageNumber: number; pageEl: HTMLElement
    } | null>(null)

    // Comment modal
    const [commentTarget, setCommentTarget] = useState<{
      x: number; y: number; text: string; range: Range; pageNumber: number; pageEl: HTMLElement; color: string
    } | null>(null)

    // Hover tooltip
    const [tooltip, setTooltip] = useState<Tooltip | null>(null)

    // Context menu for deleting local highlights
    const [contextMenu, setContextMenu] = useState<{
      highlightId: string; highlight: PDFHighlight; x: number; y: number
    } | null>(null)

    const deleteHighlight = useCallback((id: string) => {
      setHighlights(prev => prev.filter(h => h.id !== id))
    }, [])

    const containerRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const fullTextRef = useRef('')

    // Expose handle to parent (ApryseWebViewer shell)
    useImperativeHandle(ref, () => ({
      goToPage: (page: number) => {
        const el = pageRefs.current.get(page)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
      getFullText: () => fullTextRef.current,
      getCurrentPage: () => currentPage,
      highlightPassage: (page: number, needle: string) => {
        // Force the target page into visiblePages immediately (without waiting
        // for the IntersectionObserver to update currentPage after scroll).
        // This ensures the <Page> component mounts even if the page is off-screen.
        // Force the target page into visiblePages and ensure renderedUpTo covers it.
        // React will re-render on the next tick, mounting the <Page> component.
        // The attempt() loop retries for up to 6s, giving React time to paint.
        forcedVisibleRef.current.add(page)
        setRenderedUpTo(prev => Math.max(prev, page + 1))
        forceUpdate(n => n + 1)

        // Scroll to the page (pageRefs always has the placeholder div)
        const pageEl = pageRefs.current.get(page)
        if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' })

        const attempt = (tries: number) => {
          const pageEl = pageRefs.current.get(page)
          const textLayer = pageEl?.querySelector('.react-pdf__Page__textContent, .textLayer')
          const spans = textLayer
            ? (Array.from(textLayer.querySelectorAll('span[role="presentation"]')) as HTMLSpanElement[])
            : []

          if (spans.length === 0) {
            if (tries > 0) setTimeout(() => attempt(tries - 1), 400)
            else console.warn(`[highlight] p${page}: no spans after all retries. needle="${needle}"`)
            return
          }

          // ── Normalise helper ──────────────────────────────────────────────────
          const norm = (s: string) =>
            s.toLowerCase()
              .replace(/[\u2018\u2019\u201a\u201b\u2032\u2035]/g, "'")
              .replace(/[\u201c\u201d\u201e\u201f\u2033\u2036]/g, '"')
              .replace(/[\u2013\u2014\u2015\u2012]/g, '-')
              .replace(/[\u00a0\u202f\u2009]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()

          // ── Build a token list from spans ─────────────────────────────────────
          // Each non-empty span is one token. This mirrors how pageTextsRef builds
          // its text: content.items.map(it.str).join(' '). The same pdfjs items
          // become the same tokens here — just rendered as positioned spans instead
          // of a flat string. By operating at the token level we avoid all
          // character-index alignment problems.
          interface SpanToken { si: number; normText: string }
          const tokens: SpanToken[] = []
          for (let si = 0; si < spans.length; si++) {
            const n = norm(spans[si].textContent || '')
            if (n) tokens.push({ si, normText: n })
          }
          if (tokens.length === 0 || !pageEl) return

          // Build a space-joined token string that mirrors pageTextsRef exactly.
          // tokenStarts[ti] = char index in tokenString where token ti begins.
          const tokenStarts: number[] = []
          let tokenString = ''
          for (let ti = 0; ti < tokens.length; ti++) {
            tokenStarts.push(tokenString.length)
            tokenString += (ti > 0 ? ' ' : '') + tokens[ti].normText
          }

          // ── Find the longest verbatim substring of the needle in tokenString ──
          // The needle came from GPT, which read pageTextsRef (same token join).
          // So needle words ARE in tokenString — we just need to find the longest
          // consecutive run that matches. Try from full needle down to 4 words,
          // sliding across every start position each time.
          const needleNorm = norm(needle)
          const needleWords = needleNorm.split(' ').filter(Boolean)

          let matchCharStart = -1  // char index into tokenString
          let matchCharEnd = -1    // inclusive

          outer: for (let size = needleWords.length; size >= Math.min(4, needleWords.length); size--) {
            for (let wstart = 0; wstart <= needleWords.length - size; wstart++) {
              const phrase = needleWords.slice(wstart, wstart + size).join(' ')
              if (phrase.length < 8) continue // skip trivially short matches
              const idx = tokenString.indexOf(phrase)
              if (idx !== -1) {
                matchCharStart = idx
                matchCharEnd = idx + phrase.length - 1
                break outer
              }
            }
          }

          if (matchCharStart === -1 || !pageEl) return

          // ── Map char range back to token indices ──────────────────────────────
          // A token at ti covers tokenString[tokenStarts[ti] .. tokenStarts[ti]+len-1].
          // We include any token whose range overlaps the match range.
          const spanSet = new Set<number>()
          for (let ti = 0; ti < tokens.length; ti++) {
            const tStart = tokenStarts[ti]
            const tEnd = tStart + tokens[ti].normText.length - 1
            if (tEnd >= matchCharStart && tStart <= matchCharEnd) {
              spanSet.add(tokens[ti].si)
            }
          }

          const pageBounds = pageEl.getBoundingClientRect()
          const overlays: HTMLDivElement[] = []

          spanSet.forEach(si => {
            const span = spans[si]
            const r = span.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            const div = document.createElement('div')
            // getBoundingClientRect() is viewport-relative for both span and pageEl.
            // Subtracting gives the position relative to the page div's top-left corner,
            // which is what position:absolute inside pageEl needs.
            div.style.cssText = [
              'position:absolute',
              `left:${r.left - pageBounds.left}px`,
              `top:${r.top - pageBounds.top}px`,
              `width:${r.width}px`,
              `height:${r.height + 2}px`,
              'background:rgba(245,158,11,0.55)',
              'border-radius:2px',
              'pointer-events:none',
              'z-index:99',
              'transition:opacity 0.6s ease',
            ].join(';')
            pageEl.appendChild(div)
            overlays.push(div)
          })

          if (overlays.length === 0) return
          // Remove from forced-visible set — the page is now physically scrolled to
          forcedVisibleRef.current.delete(page)
          overlays[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => {
            overlays.forEach(d => { d.style.opacity = '0' })
            setTimeout(() => overlays.forEach(d => d.remove()), 600)
          }, 12000)
        }
        // Start immediately, retry up to 15×400ms = 6s while page renders
        attempt(15)
      },
      getScrollContainer: () => containerRef.current,
    }))

    // ─── Paper briefing "p.N" button → scroll to that page ───
    useEffect(() => {
      const handle = (evt: Event) => {
        const page: number = (evt as CustomEvent).detail?.page
        if (!page || page < 1) return
        const el = pageRefs.current.get(page)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
      window.addEventListener('coread:go-to-page', handle as EventListener)
      return () => window.removeEventListener('coread:go-to-page', handle as EventListener)
    }, [])

    // highlightPassage is exposed via useImperativeHandle above.
    // Called directly by ApryseWebViewer via pdfViewerRef.current.highlightPassage()

    // -----------------------------------------------------------------------
    // Document load → extract full text
    // -----------------------------------------------------------------------

    // Ref to cancel in-flight text extraction when url changes or component unmounts
    const extractionAbortRef = useRef<{ cancelled: boolean; destroy: () => void } | null>(null)

    // Cancel any in-flight extraction when url changes or on unmount.
    // Reset renderedUpTo so no Page slots survive into the new worker.
    useEffect(() => {
      setRenderedUpTo(0)
      setNumPages(0)
      if (expandRafRef.current !== null) {
        cancelAnimationFrame(expandRafRef.current)
        expandRafRef.current = null
      }
      return () => {
        if (extractionAbortRef.current) {
          extractionAbortRef.current.cancelled = true
          extractionAbortRef.current.destroy()
          extractionAbortRef.current = null
        }
      }
    }, [url])

    const handleDocumentLoad = useCallback(
      async ({ numPages: n }: { numPages: number }) => {
        setNumPages(n)
        setRenderedUpTo(0)
        // Wait two macrotasks: first lets onLoadSuccess commit settle (worker init),
        // second lets the Document internal proxy stabilise before any Page mounts.
        setTimeout(() => setTimeout(() => {
          // Only unlock pages near the current viewport — the rAF expander handles the rest.
          setRenderedUpTo(prev => Math.min(n, Math.max(prev, currentPage + INIT_BUFFER)))
        }, 0), 0)
        onDocumentLoaded?.(n)

        // Cancel any previous in-flight extraction
        if (extractionAbortRef.current) {
          extractionAbortRef.current.cancelled = true
          extractionAbortRef.current.destroy()
          extractionAbortRef.current = null
        }

        // Extract full text via pdfjs directly
        try {
          const loadingTask = pdfjs.getDocument(url)
          const abort = { cancelled: false, destroy: () => loadingTask.destroy() }
          extractionAbortRef.current = abort

          const pdf = await loadingTask.promise
          if (abort.cancelled) return

          const parts: string[] = []
          const pageTexts = new Map<number, string>()
          for (let i = 1; i <= pdf.numPages; i++) {
            if (abort.cancelled) return
            const page = await pdf.getPage(i)
            if (abort.cancelled) return
            const content = await page.getTextContent()
            const pageText = content.items.map((it: any) => it.str).join(' ')
            parts.push(pageText)
            pageTexts.set(i, pageText)
          }

          if (abort.cancelled) return

          const text = parts.join('\n\n')
          fullTextRef.current = text
          setFullText(text)
          onTextExtracted?.(text)
          onPageTextsExtracted?.(pageTexts)
          // Fire the same event the document page listens for
          window.dispatchEvent(new CustomEvent('text-extraction-response', {
            detail: { success: true, text, requestId: 'initial-load-cache' }
          }))
          extractionAbortRef.current = null
        } catch (err) {
          // Swallow cancellation errors — they're expected on unmount/url change
          if (err instanceof Error && (err.message.includes('Worker was destroyed') || err.message.includes('sendWithPromise'))) return
          console.warn('[PDFViewerCore] Text extraction failed:', err)
        }
      },
      [url, onDocumentLoaded, onTextExtracted, onPageTextsExtracted]
    )

    // -----------------------------------------------------------------------
    // Intersection observer → track current page
    // -----------------------------------------------------------------------

    useEffect(() => {
      const observer = new IntersectionObserver(
        entries => {
          let best = { page: currentPage, ratio: 0 }
          entries.forEach(e => {
            const page = Number((e.target as HTMLElement).dataset.page)
            if (e.intersectionRatio > best.ratio) best = { page, ratio: e.intersectionRatio }
          })
          if (best.ratio > 0 && best.page !== currentPage) {
            setCurrentPage(best.page)
            onPageChange?.(best.page)
          }
        },
        { root: containerRef.current, threshold: [0.3, 0.6] }
      )
      pageRefs.current.forEach(el => observer.observe(el))
      return () => observer.disconnect()
    }, [numPages, currentPage, onPageChange])

    // -----------------------------------------------------------------------
    // rAF expander — unlock additional page slots as user scrolls toward the
    // bottom of the rendered range, expanding by EXPAND_STEP per frame.
    // This keeps the DOM small at load and grows it lazily without bursts.
    // -----------------------------------------------------------------------

    useEffect(() => {
      if (renderedUpTo === 0 || renderedUpTo >= numPages) return
      // If the current page is approaching the rendered boundary, expand.
      if (currentPage + INIT_BUFFER >= renderedUpTo) {
        if (expandRafRef.current !== null) return // already scheduled
        expandRafRef.current = requestAnimationFrame(() => {
          expandRafRef.current = null
          setRenderedUpTo(prev => Math.min(numPages, prev + EXPAND_STEP))
        })
      }
      return () => {
        if (expandRafRef.current !== null) {
          cancelAnimationFrame(expandRafRef.current)
          expandRafRef.current = null
        }
      }
    }, [currentPage, renderedUpTo, numPages])

    // -----------------------------------------------------------------------
    // Text selection → show popup
    // -----------------------------------------------------------------------

    const handleMouseUp = useCallback((e: React.MouseEvent, pageNumber: number, pageEl: HTMLElement) => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.rangeCount) return
      const text = selection.toString().trim()
      if (text.length < 2) return

      const range = selection.getRangeAt(0)
      const rects = range.getClientRects()
      if (!rects.length) return

      // Position popup at top-center of selection
      const firstRect = rects[0]
      setSelectionPopup({
        x: firstRect.left + firstRect.width / 2,
        y: firstRect.top,
        text,
        range: range.cloneRange(),
        pageNumber,
        pageEl,
      })
    }, [])

    // -----------------------------------------------------------------------
    // Create highlight
    // -----------------------------------------------------------------------

    const createHighlight = useCallback((
      color: string,
      comment: string,
      text: string,
      range: Range,
      pageNumber: number,
      pageEl: HTMLElement
    ) => {
      const rects = rangeRectsRelativeTo(range, pageEl)
      if (!rects.length) return

      const h: PDFHighlight = {
        id: generateId(),
        pageNumber,
        rects,
        text,
        color,
        comment,
        author: userName,
        timestamp: new Date().toISOString(),
      }

      setHighlights(prev => [...prev, h])
      window.getSelection()?.removeAllRanges()

      // Fire callbacks
      onAnnotationAdd?.({
        id: h.id, type: 'highlight', text, color, comment,
        author: userName, timestamp: h.timestamp, pageNumber,
      })
      onHighlightAdd?.({ pageNumber, text, color, annotationId: h.id, rects, comment })

      return h
    }, [userName, onAnnotationAdd, onHighlightAdd])

    // -----------------------------------------------------------------------
    // All highlights (local + collaborator)
    // -----------------------------------------------------------------------

    const allHighlights = [...highlights, ...collaboratorHighlights]

    // -----------------------------------------------------------------------
    // Visible page window — which slots get a real <Page> vs. a placeholder.
    // Only pages within PAGE_BUFFER of currentPage render; the rest are height
    // reservations. renderedUpTo controls how many slots exist in the DOM at all.
    // -----------------------------------------------------------------------
    const PAGE_BUFFER = 2
    const visiblePages = new Set<number>()
    for (let p = Math.max(1, currentPage - PAGE_BUFFER); p <= Math.min(renderedUpTo, currentPage + PAGE_BUFFER); p++) {
      visiblePages.add(p)
    }
    // Add any pages forced visible by highlightPassage (e.g. off-screen briefing targets).
    // Use numPages as the upper bound — renderedUpTo may not have caught up yet.
    forcedVisibleRef.current.forEach(p => {
      if (p >= 1 && p <= numPages) visiblePages.add(p)
    })

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
      <div className="relative w-full h-full flex flex-col bg-gray-100">

        {/* Inject text-layer styles — guarantees transparent spans regardless of CSS import order */}
        <style dangerouslySetInnerHTML={{ __html: PDF_LAYER_STYLES }} />

        {/* Scrollable pages */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto"
          style={{ overflowX: zoomFactor > 1 ? 'auto' : 'hidden' }}
        >
          <div
            className="flex flex-col items-center py-6 gap-6"
            style={zoomFactor !== 1 ? {
              transform: `scale(${zoomFactor})`,
              transformOrigin: 'top center',
              width: `${100 / zoomFactor}%`,
              minHeight: `${100 / zoomFactor}%`,
            } : undefined}
          >
          {!workerReady ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Loading PDF…
            </div>
          ) : null}
          <Document
            key={url}
            file={workerReady ? url : null}
            onLoadSuccess={handleDocumentLoad}
            onLoadError={err => console.error('[PDFViewerCore] Load error:', err)}
            loading={
              <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                Loading PDF…
              </div>
            }
          >
            {renderedUpTo > 0 && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNumber => (
              <div
                key={pageNumber}
                data-page={pageNumber}
                ref={el => {
                  if (el) pageRefs.current.set(pageNumber, el)
                  else pageRefs.current.delete(pageNumber)
                }}
                className="relative shadow-lg"
                // Reserve height for unrendered pages so scroll position is stable.
                // 1.4 scale × A4 (842pt) ≈ 1179px; close enough as a placeholder.
                style={{ lineHeight: 0, minHeight: `${Math.round(842 * scale)}px`, width: `${Math.round(595 * scale)}px`, background: '#f3f4f6' }}
              >
                {(pageNumber <= renderedUpTo || forcedVisibleRef.current.has(pageNumber)) && visiblePages.has(pageNumber) ? (
                  <>
                    <PageErrorBoundary pageNumber={pageNumber}>
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer
                      renderAnnotationLayer={false}
                      onMouseUp={e => {
                        const pageEl = pageRefs.current.get(pageNumber)
                        if (pageEl) handleMouseUp(e as React.MouseEvent, pageNumber, pageEl)
                      }}
                      onRenderError={err => {
                        // Swallow worker-destroyed errors — expected on fast scroll / url change
                        if (err?.message?.includes('sendWithPromise') || err?.message?.includes('Worker was destroyed')) return
                        console.warn('[PDFViewerCore] Page render error p' + pageNumber + ':', err?.message)
                      }}
                      className="relative"
                    />
                    </PageErrorBoundary>

                    {/* Highlight overlay for this page */}
                    <HighlightLayer
                      highlights={allHighlights.filter(h => h.pageNumber === pageNumber)}
                      onTooltipShow={(h, x, y) => setTooltip({ highlight: h, x, y })}
                      onTooltipHide={() => setTooltip(null)}
                      onDeleteRequest={(id, x, y) => {
                        const h = highlights.find(hl => hl.id === id)
                        if (h) setContextMenu({ highlightId: id, highlight: h, x, y })
                      }}
                    />
                  </>
                ) : (
                  // Placeholder — keeps scroll height stable while page is outside buffer
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-gray-300 select-none">Page {pageNumber}</span>
                  </div>
                )}
              </div>
            ))}
          </Document>
          </div>{/* end zoom wrapper */}
        </div>

        {/* Selection popup */}
        {selectionPopup && (
          <SelectionPopup
            x={selectionPopup.x}
            y={selectionPopup.y}
            selectedText={selectionPopup.text}
            onHighlight={(color, reason) => {
              createHighlight(color, reason, selectionPopup.text, selectionPopup.range, selectionPopup.pageNumber, selectionPopup.pageEl)
              setSelectionPopup(null)
            }}
            onComment={() => {
              setCommentTarget({ ...selectionPopup, color: COLORS[0].value })
              setSelectionPopup(null)
            }}
            onAskAI={onAskAI ? () => {
              onAskAI(selectionPopup.text)
              window.getSelection()?.removeAllRanges()
              setSelectionPopup(null)
            } : undefined}
            onPrerequisiteHelp={onPrerequisiteHelp ? () => {
              onPrerequisiteHelp(selectionPopup.text)
              window.getSelection()?.removeAllRanges()
              setSelectionPopup(null)
            } : undefined}
            onRelatedWork={onRelatedWork ? () => {
              onRelatedWork(selectionPopup.text)
              window.getSelection()?.removeAllRanges()
              setSelectionPopup(null)
            } : undefined}
            onClose={() => { setSelectionPopup(null) }}
          />
        )}

        {/* Comment modal */}
        {commentTarget && (
          <CommentModal
            x={commentTarget.x}
            y={commentTarget.y}
            onSubmit={text => {
              createHighlight(commentTarget.color, text, commentTarget.text, commentTarget.range, commentTarget.pageNumber, commentTarget.pageEl)
              setCommentTarget(null)
            }}
            onCancel={() => setCommentTarget(null)}
          />
        )}

        {/* Right-click context menu — only for local highlights */}
        {contextMenu && (
          <HighlightContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            highlight={contextMenu.highlight}
            onDelete={deleteHighlight}
            onClose={() => setContextMenu(null)}
          />
        )}

        {/* Hover tooltip — plain DOM, no coordinate math needed */}
        {tooltip && (
          <div
            className="fixed z-[9998] pointer-events-none"
            style={{
              left: Math.min(tooltip.x + 12, window.innerWidth - 240),
              top: tooltip.y - 12,
              transform: 'translateY(-100%)',
            }}
          >
            <div className="rounded-xl shadow-2xl border border-gray-200 w-56 overflow-hidden" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
              {tooltip.highlight.author && (
                <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 border-b border-gray-100">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: tooltip.highlight.userColor || '#6366f1' }}
                  >
                    {tooltip.highlight.author[0]?.toUpperCase()}
                  </div>
                  <span className="text-[10px] font-medium text-gray-500">{tooltip.highlight.author}</span>
                </div>
              )}
              <p className="text-[12px] leading-snug px-3 py-2.5 text-gray-800 whitespace-pre-wrap break-words">
                {tooltip.highlight.comment || (tooltip.highlight.isCollaborator ? `"${tooltip.highlight.text?.slice(0, 80) || 'highlight'}"` : '')}
              </p>
            </div>
            <div className="absolute bottom-[-5px] left-4 w-2.5 h-2.5 rotate-45 border-r border-b border-gray-200" style={{ backgroundColor: '#ffffff' }} />
          </div>
        )}
      </div>
    )
  }
)

export default PDFViewerCore
