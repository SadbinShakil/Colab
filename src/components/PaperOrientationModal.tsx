'use client'

/**
 * PaperOrientationModal
 *
 * Phase I — Pre-Discussion Alignment entry point.
 * Fires once per document per user (keyed in localStorage).
 *
 * Stage 1 — Paper at a Glance        (loaded from /api/paper-orientation in parallel)
 * Stage 2 — Before You Dive In       (same API call, second payload)
 * Stage 3 — Your Reading Setup       (instant, user-driven; outputs feed A1 D_s baseline + A10)
 *
 * Design principles:
 *  - Never blocks reading — "Skip for now" is always visible
 *  - All analysis is specific to the paper, not generic
 *  - Stage 3 captures real coordination signals: expertise level, reading goal, prior knowledge
 *  - Results from Stage 3 are written to localStorage so ApryseWebViewer can read them
 *    and other agents (A1, A10) can initialise with calibrated baselines
 */

import { useState, useEffect, useRef } from 'react'
import {
  X, ChevronRight, ChevronLeft, ExternalLink,
  GraduationCap, AlertTriangle, CheckCircle, Lightbulb,
  BookOpen, Brain, Target, Zap, AlertCircle,
  ArrowRight, Sparkles, Users, Map, FileText,
  BarChart2, Clock, TrendingUp, Shield
} from 'lucide-react'

/* ─────────────────────────────── types ──────────────────────────────── */

interface GlanceData {
  oneSentence: string
  problemGap: string
  coreClaim: string
  howTheyTestIt: string
  keyResult: string
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
  }>
  mustReadFirst: Array<{
    title: string
    authors: string
    year: string
    whyBlocking: string
    whatToExtract: string
  }>
  entryPoint: {
    startAt: string
    why: string
    beforeOpening: string
  }
  pitfalls: Array<{
    where: string
    misreading: string
    correction: string
  }>
  termsThatTripPeople: Array<{
    term: string
    paperMeans: string
    notToConfuseWith: string
  }>
}

export interface ReaderSetup {
  expertiseLevel: 'novice' | 'familiar' | 'expert'
  readingGoal: 'overview' | 'deep' | 'methodology' | 'evaluate' | 'find-gaps'
  priorKnowledge: string
  /** ISO timestamp */
  completedAt: string
}

interface PaperOrientationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called when Stage 3 is submitted — passes reader signals back to parent */
  onSetupComplete: (setup: ReaderSetup) => void
  paperText: string
  paperTitle?: string
  paperAuthors?: string
  paperVenue?: string
  paperYear?: string
  documentId: string
}

/* ─────────────────────────────── constants ──────────────────────────── */

const DIFFICULTY_COLOR: Record<string, string> = {
  'Accessible': 'bg-green-100 text-green-700 border-green-200',
  'Moderate':   'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Dense':      'bg-orange-100 text-orange-700 border-orange-200',
  'Very Dense': 'bg-red-100 text-red-700 border-red-200',
}

const EXPERTISE_OPTIONS = [
  {
    id: 'novice' as const,
    label: 'New to this area',
    description: "I'm unfamiliar with the core concepts or methods in this paper",
    icon: BookOpen,
    color: 'border-blue-200 bg-blue-50 text-blue-700',
    activeColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-300',
  },
  {
    id: 'familiar' as const,
    label: 'Familiar with the field',
    description: "I know the area but haven't worked directly on this specific problem",
    icon: Brain,
    color: 'border-purple-200 bg-purple-50 text-purple-700',
    activeColor: 'border-purple-500 bg-purple-100 ring-2 ring-purple-300',
  },
  {
    id: 'expert' as const,
    label: 'Expert in this area',
    description: "I've published or worked extensively in this domain",
    icon: GraduationCap,
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    activeColor: 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300',
  },
]

const GOAL_OPTIONS = [
  {
    id: 'overview' as const,
    label: 'Quick overview',
    description: "Understand the main idea and whether it's relevant to me",
    icon: Zap,
  },
  {
    id: 'deep' as const,
    label: 'Deep understanding',
    description: 'Fully understand the contribution, methods, and implications',
    icon: Brain,
  },
  {
    id: 'methodology' as const,
    label: 'Study the methodology',
    description: 'Understand how they did it - I want to replicate or extend this',
    icon: Map,
  },
  {
    id: 'evaluate' as const,
    label: 'Critically evaluate',
    description: 'Assess the validity of claims, identify flaws, write a review',
    icon: Shield,
  },
  {
    id: 'find-gaps' as const,
    label: 'Find research gaps',
    description: "Identify what's missing, what to build next, what they got wrong",
    icon: TrendingUp,
  },
]

/* ─────────────────────────────── subcomponents ──────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </p>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )
}

function HeroCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )
}

/* ─────────────────────────────── stage 1 ────────────────────────────── */

function Stage1({ glance }: { glance: GlanceData }) {
  const diffClass = DIFFICULTY_COLOR[glance.readingDifficulty?.level] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="space-y-4">

      {/* Hero — one sentence */}
      <HeroCard className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-2">What this paper does</p>
        <p className="text-base font-semibold leading-relaxed">{glance.oneSentence}</p>
      </HeroCard>

      {/* Problem gap + core claim side by side */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <SectionLabel>The gap it fills</SectionLabel>
          <p className="text-sm text-gray-800 leading-relaxed">{glance.problemGap}</p>
        </Card>
        <Card>
          <SectionLabel>The core claim</SectionLabel>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">{glance.coreClaim}</p>
        </Card>
      </div>

      {/* How they test it + key result */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <SectionLabel>How they test it</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{glance.howTheyTestIt}</p>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/40">
          <SectionLabel>The headline result</SectionLabel>
          <p className="text-sm text-emerald-800 leading-relaxed font-semibold">{glance.keyResult}</p>
        </Card>
      </div>

      {/* Is it for you */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-green-100">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Directly relevant if you…</p>
          </div>
          <div className="space-y-2">
            {glance.isItForYou?.yes?.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 shrink-0" />
                <p className="text-sm text-gray-700">{s}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Less relevant if you…</p>
          </div>
          <div className="space-y-2">
            {glance.isItForYou?.no?.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-red-300 rounded-full mt-1.5 shrink-0" />
                <p className="text-sm text-gray-700">{s}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Difficulty + venue */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <SectionLabel>Reading difficulty</SectionLabel>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${diffClass}`}>
              {glance.readingDifficulty?.level}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{glance.readingDifficulty?.reason}</p>
        </Card>
        <Card>
          <SectionLabel>What the venue signals</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{glance.venueSignal}</p>
        </Card>
      </div>

    </div>
  )
}

/* ─────────────────────────────── stage 2 ────────────────────────────── */

function Stage2({ prereqs }: { prereqs: PrereqData }) {
  const [subTab, setSubTab] = useState<'before' | 'concepts' | 'papers' | 'pitfalls' | 'terms'>('before')

  const SUB_TABS = [
    { id: 'before'   as const, label: 'Entry Point', icon: Map },
    { id: 'concepts' as const, label: 'Blocking Concepts', icon: Brain },
    { id: 'papers'   as const, label: 'Read First', icon: BookOpen },
    { id: 'pitfalls' as const, label: 'Pitfalls', icon: AlertTriangle },
    { id: 'terms'    as const, label: 'Key Terms', icon: FileText },
  ]

  return (
    <div className="space-y-4">

      {/* Sub-tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all
              ${subTab === t.id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Entry Point ── */}
      {subTab === 'before' && prereqs.entryPoint && (
        <div className="space-y-3">
          <HeroCard className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 mb-2">Do this before you open the paper</p>
            <p className="text-sm font-medium leading-relaxed">{prereqs.entryPoint.beforeOpening}</p>
          </HeroCard>
          <Card>
            <SectionLabel>Where to start reading</SectionLabel>
            <p className="text-sm font-semibold text-gray-900 mb-1">{prereqs.entryPoint.startAt}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{prereqs.entryPoint.why}</p>
          </Card>
        </div>
      )}

      {/* ── Blocking Concepts ── */}
      {subTab === 'concepts' && (
        <div className="space-y-3">
          {!prereqs.blockingConcepts?.length && (
            <p className="text-sm text-gray-400 text-center py-8">No blocking concepts identified.</p>
          )}
          {prereqs.blockingConcepts?.map((c, i) => (
            <Card key={i}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="font-bold text-sm text-gray-900">{c.concept}</p>
                <span className="shrink-0 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                  {c.section}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                <span className="font-medium text-gray-900">What you need: </span>{c.oneLiner}
              </p>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-2">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">What breaks if you skip this</p>
                <p className="text-sm text-gray-700">{c.whatBreaks}</p>
              </div>
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Fastest path to get up to speed</p>
                  <p className="text-sm text-gray-700">{c.howToGetIt}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Must Read First ── */}
      {subTab === 'papers' && (
        <div className="space-y-3">
          {!prereqs.mustReadFirst?.length && (
            <p className="text-sm text-gray-400 text-center py-8">No prerequisite papers identified.</p>
          )}
          {prereqs.mustReadFirst?.map((p, i) => (
            <Card key={i}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-sm text-gray-900 leading-snug">{p.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{p.authors} · {p.year}</p>
                </div>
                <button
                  onClick={() => window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`, '_blank')}
                  className="shrink-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                  title="Find on Google Scholar">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-2">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Why you're blocked without this</p>
                <p className="text-sm text-gray-700">{p.whyBlocking}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">What to get from it (minimum)</p>
                <p className="text-sm text-gray-700">{p.whatToExtract}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Pitfalls ── */}
      {subTab === 'pitfalls' && (
        <div className="space-y-3">
          {!prereqs.pitfalls?.length && (
            <p className="text-sm text-gray-400 text-center py-8">No specific pitfalls identified.</p>
          )}
          {prereqs.pitfalls?.map((p, i) => (
            <Card key={i}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="font-semibold text-sm text-gray-900">{p.where}</p>
              </div>
              <div className="mb-2">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Common misreading</p>
                <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{p.misreading}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">What it actually means</p>
                <p className="text-sm text-gray-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{p.correction}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Terms ── */}
      {subTab === 'terms' && (
        <div className="space-y-3">
          {!prereqs.termsThatTripPeople?.length && (
            <p className="text-sm text-gray-400 text-center py-8">No tricky terminology identified.</p>
          )}
          {prereqs.termsThatTripPeople?.map((t, i) => (
            <Card key={i}>
              <p className="font-bold text-sm text-indigo-700 mb-3">{t.term}</p>
              <div className="mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">What this paper means by it</p>
                <p className="text-sm text-gray-800 italic leading-relaxed">"{t.paperMeans}"</p>
              </div>
              {t.notToConfuseWith && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Don't confuse with</p>
                    <p className="text-sm text-gray-700">{t.notToConfuseWith}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────── stage 3 ────────────────────────────── */

function Stage3({
  value, onChange
}: {
  value: { expertiseLevel: ReaderSetup['expertiseLevel']; readingGoal: ReaderSetup['readingGoal']; priorKnowledge: string }
  onChange: (v: typeof value) => void
}) {
  return (
    <div className="space-y-6">

      {/* Expertise */}
      <div>
        <SectionLabel>Your expertise in this area</SectionLabel>
        <p className="text-xs text-gray-500 mb-3">
          This calibrates how the AI assistant and coordination system respond during your reading session.
        </p>
        <div className="space-y-2">
          {EXPERTISE_OPTIONS.map(opt => {
            const selected = value.expertiseLevel === opt.id
            const Icon = opt.icon
            return (
              <button key={opt.id}
                onClick={() => onChange({ ...value, expertiseLevel: opt.id })}
                className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                  ${selected ? opt.activeColor : `border-gray-200 hover:border-gray-300 bg-white`}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? '' : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${selected ? '' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${selected ? '' : 'text-gray-800'}`}>{opt.label}</p>
                  <p className={`text-xs mt-0.5 ${selected ? 'opacity-75' : 'text-gray-500'}`}>{opt.description}</p>
                </div>
                {selected && <CheckCircle className="w-5 h-5 ml-auto shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Reading goal */}
      <div>
        <SectionLabel>Reading goal for this session</SectionLabel>
        <p className="text-xs text-gray-500 mb-3">
          Sets how the AI formats responses — quick overview vs. deep dive vs. critical analysis.
        </p>
        <div className="grid grid-cols-1 gap-2">
          {GOAL_OPTIONS.map(opt => {
            const selected = value.readingGoal === opt.id
            const Icon = opt.icon
            return (
              <button key={opt.id}
                onClick={() => onChange({ ...value, readingGoal: opt.id })}
                className={`text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all
                  ${selected
                    ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <Icon className={`w-4 h-4 shrink-0 ${selected ? 'text-indigo-600' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <span className={`text-sm font-semibold ${selected ? 'text-indigo-800' : 'text-gray-800'}`}>
                    {opt.label}
                  </span>
                  <span className={`text-xs ml-2 ${selected ? 'text-indigo-600' : 'text-gray-400'}`}>
                    — {opt.description}
                  </span>
                </div>
                {selected && <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prior knowledge */}
      <div>
        <SectionLabel>What do you already know about this topic?</SectionLabel>
        <p className="text-xs text-gray-500 mb-2">
          Optional — 1–2 sentences. The AI uses this to avoid over-explaining things you already know and to fill gaps you don't.
        </p>
        <textarea
          value={value.priorKnowledge}
          onChange={e => onChange({ ...value, priorKnowledge: e.target.value })}
          placeholder="e.g. I've implemented BERT fine-tuning but haven't worked with instruction tuning or RLHF…"
          rows={3}
          className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-xl px-4 py-3 resize-none
            placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* What this does */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">How CoRead uses this</p>
        <div className="space-y-1.5">
          {[
            'Calibrates the D_s coordination instability baseline for your session',
            "Expert readers receive silence routing \u2014 the system won't interrupt you with things you already know",
            'Your reading goal shapes how AI explanations are framed (overview vs. critical depth)',
            'Prior knowledge feeds into role allocation when reading collaboratively',
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0 mt-1.5" />
              <p className="text-xs text-indigo-800">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────── main modal ─────────────────────────── */

export default function PaperOrientationModal({
  isOpen, onClose, onSetupComplete,
  paperText, paperTitle, paperAuthors, paperVenue, paperYear, documentId
}: PaperOrientationModalProps) {

  const [stage, setStage]               = useState<1 | 2 | 3>(1)
  const [glance,  setGlance]            = useState<GlanceData | null>(null)
  const [prereqs, setPrereqs]           = useState<PrereqData | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error,   setError]             = useState<string | null>(null)

  const [readerSetup, setReaderSetup] = useState<{
    expertiseLevel: ReaderSetup['expertiseLevel']
    readingGoal:    ReaderSetup['readingGoal']
    priorKnowledge: string
  }>({
    expertiseLevel: 'familiar',
    readingGoal:    'deep',
    priorKnowledge: '',
  })

  const hasFetched = useRef(false)

  /* Fetch on open — only once per mount */
  useEffect(() => {
    if (!isOpen || hasFetched.current || !paperText) return
    hasFetched.current = true
    fetchOrientation()
  }, [isOpen, paperText])

  const fetchOrientation = async () => {
    setLoading(true)
    setError(null)
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
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    const setup: ReaderSetup = {
      ...readerSetup,
      completedAt: new Date().toISOString(),
    }
    // Persist to localStorage so agents can read on init
    try {
      const key = `coread_reader_setup_${documentId}`
      localStorage.setItem(key, JSON.stringify(setup))
    } catch { /* localStorage may be unavailable */ }
    onSetupComplete(setup)
    onClose()
  }

  const canAdvance = stage < 3 || true // Stage 3 is always completable

  if (!isOpen) return null

  /* Stage labels */
  const STAGE_INFO = [
    { n: 1, label: 'Paper at a Glance',   icon: Sparkles },
    { n: 2, label: 'Before You Dive In',  icon: Brain },
    { n: 3, label: 'Your Reading Setup',  icon: Target },
  ]

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-gray-50 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 32px 80px -12px rgba(0,0,0,0.45)' }}
      >

        {/* ── Header ── */}
        <div className="shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Paper Orientation</span>
                <span className="text-xs text-gray-300 font-medium">— Phase I</span>
              </div>
              <h2 className="text-base font-bold text-gray-900 leading-snug truncate">
                {paperTitle || 'Untitled Paper'}
              </h2>
              {paperAuthors && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {paperAuthors}{paperYear ? ` · ${paperYear}` : ''}{paperVenue ? ` · ${paperVenue}` : ''}
                </p>
              )}
            </div>
            <button onClick={onClose}
              className="shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stage stepper */}
          <div className="flex items-center gap-2 mt-4">
            {STAGE_INFO.map((s, idx) => {
              const done    = stage > s.n
              const current = stage === s.n
              const Icon    = s.icon
              return (
                <div key={s.n} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => { if (done || current) setStage(s.n as 1|2|3) }}
                    disabled={!done && !current}
                    className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border transition-all text-left
                      ${current  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : done     ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer'
                                 : 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                      ${current ? 'bg-white/20' : done ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                      {done ? <CheckCircle className="w-3 h-3" /> : s.n}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-bold leading-none ${current ? 'text-indigo-100' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                        Step {s.n}
                      </p>
                      <p className={`text-xs font-semibold truncate leading-tight mt-0.5 ${current ? 'text-white' : done ? 'text-gray-700' : 'text-gray-300'}`}>
                        {s.label}
                      </p>
                    </div>
                  </button>
                  {idx < STAGE_INFO.length - 1 && (
                    <ArrowRight className={`w-3 h-3 shrink-0 ${stage > s.n ? 'text-green-400' : 'text-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Loading state */}
          {loading && stage < 3 && (
            <div className="flex flex-col items-center justify-center h-full py-20 gap-5">
              <div className="relative">
                <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div className="text-center max-w-xs">
                <p className="font-bold text-gray-800 text-base">Reading the paper…</p>
                <p className="text-sm text-gray-400 mt-1">
                  Running two analyses in parallel — paper overview and prerequisite check.
                  This usually takes 8–12 seconds.
                </p>
              </div>
              <div className="flex items-center gap-6 mt-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                  Paper at a Glance
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                  Prerequisite Analysis
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <div className="text-center max-w-sm">
                <p className="font-semibold text-gray-800">Analysis failed</p>
                <p className="text-sm text-gray-500 mt-1">{error}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={fetchOrientation}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                  Try again
                </button>
                <button onClick={() => setStage(3)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                  Skip to setup
                </button>
              </div>
            </div>
          )}

          {/* Stage 1 */}
          {!loading && !error && stage === 1 && glance && (
            <Stage1 glance={glance} />
          )}

          {/* Stage 2 */}
          {!loading && !error && stage === 2 && prereqs && (
            <Stage2 prereqs={prereqs} />
          )}

          {/* Stage 3 */}
          {stage === 3 && (
            <Stage3 value={readerSetup} onChange={setReaderSetup} />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between gap-4">
          <button onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Skip for now
          </button>

          <div className="flex items-center gap-3">
            {stage > 1 && (
              <button
                onClick={() => setStage(s => (s - 1) as 1|2|3)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {stage < 3 ? (
              <button
                onClick={() => setStage(s => (s + 1) as 1|2|3)}
                disabled={loading || (!glance && stage === 1) || (!prereqs && stage === 2)}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                {stage === 1 ? 'See prerequisites' : 'Set up my session'}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                <Sparkles className="w-4 h-4" />
                Start reading
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
