'use client'

/**
 * SessionDeltaPanel
 *
 * Phase III artifact: shown at session end.
 * Shows each reader's understanding delta — what changed and WHY,
 * anchored to specific paper passages and peer interactions.
 *
 * This is NOT a session summary. It is a delta:
 *   what you believed before → what the session revealed → what caused it
 *
 * Design: clean, readable, feels like a research debrief not a system log.
 */

import React, { useState, useEffect } from 'react'
import {
  Loader2, X, ChevronRight, FileText, Users, Sparkles,
  ArrowRight, HelpCircle, BookOpen, Brain, Quote, Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaperAnchor {
  quote: string
  page: number
}

interface KeyInsight {
  insight: string
  source: 'peer' | 'paper' | 'ai'
  sourceName: string
  paperAnchor: PaperAnchor | null
}

interface RevisedReading {
  claim: string
  before: string
  after: string
  page: number
}

interface UserDelta {
  userId: string
  userName: string
  initialStance: string
  keyInsights: KeyInsight[]
  revisedReadings: RevisedReading[]
  openQuestions: string[]
}

interface SessionDeltaResult {
  deltas: UserDelta[]
  collectiveInsight: string
  contestedClaim: {
    claim: string
    page: number
    quote: string
    whyContested: string
  } | null
}

interface Participant {
  userId: string
  userName: string
  expertiseLevel: 'novice' | 'familiar' | 'expert'
  readingGoal: string
  priorKnowledge: string
}

interface SessionDeltaPanelProps {
  documentTitle: string
  participants: Participant[]
  chatMessages: Array<{ userId: string; userName: string; content: string; timestamp: number }>
  annotations: Array<{ userId: string; text: string; reason: string; pageNumber: number }>
  pageTexts: Map<number, string>
  onNavigateToPage?: (page: number) => void
  onClose: () => void
}

const SOURCE_CONFIG = {
  peer: { icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Peer insight' },
  paper: { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Paper passage' },
  ai: { icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50', label: 'AI explanation' },
}

export default function SessionDeltaPanel({
  documentTitle,
  participants,
  chatMessages,
  annotations,
  pageTexts,
  onNavigateToPage,
  onClose,
}: SessionDeltaPanelProps) {
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [result, setResult] = useState<SessionDeltaResult | null>(null)
  const [error, setError] = useState('')
  const [activeUser, setActiveUser] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const textRecord: Record<string, string> = {}
        pageTexts.forEach((text, page) => { textRecord[String(page)] = text })

        const res = await fetch('/api/session-delta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentTitle,
            participants,
            chatMessages: chatMessages.slice(-30),
            annotations: annotations.slice(0, 40),
            pageTexts: textRecord,
          }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Failed')
        setResult(data)
        setState('done')
        // Default to first participant
        if (data.deltas?.length) setActiveUser(data.deltas[0].userId)
      } catch (e: unknown) {
        setError(String(e))
        setState('error')
      }
    }
    run()
  }, [])

  const activeDelta = result?.deltas.find(d => d.userId === activeUser)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Brain className="w-4 h-4 text-indigo-500" />
              <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">
                Session Delta · Phase III
              </p>
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              What changed in your understanding
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {documentTitle} · {participants.length} reader{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {state === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-500">Analysing what changed across the session…</p>
            <p className="text-[11px] text-slate-400">Grounding insights in paper passages</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}

        {state === 'done' && result && (
          <div className="flex-1 overflow-y-auto">

            {/* Collective insight — shown at top always */}
            {result.collectiveInsight && (
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                      What the group knows together that no one knew alone
                    </p>
                    <p className="text-[13px] text-indigo-900 leading-relaxed font-medium">
                      {result.collectiveInsight}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Contested claim */}
            {result.contestedClaim && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">
                  Most contested claim this session
                </p>
                <p className="text-[12px] text-amber-900 font-semibold mb-1">
                  {result.contestedClaim.claim}
                </p>
                {result.contestedClaim.quote && (
                  <p className="text-[11px] text-amber-700 italic mb-1">
                    "{result.contestedClaim.quote}"
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-amber-600">{result.contestedClaim.whyContested}</p>
                  {result.contestedClaim.page > 0 && onNavigateToPage && (
                    <button
                      onClick={() => onNavigateToPage(result.contestedClaim!.page)}
                      className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5"
                    >
                      p.{result.contestedClaim.page} <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Per-user tabs */}
            {result.deltas.length > 1 && (
              <div className="flex px-5 pt-3 gap-1.5 shrink-0">
                {result.deltas.map(d => (
                  <button
                    key={d.userId}
                    onClick={() => setActiveUser(d.userId)}
                    className={cn(
                      'px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all',
                      activeUser === d.userId
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    {d.userName}
                  </button>
                ))}
              </div>
            )}

            {/* Active user delta */}
            {activeDelta && (
              <div className="px-5 py-4 space-y-5">

                {/* Initial stance */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Came in believing
                  </p>
                  <p className="text-[13px] text-slate-600 leading-relaxed italic">
                    "{activeDelta.initialStance}"
                  </p>
                </div>

                {/* Key insights */}
                {activeDelta.keyInsights.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      What changed
                    </p>
                    <div className="space-y-2.5">
                      {activeDelta.keyInsights.map((insight, i) => {
                        const src = SOURCE_CONFIG[insight.source] ?? SOURCE_CONFIG.paper
                        return (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5', src.bg)}>
                              <src.icon className={cn('w-3 h-3', src.color)} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[12px] text-slate-800 leading-relaxed font-medium">
                                {insight.insight}
                              </p>
                              <p className={cn('text-[10px] font-semibold mt-0.5', src.color)}>
                                {src.label}{insight.sourceName ? ` · ${insight.sourceName}` : ''}
                              </p>
                              {insight.paperAnchor && (
                                <div
                                  className={cn(
                                    'mt-1.5 flex items-start gap-1.5 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100',
                                    onNavigateToPage ? 'cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-colors' : ''
                                  )}
                                  onClick={() => onNavigateToPage?.(insight.paperAnchor!.page)}
                                >
                                  <Quote className="w-2.5 h-2.5 text-slate-300 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[11px] text-slate-600 italic leading-snug">
                                      "{insight.paperAnchor.quote}"
                                    </p>
                                    <p className="text-[10px] text-indigo-500 mt-0.5">
                                      p.{insight.paperAnchor.page}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Revised readings */}
                {activeDelta.revisedReadings.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Claims you now read differently
                    </p>
                    <div className="space-y-2">
                      {activeDelta.revisedReadings.map((rev, i) => (
                        <div key={i} className="border border-slate-100 rounded-xl px-3 py-2.5 bg-slate-50">
                          <p className="text-[11px] font-semibold text-slate-700 mb-1.5">{rev.claim}</p>
                          <div className="flex items-start gap-2 text-[11px]">
                            <div className="flex-1">
                              <p className="text-slate-400 font-medium mb-0.5">Before</p>
                              <p className="text-slate-600">{rev.before}</p>
                            </div>
                            <ArrowRight className="w-3 h-3 text-slate-300 mt-3 shrink-0" />
                            <div className="flex-1">
                              <p className="text-emerald-600 font-medium mb-0.5">After</p>
                              <p className="text-slate-700 font-medium">{rev.after}</p>
                            </div>
                          </div>
                          {rev.page > 0 && onNavigateToPage && (
                            <button
                              onClick={() => onNavigateToPage(rev.page)}
                              className="mt-1.5 text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5"
                            >
                              <FileText className="w-2.5 h-2.5" /> p.{rev.page}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open questions */}
                {activeDelta.openQuestions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Leaving with these open
                    </p>
                    <div className="space-y-1.5">
                      {activeDelta.openQuestions.map((q, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[12px] text-slate-700 leading-snug">{q}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 shrink-0 flex justify-between items-center">
          <p className="text-[10px] text-slate-400">
            Grounded in paper text and session interactions
          </p>
          <button
            onClick={onClose}
            className="text-[12px] font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
