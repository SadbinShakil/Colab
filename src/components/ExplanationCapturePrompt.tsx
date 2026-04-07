'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Star, ChevronRight, Brain, TrendingDown, Sparkles } from 'lucide-react'

export interface ExplanationCaptureData {
  captureId: string
  helperName: string
  sectionName: string
  dsAtStart: number
  role: 'helpee' | 'helper'
}

interface ExplanationCapturePromptProps {
  data: ExplanationCaptureData | null
  currentDs: number                      // live D_s for delta comparison
  onSubmit: (resolved: boolean, rating: number, summary?: string) => void
  onDismiss: () => void
}

const DS_LABEL = (ds: number) =>
  ds >= 0.88 ? 'severe' : ds >= 0.72 ? 'high' : ds >= 0.45 ? 'moderate' : 'low'

const DS_COLOR = (ds: number) =>
  ds >= 0.88 ? 'text-red-600' : ds >= 0.72 ? 'text-amber-600' : ds >= 0.45 ? 'text-yellow-600' : 'text-emerald-600'

export default function ExplanationCapturePrompt({
  data,
  currentDs,
  onSubmit,
  onDismiss,
}: ExplanationCapturePromptProps) {
  const [resolved, setResolved] = useState<boolean | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [summary, setSummary] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    // Reset when new prompt appears
    if (data) {
      setResolved(null)
      setRating(0)
      setSummary('')
      setSubmitted(false)
    }
  }, [data?.captureId])

  if (!data) return null

  const dsDelta = data.dsAtStart - currentDs
  const improved = dsDelta > 0.1
  const stagnant = Math.abs(dsDelta) <= 0.1
  const worsened = dsDelta < -0.05

  const handleSubmit = () => {
    if (resolved === null || rating === 0) return
    setSubmitted(true)
    onSubmit(resolved, rating, data.role === 'helper' ? summary : undefined)
  }

  if (submitted) {
    return (
      <div className="fixed bottom-6 right-6 z-[9500] w-80 bg-white rounded-2xl border border-slate-100 shadow-2xl p-5 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800">Captured</p>
            <p className="text-[11px] text-slate-500">This will improve future peer routing decisions.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9500] w-88 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-200" />
          <p className="text-[12px] font-semibold text-white">
            {data.role === 'helpee' ? `Session with ${data.helperName} — follow-up` : `You helped with ${data.sectionName}`}
          </p>
        </div>
        <p className="text-[10px] text-indigo-200 mt-0.5">Takes 20 seconds · helps calibrate future peer matching</p>
      </div>

      <div className="p-4 space-y-4">
        {/* D_s delta visualization — only for helpee */}
        {data.role === 'helpee' && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Coordination instability (D_s)</p>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className={`text-[18px] font-bold ${DS_COLOR(data.dsAtStart)}`}>{data.dsAtStart.toFixed(2)}</p>
                <p className="text-[9px] text-slate-400">before · {DS_LABEL(data.dsAtStart)}</p>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${improved ? 'bg-emerald-400' : stagnant ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.max(5, Math.min(100, (1 - currentDs) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  {improved && <TrendingDown className="w-3 h-3 text-emerald-500" />}
                  <p className="text-[9px] text-slate-400">
                    {improved ? `↓ ${dsDelta.toFixed(2)} improvement` : stagnant ? 'no change yet' : `↑ ${Math.abs(dsDelta).toFixed(2)} still rising`}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <p className={`text-[18px] font-bold ${DS_COLOR(currentDs)}`}>{currentDs.toFixed(2)}</p>
                <p className="text-[9px] text-slate-400">now · {DS_LABEL(currentDs)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Resolved question */}
        <div>
          <p className="text-[12px] font-semibold text-slate-700 mb-2">
            {data.role === 'helpee'
              ? `Did the conversation with ${data.helperName} resolve your confusion about ${data.sectionName}?`
              : `Did your explanation of ${data.sectionName} seem to land?`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setResolved(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[12px] font-semibold transition-all ${resolved === true ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-600'}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Yes, resolved
            </button>
            <button
              onClick={() => setResolved(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[12px] font-semibold transition-all ${resolved === false ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 hover:border-red-200 hover:bg-red-50/50 text-slate-600'}`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Still confused
            </button>
          </div>
        </div>

        {/* Star rating */}
        <div>
          <p className="text-[11px] text-slate-500 mb-1.5">
            {data.role === 'helpee' ? `How helpful was ${data.helperName}?` : 'How clear was your explanation?'}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${s <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Helper summary — only for helper role */}
        {data.role === 'helper' && (
          <div>
            <p className="text-[11px] text-slate-500 mb-1.5">Brief note on what you explained <span className="text-slate-400">(optional — helps future readers)</span></p>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="e.g. The key is that τ in Eq. 3 is temperature-scaled, not raw — the authors bury this in the appendix."
              className="w-full text-[11px] text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 leading-relaxed"
              rows={2}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={resolved === null || rating === 0}
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[12px] font-semibold rounded-xl py-2.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Submit
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-2.5 text-[11px] text-slate-400 hover:text-slate-600 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
