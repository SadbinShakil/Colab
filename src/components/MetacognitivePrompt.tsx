'use client'

/**
 * MetacognitivePrompt
 *
 * Shown when D_s crosses tau_fire (0.72) BEFORE the full AI explanation card.
 * Forces the reader to articulate their current understanding first —
 * self-explanation before receiving help produces significantly better
 * retention (Chi et al., 1989; Schworm & Renkl, 2007).
 *
 * The reader's response is passed to A6 as `metacognitiveContext`,
 * making the subsequent explanation much more targeted.
 */

import { useState, useRef, useEffect } from 'react'
import { Brain, ChevronDown, ChevronUp, ArrowRight, Sparkles, X } from 'lucide-react'
import type { MetacognitivePromptResponse } from '@/app/api/metacognitive-prompt/route'

interface MetacognitivePromptProps {
  sectionName: string
  passageText: string       // the confusing passage
  prompt: MetacognitivePromptResponse | null
  loading: boolean
  onSubmitReflection: (reflection: string) => void  // called when reader submits → triggers A6
  onSkip: () => void        // user can bypass and go straight to explanation
  onDismiss: () => void
}

export default function MetacognitivePrompt({
  sectionName, passageText, prompt, loading, onSubmitReflection, onSkip, onDismiss,
}: MetacognitivePromptProps) {
  const [reflection, setReflection] = useState('')
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [selfCheck, setSelfCheck] = useState<Record<number, boolean | null>>({})
  const [activeStarter, setActiveStarter] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!loading && prompt) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [loading, prompt])

  const handleStarterClick = (starter: string) => {
    setReflection(prev => prev ? `${prev}\n${starter}` : starter)
    setActiveStarter(starter)
    textareaRef.current?.focus()
  }

  const handleSubmit = () => {
    if (reflection.trim().length < 5) return
    onSubmitReflection(reflection.trim())
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg overflow-hidden max-w-md w-full">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-white" />
          <div>
            <p className="text-[12px] font-semibold text-white">Before the explanation</p>
            <p className="text-[10px] text-indigo-200">{sectionName}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-indigo-200 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Passage quote */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] italic text-slate-500 border-l-2 border-indigo-200 pl-2 leading-relaxed line-clamp-2">
          "{passageText.slice(0, 200)}{passageText.length > 200 ? '…' : ''}"
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-[12px]">Preparing a question for you…</span>
        </div>
      ) : prompt ? (
        <div className="px-4 pb-4 space-y-3">

          {/* Primary Socratic question */}
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="text-[13px] font-semibold text-indigo-800 leading-snug">{prompt.primaryQuestion}</p>
          </div>

          {/* Self-check items */}
          {prompt.selfCheckItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Quick self-check</p>
              {prompt.selfCheckItems.map((item, i) => (
                <label key={i} className="flex items-start gap-2 cursor-pointer group">
                  <div
                    className={`w-4 h-4 mt-0.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                      selfCheck[i] === true ? 'bg-emerald-500 border-emerald-500'
                      : selfCheck[i] === false ? 'bg-red-100 border-red-300'
                      : 'border-slate-300 group-hover:border-indigo-300'
                    }`}
                    onClick={() => setSelfCheck(prev => ({ ...prev, [i]: prev[i] === true ? false : prev[i] === false ? null : true }))}
                  >
                    {selfCheck[i] === true && <span className="text-white text-[8px] font-bold">✓</span>}
                    {selfCheck[i] === false && <span className="text-red-500 text-[8px] font-bold">✗</span>}
                  </div>
                  <span className="text-[11px] text-slate-600 leading-snug">{item}</span>
                </label>
              ))}
            </div>
          )}

          {/* Reflection starters */}
          {prompt.reflectionStarters.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Start your reflection with…</p>
              <div className="flex flex-wrap gap-1.5">
                {prompt.reflectionStarters.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handleStarterClick(starter)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                      activeStarter === starter
                        ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    {starter.slice(0, 40)}{starter.length > 40 ? '…' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reflection textarea */}
          <div>
            <textarea
              ref={textareaRef}
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder={prompt.hypothesisPrompt}
              className="w-full text-[12px] text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 leading-relaxed"
              rows={3}
            />
            <p className="text-[10px] text-slate-400 mt-1">Your reflection will personalize the AI explanation you receive.</p>
          </div>

          {/* Alternative framings (expandable) */}
          {prompt.alternativeFramings.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlternatives(a => !a)}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"
              >
                {showAlternatives ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Alternative angles on this question
              </button>
              {showAlternatives && (
                <div className="mt-2 space-y-1.5 pl-2 border-l border-slate-100">
                  {prompt.alternativeFramings.map((f, i) => (
                    <p key={i} className="text-[11px] text-slate-500 leading-relaxed">{f}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={reflection.trim().length < 5}
              className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[12px] font-semibold rounded-xl py-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Get targeted explanation
            </button>
            <button
              onClick={onSkip}
              className="flex items-center gap-1 px-3 py-2 text-[12px] text-slate-400 hover:text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Skip <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        /* Fallback if prompt couldn't load */
        <div className="px-4 pb-4">
          <p className="text-[12px] text-slate-600 mb-3">Before seeing an explanation: what do you think this passage is saying?</p>
          <textarea
            ref={textareaRef}
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            placeholder="Write your current understanding in a sentence or two…"
            className="w-full text-[12px] text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSubmit} className="flex-1 bg-indigo-600 text-white text-[12px] font-semibold rounded-xl py-2">
              Get explanation
            </button>
            <button onClick={onSkip} className="px-3 text-[12px] text-slate-400 rounded-xl border border-slate-200">Skip</button>
          </div>
        </div>
      )}
    </div>
  )
}
