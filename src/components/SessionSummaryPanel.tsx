'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles, CheckCircle, HelpCircle, ArrowRight,
  Loader2, Download, Brain, Users, BookOpen, ChevronDown, ChevronUp,
  Bot, User, Layers
} from 'lucide-react'

/* ─────────────────────────────── types ─────────────────────────────────── */

export interface SectionAssignmentForSummary {
  sectionId: string
  sectionName: string
  assignedTo: string      // userId or 'ai'
  assignedName: string
  isAI: boolean
  sectionText?: string    // full text of the section, if available
}

interface SectionUnderstanding {
  sectionName: string
  readerName: string
  isAI: boolean
  summary: string
  keyInsight: string
  openQuestion: string
  confidence: 'high' | 'medium' | 'low'
}

interface SharedUnderstanding {
  oneLiner: string
  whatWeNowKnow: string[]
  contestedClaims: string[]
  openQuestions: string[]
  sectionSyntheses: Array<{ sectionName: string; reader: string; contribution: string }>
  collectiveConfidence: 'high' | 'medium' | 'low'
  nextSessionPrimer: string
}

interface SessionSummaryPanelProps {
  documentTitle?: string
  documentContent?: string
  paperText?: string
  chatMessages?: Array<{ userName: string; content: string; type: string }>
  annotations?: Array<{ type: string; text: string; sectionId?: string }>
  highlights?: Array<{ text: string; sectionId?: string; userName?: string }>
  sessionDurationMinutes?: number
  participantNames?: string[]
  assignments?: SectionAssignmentForSummary[]
  onClose?: () => void
}

/* ─────────────────────────── confidence badge ──────────────────────────── */

const CONFIDENCE_CFG = {
  high:   { label: 'High coverage',   pill: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  medium: { label: 'Partial coverage', pill: 'bg-amber-100 text-amber-700 border-amber-200' },
  low:    { label: 'Light coverage',  pill: 'bg-slate-100 text-slate-600 border-slate-200' },
}

function ConfidencePill({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const cfg = CONFIDENCE_CFG[confidence] ?? CONFIDENCE_CFG.medium
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.pill}`}>
      {cfg.label}
    </span>
  )
}

/* ─────────────────────────── step indicator ────────────────────────────── */

type Step = 'idle' | 'collecting' | 'synthesising' | 'done'

const STEP_LABELS: Record<Step, string> = {
  idle:        'Ready to generate',
  collecting:  'Collecting section understandings…',
  synthesising: 'Synthesising shared understanding…',
  done:        'Shared understanding ready',
}

/* ──────────────────────── section understanding card ───────────────────── */

function SectionUnderstandingCard({ u }: { u: SectionUnderstanding }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${u.isAI ? 'bg-violet-100' : 'bg-indigo-100'}`}>
          {u.isAI
            ? <Bot className="w-3.5 h-3.5 text-violet-600" />
            : <User className="w-3.5 h-3.5 text-indigo-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{u.sectionName}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{u.readerName}{u.isAI ? ' · AI' : ''}</p>
        </div>
        <ConfidencePill confidence={u.confidence} />
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 border-l-2 border-indigo-300 pl-2">Understanding</p>
            <p className="text-sm text-slate-700 leading-relaxed">{u.summary}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 border-l-2 border-emerald-300 pl-2">Key insight</p>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">{u.keyInsight}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 border-l-2 border-amber-300 pl-2">Open question</p>
            <p className="text-sm text-slate-600 italic leading-relaxed">"{u.openQuestion}"</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────── main component ───────────────────────────── */

export default function SessionSummaryPanel({
  documentTitle,
  documentContent,
  paperText,
  chatMessages = [],
  annotations = [],
  highlights = [],
  sessionDurationMinutes = 30,
  participantNames = [],
  assignments = [],
  onClose,
}: SessionSummaryPanelProps) {
  const [step, setStep] = useState<Step>('idle')
  const [sectionUnderstandings, setSectionUnderstandings] = useState<SectionUnderstanding[]>([])
  const [sharedUnderstanding, setSharedUnderstanding] = useState<SharedUnderstanding | null>(null)
  const [error, setError] = useState('')
  const [showSections, setShowSections] = useState(false)

  const fullText = paperText || documentContent || ''

  const generate = useCallback(async () => {
    setError('')
    setStep('collecting')
    setSectionUnderstandings([])
    setSharedUnderstanding(null)

    try {
      // ── Step 1: collect per-section understanding ────────────────────────
      // Use assignments if available; fall back to a single "whole paper" entry
      const targets: SectionAssignmentForSummary[] = assignments.length
        ? assignments
        : [{ sectionId: 'full', sectionName: 'Full paper', assignedTo: 'ai', assignedName: 'CoRead AI', isAI: true }]

      const understandings: SectionUnderstanding[] = []

      await Promise.all(targets.map(async (assignment) => {
        // Collect this reader's highlights and annotations for the section
        const readerHighlights = highlights
          .filter(h => !assignment.sectionId || h.sectionId === assignment.sectionId || h.userName === assignment.assignedName)
          .map(h => h.text)

        const readerAnnotations = annotations
          .filter(a => !assignment.sectionId || a.sectionId === assignment.sectionId)
          .map(a => a.text)

        // Section text: use assignment.sectionText if provided, otherwise slice full paper
        const sectionText = assignment.sectionText
          || (fullText ? fullText.slice(0, 3000) : `Section: ${assignment.sectionName}`)

        const res = await fetch('/api/section-understanding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionName: assignment.sectionName,
            sectionText,
            readerName: assignment.assignedName,
            isAI: assignment.isAI,
            highlights: readerHighlights,
            annotations: readerAnnotations,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.understanding) {
            understandings.push({
              sectionName: assignment.sectionName,
              readerName: assignment.assignedName,
              isAI: assignment.isAI,
              ...data.understanding,
            })
          }
        }
      }))

      setSectionUnderstandings(understandings)

      // ── Step 2: synthesise shared understanding ──────────────────────────
      setStep('synthesising')

      const res = await fetch('/api/shared-understanding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle,
          paperText: fullText.slice(0, 3000),
          sectionUnderstandings: understandings,
          participantNames,
        }),
      })

      if (!res.ok) throw new Error('Synthesis failed')
      const data = await res.json()
      setSharedUnderstanding(data.sharedUnderstanding)
      setStep('done')
    } catch (e: any) {
      setError(e.message || 'Generation failed')
      setStep('idle')
    }
  }, [assignments, highlights, annotations, documentTitle, fullText, participantNames])

  const exportMarkdown = () => {
    if (!sharedUnderstanding) return
    const lines = [
      `# Shared Understanding — ${documentTitle || 'Session'}`,
      `**Participants:** ${participantNames.join(', ') || 'Research group'}`,
      `**Duration:** ~${sessionDurationMinutes} min`,
      '',
      `## Summary`,
      sharedUnderstanding.oneLiner,
      '',
      '## What We Now Know',
      ...sharedUnderstanding.whatWeNowKnow.map(s => `- ${s}`),
      '',
      '## Contested Claims',
      ...(sharedUnderstanding.contestedClaims?.length
        ? sharedUnderstanding.contestedClaims.map(s => `- ${s}`)
        : ['- None identified']),
      '',
      '## Open Questions',
      ...sharedUnderstanding.openQuestions.map(s => `- ${s}`),
      '',
      '## Section-by-Section Contributions',
      ...sharedUnderstanding.sectionSyntheses.map(s => `- **${s.sectionName}** (${s.reader}): ${s.contribution}`),
      '',
      '## Next Session Primer',
      sharedUnderstanding.nextSessionPrimer,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shared-understanding-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── idle ── */
  if (step === 'idle') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Shared Understanding</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Phase III · Post-session synthesis</p>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Who read what */}
          {assignments.length > 0 && (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session map · who read what</p>
              </div>
              <div className="divide-y divide-slate-50">
                {assignments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${a.isAI ? 'bg-violet-100' : 'bg-indigo-100'}`}>
                      {a.isAI
                        ? <Bot className="w-3 h-3 text-violet-600" />
                        : <User className="w-3 h-3 text-indigo-600" />}
                    </div>
                    <span className="text-xs text-slate-700 flex-1 truncate">{a.sectionName}</span>
                    <span className={`text-[10px] font-semibold shrink-0 ${a.isAI ? 'text-violet-600' : 'text-indigo-600'}`}>
                      {a.assignedName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 leading-relaxed">
            Each reader's understanding of their assigned sections — including AI's analysis of unassigned sections — will be combined into one shared understanding document.
          </p>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            onClick={generate}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Build Shared Understanding
          </button>
        </div>
      </div>
    )
  }

  /* ── collecting / synthesising ── */
  if (step === 'collecting' || step === 'synthesising') {
    const totalSections = assignments.length || 1
    const done = sectionUnderstandings.length

    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-amber-100 animate-ping opacity-30" />
            <div className="absolute inset-0 rounded-xl bg-amber-50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-amber-600 animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{STEP_LABELS[step]}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {step === 'collecting'
                ? `${done} of ${totalSections} sections processed`
                : 'Combining all section understandings…'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: step === 'synthesising' ? '90%' : `${Math.round((done / totalSections) * 80)}%` }}
          />
        </div>

        {/* Live section results */}
        {sectionUnderstandings.length > 0 && (
          <div className="space-y-2">
            {sectionUnderstandings.map((u, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs text-slate-600 flex-1 truncate">{u.sectionName}</span>
                <span className="text-[10px] text-slate-400">{u.readerName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ── done ── */
  if (!sharedUnderstanding) return null

  const confidenceCfg = CONFIDENCE_CFG[sharedUnderstanding.collectiveConfidence] ?? CONFIDENCE_CFG.medium

  return (
    <div className="space-y-3">

      {/* Hero card */}
      <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Shared Understanding</p>
              <p className="text-[10px] text-amber-500 mt-0.5">{participantNames.join(', ') || 'Research group'} · ~{sessionDurationMinutes} min</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ConfidencePill confidence={sharedUnderstanding.collectiveConfidence} />
            <button
              onClick={exportMarkdown}
              className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-500 transition-colors"
              title="Export as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-slate-900 leading-relaxed">{sharedUnderstanding.oneLiner}</p>
        </div>
      </div>

      {/* What we now know */}
      {sharedUnderstanding.whatWeNowKnow?.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
            <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-slate-700">What we now know</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              {sharedUnderstanding.whatWeNowKnow.length}
            </span>
          </div>
          <ul className="px-4 py-3 space-y-2">
            {sharedUnderstanding.whatWeNowKnow.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span className="text-xs text-slate-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contested claims */}
      {sharedUnderstanding.contestedClaims?.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
            <div className="w-5 h-5 rounded-md bg-red-50 flex items-center justify-center">
              <HelpCircle className="w-3 h-3 text-red-500" />
            </div>
            <span className="text-xs font-semibold text-slate-700">Contested claims</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">
              {sharedUnderstanding.contestedClaims.length}
            </span>
          </div>
          <ul className="px-4 py-3 space-y-2">
            {sharedUnderstanding.contestedClaims.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <span className="text-xs text-slate-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Open questions */}
      {sharedUnderstanding.openQuestions?.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
            <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center">
              <HelpCircle className="w-3 h-3 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-slate-700">Open questions</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
              {sharedUnderstanding.openQuestions.length}
            </span>
          </div>
          <ul className="px-4 py-3 space-y-2">
            {sharedUnderstanding.openQuestions.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span className="text-xs text-slate-600 leading-relaxed italic">"{item}"</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section-by-section contributions — collapsible */}
      {sectionUnderstandings.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setShowSections(s => !s)}
            className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center">
              <Users className="w-3 h-3 text-indigo-600" />
            </div>
            <span className="text-xs font-semibold text-slate-700">Individual section understandings</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 mr-1">
              {sectionUnderstandings.length}
            </span>
            {showSections
              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          </button>
          {showSections && (
            <div className="p-3 space-y-2">
              {sectionUnderstandings.map((u, i) => (
                <SectionUnderstandingCard key={i} u={u} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Next session primer */}
      {sharedUnderstanding.nextSessionPrimer && (
        <div className="bg-white border border-indigo-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Next session primer</p>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{sharedUnderstanding.nextSessionPrimer}</p>
        </div>
      )}

      {/* Regenerate */}
      <button
        onClick={generate}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Regenerate shared understanding
      </button>
    </div>
  )
}
