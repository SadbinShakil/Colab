'use client'

/**
 * ClaimConsistencyPanel
 *
 * Surfaces when a chat message contains a claim or skepticism about the paper.
 * Runs /api/internal-consistency to check the claim against the paper's own text.
 *
 * Design intent: feels like a colleague saying "hold on, let me check that" —
 * not a system modal. Appears inline, dismissable, shows exact paper quotes.
 */

import React, { useState } from 'react'
import { Loader2, CheckCircle, AlertTriangle, XCircle, HelpCircle, ChevronRight, X, FileText, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConsistencyResult {
  claimPassage: { quote: string; page: number; found: boolean }
  evidencePassage: { quote: string; page: number; found: boolean }
  verdict: 'supported' | 'overstated' | 'unsupported' | 'contradicted' | 'insufficient-evidence'
  confidence: number
  gap: string
  limitationConflict: string | null
  discussionPrompt: string
}

interface ClaimConsistencyPanelProps {
  claim: string
  documentTitle: string
  pageTexts: Map<number, string>
  onNavigateToPage?: (page: number) => void
  onDismiss: () => void
  onAddToDiscussion?: (text: string) => void
}

const VERDICT_CONFIG = {
  supported: {
    label: 'Internally consistent',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    barColor: 'bg-emerald-500',
  },
  overstated: {
    label: 'Overstated',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    barColor: 'bg-amber-500',
  },
  unsupported: {
    label: 'No supporting passage found',
    icon: XCircle,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    barColor: 'bg-rose-500',
  },
  contradicted: {
    label: 'Contradicted within paper',
    icon: XCircle,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    barColor: 'bg-rose-600',
  },
  'insufficient-evidence': {
    label: 'Insufficient evidence',
    icon: HelpCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    barColor: 'bg-orange-500',
  },
}

export default function ClaimConsistencyPanel({
  claim,
  documentTitle,
  pageTexts,
  onNavigateToPage,
  onDismiss,
  onAddToDiscussion,
}: ClaimConsistencyPanelProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<ConsistencyResult | null>(null)
  const [error, setError] = useState('')

  const runCheck = async () => {
    setState('loading')
    try {
      const textRecord: Record<string, string> = {}
      pageTexts.forEach((text, page) => { textRecord[String(page)] = text })

      const res = await fetch('/api/internal-consistency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, documentTitle, pageTexts: textRecord }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Check failed')
      setResult(data)
      setState('done')
    } catch (e: unknown) {
      setError(String(e))
      setState('error')
    }
  }

  const cfg = result ? VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG.unsupported : null

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between px-3.5 py-2.5 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            Internal consistency check
          </p>
          <p className="text-xs text-slate-700 leading-snug line-clamp-2 font-medium">
            "{claim.length > 120 ? claim.slice(0, 120) + '…' : claim}"
          </p>
        </div>
        <button onClick={onDismiss} className="ml-2 text-slate-300 hover:text-slate-500 shrink-0 mt-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">

        {state === 'idle' && (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Check whether the paper's own evidence supports this claim — using only the paper text, not external sources.
            </p>
            <button
              onClick={runCheck}
              className="ml-3 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Check paper
            </button>
          </div>
        )}

        {state === 'loading' && (
          <div className="flex items-center gap-2.5 py-1">
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
            <p className="text-[12px] text-slate-500">Searching paper for claim and evidence…</p>
          </div>
        )}

        {state === 'error' && (
          <p className="text-[11px] text-rose-600">{error}</p>
        )}

        {state === 'done' && result && cfg && (
          <div className="space-y-3">

            {/* Verdict badge */}
            <div className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg', cfg.bg, `border ${cfg.border}`)}>
              <cfg.icon className={cn('w-3.5 h-3.5 shrink-0', cfg.color)} />
              <span className={cn('text-[11px] font-bold uppercase tracking-wide', cfg.color)}>
                {cfg.label}
              </span>
              <div className="flex-1 ml-1 bg-white/60 rounded-full h-1">
                <div
                  className={cn('h-1 rounded-full transition-all', cfg.barColor)}
                  style={{ width: `${Math.round(result.confidence * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {Math.round(result.confidence * 100)}% confidence
              </span>
            </div>

            {/* Claim passage */}
            {result.claimPassage.found && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  Where the paper makes this claim
                </p>
                <div
                  className={cn(
                    'flex items-start gap-2 bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100',
                    onNavigateToPage ? 'cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-colors' : ''
                  )}
                  onClick={() => onNavigateToPage?.(result.claimPassage.page)}
                >
                  <Quote className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-slate-700 italic leading-relaxed">
                      "{result.claimPassage.quote}"
                    </p>
                    <p className="text-[10px] text-indigo-500 font-medium mt-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> p.{result.claimPassage.page}
                      {onNavigateToPage && <ChevronRight className="w-3 h-3" />}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence passage */}
            {result.evidencePassage.found && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  Evidence the paper cites
                </p>
                <div
                  className={cn(
                    'flex items-start gap-2 bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100',
                    onNavigateToPage ? 'cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-colors' : ''
                  )}
                  onClick={() => onNavigateToPage?.(result.evidencePassage.page)}
                >
                  <Quote className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-slate-700 italic leading-relaxed">
                      "{result.evidencePassage.quote}"
                    </p>
                    <p className="text-[10px] text-indigo-500 font-medium mt-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> p.{result.evidencePassage.page}
                      {onNavigateToPage && <ChevronRight className="w-3 h-3" />}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Gap */}
            {result.gap && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  Inferential gap
                </p>
                <p className="text-[12px] text-slate-700 leading-relaxed">{result.gap}</p>
              </div>
            )}

            {/* Limitation conflict */}
            {result.limitationConflict && (
              <div className="bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-2">
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">
                  Contradicted in limitations
                </p>
                <p className="text-[11px] text-rose-800 italic leading-relaxed">
                  "{result.limitationConflict}"
                </p>
              </div>
            )}

            {/* Discussion prompt */}
            {result.discussionPrompt && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                  For your group
                </p>
                <p className="text-[12px] text-indigo-900 leading-relaxed font-medium">
                  {result.discussionPrompt}
                </p>
                {onAddToDiscussion && (
                  <button
                    onClick={() => onAddToDiscussion(result.discussionPrompt)}
                    className="mt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Post to discussion <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Detects whether a chat message likely contains a verifiable claim about the paper.
 * Used to decide whether to surface the consistency check prompt.
 */
export function detectClaimInMessage(message: string): string | null {
  const lower = message.toLowerCase()

  // Skepticism patterns
  const skepticPatterns = [
    /i don'?t (buy|think|believe|see|follow)/,
    /is (this|that|it) (really|actually|even)/,
    /how (do they|does this|can they|can this)/,
    /wait[,.]?\s*(does|is|are|what|why|how)/,
    /they (claim|say|argue|state|assert)/,
    /the (authors?|paper|study) (claim|say|argue|show|find)/,
    /does (the paper|this|that) (actually|really|even)/,
    /n\s*=\s*\d+/,   // sample size references
    /table\s*\d|figure\s*\d|section\s*\d/i,  // specific references
  ]

  for (const pattern of skepticPatterns) {
    if (pattern.test(lower)) {
      // Extract the core claim — trim to 200 chars
      return message.trim().slice(0, 200)
    }
  }
  return null
}
