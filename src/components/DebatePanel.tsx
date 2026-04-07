// src/components/DebatePanel.tsx
'use client'

import React, { useState, useCallback } from 'react'
import { MessageSquare, ChevronDown, ChevronUp, Loader2, Lock, CheckCircle2, AlertTriangle, HelpCircle, PlusCircle } from 'lucide-react'

export type DebateStance = 'support' | 'challenge' | 'qualify' | 'extend'

export interface DebateParticipantPosition {
  userId: string
  userName: string
  stance: DebateStance
  argument: string
  depth: 'surface' | 'analytical' | 'methodological' | 'synthetic'
  timestamp: number
}

export interface DebateSynthesis {
  convergenceState: 'converging' | 'diverging' | 'stable-tension' | 'resolved'
  sharedUnderstanding: string
  persistentTension: string
  collectiveKnowledgeEntry: string
  groundingQuote: string
  nextQuestion: string
}

interface DebatePanelProps {
  debateId: string
  prompt: string                          // paper-grounded discussion prompt from A3
  groundingQuote?: string                 // verbatim paper quote that anchors debate
  sectionName?: string
  participants: Array<{ userId: string; userName: string }>
  currentUserId: string
  currentUserName: string
  documentId: string
  sectionText?: string                    // C_s context for synthesis
  onSynthesisLocked?: (synthesis: DebateSynthesis) => void
  onPositionSubmitted?: (position: DebateParticipantPosition) => void
}

const STANCE_CONFIG: Record<DebateStance, { label: string; color: string; bg: string; border: string; description: string }> = {
  support:   { label: 'Support',   color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-300', description: 'I agree with the claim / find the evidence convincing' },
  challenge: { label: 'Challenge', color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-300',     description: 'I see a methodological or logical flaw here' },
  qualify:   { label: 'Qualify',   color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-300',   description: 'Valid under certain conditions, but not universally' },
  extend:    { label: 'Extend',    color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-300',  description: 'This connects to / implies something further' },
}

const CONVERGENCE_CONFIG = {
  converging:       { icon: CheckCircle2, color: 'text-emerald-600', label: 'Converging' },
  diverging:        { icon: AlertTriangle, color: 'text-red-600',    label: 'Diverging' },
  'stable-tension': { icon: HelpCircle,   color: 'text-amber-600',  label: 'Stable Tension' },
  resolved:         { icon: CheckCircle2, color: 'text-indigo-600', label: 'Resolved' },
}

export default function DebatePanel({
  debateId,
  prompt,
  groundingQuote,
  sectionName,
  participants,
  currentUserId,
  currentUserName,
  documentId,
  sectionText,
  onSynthesisLocked,
  onPositionSubmitted,
}: DebatePanelProps) {
  const [positions, setPositions] = useState<DebateParticipantPosition[]>([])
  const [myStance, setMyStance] = useState<DebateStance | null>(null)
  const [myArgument, setMyArgument] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [synthesis, setSynthesis] = useState<DebateSynthesis | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const myPosition = positions.find(p => p.userId === currentUserId)
  const hasSubmitted = !!myPosition

  const submitPosition = useCallback(async () => {
    if (!myStance || !myArgument.trim() || hasSubmitted) return
    setIsSubmitting(true)
    setError(null)

    try {
      // Classify depth via API
      const classifyRes = await fetch('/api/position-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ argument: myArgument, stance: myStance, sectionText: sectionText?.slice(0, 2000) }),
      })
      const { depth } = classifyRes.ok ? await classifyRes.json() : { depth: 'analytical' }

      const position: DebateParticipantPosition = {
        userId: currentUserId,
        userName: currentUserName,
        stance: myStance,
        argument: myArgument.trim(),
        depth,
        timestamp: Date.now(),
      }
      setPositions(prev => [...prev, position])
      onPositionSubmitted?.(position)
      setMyArgument('')
    } catch {
      setError('Failed to submit position. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [myStance, myArgument, hasSubmitted, currentUserId, currentUserName, sectionText, onPositionSubmitted])

  const runSynthesis = useCallback(async () => {
    if (positions.length < 2 || isSynthesizing) return
    setIsSynthesizing(true)
    setError(null)

    try {
      const res = await fetch('/api/debate-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debateId,
          prompt,
          positions: positions.map(p => ({ stance: p.stance, argument: p.argument, userName: p.userName, depth: p.depth })),
          sectionText: sectionText?.slice(0, 6000),
          documentId,
        }),
      })
      if (!res.ok) throw new Error('Synthesis failed')
      const data = await res.json()
      setSynthesis(data)
    } catch {
      setError('Synthesis failed. Check your connection.')
    } finally {
      setIsSynthesizing(false)
    }
  }, [positions, isSynthesizing, debateId, prompt, sectionText, documentId])

  const lockSynthesis = useCallback(() => {
    if (!synthesis) return
    setIsLocked(true)
    onSynthesisLocked?.(synthesis)
  }, [synthesis, onSynthesisLocked])

  const stances = Object.keys(STANCE_CONFIG) as DebateStance[]

  return (
    <div className="border border-indigo-100 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100 hover:from-indigo-100 hover:to-violet-100 transition-colors text-left"
      >
        <MessageSquare className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">A3 · Structured Debate</span>
            {sectionName && <span className="text-xs text-indigo-500">— {sectionName}</span>}
          </div>
          <p className="text-sm font-medium text-slate-800 mt-0.5 leading-snug">{prompt}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-4">
          {/* Grounding quote */}
          {groundingQuote && (
            <blockquote className="border-l-2 border-indigo-300 pl-3 py-0.5">
              <p className="text-xs text-slate-600 italic leading-relaxed">"{groundingQuote}"</p>
            </blockquote>
          )}

          {/* Existing positions */}
          {positions.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Positions</span>
              {positions.map(pos => {
                const cfg = STANCE_CONFIG[pos.stance]
                return (
                  <div key={pos.userId} className={`rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-slate-500">— {pos.userName}</span>
                      <span className="ml-auto text-[10px] text-slate-400 capitalize">{pos.depth}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{pos.argument}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* My position input */}
          {!hasSubmitted && !isLocked && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Your position</span>
              {/* Stance selector */}
              <div className="grid grid-cols-2 gap-1.5">
                {stances.map(stance => {
                  const cfg = STANCE_CONFIG[stance]
                  const selected = myStance === stance
                  return (
                    <button
                      key={stance}
                      onClick={() => setMyStance(selected ? null : stance)}
                      title={cfg.description}
                      className={[
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left',
                        selected
                          ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                      ].join(' ')}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
              {myStance && (
                <p className="text-xs text-slate-500">{STANCE_CONFIG[myStance].description}</p>
              )}
              {/* Argument textarea */}
              <textarea
                value={myArgument}
                onChange={e => setMyArgument(e.target.value)}
                placeholder={myStance ? 'Ground your argument in the paper text...' : 'Select a stance first'}
                disabled={!myStance}
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                onClick={submitPosition}
                disabled={!myStance || !myArgument.trim() || isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Classifying depth…</>
                ) : (
                  <><PlusCircle className="w-3.5 h-3.5" /> Submit position</>
                )}
              </button>
            </div>
          )}

          {hasSubmitted && !isLocked && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              Position submitted. Waiting for others to weigh in.
            </div>
          )}

          {/* Synthesize button */}
          {positions.length >= 2 && !synthesis && !isLocked && (
            <button
              onClick={runSynthesis}
              disabled={isSynthesizing}
              className="w-full flex items-center justify-center gap-2 py-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg transition-colors"
            >
              {isSynthesizing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Synthesizing…</>
              ) : (
                <>A3 — Synthesize convergence</>
              )}
            </button>
          )}

          {/* Synthesis result */}
          {synthesis && (
            <div className="space-y-3 border border-slate-100 rounded-xl bg-slate-50 px-4 py-3">
              {(() => {
                const cfg = CONVERGENCE_CONFIG[synthesis.convergenceState]
                const Icon = cfg.icon
                return (
                  <div className={`flex items-center gap-2 ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-semibold">{cfg.label}</span>
                  </div>
                )
              })()}
              <div className="space-y-2 text-xs text-slate-700">
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Shared understanding</span>
                  <p className="mt-0.5 leading-relaxed">{synthesis.sharedUnderstanding}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Persistent tension</span>
                  <p className="mt-0.5 leading-relaxed">{synthesis.persistentTension}</p>
                </div>
                {synthesis.nextQuestion && (
                  <div className="border-t border-slate-200 pt-2">
                    <span className="font-semibold text-indigo-600 uppercase tracking-wide text-[10px]">Next question</span>
                    <p className="mt-0.5 text-indigo-800 leading-relaxed font-medium">{synthesis.nextQuestion}</p>
                  </div>
                )}
                {synthesis.groundingQuote && (
                  <blockquote className="border-l-2 border-slate-300 pl-3 py-0.5">
                    <p className="italic text-slate-500">"{synthesis.groundingQuote}"</p>
                  </blockquote>
                )}
              </div>
              {!isLocked && (
                <button
                  onClick={lockSynthesis}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-800 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Lock to Collective Knowledge Base
                </button>
              )}
              {isLocked && (
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Added to Collective Knowledge Base
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
