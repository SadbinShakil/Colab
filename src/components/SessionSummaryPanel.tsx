'use client'

import { useState, useCallback } from 'react'
import { Sparkles, CheckCircle, MessageCircle, HelpCircle, ArrowRight, Loader2, RefreshCw, Download, X } from 'lucide-react'
import { motion } from 'framer-motion'

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
          documentTitle,
          documentContent,
          chatMessages,
          annotations,
          sessionDurationMinutes,
          participantNames,
          sectionsRead
        })
      })
      if (!res.ok) throw new Error('Failed to generate summary')
      const data = await res.json()
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
      `# Session Summary: ${summary.headline}`,
      `**Paper:** ${documentTitle || 'Unknown'}`,
      `**Duration:** ~${sessionDurationMinutes} min`,
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
    ].join('\n')

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-summary-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!summary && !isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Session Summary</div>
              <div className="text-[11px] text-gray-500">AI-generated learning recap</div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-600 mb-4">
            Generate an AI summary of what your team learned, key discussion points, and recommended next steps.
          </p>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={generate}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate Summary
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-600">Analyzing your session…</p>
        <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
      </div>
    )
  }

  if (!summary) return null

  const SECTIONS = [
    { key: 'whatWeLearned', label: 'What We Learned', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', items: summary.whatWeLearned },
    { key: 'keyDiscussionPoints', label: 'Discussion Highlights', icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50', items: summary.keyDiscussionPoints },
    { key: 'openQuestions', label: 'Open Questions', icon: HelpCircle, color: 'text-amber-600', bg: 'bg-amber-50', items: summary.openQuestions },
    { key: 'nextSteps', label: 'Next Steps', icon: ArrowRight, color: 'text-indigo-600', bg: 'bg-indigo-50', items: summary.nextSteps },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Headline */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold opacity-70 uppercase tracking-wider mb-1">Session Complete</p>
            <h3 className="text-sm font-bold leading-snug">{summary.headline}</h3>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={exportMarkdown} title="Export as Markdown"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={generate} title="Regenerate"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.filter(s => s.items?.length > 0).map((section) => (
        <div key={section.key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-gray-100">
            <div className={`w-5 h-5 rounded-md ${section.bg} flex items-center justify-center`}>
              <section.icon className={`w-3 h-3 ${section.color}`} />
            </div>
            <span className="text-xs font-semibold text-gray-700">{section.label}</span>
          </div>
          <ul className="p-3 space-y-2">
            {section.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${section.color.replace('text-', 'bg-')}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Participant insights */}
      {summary.participantInsights?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-gray-100 text-xs font-semibold text-gray-700">
            Notable Contributions
          </div>
          <ul className="p-3 space-y-1.5">
            {summary.participantInsights.map((ins, i) => (
              <li key={i} className="text-xs text-gray-600 italic">&ldquo;{ins}&rdquo;</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
