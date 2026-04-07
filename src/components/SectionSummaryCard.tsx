'use client'

/**
 * SectionSummaryCard
 *
 * PhD-level grounded summary for the section currently in view.
 * Appears in the left sidebar, replaces the blank space below section headings.
 *
 * Design constraints:
 *  - Never generic. Every sentence is grounded to the actual section text.
 *  - Source quote shown as a blockquote — researcher can verify it against the PDF.
 *  - Tension / limitation is mandatory — researchers trust tools that name weaknesses.
 *  - Content flags (figure / table / equation / algorithm) drive the ContentDetectionNudge.
 *  - Cached per sectionId — switching sections and back is instant, no re-fetch.
 *  - Collapsible — researcher controls how much real estate this takes.
 */

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, Loader2, AlertTriangle, Quote, Zap, BookOpen } from 'lucide-react'

export interface SectionSummaryData {
  claim: string | null
  mechanism: string
  evidence: string
  sourceQuote: string
  tension: string
  keyTerms: Array<{ term: string; definition: string }>
  contentFlags: Array<'figure' | 'table' | 'equation' | 'algorithm'>
}

interface SectionSummaryCardProps {
  sectionId: string
  sectionName: string
  sectionText: string
  documentTitle: string
  sectionIndex?: string
  /** Called when the API returns flags so the parent can fire ContentDetectionNudge */
  onContentFlagsDetected?: (flags: SectionSummaryData['contentFlags'], sectionName: string, sectionText: string) => void
}

// Per-session cache — survives re-renders, cleared on hard refresh
const summaryCache = new Map<string, SectionSummaryData>()

const FLAG_META: Record<string, { label: string; color: string; bg: string }> = {
  figure:    { label: 'Figure',    color: 'text-violet-700', bg: 'bg-violet-50 border-violet-100' },
  table:     { label: 'Table',     color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100'     },
  equation:  { label: 'Equation',  color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100'   },
  algorithm: { label: 'Algorithm', color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-100'},
}

export default function SectionSummaryCard({
  sectionId,
  sectionName,
  sectionText,
  documentTitle,
  sectionIndex,
  onContentFlagsDetected,
}: SectionSummaryCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [summary, setSummary] = useState<SectionSummaryData | null>(summaryCache.get(sectionId) ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const fetchedRef = useRef<Set<string>>(new Set())
  const notifiedFlagsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Reset when section changes
    const cached = summaryCache.get(sectionId)
    if (cached) {
      setSummary(cached)
      setLoading(false)
      setError(false)
      // Re-notify flags for this section if parent needs them
      if (cached.contentFlags.length > 0 && !notifiedFlagsRef.current.has(sectionId)) {
        notifiedFlagsRef.current.add(sectionId)
        onContentFlagsDetected?.(cached.contentFlags, sectionName, sectionText)
      }
      return
    }

    if (fetchedRef.current.has(sectionId)) return
    if (!sectionText || sectionText.trim().length < 80) return

    fetchedRef.current.add(sectionId)
    setSummary(null)
    setError(false)
    setLoading(true)

    fetch('/api/section-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionName, sectionText, documentTitle, sectionIndex }),
    })
      .then(r => r.json())
      .then((data: SectionSummaryData) => {
        summaryCache.set(sectionId, data)
        setSummary(data)
        setLoading(false)
        if (data.contentFlags?.length > 0 && !notifiedFlagsRef.current.has(sectionId)) {
          notifiedFlagsRef.current.add(sectionId)
          onContentFlagsDetected?.(data.contentFlags, sectionName, sectionText)
        }
      })
      .catch(() => {
        setLoading(false)
        setError(true)
        fetchedRef.current.delete(sectionId) // allow retry
      })
  }, [sectionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if no text to summarise
  if (!sectionText || sectionText.trim().length < 80) return null

  return (
    <div className="mx-3 mb-3 rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">

      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            <BookOpen className="w-3 h-3 text-white" />
          </div>
          <span className="text-[11px] font-semibold text-slate-600 truncate">Section digest</span>
          {loading && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />}
        </div>
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        }
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-slate-100">

          {/* Loading skeleton */}
          {loading && (
            <div className="px-3 py-3 space-y-2">
              {[100, 85, 70].map((w, i) => (
                <div
                  key={i}
                  className="h-2.5 rounded-full bg-slate-100 animate-pulse"
                  style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="px-3 py-3 flex items-center gap-2 text-[11px] text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Summary unavailable — check API key
            </div>
          )}

          {/* Content */}
          {summary && !loading && (
            <div className="px-3 py-3 space-y-3">

              {/* Content flags */}
              {summary.contentFlags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {summary.contentFlags.map(flag => {
                    const m = FLAG_META[flag]
                    return (
                      <span
                        key={flag}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${m.color} ${m.bg}`}
                      >
                        <Zap className="w-2.5 h-2.5" />
                        {m.label}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Central claim */}
              {summary.claim && (
                <div>
                  <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mb-1">Central claim</p>
                  <p className="text-[12px] text-slate-800 leading-snug font-medium">{summary.claim}</p>
                </div>
              )}

              {/* Mechanism */}
              <div>
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mechanism</p>
                <p className="text-[11.5px] text-slate-700 leading-relaxed">{summary.mechanism}</p>
              </div>

              {/* Source quote */}
              {summary.sourceQuote && (
                <div className="rounded-lg border-l-2 border-indigo-200 bg-indigo-50/50 px-2.5 py-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Quote className="w-3 h-3 text-indigo-400" />
                    <span className="text-[9.5px] font-bold text-indigo-400 uppercase tracking-widest">Source</span>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-snug italic">"{summary.sourceQuote}"</p>
                </div>
              )}

              {/* Tension */}
              {summary.tension && (
                <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-2 flex gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9.5px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Tension</p>
                    <p className="text-[11px] text-amber-800 leading-snug">{summary.tension}</p>
                  </div>
                </div>
              )}

              {/* Key terms */}
              {summary.keyTerms.length > 0 && (
                <div>
                  <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Key terms</p>
                  <div className="space-y-1">
                    {summary.keyTerms.map(({ term, definition }) => (
                      <div key={term} className="flex gap-1.5">
                        <span className="text-[10.5px] font-semibold text-slate-700 shrink-0">{term}</span>
                        <span className="text-[10.5px] text-slate-400">—</span>
                        <span className="text-[10.5px] text-slate-600 leading-snug">{definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  )
}
