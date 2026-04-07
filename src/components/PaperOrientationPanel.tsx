'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, ChevronRight, AlertTriangle, CheckCircle,
  Brain, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, GraduationCap, ArrowUpRight, Sparkles, Zap,
} from 'lucide-react'

/* ─────────────────────────────── types ─────────────────────────────── */

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

/* ─────────────────────────────── difficulty ────────────────────────── */

const DIFFICULTY_CONFIG: Record<string, { pill: string; bar: string; width: string; glow: string }> = {
  'Accessible': { pill: 'bg-emerald-100 text-emerald-700',  bar: 'bg-emerald-500', width: 'w-1/4', glow: 'shadow-emerald-200' },
  'Moderate':   { pill: 'bg-amber-100 text-amber-700',      bar: 'bg-amber-500',   width: 'w-2/4', glow: 'shadow-amber-200' },
  'Dense':      { pill: 'bg-orange-100 text-orange-700',    bar: 'bg-orange-500',  width: 'w-3/4', glow: 'shadow-orange-200' },
  'Very Dense': { pill: 'bg-red-100 text-red-700',          bar: 'bg-red-500',     width: 'w-full', glow: 'shadow-red-200' },
}

/* ─────────────────────────────── animation hook ────────────────────── */

// Returns true after `delay` ms — used to stagger section reveals
function useReveal(delay: number, gate = true) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!gate) return
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay, gate])
  return visible
}

/* ─────────────────────────────── sub-components ────────────────────── */

function SectionHeading({ label, color, index = 0 }: { label: string; color: string; index?: number }) {
  const visible = useReveal(index * 80)
  return (
    <div
      className="flex items-center gap-2.5 mb-3 mt-1 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-8px)',
      }}
    >
      <div className={`w-1 h-5 rounded-full ${color}`} />
      <p className="text-sm font-bold text-slate-800 tracking-tight">{label}</p>
    </div>
  )
}

function RevealCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const visible = useReveal(delay)
  return (
    <div
      className={`bg-white border border-slate-100 rounded-2xl shadow-sm transition-all duration-500 ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{children}</p>
}

function Accordion({ title, badge, children, defaultOpen = false, delay = 0 }: {
  title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean; delay?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  const visible = useReveal(delay)
  return (
    <div
      className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-slate-800 truncate">{title}</span>
          {badge && (
            <span className="shrink-0 text-[10px] font-semibold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50">
          {children}
        </div>
      )}
    </div>
  )
}

function Sep() {
  return <div className="border-t border-slate-100 my-5" />
}

/* ─────────────────────────────── thinking steps ─────────────────────── */

const THINKING_STEPS = [
  { label: 'Reading abstract & intro…',     duration: 900 },
  { label: 'Mapping core claims…',          duration: 1800 },
  { label: 'Checking prerequisite depth…',  duration: 2800 },
  { label: 'Calibrating for your session…', duration: 3600 },
]

function ThinkingLoader() {
  const [step, setStep] = useState(0)
  const [dotCount, setDotCount] = useState(1)

  useEffect(() => {
    const stepTimers = THINKING_STEPS.map((s, i) =>
      setTimeout(() => setStep(i), s.duration)
    )
    const dotTimer = setInterval(() => setDotCount(d => (d % 3) + 1), 500)
    return () => {
      stepTimers.forEach(clearTimeout)
      clearInterval(dotTimer)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-8">

      {/* Animated orb */}
      <div className="relative w-20 h-20">
        {/* Outer pulse ring */}
        <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />
        {/* Rotating ring */}
        <div className="absolute inset-1 rounded-full border-[3px] border-indigo-200 border-t-indigo-600 animate-spin" />
        {/* Inner glow */}
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <Brain className="w-5 h-5 text-white" />
        </div>
        {/* Orbiting dot */}
        <div
          className="absolute w-2.5 h-2.5 bg-violet-400 rounded-full shadow-sm"
          style={{
            top: '50%',
            left: '50%',
            transformOrigin: '0 0',
            animation: 'orbit 1.8s linear infinite',
            marginLeft: '-5px',
            marginTop: '-32px',
          }}
        />
      </div>

      {/* Status line */}
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-slate-800">
          CoRead is reading this paper
          {'.'.repeat(dotCount)}
        </p>
        <p
          key={step}
          className="text-xs text-indigo-600 font-medium transition-all duration-400"
          style={{ animation: 'fadeSlideIn 0.4s ease' }}
        >
          {THINKING_STEPS[step]?.label}
        </p>
      </div>

      {/* Progress steps */}
      <div className="w-full space-y-2.5">
        {THINKING_STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                i < step
                  ? 'bg-indigo-600 shadow-sm shadow-indigo-200'
                  : i === step
                  ? 'bg-indigo-100 ring-2 ring-indigo-400 ring-offset-1'
                  : 'bg-slate-100'
              }`}
            >
              {i < step ? (
                <CheckCircle className="w-3 h-3 text-white" />
              ) : i === step ? (
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              ) : (
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <div
                className={`h-1 rounded-full overflow-hidden transition-all duration-700 ${
                  i < step ? 'bg-indigo-100' : 'bg-slate-100'
                }`}
              >
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: i < step ? '100%' : i === step ? '60%' : '0%' }}
                />
              </div>
            </div>
            <span
              className={`text-[10px] font-medium shrink-0 w-36 transition-colors duration-300 ${
                i < step ? 'text-indigo-500' : i === step ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateY(-32px) rotate(0deg); }
          to   { transform: rotate(360deg) translateY(-32px) rotate(-360deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.6) 40%, #fff 60%, rgba(255,255,255,0.6) 80%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          animation: shimmer 2.5s linear infinite;
        }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────── main panel ─────────────────────────── */

export default function PaperOrientationPanel({
  isOpen, onClose, onSetupComplete,
  paperText, paperTitle, paperAuthors, paperVenue, paperYear, documentId
}: PaperOrientationPanelProps) {

  const [glance, setGlance]   = useState<GlanceData | null>(null)
  const [prereqs, setPrereqs] = useState<PrereqData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [panelReady, setPanelReady] = useState(false)

  const hasFetched = useRef(false)

  // Reset fetch gate when document changes
  useEffect(() => {
    hasFetched.current = false
    setGlance(null)
    setPrereqs(null)
    setError(null)
    setPanelReady(false)
  }, [documentId])

  // Panel entrance delay — lets the slide-in complete before content appears
  useEffect(() => {
    if (!isOpen) { setPanelReady(false); return }
    const t = setTimeout(() => setPanelReady(true), 120)
    return () => clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || hasFetched.current || !paperText || paperText.length < 100) return
    hasFetched.current = true
    fetchAnalysis()
  }, [isOpen, paperText])

  const fetchAnalysis = async () => {
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

  if (!isOpen) return null

  const diff = glance?.readingDifficulty
  const diffCfg = diff ? (DIFFICULTY_CONFIG[diff.level] ?? DIFFICULTY_CONFIG['Moderate']) : null
  const hasContent = !loading && !error && (glance || prereqs)

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #f8f7ff 0%, #f8fafc 60%)',
        borderLeft: '1px solid #e2e0f0',
        boxShadow: '-8px 0 32px -8px rgba(99,102,241,0.08)',
        opacity: panelReady ? 1 : 0,
        transform: panelReady ? 'translateX(0)' : 'translateX(16px)',
        transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}
    >

      {/* ── Header ── */}
      <div
        className="shrink-0 px-5 pt-4 pb-4 border-b border-indigo-100/60"
        style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
          opacity: panelReady ? 1 : 0,
          transform: panelReady ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 0.4s ease 0.1s, transform 0.4s cubic-bezier(0.22,1,0.36,1) 0.1s',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">

            {/* Animated icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                animation: loading ? 'none' : 'iconPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both',
              }}
            >
              {loading
                ? <Brain className="w-4.5 h-4.5 text-white animate-pulse" />
                : <Sparkles className="w-4 h-4 text-white" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Paper Briefing</p>
                <span className="text-[10px] text-indigo-300">·</span>
                <p className="text-[10px] text-indigo-400 font-medium">Phase I</p>
              </div>
              <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-1 mt-0.5">
                {paperTitle || 'Untitled Paper'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-lg transition-all mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {(paperAuthors || paperYear) && (
          <p className="text-[11px] text-indigo-400/80 mt-1.5 ml-[46px] truncate font-medium">
            {[paperAuthors, paperYear, paperVenue].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Difficulty bar — animates width when it arrives */}
        {diff && diffCfg && (
          <div className="mt-3.5 ml-[46px]">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Reading difficulty</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffCfg.pill}`}>
                {diff.level}
              </span>
            </div>
            <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${diffCfg.bar}`}
                style={{
                  width: 0,
                  animation: `barFill 0.8s cubic-bezier(0.22,1,0.36,1) 0.6s both`,
                  animationFillMode: 'forwards',
                  ['--bar-width' as any]: diffCfg.width === 'w-1/4' ? '25%'
                    : diffCfg.width === 'w-2/4' ? '50%'
                    : diffCfg.width === 'w-3/4' ? '75%'
                    : '100%',
                }}
              />
            </div>
            {diff.reason && (
              <p className="text-[10px] text-indigo-400/70 mt-1.5 leading-relaxed">{diff.reason}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

        {/* Loading */}
        {loading && <ThinkingLoader />}

        {/* Error */}
        {error && !loading && (
          <div
            className="flex flex-col items-center justify-center py-14 gap-4 text-center"
            style={{ animation: 'fadeSlideUp 0.4s ease' }}
          >
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

        {/* Content — each section staggers in */}
        {hasContent && (
          <div className="space-y-1 pb-4">

            {/* ── 1. What This Paper Does ── */}
            {glance && (
              <div className="space-y-3 pb-2">
                <SectionHeading label="What this paper does" color="bg-violet-500" index={0} />

                {/* Hero sentence — arrives with shimmer */}
                <div
                  className="rounded-2xl p-4 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
                    animation: 'heroArrive 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-3 h-3 text-indigo-200" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Core thesis</p>
                  </div>
                  <p className="text-sm text-white font-medium leading-relaxed">{glance.oneSentence}</p>
                </div>

                <RevealCard className="p-4" delay={200}>
                  <FieldLabel>The gap it fills</FieldLabel>
                  <p className="text-sm text-slate-700 leading-relaxed">{glance.problemGap}</p>
                </RevealCard>

                <RevealCard className="p-4" delay={300}>
                  <FieldLabel>Core claim</FieldLabel>
                  <p className="text-sm text-slate-800 font-medium leading-relaxed">{glance.coreClaim}</p>
                </RevealCard>

                <RevealCard className="p-4 border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50" delay={400}>
                  <FieldLabel>Headline result</FieldLabel>
                  <p className="text-sm text-emerald-800 font-semibold leading-relaxed">{glance.keyResult}</p>
                </RevealCard>

                <RevealCard className="p-4" delay={500}>
                  <FieldLabel>How they test it</FieldLabel>
                  <p className="text-sm text-slate-700 leading-relaxed">{glance.howTheyTestIt}</p>
                </RevealCard>

                {glance.venueSignal && (
                  <RevealCard className="p-4" delay={580}>
                    <FieldLabel>Venue signal</FieldLabel>
                    <p className="text-sm text-slate-600 italic leading-relaxed">{glance.venueSignal}</p>
                  </RevealCard>
                )}
              </div>
            )}

            {/* ── 2. Is It For You? ── */}
            {glance && (glance.isItForYou?.yes?.length > 0 || glance.isItForYou?.no?.length > 0) && (
              <div className="space-y-3 py-2">
                <Sep />
                <SectionHeading label="Is it for you?" color="bg-blue-500" index={1} />

                {glance.isItForYou?.yes?.length > 0 && (
                  <RevealCard className="overflow-hidden" delay={680}>
                    <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Directly relevant if you…</p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {glance.isItForYou.yes.map((s, i) => (
                        <div key={i} className="flex items-start gap-2"
                          style={{ animation: `fadeSlideUp 0.35s ease ${700 + i * 60}ms both` }}>
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 mt-1.5" />
                          <p className="text-sm text-slate-700 leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  </RevealCard>
                )}

                {glance.isItForYou?.no?.length > 0 && (
                  <RevealCard className="overflow-hidden" delay={780}>
                    <div className="bg-red-50 px-4 py-2.5 border-b border-red-100 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Less relevant if you…</p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {glance.isItForYou.no.map((s, i) => (
                        <div key={i} className="flex items-start gap-2"
                          style={{ animation: `fadeSlideUp 0.35s ease ${800 + i * 60}ms both` }}>
                          <span className="w-1.5 h-1.5 bg-red-300 rounded-full shrink-0 mt-1.5" />
                          <p className="text-sm text-slate-600 leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  </RevealCard>
                )}
              </div>
            )}

            {/* ── 3. Before You Start ── */}
            {prereqs?.entryPoint && (
              <div className="space-y-3 py-2">
                <Sep />
                <SectionHeading label="Before you start" color="bg-teal-500" index={2} />

                <div
                  className="rounded-2xl p-4 shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
                    boxShadow: '0 6px 20px rgba(13,148,136,0.2)',
                    animation: 'heroArrive 0.6s cubic-bezier(0.22,1,0.36,1) 0.9s both',
                  }}
                >
                  <p className="text-[11px] font-semibold text-teal-200 uppercase tracking-wider mb-2">Do this first</p>
                  <p className="text-sm text-white font-medium leading-relaxed">{prereqs.entryPoint.beforeOpening}</p>
                </div>

                <RevealCard className="p-4" delay={980}>
                  <FieldLabel>Where to start reading</FieldLabel>
                  <p className="text-sm font-semibold text-slate-800 mb-1">{prereqs.entryPoint.startAt}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{prereqs.entryPoint.why}</p>
                </RevealCard>
              </div>
            )}

            {/* ── 4. Blocking Concepts ── */}
            {!!prereqs?.blockingConcepts?.length && (
              <div className="space-y-3 py-2">
                <Sep />
                <SectionHeading label="Blocking concepts" color="bg-violet-500" index={3} />
                <p
                  className="text-xs text-slate-500 leading-relaxed -mt-1"
                  style={{ animation: 'fadeSlideUp 0.4s ease 1.1s both' }}
                >
                  These will stop you cold — each is tied to a specific section.
                </p>
                <div className="space-y-2">
                  {prereqs!.blockingConcepts.map((c, i) => (
                    <Accordion key={i} title={c.concept} badge={c.section} defaultOpen={i === 0} delay={1150 + i * 80}>
                      <div className="space-y-2.5 pt-2">
                        <p className="text-sm text-slate-700 leading-relaxed">{c.oneLiner}</p>
                        <div className="bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                          <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-1">If you skip this</p>
                          <p className="text-sm text-slate-700">{c.whatBreaks}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-700">{c.howToGetIt}</p>
                        </div>
                      </div>
                    </Accordion>
                  ))}
                </div>
              </div>
            )}

            {/* ── 5. Read These First ── */}
            {!!prereqs?.mustReadFirst?.length && (
              <div className="space-y-3 py-2">
                <Sep />
                <SectionHeading label="Read these first" color="bg-blue-500" index={4} />
                <p
                  className="text-xs text-slate-500 leading-relaxed -mt-1"
                  style={{ animation: 'fadeSlideUp 0.4s ease 1.3s both' }}
                >
                  Prerequisite papers — you need these before specific sections.
                </p>
                <div className="space-y-2">
                  {prereqs!.mustReadFirst.map((p, i) => (
                    <RevealCard key={i} className="overflow-hidden" delay={1350 + i * 100}>
                      <div className="flex items-start justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{p.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{p.authors} · {p.year}</p>
                        </div>
                        <button
                          onClick={() => window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`, '_blank')}
                          className="shrink-0 p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                          title="Find on Google Scholar"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="px-4 py-3 space-y-2.5">
                        <div>
                          <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-1">Why it blocks you</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{p.whyBlocking}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
                          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-1">Minimum to extract</p>
                          <p className="text-sm text-slate-700">{p.whatToExtract}</p>
                        </div>
                      </div>
                    </RevealCard>
                  ))}
                </div>
              </div>
            )}

            {/* ── 6. Terms Used Differently ── */}
            {!!prereqs?.termsThatTripPeople?.length && (
              <div className="space-y-3 py-2">
                <Sep />
                <SectionHeading label="Terms used differently" color="bg-amber-500" index={5} />
                <p
                  className="text-xs text-slate-500 leading-relaxed -mt-1"
                  style={{ animation: 'fadeSlideUp 0.4s ease 1.5s both' }}
                >
                  Where this paper's meaning diverges from common usage.
                </p>
                <div className="space-y-2">
                  {prereqs!.termsThatTripPeople.map((t, i) => (
                    <RevealCard key={i} className="p-4" delay={1550 + i * 80}>
                      <p className="text-sm font-bold text-indigo-600 mb-2">{t.term}</p>
                      <p className="text-sm text-slate-700 italic leading-relaxed mb-2.5">"{t.paperMeans}"</p>
                      {t.notToConfuseWith && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-700">{t.notToConfuseWith}</p>
                        </div>
                      )}
                    </RevealCard>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Empty — waiting for text */}
        {!loading && !error && !glance && !prereqs && (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4 text-center"
            style={{ animation: 'fadeSlideUp 0.5s ease 0.3s both' }}
          >
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">Waiting for document…</p>
            <p className="text-xs text-slate-400">Analysis starts automatically once the PDF is ready.</p>
          </div>
        )}

      </div>

      {/* Global keyframes */}
      <style>{`
        @keyframes iconPop {
          from { opacity: 0; transform: scale(0.6) rotate(-10deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes heroArrive {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barFill {
          from { width: 0%; }
          to   { width: var(--bar-width, 50%); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateY(-32px) rotate(0deg); }
          to   { transform: rotate(360deg) translateY(-32px) rotate(-360deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
