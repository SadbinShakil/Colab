'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, Users, BookMarked, Wrench, AlertTriangle,
  MessageSquare, Send, ThumbsUp, ThumbsDown, Sparkles, Microscope,
  GitBranch, FileSearch
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

interface ImplicitHelpCardProps {
  trigger: ImplicitHelpTrigger | null
  onDismiss: () => void
  onHelpChosen: (type: 'explain' | 'example' | 'question', text: string) => void
  documentTitle?: string
  documentContent?: string
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
      className="fixed bottom-6 right-6 z-[200] w-9 h-9 rounded-full flex items-center justify-center"
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
      className="fixed bottom-6 right-6 z-[200] flex items-center gap-2"
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

// ─── Stage 3: Full Research Card ──────────────────────────────────────────────
function FullHelpCard({
  trigger,
  onDismiss,
  onHelpChosen,
  documentTitle,
  documentContent,
}: {
  trigger: ImplicitHelpTrigger
  onDismiss: () => void
  onHelpChosen: (type: 'explain' | 'example' | 'question', text: string) => void
  documentTitle?: string
  documentContent?: string
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
  const [isFetching, setIsFetching] = useState(false)
  const [questionInput, setQuestionInput] = useState('')
  const [showQuestion, setShowQuestion] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  const dismissTimer = useRef<NodeJS.Timeout | null>(null)

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

      // sectionText now contains page-labeled context: "[Page N]: ..."
      // Allow up to 2400 chars to include prev/current/next page content
      const sectionText = trigger.sectionText?.trim().length > 60
        ? clean(trigger.sectionText).slice(0, 2400)
        : null

      const fallbackContext = documentContent
        ? clean(documentContent).slice(0, 1200)
        : trigger.sectionName

      const context = sectionText ?? fallbackContext

      // Extract the densest claim from the section text for the quote block
      const extractClaim = (text: string): string | null => {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || []
        // Prefer sentences that contain numbers, equations, or technical density markers
        const dense = sentences.find(s => {
          const hasNumber = /\d/.test(s)
          const hasGreek = /[α-ωΑ-Ωτμσ]/.test(s)
          const hasFormula = /[=≥≤<>]/.test(s)
          const longEnough = s.trim().length > 40
          const letters = (s.match(/[a-zA-Z]/g) || []).length
          const letterRatio = letters / s.length
          return longEnough && letterRatio > 0.35 && (hasNumber || hasGreek || hasFormula)
        })
        // Fallback: longest sentence that reads like a claim
        const fallback = sentences
          .filter(s => s.trim().length > 50 && (s.match(/[a-zA-Z]/g) || []).length / s.length > 0.45)
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

    const clean = (t: string) =>
      t.replace(/\s+/g, ' ').replace(/(?:\b\d+\b\s*){4,}/g, ' ').trim()

    // Use the page-labeled context (prev/current/next page) for all action prompts
    const ctx = trigger.sectionText?.trim().length > 60
      ? clean(trigger.sectionText).slice(0, 2400)
      : documentContent
        ? clean(documentContent).slice(0, 1200)
        : trigger.sectionName

    const action = actions.find(a => a.id === actionId)

    // Append selected focus point as the specific anchor for this query
    const focusAnchor = selectedFocus
      ? `\n\nFOCUS: The researcher has selected "${selectedFocus.label}" (${selectedFocus.type}) as their specific point of interest: ${selectedFocus.description}\nAnchor your entire response to this specific element.`
      : ''

    // For custom questions: anchor the response to the current page.
    const fullDoc = documentContent?.trim() || ''
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

    if (!prompt) return

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
        let text: string = data.response?.answer || ''
        text = text.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').trim()
        setResponseText(text)
        // Response stays inside ImplicitHelpCard — do NOT call onHelpChosen here.
        // onHelpChosen is only used for peer routing (handled above).
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
      className="fixed bottom-6 right-6 z-[200] w-[348px] max-h-[calc(100vh-5rem)] flex flex-col"
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
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11.5px] text-slate-500 leading-snug"
                  >
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
            ) : isFetching || responseText ? (
              <motion.div
                key="response"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 relative">
                  <button
                    onClick={() => { setResponseText(null); setActiveAction(null); setIsFetching(false) }}
                    className="absolute top-2 right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="px-3 py-3 pr-7">
                    {isFetching ? (
                      <PulseSkeleton lines={3} />
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[12.5px] text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[180px] overflow-y-auto pr-1">
                          {responseText}
                        </p>
                        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100">
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
                                      payload: { rating: dir, action: activeAction, section: trigger.sectionName },
                                    }),
                                  })
                                }}
                                className={`p-1 rounded transition-colors ${
                                  feedback === dir
                                    ? dir === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {dir === 'up'
                                  ? <ThumbsUp className="w-3.5 h-3.5" />
                                  : <ThumbsDown className="w-3.5 h-3.5" />
                                }
                              </button>
                            ))}
                          </div>
                          {feedback && (
                            <span className="text-[10px] text-indigo-500 font-medium ml-auto">Logged</span>
                          )}
                        </div>
                      </div>
                    )}
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
        />
      )}
    </AnimatePresence>
  )
}
