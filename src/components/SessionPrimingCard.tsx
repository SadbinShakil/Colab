// src/components/SessionPrimingCard.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { BookOpen, AlertCircle, CheckCircle2, HelpCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface PriorKnowledge {
  type: 'confusion' | 'insight' | 'open-question' | 'resolved'
  sectionName: string
  content: string
  sessionCount: number   // how many prior sessions this appears in
}

interface SessionPrimer {
  shouldPrime: boolean
  priorSessionCount: number
  knowledge: PriorKnowledge[]
  prioritySections: string[]   // section names to read carefully
}

interface SessionPrimingCardProps {
  documentId: string
  onDismiss?: () => void
}

const TYPE_CONFIG = {
  confusion:       { icon: AlertCircle,    color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Readers struggled here' },
  insight:         { icon: CheckCircle2,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Prior insight' },
  'open-question': { icon: HelpCircle,     color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Open question' },
  resolved:        { icon: CheckCircle2,   color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  label: 'Resolved in past sessions' },
}

export default function SessionPrimingCard({ documentId, onDismiss }: SessionPrimingCardProps) {
  const [primer, setPrimer] = useState<SessionPrimer | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch(`/api/session-primer?documentId=${documentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setPrimer(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [documentId])

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking prior session knowledge…
      </div>
    )
  }

  if (!primer?.shouldPrime || dismissed) return null

  const confusions = primer.knowledge.filter(k => k.type === 'confusion')
  const insights = primer.knowledge.filter(k => k.type === 'insight')
  const openQs = primer.knowledge.filter(k => k.type === 'open-question')
  const resolved = primer.knowledge.filter(k => k.type === 'resolved')

  return (
    <div className="border border-indigo-100 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100">
        <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
        <div className="flex-1">
          <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Collective Knowledge Base</span>
          <p className="text-xs text-indigo-600 mt-0.5">From {primer.priorSessionCount} prior reading session{primer.priorSessionCount > 1 ? 's' : ''} on this paper</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 rounded hover:bg-indigo-100 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-4">
          {/* Priority sections banner */}
          {primer.prioritySections.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-amber-700">Read carefully:</p>
              <p className="text-xs text-amber-800 mt-0.5">{primer.prioritySections.join(' · ')}</p>
            </div>
          )}

          {/* Confusions */}
          {confusions.length > 0 && (
            <KnowledgeGroup title="Where past readers struggled" items={confusions} />
          )}

          {/* Open questions */}
          {openQs.length > 0 && (
            <KnowledgeGroup title="Open questions (unresolved)" items={openQs} />
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <KnowledgeGroup title="Insights from past sessions" items={insights} />
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <KnowledgeGroup title="Already resolved" items={resolved} />
          )}
        </div>
      )}
    </div>
  )
}

function KnowledgeGroup({ title, items }: { title: string; items: PriorKnowledge[] }) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{title}</span>
      {items.map((item, i) => {
        const cfg = TYPE_CONFIG[item.type]
        const Icon = cfg.icon
        return (
          <div key={i} className={`rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2`}>
            <div className="flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 ${cfg.color} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-500">{item.sectionName}</span>
                  {item.sessionCount > 1 && (
                    <span className={`text-[10px] font-semibold ${cfg.color}`}>×{item.sessionCount}</span>
                  )}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{item.content}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
