'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, AlertTriangle, CheckCircle, Brain, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, ArrowUpRight, Sparkles, Zap,
  Scale, FlaskConical, ShieldAlert, Crosshair, BookOpen,
  GraduationCap, Target, ChevronRight, FileSearch,
} from 'lucide-react'

/* ─────────────────────────────── types ─────────────────────────────── */

interface GlanceData {
  oneSentence: string
  problemGap: string
  problemGapPage?: number
  problemGapQuote?: string
  coreClaim: string
  coreClaimPage?: number
  coreClaimQuote?: string
  howTheyTestIt: string
  howTheyTestItPage?: number
  howTheyTestItQuote?: string
  keyResult: string
  keyResultPage?: number
  keyResultQuote?: string
  isItForYou: { yes: string[]; no: string[] }
  readingDifficulty: { level: 'Accessible' | 'Moderate' | 'Dense' | 'Very Dense'; reason: string }
  venueSignal: string
}

interface PrereqData {
  blockingConcepts: Array<{
    concept: string
    section: string
    whatBreaks: string
    oneLiner: string
    howToGetIt: string
    sourcePage?: number
    sourceQuote?: string
  }>
  mustReadFirst: Array<{
    title: string
    authors: string
    year: string
    coreClaim: string
    whyBlocking: string
    whatToExtract: string
  }>
  entryPoint: {
    startAt: string
    why: string
    beforeOpening: string
    startAtPage?: number
  }
  pitfalls: Array<{
    where: string
    misreading: string
    correction: string
    sourcePage?: number
    sourceQuote?: string
  }>
  termsThatTripPeople: Array<{
    term: string
    paperMeans: string
    notToConfuseWith: string
    sourcePage?: number
    sourceQuote?: string
  }>
}

interface CritiqueData {
  methodologicalWeaknesses: Array<{
    weakness: string
    whyItMatters: string
    questionToAsk: string
    sourcePage?: number
    sourceQuote?: string
  }>
  claimEvidenceMap: Array<{
    claim: string
    evidenceStrength: 'strong' | 'moderate' | 'weak' | 'unsupported'
    rationale: string
    sourcePage?: number
    sourceQuote?: string
  }>
  whatThisPaperDoesNotProve: string
  readingAngle: string
}

export interface ReaderSetup {
  expertiseLevel: 'novice' | 'familiar' | 'expert'
  readingGoal: 'overview' | 'deep' | 'methodology' | 'evaluate' | 'find-gaps'
  priorKnowledge: string
  completedAt: string
}

interface PaperOrientationPanelProps {
  isOpen: boolean
  onClose: () => void
  onSetupComplete: (setup: ReaderSetup) => void
  paperText: string
  paperTitle?: string
  paperAuthors?: string
  paperVenue?: string
  paperYear?: string
  documentId: string
}

/* ─────────────────────────────── difficulty config ─────────────────── */

const DIFFICULTY_CONFIG: Record<string, {
  pill: string; track: string; fill: string; pct: number
}> = {
  'Accessible': { pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', track: 'bg-emerald-100', fill: 'bg-emerald-500', pct: 25 },
  'Moderate':   { pill: 'bg-amber-100  text-amber-700  border-amber-200',  track: 'bg-amber-100',  fill: 'bg-amber-500',  pct: 50 },
  'Dense':      { pill: 'bg-orange-100 text-orange-700 border-orange-200', track: 'bg-orange-100', fill: 'bg-orange-500', pct: 75 },
  'Very Dense': { pill: 'bg-red-100    text-red-700    border-red-200',    track: 'bg-red-100',    fill: 'bg-red-500',    pct: 100 },
}

/* ─────────────────────────────── evidence strength ─────────────────── */

const EVIDENCE_CFG: Record<string, {
  label: string; dot: string; bar: string; track: string; pct: number
  labelColor: string; border: string; headerBg: string
}> = {
  strong:      { label: 'Strong',      dot: 'bg-emerald-500', bar: 'bg-emerald-500', track: 'bg-emerald-100', pct: 100, labelColor: 'text-emerald-700', border: 'border-emerald-100', headerBg: 'bg-emerald-50' },
  moderate:    { label: 'Moderate',    dot: 'bg-blue-500',    bar: 'bg-blue-500',    track: 'bg-blue-100',    pct: 66,  labelColor: 'text-blue-700',    border: 'border-blue-100',    headerBg: 'bg-blue-50'    },
  weak:        { label: 'Weak',        dot: 'bg-amber-500',   bar: 'bg-amber-500',   track: 'bg-amber-100',   pct: 33,  labelColor: 'text-amber-700',   border: 'border-amber-100',   headerBg: 'bg-amber-50'   },
  unsupported: { label: 'Unsupported', dot: 'bg-red-500',     bar: 'bg-red-500',     track: 'bg-red-100',     pct: 8,   labelColor: 'text-red-700',     border: 'border-red-100',     headerBg: 'bg-red-50'     },
}

/* ─────────────────────────────── micro components ──────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1 border-l-2 border-indigo-300 pl-2">
      {children}
    </p>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-100 rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}

/**
 * Jump-to-page button. Dispatches 'coread:go-to-page' so PDFViewerCore / Apryse
 * scrolls to the correct page, then 'coread:highlight-passage' so the viewer
 * searches for the source quote and overlays an amber highlight on it.
 */
function FindInPaper({ page, quote, summary, label }: { page: number | undefined; quote?: string; summary?: string; label?: string }) {
  if (!page || page < 1) return null
  return (
    <button
      onClick={() => {
        window.dispatchEvent(new CustomEvent('coread:go-to-page', { detail: { page } }))
        window.dispatchEvent(new CustomEvent('coread:highlight-passage', {
          detail: { text: quote?.trim() || undefined, summary: summary?.trim() || undefined, label: label?.trim() || undefined, page }
        }))
      }}
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-1.5 py-0.5 rounded transition-colors border border-indigo-100 hover:border-indigo-300 shrink-0"
      title={`Go to page ${page} · highlights relevant passage`}
    >
      <FileSearch className="w-2.5 h-2.5" />
      Find in paper · p.{page}
    </button>
  )
}

function SectionTitle({ icon: Icon, label, color }: {
  icon: React.ElementType; label: string; color: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  )
}

function Accordion({ title, badge, children, defaultOpen = false }: {
  title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-slate-800 leading-snug">{title}</span>
          {badge && (
            <span className="shrink-0 text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────── loading state ─────────────────────── */

const THINKING_STEPS = [
  { label: 'Reading abstract & introduction…' },
  { label: 'Mapping core claims and evidence…' },
  { label: 'Checking prerequisite depth…' },
  { label: 'Identifying methodological limits…' },
]

function ThinkingLoader() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = [900, 1800, 2800, 3600].map((d, i) =>
      setTimeout(() => setStep(i), d)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-25" />
        <div className="absolute inset-1 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        <div className="absolute inset-2.5 rounded-full bg-indigo-600 flex items-center justify-center">
          <Brain className="w-4.5 h-4.5 text-white" />
        </div>
      </div>

      <div className="w-full space-y-3">
        {THINKING_STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
              i < step ? 'bg-indigo-600' : i === step ? 'bg-indigo-100 ring-2 ring-indigo-400 ring-offset-1' : 'bg-slate-100'
            }`}>
              {i < step
                ? <CheckCircle className="w-3 h-3 text-white" />
                : i === step
                ? <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                : <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />}
            </div>
            <span className={`text-xs transition-colors duration-300 ${
              i < step ? 'text-indigo-500 font-medium' : i === step ? 'text-slate-700 font-semibold' : 'text-slate-300'
            }`}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────── tab: glance ───────────────────────── */

function GlanceTab({ glance }: { glance: GlanceData }) {
  const diff = glance.readingDifficulty
  const diffCfg = DIFFICULTY_CONFIG[diff?.level] ?? DIFFICULTY_CONFIG['Moderate']

  return (
    <div className="space-y-5 pb-6">

      {/* ── Core thesis ── */}
      <div>
        <SectionTitle icon={Zap} label="Core thesis" color="bg-indigo-100 text-indigo-600" />
        <Card className="p-4">
          <p className="text-[15px] font-semibold text-slate-900 leading-relaxed">
            {glance.oneSentence}
          </p>
        </Card>
      </div>

      {/* ── Gap + Claim side by side summary ── */}
      <div className="space-y-2.5">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Label>The gap it fills</Label>
            {glance.problemGapPage && <FindInPaper page={glance.problemGapPage} quote={glance.problemGapQuote} summary={glance.problemGap} label="the gap in prior work that motivated this paper" />}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{glance.problemGap}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Label>Central claim</Label>
            {glance.coreClaimPage && <FindInPaper page={glance.coreClaimPage} quote={glance.coreClaimQuote} summary={glance.coreClaim} label="the central claim or main contribution of this paper" />}
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">{glance.coreClaim}</p>
        </Card>
      </div>

      {/* ── Evaluation + headline result ── */}
      <div className="grid grid-cols-1 gap-2.5">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Label>How they validate it</Label>
            {glance.howTheyTestItPage && <FindInPaper page={glance.howTheyTestItPage} quote={glance.howTheyTestItQuote} summary={glance.howTheyTestIt} label="how the authors evaluate or validate their approach" />}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{glance.howTheyTestIt}</p>
        </Card>

        <Card className="p-4 border-emerald-100 bg-emerald-50/40">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Label>Headline result</Label>
            {glance.keyResultPage && <FindInPaper page={glance.keyResultPage} quote={glance.keyResultQuote} summary={glance.keyResult} label="the headline result or key finding" />}
          </div>
          <p className="text-sm font-semibold text-emerald-800 leading-relaxed">{glance.keyResult}</p>
        </Card>
      </div>

      {/* ── Difficulty ── */}
      {diff && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <Label>Reading difficulty</Label>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${diffCfg.pill}`}>
              {diff.level}
            </span>
          </div>
          <div className={`h-1.5 ${diffCfg.track} rounded-full overflow-hidden mb-2`}>
            <div
              className={`h-full ${diffCfg.fill} rounded-full`}
              style={{ width: `${diffCfg.pct}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }}
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{diff.reason}</p>
        </Card>
      )}

      {/* ── Is it for you? ── */}
      {(glance.isItForYou?.yes?.length > 0 || glance.isItForYou?.no?.length > 0) && (
        <div>
          <SectionTitle icon={Target} label="Relevance" color="bg-slate-100 text-slate-500" />
          <div className="space-y-2">
            {glance.isItForYou?.yes?.length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Directly useful if you…</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {glance.isItForYou.yes.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 mt-1.5" />
                      <p className="text-sm text-slate-700 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {glance.isItForYou?.no?.length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Less relevant if you…</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {glance.isItForYou.no.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0 mt-1.5" />
                      <p className="text-sm text-slate-500 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Venue signal ── */}
      {glance.venueSignal && (
        <Card className="p-4 border-slate-100">
          <Label>Venue signal</Label>
          <p className="text-sm text-slate-600 leading-relaxed">{glance.venueSignal}</p>
        </Card>
      )}
    </div>
  )
}

/* ─────────────────────────────── tab: prepare ──────────────────────── */

function PrepareTab({ prereqs, critique }: { prereqs: PrereqData; critique: CritiqueData | null }) {
  return (
    <div className="space-y-6 pb-6">

      {/* ── Entry point ── */}
      {prereqs.entryPoint && (
        <div>
          <SectionTitle icon={BookOpen} label="How to enter this paper" color="bg-teal-100 text-teal-600" />
          <div className="space-y-2.5">
            <Card className="p-4 border-teal-100 bg-teal-50/30">
              <Label>Do this before opening it</Label>
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">{prereqs.entryPoint.beforeOpening}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <Label>Start reading at</Label>
                {prereqs.entryPoint.startAtPage && <FindInPaper page={prereqs.entryPoint.startAtPage} summary={prereqs.entryPoint.startAt} label="the recommended entry point or starting section" />}
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">{prereqs.entryPoint.startAt}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{prereqs.entryPoint.why}</p>
            </Card>
          </div>
        </div>
      )}

      {/* ── Blocking concepts ── */}
      {!!prereqs.blockingConcepts?.length && (
        <div>
          <SectionTitle icon={AlertCircle} label="Blocking concepts" color="bg-violet-100 text-violet-600" />
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Each of these is tied to a specific section. Missing one will cause a specific misread.
          </p>
          <div className="space-y-2">
            {prereqs.blockingConcepts.map((c, i) => (
              <Accordion key={i} title={c.concept} badge={c.section} defaultOpen={i === 0}>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-slate-700 leading-relaxed">{c.oneLiner}</p>
                    {c.sourcePage && <FindInPaper page={c.sourcePage} quote={c.sourceQuote} summary={c.oneLiner} label={`the concept "${c.concept}" as used in this paper`} />}
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">If you skip this</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.whatBreaks}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600 leading-relaxed">{c.howToGetIt}</p>
                  </div>
                </div>
              </Accordion>
            ))}
          </div>
        </div>
      )}

      {/* ── Must-read first ── */}
      {!!prereqs.mustReadFirst?.length && (
        <div>
          <SectionTitle icon={GraduationCap} label="Read these first" color="bg-blue-100 text-blue-600" />
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Prerequisite papers — specific sections depend on them.
          </p>
          <div className="space-y-2.5">
            {prereqs.mustReadFirst.map((p, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{p.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.authors} · {p.year}</p>
                  </div>
                  <button
                    onClick={() => window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`, '_blank')}
                    className="shrink-0 p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    title="Search on Google Scholar"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {p.coreClaim && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">What it argues</p>
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">{p.coreClaim}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Why it blocks you</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{p.whyBlocking}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Minimum to extract</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{p.whatToExtract}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Terms used differently ── */}
      {!!prereqs.termsThatTripPeople?.length && (
        <div>
          <SectionTitle icon={AlertTriangle} label="Terms used differently here" color="bg-amber-100 text-amber-600" />
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Where this paper's usage diverges from common understanding.
          </p>
          <div className="space-y-2">
            {prereqs.termsThatTripPeople.map((t, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-slate-800">{t.term}</p>
                  {t.sourcePage && <FindInPaper page={t.sourcePage} quote={t.sourceQuote} summary={t.paperMeans} label={`the term "${t.term}" and what it means in this paper`} />}
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed mb-2.5">
                  "{t.paperMeans}"
                </p>
                {t.notToConfuseWith && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">{t.notToConfuseWith}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Common misreadings ── */}
      {!!prereqs.pitfalls?.length && (
        <div>
          <SectionTitle icon={ShieldAlert} label="Common misreadings" color="bg-rose-100 text-rose-600" />
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Interpretations that look right but aren't.
          </p>
          <div className="space-y-2">
            {prereqs.pitfalls.map((p, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-slate-500">{p.where}</p>
                  {p.sourcePage && <FindInPaper page={p.sourcePage} quote={p.sourceQuote} summary={p.misreading} label={`the pitfall or common misreading at "${p.where}"`} />}
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Wrong read</p>
                    <p className="text-sm text-slate-500 italic leading-relaxed">"{p.misreading}"</p>
                  </div>
                  <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 leading-relaxed">{p.correction}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Critical reading layer ── */}
      {critique && (
        <div>
          <SectionTitle icon={Crosshair} label="Critical reading layer" color="bg-rose-100 text-rose-600" />

          {/* Reading angle — the single most important thing */}
          {critique.readingAngle && (
            <Card className="p-4 mb-3 border-rose-100 bg-rose-50/30">
              <Label>Your reading angle</Label>
              <p className="text-sm font-semibold text-slate-900 leading-relaxed">{critique.readingAngle}</p>
            </Card>
          )}

          {/* What this paper does NOT prove */}
          {critique.whatThisPaperDoesNotProve && (
            <Card className="overflow-hidden mb-3">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <FlaskConical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">What this paper does not prove</p>
              </div>
              <div className="px-4 py-3.5">
                <p className="text-sm text-slate-700 leading-relaxed">{critique.whatThisPaperDoesNotProve}</p>
              </div>
            </Card>
          )}

          {/* Claim–evidence map */}
          {!!critique.claimEvidenceMap?.length && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                Claim–evidence map
              </p>
              <div className="space-y-2">
                {critique.claimEvidenceMap.map((item, i) => {
                  const cfg = EVIDENCE_CFG[item.evidenceStrength] ?? EVIDENCE_CFG.moderate
                  return (
                    <Card key={i} className={`overflow-hidden border-slate-100`}>
                      <div className={`px-4 py-2.5 ${cfg.headerBg} border-b ${cfg.border} flex items-center justify-between gap-3`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                          <Scale className={`w-3 h-3 shrink-0 ${cfg.labelColor}`} />
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.labelColor}`}>
                            {cfg.label}
                          </p>
                        </div>
                        <div className={`w-16 h-1.5 rounded-full overflow-hidden ${cfg.track}`}>
                          <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${cfg.pct}%` }} />
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 leading-snug">"{item.claim}"</p>
                          {item.sourcePage && <FindInPaper page={item.sourcePage} quote={item.sourceQuote} summary={item.claim} label="a key claim and the evidence supporting it" />}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{item.rationale}</p>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Methodological weaknesses */}
          {!!critique.methodologicalWeaknesses?.length && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                Methodological weaknesses
              </p>
              <div className="space-y-2">
                {critique.methodologicalWeaknesses.map((w, i) => (
                  <Accordion key={i} title={w.weakness} badge="Methodology">
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Why it matters</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{w.whyItMatters}</p>
                        </div>
                        {w.sourcePage && <FindInPaper page={w.sourcePage} quote={w.sourceQuote} summary={w.weakness} label={`a methodological weakness: "${w.weakness}"`} />}
                      </div>
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-2.5">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Reviewer question</p>
                        <p className="text-sm text-slate-700 italic leading-relaxed">"{w.questionToAsk}"</p>
                      </div>
                    </div>
                  </Accordion>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────── main component ────────────────────── */

export default function PaperOrientationPanel({
  isOpen, onClose, onSetupComplete,
  paperText, paperTitle, paperAuthors, paperVenue, paperYear, documentId
}: PaperOrientationPanelProps) {

  const [glance, setGlance]     = useState<GlanceData | null>(null)
  const [prereqs, setPrereqs]   = useState<PrereqData | null>(null)
  const [critique, setCritique] = useState<CritiqueData | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'glance' | 'prepare'>('glance')

  const hasFetched = useRef(false)
  const glanceRef = useRef<GlanceData | null>(null)

  useEffect(() => { glanceRef.current = glance }, [glance])

  useEffect(() => {
    hasFetched.current = false
    setGlance(null); setPrereqs(null); setCritique(null)
    setError(null); setActiveTab('glance')
  }, [documentId])

  useEffect(() => {
    if (!isOpen || !paperText || paperText.length < 100) return
    if (hasFetched.current) {
      // Re-fetch if cached data predates the sourcePage upgrade
      const g = glanceRef.current
      if (g && !g.coreClaimPage && !g.keyResultPage) hasFetched.current = false
      else return
    }
    hasFetched.current = true
    fetchAnalysis()
  }, [isOpen, paperText])

  const fetchAnalysis = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/paper-orientation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperText, paperTitle, paperAuthors, paperVenue, paperYear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setGlance(data.glance)
      setPrereqs(data.prereqs)
      setCritique(data.critique ?? null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const hasContent = !loading && !error && (glance || prereqs)

  // Count prep items to badge the tab
  const prepCount = (prereqs?.blockingConcepts?.length ?? 0) +
    (prereqs?.mustReadFirst?.length ?? 0) +
    (prereqs?.pitfalls?.length ?? 0) +
    (critique?.methodologicalWeaknesses?.length ?? 0)

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white" style={{ borderLeft: '1px solid #e5e7eb' }}>

      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              {loading
                ? <Brain className="w-4 h-4 text-white animate-pulse" />
                : <Sparkles className="w-4 h-4 text-white" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Paper Briefing</p>
                <span className="text-[10px] text-slate-300">·</span>
                <p className="text-[10px] text-slate-400 font-medium">Phase I</p>
              </div>
              <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                {paperTitle || 'Untitled Paper'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!loading && (
              <button
                onClick={() => { hasFetched.current = false; fetchAnalysis() }}
                className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                title="Refresh briefing"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {(paperAuthors || paperYear) && (
          <p className="text-[11px] text-slate-400 mb-3 truncate">
            {[paperAuthors, paperYear, paperVenue].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Tab bar — only shown when content is ready */}
        {hasContent && (
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {([
              { id: 'glance',  label: 'At a Glance',   badge: null },
              { id: 'prepare', label: 'Prepare to Read', badge: prepCount > 0 ? prepCount : null },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.badge !== null && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {loading && <ThinkingLoader />}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
            <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm text-slate-600 max-w-[260px] leading-relaxed">{error}</p>
            <button
              onClick={() => { hasFetched.current = false; fetchAnalysis() }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        )}

        {hasContent && activeTab === 'glance' && glance && (
          <GlanceTab glance={glance} />
        )}

        {hasContent && activeTab === 'prepare' && prereqs && (
          <PrepareTab prereqs={prereqs} critique={critique} />
        )}

        {!loading && !error && !glance && !prereqs && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-indigo-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">Waiting for document…</p>
            <p className="text-xs text-slate-400">Analysis starts automatically once the PDF is ready.</p>
          </div>
        )}
      </div>
    </div>
  )
}
