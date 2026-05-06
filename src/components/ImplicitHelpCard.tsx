'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, Users, BookMarked, Wrench, AlertTriangle,
  MessageSquare, Send, ThumbsUp, ThumbsDown, Sparkles, Microscope,
  GitBranch, FileSearch, ChevronDown, ChevronUp, Layers,
  AlertCircle, Link2, Eye, Zap, Scale, FlaskConical, CheckCircle
} from 'lucide-react'

/**
 * ImplicitHelpCard — PhD-level ambient assistance
 *
 * Design standard: This appears for researchers who read 10+ papers/week.
 * It must not patronise. Every word must earn its place.
 *
 * Stage 1: Ambient pulse dot — no text, purely a signal
 * Stage 2: Section-anchored chip — shows the exact section name, not "Page N"
 * Stage 3: Full card — grounded diagnostic + researcher-grade actions
 *
 * The full card:
 *  - Quotes the specific contested/dense claim, not the opening sentence
 *  - Diagnostic: names the mechanism, points to the tension, cites the exact
 *    table/equation causing the pause — never generic AI filler
 *  - Actions calibrated for a researcher:
 *      Unpack mechanism / Trace prior work / Challenge this claim / Ask a peer
 *  - Signal provenance: shows what behavioural signals triggered this
 *  - Peer signal: "2 others paused here" if in collaborative mode
 */

export interface ImplicitHelpTrigger {
  sectionId: string
  sectionName: string
  sectionText: string
  confidence: number
  contributingFactors: string[]
  stage: 1 | 2 | 3
}

export interface PageSectionInfo {
  id: string
  name: string
  fullText: string
}

interface SectionIntelligence {
  id: string
  name: string
  argument: string
  evidence: string | null
  assumptions: string | null
  connects: string | null
  watchOut: string | null
  keyTension: string | null
}

interface ImplicitHelpCardProps {
  trigger: ImplicitHelpTrigger | null
  onDismiss: () => void
  onHelpChosen: (type: 'explain' | 'example' | 'question', text: string) => void
  documentTitle?: string
  documentContent?: string
  pageSections?: PageSectionInfo[]
  /** Navigate the PDF viewer to a given page, optionally with an amber highlight */
  onNavigate?: (page: number, highlight?: string) => void
  /** All paper sections with page ranges — used for cross-section navigation links */
  allSections?: Array<{ name: string; startPage: number }>
}

// ─── Stage 1: Ambient Pulse ───────────────────────────────────────────────────
function AmbientDot({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      onClick={onClick}
      className="w-9 h-9 rounded-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        boxShadow: '0 0 0 0 rgba(79, 70, 229, 0.5)',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title="CoRead detected extended dwell — click to surface analysis"
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: 'rgba(79,70,229,0.35)' }}
        animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Sparkles className="w-3.5 h-3.5 text-white relative z-10" />
    </motion.button>
  )
}

// ─── Stage 2: Section Chip ────────────────────────────────────────────────────
function SectionChip({
  sectionName,
  onClick,
  onDismiss,
}: {
  sectionName: string
  onClick: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 18000)
    return () => clearTimeout(t)
  }, [onDismiss])

  // Truncate to fit a chip without wrapping
  const label = sectionName.length > 36 ? sectionName.slice(0, 36) + '…' : sectionName

  return (
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      className="flex items-center gap-2"
    >
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-white text-[13px] font-medium shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          boxShadow: '0 4px 18px rgba(79,70,229,0.35)',
          letterSpacing: '-0.01em'
        }}
      >
        <Microscope className="w-3.5 h-3.5 opacity-80 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
      </motion.button>

      <motion.button
        onClick={onDismiss}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </motion.button>
    </motion.div>
  )
}

// ─── Diagnostic loading skeleton ──────────────────────────────────────────────
function PulseSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="h-3 rounded-full bg-slate-100"
          style={{ width: i === lines - 1 ? '70%' : '100%' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  )
}

// ─── Shared sub-components for structured + prose results ────────────────────

function StructuredField({
  icon, label, value, accent, tc,
}: { icon: React.ReactNode; label: string; value: string | null | undefined; accent: string; tc: string }) {
  if (!value) return null
  return (
    <div className={`rounded-lg border px-2.5 py-2 bg-white ${accent.replace(/bg-\S+/g, '')}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${tc}`}>
        <div className="w-3 h-3 shrink-0">{icon}</div>
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-[12px] text-slate-700 leading-relaxed">{value}</p>
    </div>
  )
}

// Three-level depth selector for structured content analysis.
// Level 1 — Orient: what is this and what do the authors say it shows
// Level 2 — Interrogate: does the evidence hold up, cross-references, statistical read
// Level 3 — Challenge: reviewer objections, alternative explanations, what breaks
type DepthLevel = 1 | 2 | 3

const DEPTH_LABELS: Record<DepthLevel, { label: string; sub: string; color: string; active: string }> = {
  1: { label: 'Orient',      sub: 'What is this?',        color: 'text-slate-500 border-slate-200',              active: 'text-indigo-700 border-indigo-500 bg-indigo-50' },
  2: { label: 'Interrogate', sub: 'Does it hold up?',     color: 'text-slate-500 border-slate-200',              active: 'text-amber-700 border-amber-500 bg-amber-50'   },
  3: { label: 'Challenge',   sub: 'Where does it break?', color: 'text-slate-500 border-slate-200',              active: 'text-rose-700 border-rose-500 bg-rose-50'      },
}

function DepthLeveledResult({ type, data }: { type: string; data: any }) {
  const [depth, setDepth] = useState<DepthLevel>(1)

  // Field definitions per content type per level
  const LEVELS: Record<string, Record<DepthLevel, Array<{
    icon: React.ReactNode; label: string; field: string; accent: string; tc: string
  }>>> = {
    figure: {
      1: [
        { icon: <Eye className="w-3 h-3" />,       label: 'What it shows',       field: 'whatItShows',      accent: 'bg-violet-50 border-violet-100', tc: 'text-violet-700' },
        { icon: <Zap className="w-3 h-3" />,        label: 'What authors claim',  field: 'whatAuthorsClaim', accent: 'bg-indigo-50 border-indigo-100', tc: 'text-indigo-700' },
      ],
      2: [
        { icon: <Scale className="w-3 h-3" />,      label: 'Evidence sufficiency', field: 'evidenceSufficiency', accent: 'bg-amber-50 border-amber-100', tc: 'text-amber-700' },
        { icon: <Link2 className="w-3 h-3" />,      label: 'Cross-reference',      field: 'crossReference',      accent: 'bg-teal-50 border-teal-100',  tc: 'text-teal-700'  },
      ],
      3: [
        { icon: <FlaskConical className="w-3 h-3" />, label: 'Alternative read', field: 'alternativeInterpretation', accent: 'bg-rose-50 border-rose-100', tc: 'text-rose-700' },
      ],
    },
    table: {
      1: [
        { icon: <BookMarked className="w-3 h-3" />, label: 'What it compares',   field: 'whatItCompares',  accent: 'bg-blue-50 border-blue-100',    tc: 'text-blue-700'   },
        { icon: <Zap className="w-3 h-3" />,        label: 'Headline result',    field: 'headlineResult',  accent: 'bg-indigo-50 border-indigo-100', tc: 'text-indigo-700' },
      ],
      2: [
        { icon: <Scale className="w-3 h-3" />,      label: 'Statistical read',   field: 'statisticalInterpretation', accent: 'bg-amber-50 border-amber-100',   tc: 'text-amber-700'   },
        { icon: <Link2 className="w-3 h-3" />,      label: 'Cross-reference',    field: 'crossReference',            accent: 'bg-teal-50 border-teal-100',     tc: 'text-teal-700'    },
      ],
      3: [
        { icon: <CheckCircle className="w-3 h-3" />, label: 'Conclusion warranted?', field: 'conclusionWarranted', accent: 'bg-emerald-50 border-emerald-100', tc: 'text-emerald-700' },
        { icon: <FlaskConical className="w-3 h-3" />, label: 'Alternative read',      field: 'alternativeRead',     accent: 'bg-rose-50 border-rose-100',      tc: 'text-rose-700'    },
      ],
    },
    equation: {
      1: [
        { icon: <Zap className="w-3 h-3" />,        label: 'Role in argument',    field: 'role',              accent: 'bg-amber-50 border-amber-100',  tc: 'text-amber-700'  },
        { icon: <BookMarked className="w-3 h-3" />, label: 'Paper-specific use',  field: 'paperSpecificUse',  accent: 'bg-indigo-50 border-indigo-100', tc: 'text-indigo-700' },
      ],
      2: [
        { icon: <Link2 className="w-3 h-3" />,      label: 'Connection to claim', field: 'connectionToMainClaim', accent: 'bg-violet-50 border-violet-100', tc: 'text-violet-700' },
        { icon: <Scale className="w-3 h-3" />,      label: 'Numerical intuition', field: 'numericalIntuition',    accent: 'bg-teal-50 border-teal-100',    tc: 'text-teal-700'   },
      ],
      3: [
        { icon: <AlertTriangle className="w-3 h-3" />, label: 'Reading pitfall', field: 'readingPitfall', accent: 'bg-rose-50 border-rose-100', tc: 'text-rose-700' },
      ],
    },
    algorithm: {
      1: [
        { icon: <Wrench className="w-3 h-3" />,     label: 'Input → Output',      field: 'inputOutputContract', accent: 'bg-emerald-50 border-emerald-100', tc: 'text-emerald-700' },
        { icon: <Zap className="w-3 h-3" />,        label: 'Key decision step',   field: 'keyDecisionStep',     accent: 'bg-teal-50 border-teal-100',      tc: 'text-teal-700'    },
      ],
      2: [
        { icon: <BookMarked className="w-3 h-3" />, label: 'Design rationale',    field: 'designRationale',         accent: 'bg-indigo-50 border-indigo-100', tc: 'text-indigo-700' },
        { icon: <Link2 className="w-3 h-3" />,      label: 'Evaluation',          field: 'connectionToEvaluation',  accent: 'bg-violet-50 border-violet-100', tc: 'text-violet-700' },
      ],
      3: [
        { icon: <AlertTriangle className="w-3 h-3" />, label: 'Unstated limitations', field: 'limitationsNotStated', accent: 'bg-rose-50 border-rose-100', tc: 'text-rose-700' },
      ],
    },
  }

  const contentLevels = LEVELS[type] || LEVELS.figure
  const fields = contentLevels[depth] || []

  return (
    <div className="space-y-2.5">
      {/* Depth selector tabs */}
      <div className="flex gap-1.5">
        {([1, 2, 3] as DepthLevel[]).map(lvl => {
          const cfg = DEPTH_LABELS[lvl]
          const isActive = depth === lvl
          return (
            <button
              key={lvl}
              onClick={() => setDepth(lvl)}
              className={`flex-1 py-1.5 px-2 rounded-lg border text-center transition-all ${isActive ? cfg.active : cfg.color + ' bg-white hover:bg-slate-50'}`}
            >
              <p className="text-[10px] font-bold leading-none">{cfg.label}</p>
              <p className="text-[9px] opacity-70 mt-0.5 leading-none">{cfg.sub}</p>
            </button>
          )
        })}
      </div>

      {/* Fields for current depth */}
      <AnimatePresence mode="wait">
        <motion.div
          key={depth}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="space-y-2"
        >
          {fields.map(f => (
            <StructuredField key={f.field} icon={f.icon} label={f.label} value={data[f.field]} accent={f.accent} tc={f.tc} />
          ))}

          {/* Equation type badge at orient level */}
          {type === 'equation' && depth === 1 && data.equationType && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              {data.equationType}
            </span>
          )}

          {/* No content fallback */}
          {fields.every(f => !data[f.field]) && (
            <p className="text-[12px] text-slate-400 text-center py-2">No data for this level</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ProseResponse({ text }: { text: string }) {
  // Split on [Label] markers produced by handleAction's markdown conversion
  const segments = text.split(/(\[[^\]]+\])/)
  return (
    <div className="space-y-2">
      {segments.reduce<React.ReactNode[]>((acc, seg, i) => {
        if (/^\[[^\]]+\]$/.test(seg)) {
          // This is a section label — render as a pill header
          const label = seg.slice(1, -1)
          const labelColors: Record<string, string> = {
            Analysis: 'text-indigo-600 bg-indigo-50',
            Tension:  'text-amber-700 bg-amber-50',
            Source:   'text-emerald-700 bg-emerald-50',
          }
          const color = labelColors[label] || 'text-slate-600 bg-slate-100'
          acc.push(
            <p key={i} className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md inline-block ${color}`}>
              {label}
            </p>
          )
        } else if (seg.trim()) {
          acc.push(
            <p key={i} className="text-[12.5px] text-slate-800 leading-relaxed whitespace-pre-wrap">
              {seg.trim()}
            </p>
          )
        }
        return acc
      }, [])}
    </div>
  )
}

function FeedbackRow({
  feedback, setFeedback, activeAction, sectionName,
}: {
  feedback: 'up' | 'down' | null
  setFeedback: (v: 'up' | 'down') => void
  activeAction: string | null
  sectionName: string
}) {
  return (
    <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-100">
      <span className="text-[10px] text-slate-400 font-medium">Useful?</span>
      <div className="flex gap-1">
        {(['up', 'down'] as const).map(dir => (
          <button
            key={dir}
            onClick={() => {
              setFeedback(dir)
              fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'ai_feedback',
                  payload: { rating: dir, action: activeAction, section: sectionName },
                }),
              })
            }}
            className={`p-1 rounded transition-colors ${
              feedback === dir
                ? dir === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {dir === 'up' ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>
      {feedback && <span className="text-[10px] text-indigo-500 font-medium ml-auto">Logged</span>}
    </div>
  )
}

// ─── Cross-section linkifier ─────────────────────────────────────────────────
// Parses AI text like "defined in §Introduction" or "see Table 2 on page 5"
// and renders section/page references as clickable chips.
function LinkifiedText({
  text,
  allSections,
  onNavigate,
}: {
  text: string
  allSections?: Array<{ name: string; startPage: number }>
  onNavigate?: (page: number, highlight?: string) => void
}) {
  if (!onNavigate || !allSections || allSections.length === 0) {
    return <span>{text}</span>
  }

  const sectionPattern = /§([A-Za-z][^\s,;:.!?]{1,40})/g
  const pagePattern = /\bp\.?\s*(\d+)\b/gi

  const matches: Array<{ start: number; end: number; label: string; page: number; highlight: string }> = []

  // Section name matches — highlight the full section name so the PDF flashes the heading
  for (const m of text.matchAll(sectionPattern)) {
    const sectionName = m[1].trim()
    const found = allSections.find(s =>
      s.name.toLowerCase().startsWith(sectionName.toLowerCase()) ||
      sectionName.toLowerCase().startsWith(s.name.toLowerCase())
    )
    if (found) {
      matches.push({ start: m.index!, end: m.index! + m[0].length, label: m[0], page: found.startPage, highlight: found.name })
    }
  }

  // Page number matches — no passage text to highlight, use empty string (just navigates)
  for (const m of text.matchAll(pagePattern)) {
    const page = parseInt(m[1], 10)
    if (page > 0) {
      matches.push({ start: m.index!, end: m.index! + m[0].length, label: m[0], page, highlight: '' })
    }
  }

  if (matches.length === 0) return <span>{text}</span>

  matches.sort((a, b) => a.start - b.start)
  const deduped = matches.filter((m, i) => i === 0 || m.start >= matches[i - 1].end)

  let cursor = 0
  const nodes: React.ReactNode[] = []
  deduped.forEach((m, i) => {
    if (m.start > cursor) nodes.push(<span key={`t${i}`}>{text.slice(cursor, m.start)}</span>)
    nodes.push(
      <button
        key={`l${i}`}
        onClick={() => onNavigate(m.page, m.highlight || undefined)}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10.5px] font-semibold hover:bg-indigo-100 active:bg-amber-50 active:border-amber-300 active:text-amber-700 transition-colors mx-0.5"
        title={`Jump to page ${m.page}`}
      >
        {m.label}
        <ChevronRight className="w-2.5 h-2.5 opacity-60" />
      </button>
    )
    cursor = m.end
  })
  if (cursor < text.length) nodes.push(<span key="tail">{text.slice(cursor)}</span>)

  return <>{nodes}</>
}

// ─── Section Intelligence Panel ──────────────────────────────────────────────
function SectionIntelligencePanel({
  sections,
  documentTitle,
  documentContent,
  currentPage,
  onNavigate,
  allSections,
}: {
  sections: PageSectionInfo[]
  documentTitle?: string
  documentContent?: string
  currentPage?: string
  onNavigate?: (page: number, highlight?: string) => void
  allSections?: Array<{ name: string; startPage: number }>
}) {
  const [intelligence, setIntelligence] = useState<SectionIntelligence[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current || sections.length === 0) return
    hasFetched.current = true

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/section-intelligence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sections: sections.map(s => ({ id: s.id, name: s.name, fullText: s.fullText })),
            paperTitle: documentTitle,
            paperContent: documentContent?.slice(0, 4000),
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const results: SectionIntelligence[] = data.sections || []
          setIntelligence(results)
          // Auto-expand first section
          if (results.length > 0) setExpandedId(results[0].id)
        }
      } catch {
        // silently fail — don't block the rest of the card
      } finally {
        setLoading(false)
      }
    }

    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const FIELD_ROWS: Array<{
    key: keyof SectionIntelligence
    label: string
    icon: React.ReactNode
    color: string
    textColor: string
  }> = [
    { key: 'argument',    label: 'Core move',      icon: <Zap className="w-3 h-3" />,          color: 'bg-indigo-50 border-indigo-100',  textColor: 'text-indigo-700' },
    { key: 'evidence',    label: 'Evidence',        icon: <FileSearch className="w-3 h-3" />,    color: 'bg-emerald-50 border-emerald-100', textColor: 'text-emerald-700' },
    { key: 'assumptions', label: 'Silent premises', icon: <AlertCircle className="w-3 h-3" />,   color: 'bg-amber-50 border-amber-100',    textColor: 'text-amber-700' },
    { key: 'connects',    label: 'Connects to',     icon: <Link2 className="w-3 h-3" />,         color: 'bg-violet-50 border-violet-100',  textColor: 'text-violet-700' },
    { key: 'watchOut',    label: 'Watch out for',   icon: <Eye className="w-3 h-3" />,           color: 'bg-rose-50 border-rose-100',      textColor: 'text-rose-700' },
    { key: 'keyTension',  label: 'Key tension',     icon: <AlertTriangle className="w-3 h-3" />, color: 'bg-slate-50 border-slate-200',    textColor: 'text-slate-600' },
  ]

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center gap-1.5">
        <Layers className="w-3 h-3 text-slate-400" />
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {sections.length === 1 ? '1 section on this page' : `${sections.length} sections on this page`}
        </p>
      </div>

      {loading && (
        <div className="space-y-1.5 pt-0.5">
          {sections.map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-3 py-2.5 flex items-center gap-2 bg-slate-50">
                <motion.div
                  className="h-2 rounded-full bg-slate-200 flex-1"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && intelligence.map((sec) => {
        const isOpen = expandedId === sec.id
        return (
          <div
            key={sec.id}
            className="rounded-xl border border-slate-100 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            {/* Section name row — click to expand */}
            <button
              onClick={() => setExpandedId(isOpen ? null : sec.id)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-1.5 h-4 rounded-full shrink-0"
                  style={{ background: 'linear-gradient(to bottom, #4f46e5, #7c3aed)' }}
                />
                <p className="text-[12px] font-semibold text-slate-800 truncate">§{sec.name}</p>
              </div>
              {isOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            </button>

            {/* Expanded intelligence */}
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-slate-100 px-3 py-2.5 space-y-2"
              >
                {FIELD_ROWS.map(({ key, label, icon, color, textColor }) => {
                  const value = sec[key]
                  if (!value) return null
                  const isNavigable = key === 'connects'
                  return (
                    <div key={key} className={`rounded-lg border px-2.5 py-2 ${color}`}>
                      <div className={`flex items-center gap-1.5 mb-1 ${textColor}`}>
                        {icon}
                        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
                      </div>
                      <p className="text-[12px] text-slate-700 leading-relaxed">
                        {isNavigable ? (
                          <LinkifiedText
                            text={value as string}
                            allSections={allSections}
                            onNavigate={onNavigate}
                          />
                        ) : (value as string)}
                      </p>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Stage 3: Full Research Card ──────────────────────────────────────────────
function FullHelpCard({
  trigger,
  onDismiss,
  onHelpChosen,
  documentTitle,
  documentContent,
  pageSections,
  onNavigate,
  allSections,
}: {
  trigger: ImplicitHelpTrigger
  onDismiss: () => void
  onHelpChosen: (type: 'explain' | 'example' | 'question', text: string) => void
  documentTitle?: string
  documentContent?: string
  pageSections?: PageSectionInfo[]
  onNavigate?: (page: number, highlight?: string) => void
  allSections?: Array<{ name: string; startPage: number }>
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [diagnostic, setDiagnostic] = useState<string | null>(null)
  const [claimQuote, setClaimQuote] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Focus point selection — when a page has multiple distinct elements
  interface FocusPoint { id: string; label: string; type: string; description: string }
  const [focusPoints, setFocusPoints] = useState<FocusPoint[]>([])
  const [selectedFocus, setSelectedFocus] = useState<FocusPoint | null>(null)

  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [responseText, setResponseText] = useState<string | null>(null)
  const [structuredResult, setStructuredResult] = useState<any | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [questionInput, setQuestionInput] = useState('')
  const [showQuestion, setShowQuestion] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  const dismissTimer = useRef<NodeJS.Timeout | null>(null)

  // ── Auto-analyse on structured focus selection ─────────────────────────────
  // When researcher selects a figure / table / equation / algorithm focus point,
  // immediately fire the structured analysis without waiting for an action click.
  const STRUCTURED_TYPES = ['figure', 'table', 'equation', 'algorithm']
  useEffect(() => {
    if (!selectedFocus) return
    if (!STRUCTURED_TYPES.includes(selectedFocus.type)) return
    if (structuredResult || isFetching || responseText) return
    handleAction('mechanism')
  }, [selectedFocus?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-dismiss ───────────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(onDismiss, 90000)
  }, [onDismiss])

  useEffect(() => {
    resetTimer()
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }
  }, [resetTimer])

  // Dismiss on sustained scroll away (> 30 wheel ticks)
  useEffect(() => {
    let count = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 10 && ++count > 30) onDismiss()
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [onDismiss])

  // ── Load grounded diagnostic ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setDiagnostic(null)
      setClaimQuote(null)
      setFocusPoints([])
      setSelectedFocus(null)
      setResponseText(null)
      setActiveAction(null)

      const clean = (t: string) =>
        t.replace(/\s+/g, ' ').replace(/(?:\b\d+\b\s*){4,}/g, ' ').trim()

      // sectionText contains page-labeled context: "[Page N]: ..."
      // Strip the [Page N]: labels before any further processing so they
      // don't leak into claim quotes or prompts as garbage metadata.
      const stripPageLabels = (t: string) =>
        t.replace(/\[Page\s+\d+\]:\s*/gi, ' ').replace(/\s+/g, ' ').trim()

      const rawSectionText = trigger.sectionText?.trim().length > 60
        ? trigger.sectionText
        : null

      const sectionText = rawSectionText
        ? clean(stripPageLabels(rawSectionText)).slice(0, 2400)
        : null

      // Keep the page-labeled version intact for the GPT prompt context (it helps GPT orient)
      const contextForPrompt = rawSectionText
        ? clean(rawSectionText).slice(0, 2400)
        : documentContent
          ? clean(documentContent).slice(0, 1200)
          : trigger.sectionName

      const context = contextForPrompt

      // Extract the densest claim from the STRIPPED section text — no metadata
      const extractClaim = (text: string): string | null => {
        // Skip any remaining label-like fragments at the start
        const cleaned = text.replace(/^\s*\[?Page\s*\d+\]?[:\s]*/i, '').trim()
        const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || []
        // Prefer sentences with technical density markers (numbers, greek, operators)
        // AND high letter ratio (excludes citation strings like "CHI EA '24, May 11–16")
        const dense = sentences.find(s => {
          const hasNumber = /\d/.test(s)
          const hasGreek = /[α-ωΑ-Ωτμσ]/.test(s)
          const hasFormula = /[=≥≤<>]/.test(s)
          const longEnough = s.trim().length > 45
          const letters = (s.match(/[a-zA-Z]/g) || []).length
          const letterRatio = letters / s.length
          // Reject citation-like strings (high punctuation, many numbers, low words)
          const wordCount = (s.match(/\b[a-zA-Z]{3,}\b/g) || []).length
          const isCitationLike = wordCount < 4 && /\d{4}/.test(s)
          return longEnough && letterRatio > 0.45 && !isCitationLike && (hasNumber || hasGreek || hasFormula)
        })
        // Fallback: longest sentence with enough real words
        const fallback = sentences
          .filter(s => {
            const words = (s.match(/\b[a-zA-Z]{3,}\b/g) || []).length
            const letters = (s.match(/[a-zA-Z]/g) || []).length
            return s.trim().length > 55 && words >= 6 && letters / s.length > 0.50
          })
          .sort((a, b) => b.length - a.length)[0]

        const chosen = dense || fallback
        if (!chosen) return null
        const trimmed = chosen.trim()
        return trimmed.length > 130 ? trimmed.slice(0, 130) + '…' : trimmed
      }

      const claim = sectionText ? extractClaim(sectionText) : null
      if (claim) setClaimQuote(claim)

      try {
        const fullDoc = documentContent?.trim() || ''
        const hasFullDoc = fullDoc.length > 500

        const prompt = `You are helping a PhD researcher who has been dwelling on page ${trigger.sectionName.replace('Page ', '')} of "${documentTitle || 'this paper'}".

VISIBLE PAGE CONTENT (page-labeled, prev/current/next page for context):
${context}

${hasFullDoc ? `FULL PAPER CONTEXT (for cross-reference only):
${fullDoc.slice(0, 20000)}` : ''}

Your task: scan the CURRENT page and identify 2–4 distinct elements the researcher might be struggling with or interested in (e.g. a figure, an equation, a specific claim, a method step, a table, a cited result).

Respond with ONLY valid JSON in this exact format — no markdown, no prose:
{
  "points": [
    { "id": "p1", "label": "Figure 1", "type": "figure", "description": "System architecture with three components: signal detection, routing, and output" },
    { "id": "p2", "label": "τ_fire threshold", "type": "equation", "description": "The 0.72 threshold that triggers A7 notification — derived empirically from 3 sessions" },
    { "id": "p3", "label": "Peer routing claim", "type": "claim", "description": "Authors claim peer routing activates in 10/12 sessions — but no failure analysis is given" }
  ],
  "diagnostic": "One sentence: the single most tension-laden element on this page, and where it connects elsewhere in the paper."
}

Rules:
- label: short name (e.g. "Figure 1", "Equation 3", "Section 4.2 claim")
- type: one of "figure" | "table" | "equation" | "claim" | "method" | "result"
- description: 1 sentence — what it IS and why a researcher might pause here
- If page has only 1 notable element, return just that 1 point
- Focus strictly on the CURRENT page content, not the abstract or introduction
- diagnostic: cite cross-section link (e.g. "validated in Table 2", "defined in §Introduction")`

        const res = await fetch('/api/ai-help', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: prompt,
            documentContent: fullDoc.slice(0, 20000),
            documentTitle: documentTitle || 'Academic Paper',
          }),
        })

        if (res.ok) {
          const data = await res.json()
          let raw: string = data.response?.answer || ''
          // Strip markdown code fences if present
          raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
          try {
            const parsed = JSON.parse(raw)
            const points: FocusPoint[] = (parsed.points || []).slice(0, 4)
            setFocusPoints(points)
            setDiagnostic(parsed.diagnostic || null)
            // Auto-select if only one point
            if (points.length === 1) setSelectedFocus(points[0])
          } catch {
            // JSON parse failed — fall back to treating as plain text diagnostic
            const text = raw.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').trim()
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
            setDiagnostic(sentences.slice(0, 2).join(' ').trim())
          }
        } else {
          setDiagnostic(`The authors' claim in §${trigger.sectionName} rests on an assumption that may warrant scrutiny — check whether the evidence in the referenced table supports the stated threshold.`)
        }
      } catch {
        setDiagnostic(`The framing in §${trigger.sectionName} contains an implicit assumption — identify it before accepting the conclusion.`)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [trigger.sectionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────
  const actions = [
    {
      id: 'mechanism',
      icon: <Wrench className="w-3.5 h-3.5" />,
      label: 'Unpack mechanism',
      sub: 'How does this actually work?',
      color: 'border-indigo-100 bg-indigo-50/60 text-indigo-800 hover:bg-indigo-100/80',
      prompt: (ctx: string) =>
        `The researcher is looking at ${trigger.sectionName} of "${documentTitle}". The page content (prev/current/next page labeled) is:

${ctx}

Trace the complete causal mechanism for the main content on the CURRENT page. For each step:
- Name what is happening and why
- If the page shows a figure (e.g., Figure 1) or table, describe its components specifically — do not skip it
- Flag any assumption left implicit by the authors

Then: does this mechanism connect to another part of the paper? Name the specific section where it is defined, extended, or validated. If the page has a figure, identify which section discusses it in text.

FULL PAPER AVAILABLE FOR CROSS-SECTION LINKING: ${documentContent ? 'yes' : 'no'}`,
    },
    {
      id: 'priorwork',
      icon: <FileSearch className="w-3.5 h-3.5" />,
      label: 'Trace prior work',
      sub: 'What does this build on?',
      color: 'border-violet-100 bg-violet-50/60 text-violet-800 hover:bg-violet-100/80',
      prompt: (ctx: string) =>
        `The researcher is looking at ${trigger.sectionName} of "${documentTitle}". Page content (prev/current/next labeled):

${ctx}

Based on what is ACTUALLY shown on the current page:
1. What is the single most important prior work this content builds on or contradicts? Name the specific paper or author if cited on this page.
2. What exactly does this paper change compared to that prior work — what is new vs. inherited?
3. Is there a notable omission — a well-known paper in this area not cited? Name it and explain why its absence matters.
4. If this page references a figure, table, or result from another section, identify what that cross-reference establishes.`,
    },
    {
      id: 'challenge',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: 'Challenge this',
      sub: 'What would a reviewer ask?',
      color: 'border-amber-100 bg-amber-50/60 text-amber-800 hover:bg-amber-100/80',
      prompt: (ctx: string) =>
        `The researcher is looking at ${trigger.sectionName} of "${documentTitle}". Page content (prev/current/next labeled):

${ctx}

You are a program committee reviewer. Identify the 2 strongest methodological objections to the claims on the CURRENT page:

For each objection:
- State the specific claim (quote from the page text or describe the figure/table)
- Explain the evidential gap: what data, control, or comparison is missing
- Rate: minor / moderate / major and why

Also: does this content contradict or underqualify a claim elsewhere in the paper? Cite the specific section.`,
    },
    {
      id: 'peer',
      icon: <Users className="w-3.5 h-3.5" />,
      label: 'Ask a peer',
      sub: 'Route this to a collaborator',
      color: 'border-emerald-100 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/80',
      prompt: null, // Handled as peer routing
    },
  ]

  const handleAction = async (actionId: string, customQuery?: string) => {
    setActiveAction(actionId)
    setFeedback(null)
    resetTimer()

    if (actionId === 'peer') {
      // Route to peer — tell the parent to open peer routing
      onHelpChosen('question', `Peer routing requested for section: ${trigger.sectionName}`)
      return
    }

    if (actionId === 'question' && !customQuery) {
      setShowQuestion(true)
      setResponseText(null)
      return
    }

    setShowQuestion(false)
    setIsFetching(true)
    setResponseText(null)
    setStructuredResult(null)

    const clean = (t: string) =>
      t.replace(/\s+/g, ' ').replace(/(?:\b\d+\b\s*){4,}/g, ' ').trim()

    // Use the page-labeled context (prev/current/next page) for all action prompts
    const ctx = trigger.sectionText?.trim().length > 60
      ? clean(trigger.sectionText).slice(0, 2400)
      : documentContent
        ? clean(documentContent).slice(0, 1200)
        : trigger.sectionName

    const fullDoc = documentContent?.trim() || ''

    // ── Structured path: figure / table / equation / algorithm focus points ──
    // When the researcher has selected a specific content element, route to the
    // dedicated structured endpoint instead of the generic prose path.
    const STRUCTURED_TYPES = ['figure', 'table', 'equation', 'algorithm']
    if (selectedFocus && STRUCTURED_TYPES.includes(selectedFocus.type) && actionId !== 'question') {
      try {
        const res = await fetch('/api/content-explainer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: selectedFocus.type,
            sectionText: ctx,
            sectionName: trigger.sectionName,
            paperTitle: documentTitle,
            paperContent: fullDoc.slice(0, 3000),
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setStructuredResult({ type: selectedFocus.type, data })
        } else {
          setResponseText('Structured analysis failed — check connection.')
        }
      } catch {
        setResponseText('Request failed. Please retry.')
      } finally {
        setIsFetching(false)
      }
      return
    }

    // ── Prose path: claims, methods, results, or no focus selected ──
    const action = actions.find(a => a.id === actionId)

    // Append selected focus point as the specific anchor for this query
    const focusAnchor = selectedFocus
      ? `\n\nFOCUS: The researcher has selected "${selectedFocus.label}" (${selectedFocus.type}) as their specific point of interest: ${selectedFocus.description}\nAnchor your entire response to this specific element.`
      : ''

    const prompt = actionId === 'question' && customQuery
      ? `You are helping a PhD researcher reading ${trigger.sectionName} of "${documentTitle || 'this paper'}".

CURRENT PAGE CONTENT (prev/current/next page labeled):
${ctx}${focusAnchor}

FULL PAPER (for cross-reference only — cite section/page when drawing from it):
${fullDoc.slice(0, 20000)}

RESEARCHER'S QUESTION: "${customQuery}"

Rules:
- Base your answer on the CURRENT PAGE and the selected focus element above
- If the answer requires information from another section, cite it explicitly: "as defined in §Introduction", "see Table 2 on page 5", "elaborated in §Evaluation"
- Do NOT give a general paper-wide summary — answer the specific question about the selected element
- Be direct and precise. PhD-level language. No filler.`
      : (action?.prompt?.(ctx) || '') + focusAnchor

    if (!prompt) { setIsFetching(false); return }

    try {
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          documentContent: fullDoc.slice(0, 20000) || ctx,
          documentTitle: documentTitle || 'Academic Paper',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const raw: string = data.response?.answer || ''
        // Preserve **Section:** headers by converting to readable labels instead of stripping
        const text = raw
          .replace(/\*\*([^*]+):\*\*/g, '[$1]')   // **Label:** → [Label]
          .replace(/^#+\s+/gm, '')                  // strip markdown headings
          .trim()
        setResponseText(text)
      } else {
        setResponseText('Could not retrieve analysis. Check your connection.')
      }
    } catch {
      setResponseText('Request failed. Please retry.')
    } finally {
      setIsFetching(false)
    }
  }

  // Signal provenance labels — human-readable, researcher-appropriate
  const signalLabels: Record<string, string> = {
    'extended reading time': 'dwell',
    'extended dwell time': 'dwell',
    'prolonged passive engagement': 'dwell',
    'consistently rising struggle score': 'rising D_s',
    '1 confusion highlight(s)': '1 confusion mark',
    '2 confusion highlight(s)': '2 confusion marks',
    '3 confusion highlight(s)': '3 confusion marks',
    'dense content (math/method)': 'dense section',
  }
  const signalDisplay = trigger.contributingFactors
    .slice(0, 3)
    .map(f => signalLabels[f] || f)
    .join(' · ')

  return (
    <motion.div
      initial={{ x: 110, opacity: 0, scale: 0.96 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 110, opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', damping: 26, stiffness: 290 }}
      className="w-[348px] max-h-[calc(100vh-12rem)] flex flex-col"
      onMouseEnter={resetTimer}
    >
      <div
        className="rounded-2xl overflow-hidden flex flex-col min-h-0"
        style={{
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(28px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.11), 0 1px 4px rgba(0,0,0,0.07)',
          border: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        {/* ── Header ── */}
        <div className="px-4 pt-3.5 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                <Microscope className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest">
                  CoRead · A7
                </p>
                {/* Section name — this is what was "Page 1" before */}
                <p
                  className="text-[13px] font-semibold text-slate-900 leading-tight mt-0.5 truncate"
                  title={trigger.sectionName}
                >
                  §{trigger.sectionName}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors shrink-0 mt-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="px-4 pt-3 pb-3.5 space-y-3 overflow-y-auto flex-1 min-h-0">

          {/* ── Claim Quote ── The specific dense/contested sentence ── */}
          {claimQuote && (
            <div
              className="rounded-xl px-3 py-2.5"
              style={{
                background: 'linear-gradient(135deg, rgba(79,70,229,0.04) 0%, rgba(124,58,237,0.04) 100%)',
                borderLeft: '2px solid #4f46e5',
              }}
            >
              <p className="text-[11.5px] text-slate-600 italic leading-relaxed font-mono">
                "{claimQuote}"
              </p>
            </div>
          )}

          {/* ── Focus Point Selector ── shown when page has multiple elements ── */}
          <AnimatePresence>
            {!isLoading && focusPoints.length > 1 && (
              <motion.div
                key="focus-selector"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-1.5"
              >
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  {selectedFocus ? 'Focused on' : 'What are you looking at?'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {focusPoints.map(fp => {
                    const typeColors: Record<string, string> = {
                      figure:   'bg-violet-50 border-violet-200 text-violet-700',
                      table:    'bg-teal-50 border-teal-200 text-teal-700',
                      equation: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                      claim:    'bg-amber-50 border-amber-200 text-amber-700',
                      method:   'bg-blue-50 border-blue-200 text-blue-700',
                      result:   'bg-emerald-50 border-emerald-200 text-emerald-700',
                    }
                    const color = typeColors[fp.type] || 'bg-slate-50 border-slate-200 text-slate-700'
                    const isSelected = selectedFocus?.id === fp.id
                    return (
                      <button
                        key={fp.id}
                        onClick={() => {
                          setSelectedFocus(isSelected ? null : fp)
                          setResponseText(null)
                          setStructuredResult(null)
                          setActiveAction(null)
                        }}
                        title={fp.description}
                        className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-medium transition-all ${color} ${
                          isSelected
                            ? 'ring-2 ring-offset-1 ring-current shadow-sm scale-[1.03]'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                      >
                        {fp.label}
                      </button>
                    )
                  })}
                </div>
                {selectedFocus && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11.5px] text-slate-500 leading-snug">
                    {selectedFocus.description}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Diagnostic ── Cross-section tension, shown after focus selection or when single item ── */}
          <div className="min-h-[48px]">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <PulseSkeleton lines={2} />
                </motion.div>
              ) : diagnostic ? (
                <motion.p
                  key="diag"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[13px] text-slate-700 leading-relaxed"
                >
                  {diagnostic}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          {/* ── Section Intelligence — PhD-level per-section breakdown ── */}
          {pageSections && pageSections.length > 0 && !isLoading && (
            <div className="border-t border-slate-100 pt-3">
              <SectionIntelligencePanel
                sections={pageSections}
                documentTitle={documentTitle}
                documentContent={documentContent}
                currentPage={trigger.sectionName}
                onNavigate={onNavigate}
                allSections={allSections}
              />
            </div>
          )}

          {/* ── Inline Response Area ── */}
          <AnimatePresence mode="popLayout">
            {showQuestion ? (
              <motion.div
                key="q-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <input
                    autoFocus
                    type="text"
                    value={questionInput}
                    onChange={e => setQuestionInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && questionInput.trim())
                        handleAction('question', questionInput.trim())
                    }}
                    placeholder="Your specific question about this section…"
                    className="flex-1 bg-transparent text-[13px] px-3 py-2 outline-none text-slate-800 placeholder-slate-400"
                  />
                  <button
                    onClick={() => questionInput.trim() && handleAction('question', questionInput.trim())}
                    disabled={!questionInput.trim()}
                    className="px-3 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>

            ) : isFetching ? (
              /* ── Loading ── */
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <PulseSkeleton lines={4} />
                  <p className="text-[10.5px] text-slate-400 mt-2">
                    {selectedFocus && ['figure','table','equation','algorithm'].includes(selectedFocus.type)
                      ? `Analysing ${selectedFocus.type}…`
                      : 'Analysing…'}
                  </p>
                </div>
              </motion.div>

            ) : structuredResult ? (
              /* ── Structured result (figure / table / equation / algorithm) ── */
              <motion.div
                key="structured"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                        {structuredResult.type} analysis · A6
                      </span>
                    </div>
                    <button
                      onClick={() => { setStructuredResult(null); setActiveAction(null) }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Depth-leveled structured fields */}
                  <div className="px-3 py-2.5">
                    <DepthLeveledResult type={structuredResult.type} data={structuredResult.data} />
                  </div>

                  {/* Feedback footer */}
                  <FeedbackRow feedback={feedback} setFeedback={setFeedback} activeAction={activeAction} sectionName={trigger.sectionName} />
                </div>
              </motion.div>

            ) : responseText ? (
              /* ── Prose result with visible section headers ── */
              <motion.div
                key="response"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analysis</span>
                    <button
                      onClick={() => { setResponseText(null); setActiveAction(null) }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="px-3 py-3">
                    <ProseResponse text={responseText} />
                    <FeedbackRow feedback={feedback} setFeedback={setFeedback} activeAction={activeAction} sectionName={trigger.sectionName} />
                  </div>
                </div>
              </motion.div>

            ) : (
              /* ── Action grid ── */
              <motion.div
                key="actions"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-1.5"
              >
                {actions.map(action => (
                  <motion.button
                    key={action.id}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAction(action.id)}
                    className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${action.color} ${activeAction === action.id ? 'ring-1 ring-offset-1 ring-current' : ''}`}
                  >
                    <div className="w-5 h-5 rounded-md bg-white/70 flex items-center justify-center shrink-0 mt-0.5">
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold leading-tight">{action.label}</p>
                      <p className="text-[10px] opacity-65 leading-tight mt-0.5">{action.sub}</p>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Also ask ── */}
          {!showQuestion && !responseText && !isFetching && (
            <button
              onClick={() => { setShowQuestion(true); setActiveAction('question'); setResponseText(null) }}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-indigo-500 transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              Ask a specific question about this section
            </button>
          )}

          {/* ── Signal provenance ── confidence bars only ── */}
          <div className="flex items-center justify-end pt-0.5 border-t border-slate-100">
            {/* D_s confidence bars */}
            <div className="flex items-end gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full"
                  style={{
                    height: 4 + i * 2,
                    background: i < Math.round(trigger.confidence * 5)
                      ? 'linear-gradient(to top, #4f46e5, #7c3aed)'
                      : '#e2e8f0',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────
export default function ImplicitHelpCard({
  trigger,
  onDismiss,
  onHelpChosen,
  documentTitle,
  documentContent,
  pageSections,
  onNavigate,
  allSections,
}: ImplicitHelpCardProps) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0)
  const prevSection = useRef<string | null>(null)

  useEffect(() => {
    if (!trigger) { setStage(0); return }

    if (prevSection.current !== trigger.sectionId) {
      prevSection.current = trigger.sectionId
      setStage(trigger.stage)
    } else {
      setStage(prev => Math.max(prev, trigger.stage) as 0 | 1 | 2 | 3)
    }
  }, [trigger])

  const dismiss = () => { setStage(0); onDismiss() }

  return (
    <AnimatePresence mode="wait">
      {stage === 1 && trigger && (
        <AmbientDot key="dot" onClick={() => setStage(2)} />
      )}
      {stage === 2 && trigger && (
        <SectionChip
          key="chip"
          sectionName={trigger.sectionName}
          onClick={() => setStage(3)}
          onDismiss={dismiss}
        />
      )}
      {stage === 3 && trigger && (
        <FullHelpCard
          key="card"
          trigger={trigger}
          onDismiss={dismiss}
          onHelpChosen={onHelpChosen}
          documentTitle={documentTitle}
          documentContent={documentContent}
          pageSections={pageSections}
          onNavigate={onNavigate}
          allSections={allSections}
        />
      )}
    </AnimatePresence>
  )
}
