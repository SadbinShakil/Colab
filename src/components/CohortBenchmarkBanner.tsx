'use client'

/**
 * CohortBenchmarkBanner
 *
 * Passive, non-intrusive strip shown at the bottom of the reading view
 * when cohort data is available for the current section.
 *
 * Shows: "78% of readers struggled here · Cohort median: 14 min · You: 18 min (slow)"
 *
 * The goal is normalization of struggle — knowing "it's not just me" is one
 * of the most powerful interventions in collaborative learning (Dillenbourg, 1999).
 * It also primes the reader to seek help earlier.
 */

import { useState } from 'react'
import { Users, Clock, TrendingUp, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { CohortBenchmarkResult } from '@/app/api/cohort-benchmark/route'

interface CohortBenchmarkBannerProps {
  benchmark: CohortBenchmarkResult
  onDismiss: () => void
  onRequestHelp?: () => void  // optional — link to the smart help panel
}

function msToMin(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}min`
}

function PacingChip({ pacing }: { pacing: 'fast' | 'normal' | 'slow' | 'unknown' }) {
  const styles: Record<string, string> = {
    fast:    'bg-blue-50 text-blue-700 border-blue-200',
    normal:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    slow:    'bg-amber-50 text-amber-700 border-amber-200',
    unknown: 'bg-slate-50 text-slate-500 border-slate-200',
  }
  const labels: Record<string, string> = {
    fast: 'Faster than cohort', normal: 'Cohort pace', slow: 'Slower than cohort', unknown: '',
  }
  if (pacing === 'unknown') return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[pacing]}`}>
      {labels[pacing]}
    </span>
  )
}

export default function CohortBenchmarkBanner({
  benchmark, onDismiss, onRequestHelp,
}: CohortBenchmarkBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const isHighStruggle = benchmark.pctStruggled >= 50

  const bannerBg = isHighStruggle
    ? 'bg-amber-50 border-amber-200'
    : 'bg-slate-50 border-slate-200'
  const iconColor = isHighStruggle ? 'text-amber-600' : 'text-slate-500'

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${bannerBg}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Users className={`w-4 h-4 shrink-0 ${iconColor}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12px] font-medium text-slate-700">{benchmark.message}</p>
            {benchmark.pacing !== 'unknown' && <PacingChip pacing={benchmark.pacing} />}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" /> {benchmark.totalReaders} readers
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> median {msToMin(benchmark.cohortMedianMs)}
            </span>
            {benchmark.pctStruggled > 0 && (
              <span className={`text-[10px] flex items-center gap-1 font-medium ${isHighStruggle ? 'text-amber-600' : 'text-slate-400'}`}>
                <TrendingUp className="w-2.5 h-2.5" /> {benchmark.pctStruggled}% struggled
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {benchmark.totalReaders >= 3 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={onDismiss} className="p-1 text-slate-300 hover:text-slate-500 rounded-lg hover:bg-white/60 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 space-y-2">
          {/* Distribution mini-chart */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Time distribution</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-16 shrink-0">Fastest 25%</span>
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full relative">
                <div className="absolute left-0 top-0 h-full bg-blue-300 rounded-full" style={{ width: `${(benchmark.cohortP25Ms / benchmark.cohortP75Ms) * 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 w-12 text-right shrink-0">{msToMin(benchmark.cohortP25Ms)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-16 shrink-0">Median</span>
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full relative">
                <div className="absolute left-0 top-0 h-full bg-emerald-400 rounded-full" style={{ width: '50%' }} />
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold w-12 text-right shrink-0">{msToMin(benchmark.cohortMedianMs)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-16 shrink-0">Slowest 25%</span>
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full relative">
                <div className="absolute left-0 top-0 h-full bg-amber-300 rounded-full" style={{ width: '100%' }} />
              </div>
              <span className="text-[10px] text-slate-500 w-12 text-right shrink-0">{msToMin(benchmark.cohortP75Ms)}</span>
            </div>
            {benchmark.userTimeMs && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-500 font-semibold w-16 shrink-0">You</span>
                <div className="flex-1 h-1.5 bg-indigo-100 rounded-full relative">
                  <div
                    className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, (benchmark.userTimeMs / benchmark.cohortP75Ms) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-indigo-600 font-semibold w-12 text-right shrink-0">{msToMin(benchmark.userTimeMs)}</span>
              </div>
            )}
          </div>

          {/* Confusion context */}
          {benchmark.avgConfusionHighlights > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Avg. confusion highlights per reader</span>
              <span className={`font-semibold ${benchmark.avgConfusionHighlights >= 2 ? 'text-red-600' : 'text-slate-600'}`}>
                {benchmark.avgConfusionHighlights.toFixed(1)}
              </span>
            </div>
          )}

          {/* Percentile message */}
          {benchmark.percentileRank != null && (
            <div className={`rounded-lg px-3 py-2 text-[11px] ${
              benchmark.pacing === 'slow' ? 'bg-amber-100 text-amber-800'
              : benchmark.pacing === 'fast' ? 'bg-blue-50 text-blue-700'
              : 'bg-emerald-50 text-emerald-700'
            }`}>
              You're at the <strong>{benchmark.percentileRank}th percentile</strong> for time spent — {
                benchmark.pacing === 'slow' ? 'slower than most, which can mean deeper reading or a gap worth addressing.'
                : benchmark.pacing === 'fast' ? 'faster than most — worth making sure you caught the key ideas.'
                : 'right in line with the cohort.'
              }
            </div>
          )}

          {/* CTA */}
          {isHighStruggle && onRequestHelp && (
            <button
              onClick={onRequestHelp}
              className="w-full text-[11px] font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-lg py-1.5 transition-colors"
            >
              Get help with this section →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
