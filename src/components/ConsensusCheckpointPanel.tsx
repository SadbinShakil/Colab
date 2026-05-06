'use client'

import { useState, useEffect } from 'react'
import { BookMarked, Users, ChevronDown, ChevronUp, X, Send, AlertCircle } from 'lucide-react'

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
// Banner: surfaced when entering a section that has prior group readings
// ─────────────────────────────────────────────────────────────────────────────
interface ConsensussBannerProps {
  checkpoints: ConsensusCheckpoint[]
  onDismiss: () => void
}

export function ConsensusBanner({ checkpoints, onDismiss }: ConsensussBannerProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (!checkpoints.length) return null

  return (
    <div className="mx-3 mt-2 mb-0 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-100/60">
        <div className="flex items-center gap-1.5">
          <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
          <p className="text-[11px] font-semibold text-indigo-900">
            {checkpoints.length === 1
              ? 'Prior group recorded a reading position here'
              : `${checkpoints.length} recorded reading positions from prior groups`}
          </p>
        </div>
        <button onClick={onDismiss} className="p-0.5 text-indigo-300 hover:text-indigo-600 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-indigo-100">
        {checkpoints.map(cp => (
          <div key={cp.id} className="px-3 py-2">
            <button
              onClick={() => setExpanded(expanded === cp.id ? null : cp.id)}
              className="w-full text-left flex items-start justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Users className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="text-[10px] text-indigo-500 font-medium">
                    {cp.contributors.map(c => c.userName).join(', ')}
                  </span>
                </div>
                <p className="text-[12px] text-slate-700 leading-relaxed line-clamp-2">
                  {cp.agreedMeaning}
                </p>
              </div>
              {expanded === cp.id
                ? <ChevronUp className="w-3.5 h-3.5 text-indigo-300 shrink-0 mt-0.5" />
                : <ChevronDown className="w-3.5 h-3.5 text-indigo-300 shrink-0 mt-0.5" />}
            </button>

            {expanded === cp.id && cp.passageText && (
              <div className="mt-2 pl-2 border-l-2 border-indigo-200">
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
// Prompt: A3 surfaces this after sustained group engagement on a section
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
      setError('Too brief — record the group\'s actual interpretive position, including any tension or ambiguity.')
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
    <div className="fixed bottom-20 right-4 z-[9600] pointer-events-none">
      <div className="pointer-events-auto w-[360px] bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200">

        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <BookMarked className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-800">Record group reading position</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                How does your group interpret <span className="font-semibold text-slate-700">{sectionName}</span>? This will be shown to future readers of this paper.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-2.5">
          {/* Participants */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-medium">Readers:</span>
            {participants.map(p => (
              <span key={p.userId} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-full">
                {p.userName}
              </span>
            ))}
          </div>

          {/* Reading position input */}
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              How does your group read this section?
            </label>
            <textarea
              value={meaning}
              onChange={e => setMeaning(e.target.value)}
              placeholder="Record your group's interpretive position — include disagreements and open questions."
              className="w-full text-[12px] text-slate-800 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 leading-relaxed"
              rows={3}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                <p className="text-[10px] text-red-500">{error}</p>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Disagreement is as valuable as agreement — future readers will see this.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || meaning.trim().length < 20}
              className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-[12px] font-semibold rounded-lg py-2 transition-colors"
            >
              <Send className="w-3 h-3" />
              {submitting ? 'Saving…' : 'Record position'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-[12px] text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
