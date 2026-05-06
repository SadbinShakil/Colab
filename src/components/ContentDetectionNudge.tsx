'use client'

/**
 * ContentDetectionNudge
 *
 * Non-modal ambient chip that appears when the current page contains a figure,
 * table, equation, or algorithm.
 *
 * Stage 1: Small chip at bottom-right — one click to expand, one click to dismiss
 * Stage 2: Full PhD-level structured panel per content type
 *
 * For figures: captures current page as image, sends to GPT-4o vision for
 *   grounded structured analysis (what it shows / what authors claim / critical read / cross-refs)
 * For tables: calls /api/content-explainer with structured statistical audit
 * For equations: calls /api/content-explainer with full symbol table + derivation + assumptions
 * For algorithms: calls /api/content-explainer with contract + decision step + novelty audit
 *
 * Never blocks reading. Auto-dismisses after 30s if ignored.
 * Cooldown: won't re-appear for the same section within the session.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, Loader2, BarChart2, Table2, FunctionSquare, Cpu,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Link2,
  Eye, Scale, Zap, FlaskConical, Code2, ScanLine, BookMarked, Wrench,
} from 'lucide-react'

export type ContentFlag = 'figure' | 'table' | 'equation' | 'algorithm'

export interface ContentDetectionNudgeProps {
  sectionId: string
  sectionName: string
  sectionText: string
  flags: ContentFlag[]
  documentTitle?: string
  documentContent?: string
  /** Async function that captures the current PDF page as a base64 data URL, or null if unavailable */
  capturePageImage?: () => Promise<string | null>
  onDismiss: () => void
}

/* ─── Flag config ──────────────────────────────────────────────────────────── */

const FLAG_CONFIG: Record<ContentFlag, {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  chipLabel: string
  gradient: string
  accentColor: string
  textColor: string
  borderColor: string
}> = {
  figure: {
    Icon: BarChart2,
    label: 'Figure',
    chipLabel: 'Figure detected — analyse it?',
    gradient: 'from-violet-500 to-purple-600',
    accentColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
  },
  table: {
    Icon: Table2,
    label: 'Table',
    chipLabel: 'Table detected — unpack it?',
    gradient: 'from-blue-500 to-indigo-600',
    accentColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  equation: {
    Icon: FunctionSquare,
    label: 'Equation',
    chipLabel: 'Equation detected — trace it?',
    gradient: 'from-amber-500 to-orange-500',
    accentColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  algorithm: {
    Icon: Cpu,
    label: 'Algorithm',
    chipLabel: 'Algorithm detected — dissect it?',
    gradient: 'from-emerald-500 to-teal-600',
    accentColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
}

/* ─── Structured result renderers ─────────────────────────────────────────── */

function FieldRow({
  icon,
  label,
  value,
  accent = 'bg-slate-50 border-slate-200',
  labelColor = 'text-slate-500',
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  accent?: string
  labelColor?: string
}) {
  if (!value) return null
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${accent}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${labelColor}`}>
        <div className="w-3 h-3 shrink-0">{icon}</div>
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-[12.5px] text-slate-800 leading-relaxed">{value}</p>
    </div>
  )
}

function AccordionRow({ label, items }: { label: string; items: Array<{ [k: string]: string }> }) {
  const [open, setOpen] = useState(false)
  if (!items || items.length === 0) return null
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <p className="text-[11px] font-semibold text-slate-600">{label} ({items.length})</p>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-100">
          {items.map((item, i) => (
            <div key={i} className="px-3 py-2.5 space-y-0.5">
              {Object.entries(item).map(([k, v]) => v ? (
                <div key={k}>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{k}: </span>
                  <span className="text-[12px] text-slate-700">{v}</span>
                </div>
              ) : null)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Depth-leveled result ────────────────────────────────────────────────── */

type DepthLevel = 1 | 2 | 3

const DEPTH_LABELS: Record<DepthLevel, { label: string; sub: string; color: string; active: string }> = {
  1: { label: 'Orient',      sub: 'What is this?',        color: 'text-slate-500 border-slate-200',              active: 'text-indigo-700 border-indigo-500 bg-indigo-50' },
  2: { label: 'Interrogate', sub: 'Does it hold up?',     color: 'text-slate-500 border-slate-200',              active: 'text-amber-700 border-amber-500 bg-amber-50'   },
  3: { label: 'Challenge',   sub: 'Where does it break?', color: 'text-slate-500 border-slate-200',              active: 'text-rose-700 border-rose-500 bg-rose-50'      },
}

function DepthLeveledResult({ type, data, hasImage }: { type: string; data: any; hasImage?: boolean }) {
  const [depth, setDepth] = useState<DepthLevel>(1)

  const LEVELS: Record<string, Record<DepthLevel, Array<{
    icon: React.ReactNode; label: string; field: string; accent: string; labelColor: string
  }>>> = {
    figure: {
      1: [
        { icon: <Eye className="w-3 h-3" />,         label: 'What it shows',       field: 'whatItShows',      accent: 'bg-violet-50 border-violet-100', labelColor: 'text-violet-700' },
        { icon: <Zap className="w-3 h-3" />,          label: 'What authors claim',  field: 'whatAuthorsClaim', accent: 'bg-indigo-50 border-indigo-100', labelColor: 'text-indigo-700' },
      ],
      2: [
        { icon: <Scale className="w-3 h-3" />,        label: 'Evidence sufficiency', field: 'evidenceSufficiency', accent: 'bg-amber-50 border-amber-100', labelColor: 'text-amber-700' },
        { icon: <Link2 className="w-3 h-3" />,        label: 'Cross-reference',      field: 'crossReference',      accent: 'bg-teal-50 border-teal-100',  labelColor: 'text-teal-700'  },
      ],
      3: [
        { icon: <FlaskConical className="w-3 h-3" />, label: 'Alternative read', field: 'alternativeInterpretation', accent: 'bg-rose-50 border-rose-100', labelColor: 'text-rose-700' },
      ],
    },
    table: {
      1: [
        { icon: <BookMarked className="w-3 h-3" />,   label: 'What it compares',   field: 'whatItCompares',  accent: 'bg-blue-50 border-blue-100',    labelColor: 'text-blue-700'   },
        { icon: <Zap className="w-3 h-3" />,          label: 'Headline result',    field: 'headlineResult',  accent: 'bg-indigo-50 border-indigo-100', labelColor: 'text-indigo-700' },
      ],
      2: [
        { icon: <Scale className="w-3 h-3" />,        label: 'Statistical read',   field: 'statisticalInterpretation', accent: 'bg-amber-50 border-amber-100', labelColor: 'text-amber-700' },
        { icon: <Link2 className="w-3 h-3" />,        label: 'Cross-reference',    field: 'crossReference',            accent: 'bg-teal-50 border-teal-100',  labelColor: 'text-teal-700'  },
      ],
      3: [
        { icon: <CheckCircle className="w-3 h-3" />,  label: 'Conclusion warranted?', field: 'conclusionWarranted', accent: 'bg-emerald-50 border-emerald-100', labelColor: 'text-emerald-700' },
        { icon: <FlaskConical className="w-3 h-3" />, label: 'Alternative read',      field: 'alternativeRead',     accent: 'bg-rose-50 border-rose-100',      labelColor: 'text-rose-700'    },
      ],
    },
    equation: {
      1: [
        { icon: <Zap className="w-3 h-3" />,          label: 'Role in argument',   field: 'role',             accent: 'bg-amber-50 border-amber-100',  labelColor: 'text-amber-700'  },
        { icon: <BookMarked className="w-3 h-3" />,   label: 'Paper-specific use', field: 'paperSpecificUse', accent: 'bg-indigo-50 border-indigo-100', labelColor: 'text-indigo-700' },
      ],
      2: [
        { icon: <Link2 className="w-3 h-3" />,        label: 'Connection to claim', field: 'connectionToMainClaim', accent: 'bg-violet-50 border-violet-100', labelColor: 'text-violet-700' },
        { icon: <Scale className="w-3 h-3" />,        label: 'Numerical intuition', field: 'numericalIntuition',    accent: 'bg-teal-50 border-teal-100',    labelColor: 'text-teal-700'   },
      ],
      3: [
        { icon: <AlertTriangle className="w-3 h-3" />, label: 'Reading pitfall', field: 'readingPitfall', accent: 'bg-rose-50 border-rose-100', labelColor: 'text-rose-700' },
      ],
    },
    algorithm: {
      1: [
        { icon: <Wrench className="w-3 h-3" />,       label: 'Input → Output',    field: 'inputOutputContract', accent: 'bg-emerald-50 border-emerald-100', labelColor: 'text-emerald-700' },
        { icon: <Zap className="w-3 h-3" />,          label: 'Key decision step', field: 'keyDecisionStep',     accent: 'bg-teal-50 border-teal-100',      labelColor: 'text-teal-700'    },
      ],
      2: [
        { icon: <BookMarked className="w-3 h-3" />,   label: 'Design rationale', field: 'designRationale',        accent: 'bg-indigo-50 border-indigo-100', labelColor: 'text-indigo-700' },
        { icon: <Link2 className="w-3 h-3" />,        label: 'Evaluation',       field: 'connectionToEvaluation', accent: 'bg-violet-50 border-violet-100', labelColor: 'text-violet-700' },
      ],
      3: [
        { icon: <AlertTriangle className="w-3 h-3" />, label: 'Unstated limitations', field: 'limitationsNotStated', accent: 'bg-rose-50 border-rose-100', labelColor: 'text-rose-700' },
      ],
    },
  }

  const contentLevels = LEVELS[type] || LEVELS.figure
  const fields = contentLevels[depth] || []

  return (
    <div className="space-y-2.5">
      {/* Vision fallback notice */}
      {type === 'figure' && !hasImage && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-[11px] text-amber-700">Page capture unavailable — analysis based on caption and text only</p>
        </div>
      )}

      {/* Equation type badge at orient level */}
      {type === 'equation' && depth === 1 && data.equationType && (
        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
          <FunctionSquare className="w-3 h-3" />
          {data.equationType}
        </div>
      )}

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
            <FieldRow
              key={f.field}
              icon={f.icon}
              label={f.label}
              value={data[f.field]}
              accent={f.accent}
              labelColor={f.labelColor}
            />
          ))}

          {/* Accordion extras at interrogate level for equation */}
          {type === 'equation' && depth === 2 && (
            <>
              {Array.isArray(data.symbolTable) && data.symbolTable.length > 0 && (
                <AccordionRow label="Symbol table" items={data.symbolTable.map((s: any) => ({
                  symbol: s.symbol, meaning: s.meaning, domain: s.domain
                }))} />
              )}
              {Array.isArray(data.assumptions) && data.assumptions.length > 0 && (
                <AccordionRow label="Assumptions" items={data.assumptions.map((a: any) => ({
                  assumption: a.assumption, 'if violated': a.ifViolated
                }))} />
              )}
            </>
          )}

          {/* Derivation steps at challenge level for equation */}
          {type === 'equation' && depth === 3 && Array.isArray(data.derivationSteps) && data.derivationSteps.length > 0 && (
            <AccordionRow label="Derivation steps" items={data.derivationSteps.map((s: string, i: number) => ({
              [`Step ${i + 1}`]: s
            }))} />
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

/* ─── Per-session cooldown ────────────────────────────────────────────────── */

const shownSections = new Set<string>()

export function shouldShowNudge(sectionId: string): boolean {
  return !shownSections.has(sectionId)
}

export function markNudgeShown(sectionId: string): void {
  shownSections.add(sectionId)
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function ContentDetectionNudge({
  sectionId,
  sectionName,
  sectionText,
  flags,
  documentTitle,
  documentContent,
  capturePageImage,
  onDismiss,
}: ContentDetectionNudgeProps) {
  const [stage, setStage] = useState<'chip' | 'loading' | 'panel'>('chip')
  const [activeFlag, setActiveFlag] = useState<ContentFlag>(flags[0])
  const [result, setResult] = useState<any>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<'vision' | 'text'>('text')
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleDismiss = useCallback((ms: number) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(onDismiss, ms)
  }, [onDismiss])

  useEffect(() => {
    scheduleDismiss(30_000)
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }
  }, [scheduleDismiss])

  const handleExpand = useCallback(async (flag: ContentFlag) => {
    setActiveFlag(flag)
    setStage('loading')
    if (dismissTimer.current) clearTimeout(dismissTimer.current)

    try {
      if (flag === 'figure' && capturePageImage) {
        // Try to capture the page as an image for vision analysis
        const imageData = await capturePageImage()

        if (imageData) {
          setCapturedImage(imageData)
          setAnalysisType('vision')

          const res = await fetch('/api/vision-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData,
              caption: sectionText.slice(0, 400),
              documentTitle,
              documentContent: documentContent?.slice(0, 4000),
              isDetailedMode: true,
              question: `This page is from §${sectionName}. Identify every figure on this page and for each: (1) what it depicts (axes, variables, conditions), (2) what the authors claim it shows, (3) whether the visual evidence is sufficient to support that claim, (4) any cross-references to other sections/tables.`,
            }),
          })

          if (res.ok) {
            const data = await res.json()
            const raw: string = data.response?.answer || ''
            // Parse the structured sections from the vision response
            const parsed = parseVisionResponse(raw)
            setResult(parsed)
            setStage('panel')
            return
          }
        }
      }

      // Text-based analysis for table/equation/algorithm, or figure fallback
      setAnalysisType('text')
      const res = await fetch('/api/content-explainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: flag,
          sectionText,
          sectionName,
          paperTitle: documentTitle,
          paperContent: documentContent?.slice(0, 3000),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        setResult({ error: 'Analysis failed' })
      }
    } catch {
      setResult({ error: 'Request failed — check connection.' })
    } finally {
      setStage('panel')
    }
  }, [capturePageImage, sectionText, sectionName, documentTitle, documentContent])

  // Switch between flags in the panel — re-fetch for the new type
  const handleFlagSwitch = useCallback((flag: ContentFlag) => {
    if (flag === activeFlag) return
    setResult(null)
    setActiveFlag(flag)
    handleExpand(flag)
  }, [activeFlag, handleExpand])

  const primaryFlag = flags[0]
  const primaryCfg = FLAG_CONFIG[primaryFlag]
  const PrimaryIcon = primaryCfg.Icon
  const activeCfg = FLAG_CONFIG[activeFlag]
  const ActiveIcon = activeCfg.Icon

  /* ── Chip ── */
  if (stage === 'chip') {
    return (
      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="fixed bottom-6 right-6 z-[190] flex items-center gap-2"
      >
        <motion.button
          onClick={() => handleExpand(primaryFlag)}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-white text-[13px] font-medium shadow-lg bg-gradient-to-r ${primaryCfg.gradient}`}
          style={{ boxShadow: '0 4px 18px rgba(0,0,0,0.18)', letterSpacing: '-0.01em' }}
        >
          <PrimaryIcon className="w-3.5 h-3.5 opacity-90 shrink-0" />
          <span>{primaryCfg.chipLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
        </motion.button>
        <motion.button
          onClick={onDismiss}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </motion.div>
    )
  }

  /* ── Panel (loading + result) ── */
  return (
    <motion.div
      initial={{ x: 110, opacity: 0, scale: 0.96 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 110, opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', damping: 26, stiffness: 290 }}
      className="fixed bottom-6 right-6 z-[190] w-[380px] max-h-[calc(100vh-5rem)] flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(28px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)',
        border: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${activeCfg.gradient} shrink-0`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <ActiveIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold text-white/60 uppercase tracking-widest leading-none mb-0.5">
              A6 · Content Analysis {analysisType === 'vision' ? '· Vision' : '· Text'}
            </p>
            <p className="text-[13px] font-semibold text-white leading-tight truncate">§{sectionName}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Flag tabs — if multiple types on this page */}
      {flags.length > 1 && (
        <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
          {flags.map(f => {
            const cfg = FLAG_CONFIG[f]
            const Icon = cfg.Icon
            return (
              <button
                key={f}
                onClick={() => handleFlagSwitch(f)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
                  activeFlag === f
                    ? `${cfg.textColor} border-b-2 border-current bg-white`
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cfg.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        <AnimatePresence mode="wait">
          {stage === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 gap-3"
            >
              <div className="relative">
                {activeFlag === 'figure' && capturePageImage && (
                  <ScanLine className="absolute inset-0 m-auto w-4 h-4 text-violet-500 animate-pulse" />
                )}
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <p className="text-[12px] text-slate-500 text-center">
                {activeFlag === 'figure' && capturePageImage
                  ? 'Capturing page and analysing with vision…'
                  : `Analysing ${activeCfg.label.toLowerCase()} in §${sectionName}…`}
              </p>
              <p className="text-[10.5px] text-slate-400">Grounded to paper text only</p>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 pb-2"
            >
              {result.error ? (
                <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-3 text-[12px] text-red-700">
                  {result.error}
                </div>
              ) : (
                <DepthLeveledResult
                  type={activeFlag}
                  data={result}
                  hasImage={analysisType === 'vision'}
                />
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">
          Grounded to §{sectionName} · {analysisType === 'vision' ? 'GPT-4o Vision' : 'text analysis'}
        </span>
        <button
          onClick={onDismiss}
          className="text-[11px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Parse vision response into structured fields ────────────────────────── */

function parseVisionResponse(raw: string): {
  whatItShows: string | null
  whatAuthorsClaim: string | null
  evidenceSufficiency: string | null
  crossReference: string | null
  alternativeInterpretation: string | null
} {
  // Vision API returns sections in the format:
  // WHAT IT SHOWS: ...
  // WHAT THE AUTHORS CLAIM: ...
  // CRITICAL READ: ...
  // CROSS-REFERENCE: ...
  const extract = (label: string): string | null => {
    const patterns = [
      new RegExp(`${label}[:\\s]+([^\\n]+(?:\\n(?![A-Z\\s]{4,}:)[^\\n]+)*)`, 'i'),
    ]
    for (const p of patterns) {
      const m = raw.match(p)
      if (m?.[1]) return m[1].replace(/\*\*/g, '').trim()
    }
    return null
  }

  return {
    whatItShows: extract('WHAT IT SHOWS'),
    whatAuthorsClaim: extract("WHAT THE AUTHORS CLAIM"),
    evidenceSufficiency: extract('CRITICAL READ'),
    crossReference: extract('CROSS-REFERENCE'),
    alternativeInterpretation: null,
  }
}
