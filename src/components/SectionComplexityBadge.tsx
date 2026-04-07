'use client'

/**
 * SectionComplexityBadge
 *
 * Proactive badge shown when a reader enters a high-complexity section.
 * Tells them: what kind of dense content to expect, how long it'll take,
 * what prerequisites they need, and how to approach it.
 *
 * This is "timely intervention" in the pre-difficulty phase —
 * priming attention before confusion sets in.
 */

import { useState } from 'react'
import { X, Clock, BookOpen, ChevronDown, ChevronUp, Sigma, Table, BarChart3, GitBranch, Zap } from 'lucide-react'
import type { SectionComplexityResult } from '@/app/api/section-complexity/route'

interface SectionComplexityBadgeProps {
  complexity: SectionComplexityResult
  onDismiss: () => void
  onRequestMathWalkthrough: () => void
  onRequestPrerequisites: () => void
}

function complexityLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 0.8) return { label: 'Very dense', color: 'text-red-700', bg: 'bg-red-50 border-red-200' }
  if (score >= 0.6) return { label: 'Dense', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' }
  if (score >= 0.4) return { label: 'Moderate', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
  return { label: 'Accessible', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
}

function IntensityBar({ value, max = 1 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct >= 80 ? 'bg-red-400' : pct >= 50 ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex-1">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function SectionComplexityBadge({
  complexity, onDismiss, onRequestMathWalkthrough, onRequestPrerequisites,
}: SectionComplexityBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const { label, color, bg } = complexityLabel(complexity.complexityScore)

  const contentFlags = [
    { active: complexity.hasMath, icon: Sigma, label: 'Math/equations' },
    { active: complexity.hasFigures, icon: BarChart3, label: 'Figures' },
    { active: complexity.hasTables, icon: Table, label: 'Tables' },
    { active: complexity.hasAlgorithms, icon: GitBranch, label: 'Algorithms' },
  ].filter(f => f.active)

  return (
    <div className={`rounded-2xl border shadow-lg overflow-hidden bg-white max-w-sm w-full`}>

      {/* Header strip */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${bg} border-b ${bg.includes('border') ? '' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${color}`} />
          <p className={`text-[12px] font-semibold ${color}`}>
            {label} section ahead
          </p>
        </div>
        <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Section name + reading time */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-slate-800 truncate max-w-[200px]">{complexity.sectionName}</p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
            <Clock className="w-3 h-3" />
            ~{complexity.readingTimeMin < 1
              ? `${Math.round(complexity.readingTimeMin * 60)}s`
              : `${Math.round(complexity.readingTimeMin)}min`}
          </div>
        </div>

        {/* Complexity bar */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-slate-400 font-medium w-20 shrink-0">Complexity</p>
            <IntensityBar value={complexity.complexityScore} />
            <span className={`text-[10px] font-bold ${color} shrink-0`}>{Math.round(complexity.complexityScore * 100)}%</span>
          </div>
          {complexity.hasMath && (
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-slate-400 font-medium w-20 shrink-0">Math density</p>
              <IntensityBar value={Math.min(complexity.mathDensity, 10)} max={10} />
              <span className="text-[10px] text-slate-500 shrink-0">{complexity.mathDensity.toFixed(1)}/100w</span>
            </div>
          )}
        </div>

        {/* Content type flags */}
        {contentFlags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {contentFlags.map(({ icon: Icon, label: lbl }) => (
              <span key={lbl} className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-slate-600">
                <Icon className="w-2.5 h-2.5" /> {lbl}
              </span>
            ))}
          </div>
        )}

        {/* Expandable detail */}
        {(complexity.prerequisiteKnowledge.length > 0 || complexity.suggestedApproach) && (
          <>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Less' : 'How to approach this section'}
            </button>

            {expanded && (
              <div className="space-y-2.5">
                {/* Advisor's reading strategy */}
                {complexity.suggestedApproach && (
                  <div className="bg-indigo-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-indigo-700 mb-1 uppercase tracking-wide">Reading strategy</p>
                    <p className="text-[12px] text-indigo-800 leading-relaxed">{complexity.suggestedApproach}</p>
                  </div>
                )}

                {/* Prerequisites */}
                {complexity.prerequisiteKnowledge.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5">You should already know</p>
                    <ul className="space-y-1">
                      {complexity.prerequisiteKnowledge.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                          <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key technical terms */}
                {complexity.technicalTerms.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Key terms in this section</p>
                    <div className="flex flex-wrap gap-1">
                      {complexity.technicalTerms.map((term, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-violet-50 border border-violet-100 text-violet-700 rounded-full">{term}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hardest passage */}
                {complexity.hardestPassage && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1">Likely hardest moment</p>
                    <p className="text-[11px] italic text-slate-500 border-l-2 border-amber-200 pl-2 leading-relaxed">
                      "{complexity.hardestPassage.slice(0, 180)}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {complexity.hasMath && (
            <button
              onClick={onRequestMathWalkthrough}
              className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-xl py-2 transition-colors"
            >
              <Sigma className="w-3 h-3" /> Math walkthrough mode
            </button>
          )}
          {complexity.prerequisiteKnowledge.length > 0 && (
            <button
              onClick={onRequestPrerequisites}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors"
            >
              <BookOpen className="w-3 h-3" /> Prerequisites
            </button>
          )}
          {!complexity.hasMath && (
            <button
              onClick={onDismiss}
              className="flex-1 text-[11px] text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 py-2 transition-colors"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
