'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, ThumbsUp, Check, X, Plus, Flame, Send, RotateCcw } from 'lucide-react'

export interface CritiqueAnnotation {
  id: string
  authorName: string
  authorId: string
  passageText: string
  critiqueText: string
  critiqueType: string
  severity: string
  upvotes: number
  resolved: boolean
  resolvedNote?: string | null
  pageNumber: number
  sectionName?: string | null
  createdAt: string
  disputed?: boolean
}

interface CritiqueLayerPanelProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  userId: string
  userName: string
  currentPage: number
  selectedPassage?: string
  currentSectionName?: string
}

const CRITIQUE_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'overstatement',    label: 'Overstatement',     color: 'text-red-600 bg-red-50 border-red-100' },
  { value: 'contradiction',    label: 'Contradiction',     color: 'text-orange-600 bg-orange-50 border-orange-100' },
  { value: 'methodology',      label: 'Methodology issue', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { value: 'assumption',       label: 'Unjustified assumption', color: 'text-violet-600 bg-violet-50 border-violet-100' },
  { value: 'missing-citation', label: 'Missing citation',  color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { value: 'other',            label: 'Other',             color: 'text-slate-600 bg-slate-50 border-slate-100' },
]

const SEVERITY_STYLES: Record<string, string> = {
  minor:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  medium:   'bg-orange-50 text-orange-700 border-orange-200',
  major:    'bg-red-50 text-red-700 border-red-200',
}

function critiqueTypeStyle(type: string) {
  return CRITIQUE_TYPES.find(t => t.value === type)?.color || 'text-slate-600 bg-slate-50 border-slate-100'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function CritiqueLayerPanel({
  isOpen, onClose, documentId, userId, userName,
  currentPage, selectedPassage, currentSectionName,
}: CritiqueLayerPanelProps) {
  const [critiques, setCritiques] = useState<CritiqueAnnotation[]>([])
  const [loading, setLoading] = useState(false)
  const [composing, setComposing] = useState(false)
  const [critiqueText, setCritiqueText] = useState('')
  const [critiqueType, setCritiqueType] = useState('overstatement')
  const [severity, setSeverity] = useState('medium')
  const [anchorPassage, setAnchorPassage] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const lastPassageRef = useRef<string>('')

  const fetchCritiques = useCallback(async () => {
    if (!documentId || !isOpen) return
    setLoading(true)
    try {
      const res = await fetch(`/api/critique-layer?paperId=${encodeURIComponent(documentId)}&pageNumber=${currentPage}`)
      const data = await res.json()
      if (data.success) setCritiques(data.critiques || [])
    } catch { /* fail silently */ }
    setLoading(false)
  }, [documentId, isOpen, currentPage])

  useEffect(() => {
    if (isOpen) fetchCritiques()
  }, [isOpen, currentPage, fetchCritiques])

  // Reset passage ref when panel closes — so reopening with same passage re-triggers compose
  useEffect(() => {
    if (!isOpen) {
      lastPassageRef.current = ''
      setComposing(false)
    }
  }, [isOpen])

  // Auto-open compose when a new passage is pre-selected — fires even if panel was already open
  useEffect(() => {
    if (!isOpen || !selectedPassage) return
    if (selectedPassage === lastPassageRef.current) return
    lastPassageRef.current = selectedPassage
    setAnchorPassage(selectedPassage)
    setCritiqueText('')
    setError('')
    setComposing(true)
  }, [isOpen, selectedPassage])

  const handleSubmit = async () => {
    if (!critiqueText.trim() || critiqueText.trim().length < 20) {
      setError('Be specific — at least 20 characters')
      return
    }
    // anchorPassage is optional — a section-level critique is still valid
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/critique-layer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: documentId,
          authorId: userId,
          authorName: userName,
          passageText: anchorPassage,
          pageNumber: currentPage,
          sectionName: currentSectionName || null,
          critiqueText: critiqueText.trim(),
          critiqueType,
          severity,
          aiAnalysis,
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Failed to save'); return }
      setCritiques(prev => [data.critique, ...prev])
      setComposing(false)
      setCritiqueText('')
      setAnchorPassage('')
      setAiAnalysis(false)
    } catch { setError('Network error') }
    setSubmitting(false)
  }

  const handleUpvote = async (id: string) => {
    try {
      const res = await fetch(`/api/critique-layer?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upvote' }),
      })
      const data = await res.json()
      if (data.success) {
        setCritiques(prev => prev.map(c => c.id === id ? { ...c, upvotes: data.upvotes } : c))
      }
    } catch { /* fail silently */ }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/critique-layer?id=${id}&userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
      setCritiques(prev => prev.filter(c => c.id !== id))
    } catch { /* fail silently */ }
  }

  if (!isOpen) return null

  const disputed = critiques.filter(c => c.disputed && !c.resolved)
  const active = critiques.filter(c => !c.resolved)
  const resolved = critiques.filter(c => c.resolved)

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-100">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-red-50 to-orange-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800">Critical Reading Layer</p>
            <p className="text-[10px] text-slate-500">Page {currentPage} · push back on claims</p>
          </div>
          {disputed.length > 0 && (
            <span className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
              <Flame className="w-2.5 h-2.5" /> {disputed.length} disputed
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Compose */}
        {composing ? (
          <div className="p-4 border-b border-slate-100 bg-red-50/30">
            <p className="text-[11px] font-semibold text-red-700 mb-3 uppercase tracking-wide">Register a critique</p>

            {/* Passage anchor */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-slate-500 font-medium">Claim being critiqued <span className="text-slate-400">(optional)</span></label>
                {!anchorPassage && selectedPassage && (
                  <button type="button" onClick={() => setAnchorPassage(selectedPassage)} className="text-[10px] text-red-600 hover:text-red-800 font-medium">
                    Use current selection
                  </button>
                )}
              </div>
              {anchorPassage ? (
                <div className="flex items-start gap-1.5">
                  <p className="flex-1 text-[11px] italic text-slate-600 border-l-2 border-red-300 pl-2 leading-relaxed line-clamp-3">"{anchorPassage}"</p>
                  <button type="button" onClick={() => setAnchorPassage('')} className="text-slate-300 hover:text-slate-500 mt-0.5 shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                  Highlight a claim in the PDF to anchor your critique — or leave blank for a section-level critique.
                </p>
              )}
            </div>

            {/* Type selector */}
            <div className="mb-3">
              <label className="text-[10px] text-slate-500 font-medium mb-1.5 block">Critique type</label>
              <div className="flex flex-wrap gap-1.5">
                {CRITIQUE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setCritiqueType(t.value)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      critiqueType === t.value ? t.color : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div className="mb-3 flex items-center gap-2">
              <label className="text-[10px] text-slate-500 font-medium">Severity:</label>
              {(['minor', 'medium', 'major'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize transition-all ${
                    severity === s ? SEVERITY_STYLES[s] : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Critique text */}
            <textarea
              value={critiqueText}
              onChange={e => setCritiqueText(e.target.value)}
              placeholder={`e.g. "The authors claim τ=0.72 is 'empirically derived' but Table 2 only reports 3 sessions — this sample size cannot support a universal threshold."`}
              className="w-full text-[12px] text-slate-700 placeholder:text-slate-400 bg-white border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-red-200 leading-relaxed"
              rows={4}
            />

            {/* AI analysis toggle */}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aiAnalysis}
                onChange={e => setAiAnalysis(e.target.checked)}
                className="w-3 h-3 rounded"
              />
              <span className="text-[11px] text-slate-500">Ask AI to analyze and strengthen this critique</span>
            </label>

            {error && <p className="text-[11px] text-red-500 mt-1.5">{error}</p>}

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[12px] font-semibold rounded-xl py-2 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Saving…' : 'Register critique'}
              </button>
              <button onClick={() => { setComposing(false); setError('') }} className="px-3 py-2 text-[12px] text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-3 pb-2">
            <button
              onClick={() => { setAnchorPassage(selectedPassage || ''); setComposing(true) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-red-200 hover:border-red-400 hover:bg-red-50 text-red-500 hover:text-red-700 text-[12px] font-medium transition-all"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Register a critique on a claim
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
            <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
            <span className="text-[12px]">Loading…</span>
          </div>
        )}

        {/* Active critiques */}
        {!loading && active.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">{active.length} active critique{active.length !== 1 ? 's' : ''}</p>
            <div className="space-y-2.5">
              {active.map(critique => (
                <CritiqueCard
                  key={critique.id}
                  critique={critique}
                  userId={userId}
                  expanded={expandedId === critique.id}
                  onToggle={() => setExpandedId(expandedId === critique.id ? null : critique.id)}
                  onUpvote={() => handleUpvote(critique.id)}
                  onDelete={() => handleDelete(critique.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !composing && active.length === 0 && (
          <div className="text-center py-8 px-4">
            <AlertTriangle className="w-7 h-7 text-slate-200 mx-auto mb-2" />
            <p className="text-[12px] text-slate-400 font-medium">No critiques on this page yet</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Critical reading is part of the research process. Disagree? Say so.</p>
          </div>
        )}

        {/* Resolved critiques (collapsed) */}
        {resolved.length > 0 && (
          <div className="px-3 pb-4 mt-2">
            <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide px-1 mb-2">{resolved.length} resolved</p>
            {resolved.map(critique => (
              <div key={critique.id} className="mb-1.5 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  <p className="text-[11px] text-slate-500 line-clamp-1">{critique.critiqueText}</p>
                </div>
                {critique.resolvedNote && (
                  <p className="text-[10px] text-emerald-600 mt-1 ml-5">Resolution: {critique.resolvedNote}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CritiqueCard({
  critique, userId, expanded, onToggle, onUpvote, onDelete,
}: {
  critique: CritiqueAnnotation
  userId: string
  expanded: boolean
  onToggle: () => void
  onUpvote: () => void
  onDelete: () => void
}) {
  const typeStyle = critiqueTypeStyle(critique.critiqueType)
  const typeLabel = CRITIQUE_TYPES.find(t => t.value === critique.critiqueType)?.label || critique.critiqueType
  const hasAiAnalysis = critique.critiqueText.includes('[AI analysis:')

  // Split AI analysis if present
  const parts = critique.critiqueText.split('\n\n[AI analysis:')
  const mainCritique = parts[0]
  const aiPart = parts[1]?.replace(/\]$/, '') || null

  return (
    <div className={`bg-white border rounded-xl overflow-hidden shadow-sm ${critique.disputed ? 'border-red-200' : 'border-slate-100'}`}>
      {/* Disputed badge */}
      {critique.disputed && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border-b border-red-100">
          <Flame className="w-3 h-3 text-red-500" />
          <span className="text-[10px] font-bold text-red-600">Disputed claim — multiple researchers raised this</span>
        </div>
      )}

      <div className="p-3">
        {/* Meta row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeStyle}`}>{typeLabel}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${SEVERITY_STYLES[critique.severity] || SEVERITY_STYLES.medium}`}>{critique.severity}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>{critique.authorName}</span>
            <span>·</span>
            <span>{timeAgo(critique.createdAt)}</span>
          </div>
        </div>

        {/* Anchored passage */}
        <p className="text-[11px] italic text-slate-500 border-l-2 border-slate-200 pl-2 mb-2 leading-relaxed line-clamp-2">
          "{critique.passageText}"
        </p>

        {/* Critique text */}
        <p className={`text-[12px] text-slate-700 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
          {mainCritique}
        </p>

        {/* AI analysis */}
        {aiPart && expanded && (
          <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
            <p className="text-[10px] font-semibold text-indigo-600 mb-1">AI analysis</p>
            <p className="text-[11px] text-indigo-800 leading-relaxed">{aiPart}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onUpvote}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ThumbsUp className="w-3 h-3" /> {critique.upvotes}
            </button>
            {critique.critiqueText.length > 120 && (
              <button
                onClick={onToggle}
                className="flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-slate-600"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" /> less</> : <><ChevronDown className="w-3 h-3" /> more</>}
              </button>
            )}
            {hasAiAnalysis && !expanded && (
              <span className="text-[10px] text-indigo-400">· AI analyzed</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {critique.authorId === userId && (
              <button onClick={onDelete} className="text-[10px] text-slate-300 hover:text-red-400 transition-colors">
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
