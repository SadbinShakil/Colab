'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles, CheckCircle, MessageCircle, HelpCircle, ArrowRight,
  Loader2, RefreshCw, Download, X, BookOpen, Users
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SessionSummary {
  headline: string
  whatWeLearned: string[]
  keyDiscussionPoints: string[]
  openQuestions: string[]
  nextSteps: string[]
  participantInsights: string[]
}

interface SessionSummaryPanelProps {
  documentTitle?: string
  documentContent?: string
  chatMessages?: Array<{ userName: string; content: string; type: string }>
  annotations?: Array<{ type: string; text: string }>
  sessionDurationMinutes?: number
  participantNames?: string[]
  sectionsRead?: string[]
  onClose?: () => void
}

export default function SessionSummaryPanel({
  documentTitle,
  documentContent,
  chatMessages = [],
  annotations = [],
  sessionDurationMinutes = 30,
  participantNames = [],
  sectionsRead = [],
  onClose
}: SessionSummaryPanelProps) {
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/session-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle, documentContent, chatMessages, annotations,
          sessionDurationMinutes, participantNames, sectionsRead
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate summary')
      setSummary(data.summary)
    } catch (e: any) {
      setError(e.message || 'Failed to generate summary')
    } finally {
      setIsLoading(false)
    }
  }, [documentTitle, documentContent, chatMessages, annotations, sessionDurationMinutes, participantNames, sectionsRead])

  const exportMarkdown = () => {
    if (!summary) return
    const md = [
      `# Session Log — ${summary.headline}`,
      `**Paper:** ${documentTitle || 'Unknown'}`,
      `**Duration:** ~${sessionDurationMinutes} min`,
      participantNames.length ? `**Participants:** ${participantNames.join(', ')}` : '',
      '',
      '## What We Learned',
      ...summary.whatWeLearned.map(p => `- ${p}`),
      '',
      '## Key Discussion Points',
      ...summary.keyDiscussionPoints.map(p => `- ${p}`),
      '',
      '## Open Questions',
      ...summary.openQuestions.map(p => `- ${p}`),
      '',
      '## Next Steps',
      ...summary.nextSteps.map(p => `- ${p}`),
    ].filter(l => l !== undefined).join('\n')

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `coread-session-log-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-slate-100 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-800">Generating Session Log…</p>
        <p className="text-xs text-slate-400 mt-1">Synthesizing discussion, annotations, and reading patterns</p>
      </div>
    )
  }

  // ── Idle / pre-generate state ─────────────────────────────────────────────
  if (!summary) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Phase III · Session Log</p>
            <p className="text-[11px] text-slate-400 mt-0.5">AI-generated knowledge artifact</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {/* Session meta */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5 text-slate-300" />
              {participantNames.length > 0 ? participantNames.join(', ') : 'No participants logged'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MessageCircle className="w-3.5 h-3.5 text-slate-300" />
              {chatMessages.length} messages
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle className="w-3.5 h-3.5 text-slate-300" />
              {annotations.length} annotations
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-5">
            CoRead will synthesize what your team learned, key discussion moments, unresolved questions, and suggested next steps.
          </p>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2.5 mb-4 border border-red-100">
              <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={generate}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generate Session Log
          </button>
        </div>
      </div>
    )
  }

  // ── Summary result ────────────────────────────────────────────────────────
  const SECTIONS = [
    { key: 'whatWeLearned', label: 'What We Learned', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', items: summary.whatWeLearned },
    { key: 'keyDiscussionPoints', label: 'Discussion Highlights', icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', items: summary.keyDiscussionPoints },
    { key: 'openQuestions', label: 'Open Questions', icon: HelpCircle, color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', items: summary.openQuestions },
    { key: 'nextSteps', label: 'Next Steps', icon: ArrowRight, color: 'text-indigo-600', bg: 'bg-indigo-50', dot: 'bg-indigo-500', items: summary.nextSteps },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">

      {/* Headline card */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1.5">Phase III · Session Log</p>
            <h3 className="text-sm font-semibold leading-snug">{summary.headline}</h3>
            <p className="text-[11px] opacity-60 mt-1.5">
              {sessionDurationMinutes}min · {participantNames.length > 0 ? participantNames.join(', ') : 'Session'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={exportMarkdown}
              title="Export as Markdown"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={generate}
              title="Regenerate"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content sections */}
      <AnimatePresence>
        {SECTIONS.filter(s => s.items?.length > 0).map((section, idx) => (
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm"
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-50">
              <div className={`w-5 h-5 rounded-md ${section.bg} flex items-center justify-center`}>
                <section.icon className={`w-3 h-3 ${section.color}`} />
              </div>
              <span className="text-xs font-semibold text-slate-700">{section.label}</span>
              <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${section.bg} ${section.color}`}>
                {section.items.length}
              </span>
            </div>
            <ul className="px-4 py-3 space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${section.dot} mt-1.5 shrink-0`} />
                  <span className="text-xs text-slate-700 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Participant insights */}
      {summary.participantInsights?.length > 0 && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Notable Contributions</span>
          </div>
          <ul className="px-4 py-3 space-y-2">
            {summary.participantInsights.map((ins, i) => (
              <li key={i} className="text-xs text-slate-500 italic leading-relaxed">&ldquo;{ins}&rdquo;</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
