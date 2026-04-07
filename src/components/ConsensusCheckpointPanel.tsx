'use client'

import { useState, useEffect } from 'react'
import { Users, CheckCircle2, MessageSquare, ChevronDown, ChevronUp, X, Send } from 'lucide-react'

export interface ConsensusCheckpoint {
  id: string
  sectionId: string
  sectionName: string
  passageText: string
  agreedMeaning: string
  contributors: { userId: string; userName: string }[]
  confidence: number
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Banner: shown to any reader when a consensus exists for the current section
// ─────────────────────────────────────────────────────────────────────────────
interface ConsensussBannerProps {
  checkpoints: ConsensusCheckpoint[]
  onDismiss: () => void
}

export function ConsensusBanner({ checkpoints, onDismiss }: ConsensussBannerProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (!checkpoints.length) return null

  return (
    <div className="mx-3 mt-2 mb-0 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-emerald-100/60">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <p className="text-[11px] font-semibold text-emerald-800">
            {checkpoints.length === 1
              ? 'Previous readers reached consensus here'
              : `${checkpoints.length} consensus points from previous readers`}
          </p>
        </div>
        <button onClick={onDismiss} className="p-0.5 text-emerald-400 hover:text-emerald-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-emerald-100">
        {checkpoints.map(cp => (
          <div key={cp.id} className="px-3 py-2">
            <button
              onClick={() => setExpanded(expanded === cp.id ? null : cp.id)}
              className="w-full text-left flex items-start justify-between gap-2 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Users className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="text-[10px] text-emerald-600 font-medium">
                    {cp.contributors.map(c => c.userName).join(', ')} agreed
                  </span>
                </div>
                <p className="text-[12px] text-slate-700 leading-relaxed line-clamp-2">
                  {cp.agreedMeaning}
                </p>
              </div>
              {expanded === cp.id
                ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                : <ChevronDown className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
            </button>

            {expanded === cp.id && cp.passageText && (
              <div className="mt-2 pl-1 border-l-2 border-emerald-200">
                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                  "{cp.passageText.slice(0, 200)}{cp.passageText.length > 200 ? '…' : ''}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt: A3 surfaces this after detecting sustained group engagement
// ─────────────────────────────────────────────────────────────────────────────
interface ConsensusPromptProps {
  isOpen: boolean
  sectionName: string
  sectionId: string
  passageText: string
  paperId: string
  sessionId: string
  participants: { userId: string; userName: string }[]
  onClose: () => void
  onSaved: (checkpoint: ConsensusCheckpoint) => void
}

export function ConsensusPrompt({
  isOpen,
  sectionName,
  sectionId,
  passageText,
  paperId,
  sessionId,
  participants,
  onClose,
  onSaved,
}: ConsensusPromptProps) {
  const [meaning, setMeaning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) { setMeaning(''); setError('') }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (meaning.trim().length < 20) {
      setError('Be specific — what exactly did your group agree this means?')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/consensus-checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId,
          sectionId,
          sectionName,
          passageText,
          agreedMeaning: meaning.trim(),
          contributors: participants,
          sessionId,
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Failed to save'); return }
      onSaved(data.checkpoint)
      onClose()
    } catch {
      setError('Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9600] flex items-end justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg mb-6 mx-4 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <MessageSquare className="w-4 h-4 text-emerald-100" />
              <p className="text-[13px] font-semibold text-white">Consensus Checkpoint</p>
            </div>
            <p className="text-[10px] text-emerald-100">
              Your group has been discussing <span className="font-medium">{sectionName}</span> — capture what you agreed.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Passage context */}
          {passageText && (
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              <p className="text-[10px] text-slate-500 mb-1 font-medium">Passage in focus</p>
              <p className="text-[11px] text-slate-600 italic leading-relaxed line-clamp-3">
                "{passageText}"
              </p>
            </div>
          )}

          {/* Participants */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500">From:</span>
            {participants.map(p => (
              <span key={p.userId} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full border border-emerald-100">
                {p.userName}
              </span>
            ))}
          </div>

          {/* Consensus statement */}
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
              What did your group agree this means?
            </label>
            <textarea
              value={meaning}
              onChange={e => setMeaning(e.target.value)}
              placeholder="e.g. The threshold τ=0.72 is not a universal constant — it was calibrated specifically on their 12-session dataset and may not generalize. The paper acknowledges this only in the limitations section."
              className="w-full text-[12px] text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 leading-relaxed"
              rows={3}
              autoFocus
            />
            {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
            <p className="text-[10px] text-slate-400 mt-1">
              This will be shown to future readers of this paper — be precise and grounded in the text.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || meaning.trim().length < 20}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[12px] font-semibold rounded-xl py-2.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Saving…' : 'Save consensus'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-[12px] text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
