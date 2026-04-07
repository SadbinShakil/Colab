'use client'

/**
 * ContentDetectionNudge
 *
 * Non-modal ambient chip that appears when the current page contains a figure,
 * table, equation, or algorithm. Offers a one-click "explain this" that returns
 * a PhD-level grounded explanation anchored to the actual section text.
 *
 * Design principles (CoRead / CLAUDE.md):
 *  - Stage 1: Small chip at bottom-right — not intrusive, dismissible in one click
 *  - Stage 2: Explanation panel — full-width card, PhD-level, source-linked
 *  - Never blocks reading — stays fixed bottom-right, outside the PDF viewport
 *  - Auto-dismisses after 30s if ignored
 *  - Cooldown: won't re-appear for the same section within the same session
 *  - Grounded: every explanation sentence is derived from sectionText (via ai-tutor)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronRight, Loader2, BarChart2, Table2, FunctionSquare, Cpu, Quote } from 'lucide-react'

export type ContentFlag = 'figure' | 'table' | 'equation' | 'algorithm'

export interface ContentDetectionNudgeProps {
  sectionId: string
  sectionName: string
  sectionText: string
  flags: ContentFlag[]            // detected element types in this section
  documentTitle?: string
  onDismiss: () => void
}

const FLAG_CONFIG: Record<ContentFlag, {
  icon: React.ComponentType<{ className?: string }>
  label: string
  promptLabel: string
  color: string
  gradient: string
  query: (section: string, text: string) => string
}> = {
  figure: {
    icon: BarChart2,
    label: 'Figure detected',
    promptLabel: 'Explain figure',
    color: 'text-violet-700',
    gradient: 'from-violet-500 to-purple-600',
    query: (s, t) =>
      `In §${s}: a figure is referenced. Based strictly on the section text below, explain: (1) what the figure shows, (2) what the authors claim it demonstrates, and (3) whether the visual evidence is sufficient to support that claim. Quote the specific caption or reference sentence.\n\nSection text:\n${t.slice(0, 4000)}`,
  },
  table: {
    icon: Table2,
    label: 'Table detected',
    promptLabel: 'Unpack table',
    color: 'text-blue-700',
    gradient: 'from-blue-500 to-indigo-600',
    query: (s, t) =>
      `In §${s}: a table is present. Based strictly on the section text, explain: (1) what variables or conditions the table compares, (2) what the key numeric result is, and (3) what the authors conclude from it — and whether that conclusion is warranted. Quote the specific result.\n\nSection text:\n${t.slice(0, 4000)}`,
  },
  equation: {
    icon: FunctionSquare,
    label: 'Equation detected',
    promptLabel: 'Trace the math',
    color: 'text-amber-700',
    gradient: 'from-amber-500 to-orange-500',
    query: (s, t) =>
      `In §${s}: an equation or formula is introduced. Based strictly on the section text, explain: (1) what each variable represents, (2) what the equation computes or models, (3) what assumptions are encoded in its form, and (4) where in the text the authors justify these choices. Be mathematically precise.\n\nSection text:\n${t.slice(0, 4000)}`,
  },
  algorithm: {
    icon: Cpu,
    label: 'Algorithm detected',
    promptLabel: 'Trace the algorithm',
    color: 'text-emerald-700',
    gradient: 'from-emerald-500 to-teal-600',
    query: (s, t) =>
      `In §${s}: an algorithm is described. Based strictly on the section text, explain: (1) the input/output contract, (2) the key decision step and why it was designed that way, (3) the computational complexity if stated, and (4) what the authors claim is novel about it. Quote the specific design rationale sentence.\n\nSection text:\n${t.slice(0, 4000)}`,
  },
}

// Per-session cooldown — won't re-fire for same section
const shownSections = new Set<string>()

export default function ContentDetectionNudge({
  sectionId,
  sectionName,
  sectionText,
  flags,
  documentTitle,
  onDismiss,
}: ContentDetectionNudgeProps) {
  const [stage, setStage] = useState<'chip' | 'panel'>('chip')
  const [activeFlag, setActiveFlag] = useState<ContentFlag>(flags[0])
  const [explanation, setExplanation] = useState<string | null>(null)
  const [sourceQuote, setSourceQuote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleDismiss = useCallback((ms: number) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(onDismiss, ms)
  }, [onDismiss])

  const cancelDismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
  }, [])

  useEffect(() => {
    scheduleDismiss(30_000) // chip auto-dismisses after 30s
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }
  }, [scheduleDismiss])

  const handleExpand = useCallback((flag: ContentFlag) => {
    setActiveFlag(flag)
    setStage('panel')
    cancelDismiss()

    if (explanation) return  // already fetched for this flag in this session

    setLoading(true)
    const cfg = FLAG_CONFIG[flag]

    fetch('/api/ai-tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: cfg.query(sectionName, sectionText),
        context: sectionText.slice(0, 4000),
        sectionName,
        documentContent: sectionText,
        documentTitle,
        userName: 'researcher',
      }),
    })
      .then(r => r.json())
      .then(data => {
        const text: string = data.response || data.content || ''
        // Extract the first quoted passage as the source link
        const quoteMatch = text.match(/"([^"]{20,120})"/)
        setSourceQuote(quoteMatch?.[1] ?? null)
        setExplanation(text)
        setLoading(false)
      })
      .catch(() => {
        setExplanation('Explanation unavailable — check API key or network.')
        setLoading(false)
      })
  }, [explanation, sectionName, sectionText, documentTitle, cancelDismiss])

  const primaryFlag = flags[0]
  const primaryCfg = FLAG_CONFIG[primaryFlag]
  const PrimaryIcon = primaryCfg.icon

  // Chip stage
  if (stage === 'chip') {
    return (
      <div className="fixed bottom-6 right-6 z-[190] flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-200">
        <button
          onClick={() => handleExpand(primaryFlag)}
          className={`flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-white text-[13px] font-medium shadow-lg bg-gradient-to-r ${primaryCfg.gradient}`}
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.18)', letterSpacing: '-0.01em' }}
        >
          <PrimaryIcon className="w-3.5 h-3.5 opacity-90 shrink-0" />
          <span>{primaryCfg.label} — explain it?</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
        </button>
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  // Panel stage
  const activeCfg = FLAG_CONFIG[activeFlag]
  const ActiveIcon = activeCfg.icon

  return (
    <div
      className="fixed bottom-6 right-6 z-[190] w-[380px] max-h-[calc(100vh-5rem)] rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.14)' }}
    >
      {/* Panel header */}
      <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${activeCfg.gradient}`}>
        <div className="flex items-center gap-2.5">
          <ActiveIcon className="w-4 h-4 text-white/90 shrink-0" />
          <div>
            <p className="text-[9.5px] font-bold text-white/60 uppercase tracking-widest leading-none mb-0.5">
              A6 · Content Analysis
            </p>
            <p className="text-[13px] font-semibold text-white leading-tight">§{sectionName}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Flag tabs — if multiple types detected */}
      {flags.length > 1 && (
        <div className="flex border-b border-slate-100 bg-slate-50">
          {flags.map(f => {
            const cfg = FLAG_CONFIG[f]
            const Icon = cfg.icon
            return (
              <button
                key={f}
                onClick={() => { setActiveFlag(f); setExplanation(null); setSourceQuote(null) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
                  activeFlag === f
                    ? `${cfg.color} border-b-2 border-current bg-white`
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cfg.promptLabel}
              </button>
            )
          })}
        </div>
      )}

      {/* Explanation body */}
      <div className="px-4 py-3 max-h-72 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2.5 py-4">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
            <span className="text-[12px] text-slate-500">Analysing §{sectionName}…</span>
          </div>
        )}

        {!loading && explanation && (
          <div className="space-y-3">
            <p className="text-[12.5px] text-slate-800 leading-relaxed whitespace-pre-wrap">{explanation}</p>

            {/* Source quote — grounding anchor */}
            {sourceQuote && (
              <div className="rounded-lg border-l-2 border-indigo-200 bg-indigo-50/60 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Quote className="w-3 h-3 text-indigo-400" />
                  <span className="text-[9.5px] font-bold text-indigo-500 uppercase tracking-widest">
                    Source · §{sectionName}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-800 italic leading-snug">"{sourceQuote}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Grounded to §{sectionName} · no external sources</span>
          <button
            onClick={onDismiss}
            className="text-[11px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

/** Returns true if the nudge should fire for this section (not already shown this session) */
export function shouldShowNudge(sectionId: string): boolean {
  return !shownSections.has(sectionId)
}

/** Mark a section as shown — prevents re-firing within the session */
export function markNudgeShown(sectionId: string): void {
  shownSections.add(sectionId)
}
