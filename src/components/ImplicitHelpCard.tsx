'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, X, Lightbulb, BookOpen, MessageCircle, Zap, Send, ThumbsUp, ThumbsDown, Star } from 'lucide-react'

/**
 * IMPLICIT HELP CARD — Google-quality ambient assistance
 *
 * Design philosophy (as a Google Workspace engineer would build it):
 *
 * STAGE 0: Silent accumulation — score rising, user sees nothing
 * STAGE 1: Ambient pulse (score ~0.50) — subtle glowing dot, barely visible
 *           → Auto-dismisses if user scrolls away
 * STAGE 2: Suggestion chip (score ~0.65) — "Having trouble with X?" pill  
 *           → One-tap to expand, auto-fades in 15s if ignored
 * STAGE 3: Full AI card (score ~0.80 OR user taps chip)
 *           → LLM-generated insight about the SPECIFIC text
 *           → 3 targeted help options
 *           → Auto-fades in 30s, or when user scrolls past section
 *
 * Content behavior:
 * - The card quotes the actual sentence/paragraph you're stuck on
 * - The AI generates a 1-sentence diagnostic: "This section introduces [X],
 *   which typically confuses readers because [Y]."
 * - Then 3 options specific to that content
 */

export interface ImplicitHelpTrigger {
    sectionId: string
    sectionName: string
    sectionText: string       // The actual text the user is stuck on
    confidence: number        // 0.0 → 1.0
    contributingFactors: string[]
    stage: 1 | 2 | 3         // Which escalation stage to show
}

interface ImplicitHelpCardProps {
    trigger: ImplicitHelpTrigger | null
    onDismiss: () => void
    onHelpChosen: (type: 'explain' | 'example' | 'question', text: string) => void
    documentTitle?: string
    documentContent?: string
}

// ─── Stage 1: Ambient Pulse Dot ───────────────────────────────────────────────
function AmbientDot({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={onClick}
            className="fixed bottom-28 right-6 z-[200] w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
            style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.7)',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* Pulsing ring */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'rgba(102, 126, 234, 0.4)' }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Sparkles className="w-4 h-4 text-white relative z-10" />
        </motion.button>
    )
}

// ─── Stage 2: Suggestion Chip ─────────────────────────────────────────────────
function SuggestionChip({
    sectionName,
    onClick,
    onDismiss
}: {
    sectionName: string
    onClick: () => void
    onDismiss: () => void
}) {
    // Auto-dismiss after 15s
    useEffect(() => {
        const t = setTimeout(onDismiss, 15000)
        return () => clearTimeout(t)
    }, [onDismiss])

    const shortName = sectionName.length > 28 ? sectionName.slice(0, 28) + '…' : sectionName

    return (
        <motion.div
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed bottom-28 right-6 z-[200] flex items-center gap-2"
        >
            <motion.button
                onClick={onClick}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full text-white text-sm font-medium shadow-lg"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                    letterSpacing: '-0.01em'
                }}
            >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Need help with <strong>{shortName}</strong>?</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
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

// ─── Stage 3: Full AI Help Card ───────────────────────────────────────────────
function FullHelpCard({
    trigger,
    onDismiss,
    onHelpChosen,
    documentTitle,
    documentContent
}: {
    trigger: ImplicitHelpTrigger
    onDismiss: () => void
    onHelpChosen: (type: 'explain' | 'example' | 'question', text: string) => void
    documentTitle?: string
    documentContent?: string
}) {
    const [aiInsight, setAiInsight] = useState<string | null>(null)
    const [isLoadingInsight, setIsLoadingInsight] = useState(true)
    const [activeAction, setActiveAction] = useState<string | null>(null)
    const dismissTimer = useRef<NodeJS.Timeout | null>(null)

    // Inline interaction state
    const [inlineResponse, setInlineResponse] = useState<string | null>(null)
    const [isFetchingResponse, setIsFetchingResponse] = useState(false)
    const [showQuestionInput, setShowQuestionInput] = useState(false)
    const [questionText, setQuestionText] = useState('')

    // Personalization: Remember user's preferred implicit help type
    const [preferredAction, setPreferredAction] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

    // Load preferred action on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('google_implicit_help_pref')
            if (saved) setPreferredAction(saved)
        }
    }, [])

    // Smart Fading: auto-dismiss if the user scrolls away significantly
    useEffect(() => {
        let scrollCount = 0;
        const handleWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > 10) {
                scrollCount++
                if (scrollCount > 25) {
                    onDismiss()
                }
            }
        }
        window.addEventListener('wheel', handleWheel, { passive: true })
        return () => window.removeEventListener('wheel', handleWheel)
    }, [onDismiss])

    // Auto-dismiss after 60s if no interaction
    const resetDismissTimer = useCallback(() => {
        if (dismissTimer.current) clearTimeout(dismissTimer.current)
        dismissTimer.current = setTimeout(onDismiss, 60000)
    }, [onDismiss])

    useEffect(() => {
        resetDismissTimer()
        return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }
    }, [resetDismissTimer])

    // Load AI insight immediately when card appears
    useEffect(() => {
        const loadInsight = async () => {
            setIsLoadingInsight(true)
            try {
                // Use sectionText if available (the exact stared-at text), otherwise fall back to full document content
                const hasSubstantialText = trigger.sectionText && trigger.sectionText.trim().length > 40

                const cleanTextForAI = (text: string) => {
                    return text
                        .replace(/\s+/g, ' ')
                        .replace(/(?:\b\d+\b\s*){4,}/g, ' ') // Strip sequences of isolated line numbers (1 2 3 4)
                        .trim()
                }

                const contextContent = hasSubstantialText
                    ? cleanTextForAI(trigger.sectionText).slice(0, 800)
                    : documentContent && documentContent.trim().length > 100
                        ? cleanTextForAI(documentContent).slice(0, 800)
                        : trigger.sectionName

                const aiReferenceContent = hasSubstantialText || !documentContent
                    ? contextContent
                    : cleanTextForAI(documentContent).slice(0, 5000)

                const prompt = hasSubstantialText
                    ? `I've been reading this specific passage for a while and seem to be stuck. In 1-2 short sentences, identify the single most likely concept causing confusion and why it's typically hard. Be specific — quote a term from the text.\n\nSection: "${trigger.sectionName}"\nText I'm reading: "${contextContent}"`
                    : `I've been spending a long time on this section. Based on the document content below, in 1-2 sentences identify what concept in this section is most likely to confuse a reader and why. Be specific.\n\nSection: "${trigger.sectionName}"\nDocument content: "${aiReferenceContent.slice(0, 600)}"`

                const response = await fetch('/api/ai-help', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: prompt,
                        documentContent: aiReferenceContent,
                        documentTitle: documentTitle || 'Academic Paper',
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    let insight = data.response?.answer || ''
                    // Clean up any markdown headers the LLM might produce
                    insight = insight.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').trim()
                    // Take just the first 2 sentences
                    const sentences = insight.match(/[^.!?]+[.!?]+/g) || [insight]
                    setAiInsight(sentences.slice(0, 2).join(' ').trim())
                } else {
                    setAiInsight(`This section appears to require careful attention. The concepts here build on each other, so it helps to identify the first term that feels unfamiliar.`)
                }
            } catch {
                setAiInsight(`This section appears to require careful attention. Try identifying the first unfamiliar term and working from there.`)
            } finally {
                setIsLoadingInsight(false)
            }
        }
        loadInsight()
    }, [trigger.sectionId])

    // Get a relevant quote from the section text (first meaningful sentence)
    const getQuote = () => {
        const source = trigger.sectionText?.trim().length > 40 ? trigger.sectionText : (documentContent || '')
        if (!source) return null

        const clean = source
            .replace(/\s+/g, ' ')
            .replace(/(?:\b\d+\b\s*){4,}/g, ' ') // Strip isolated line numbers
            .replace(/^[^a-zA-Z]+/, '') // Strip leading non-alphabetic chars
            .trim()

        const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean] // Fallback to entire text if no punct

        // Find first sentence that's 20+ chars and has a good ratio of letters
        const meaningful = sentences.find(s => {
            const letters = (s.match(/[a-zA-Z]/g) || []).length
            return s.length > 20 && letters > s.length * 0.4 // Must be at least 40% letters
        })

        return meaningful ? meaningful.trim().slice(0, 120) + (meaningful.length > 120 ? '…' : '') : null
    }

    const quote = getQuote()

    const helpOptions = [
        {
            id: 'explain',
            icon: <Lightbulb className="w-3.5 h-3.5" />,
            label: 'Explain simply',
            description: 'Plain English breakdown',
            color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100'
        },
        {
            id: 'example',
            icon: <BookOpen className="w-3.5 h-3.5" />,
            label: 'Show an example',
            description: 'Real-world analogy',
            color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100'
        },
        {
            id: 'question',
            icon: <MessageCircle className="w-3.5 h-3.5" />,
            label: 'Let me ask',
            description: 'Open a conversation',
            color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100'
        },
    ]

    // ─── Inline Fetch Logic ──────────────────────────────────────────
    const handleActionClick = async (actionId: string, customQuery?: string) => {
        setActiveAction(actionId)
        resetDismissTimer()
        setFeedback(null) // reset feedback state for new query

        if (typeof window !== 'undefined' && actionId !== 'question') {
            localStorage.setItem('google_implicit_help_pref', actionId)
            setPreferredAction(actionId)
        }

        // If question mode, just show input and wait for user to submit
        if (actionId === 'question' && !customQuery) {
            setShowQuestionInput(true)
            setInlineResponse(null)
            return
        }

        setShowQuestionInput(false)
        setIsFetchingResponse(true)
        setInlineResponse(null)

        const cleanTextForAI = (text: string) => {
            return text.replace(/\s+/g, ' ').replace(/(?:\b\d+\b\s*){4,}/g, ' ').trim()
        }

        const hasSubstantialText = trigger.sectionText && trigger.sectionText.trim().length > 40
        const contextContent = hasSubstantialText
            ? cleanTextForAI(trigger.sectionText).slice(0, 800)
            : documentContent
                ? cleanTextForAI(documentContent).slice(0, 800)
                : trigger.sectionName

        let prompt = ''
        if (actionId === 'explain') {
            prompt = `Explain this concept from the paper as simply as possible, as if to a fellow student. Avoid jargon. Keep it to 2-3 short, clear sentences:\n\n"${contextContent}"`
        } else if (actionId === 'example') {
            prompt = `Give me one extremely clear, real-world example or analogy to help me understand this concept from the academic paper. Keep it to 2-3 sentences:\n\n"${contextContent}"`
        } else {
            prompt = `Answer this specific question: "${customQuery}" based strictly on this academic text:\n\n"${contextContent}"`
        }

        try {
            const response = await fetch('/api/ai-help', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: prompt,
                    documentContent: documentContent?.slice(0, 4000) || contextContent,
                    documentTitle: documentTitle || 'Academic Paper',
                })
            })

            if (response.ok) {
                const data = await response.json()
                let insight = data.response?.answer || ''
                insight = insight.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').trim()
                setInlineResponse(insight)
            } else {
                setInlineResponse("I couldn't generate an answer right now. Please try again.")
            }
        } catch {
            setInlineResponse("I couldn't generate an answer right now. Please try again.")
        } finally {
            setIsFetchingResponse(false)
        }
    }

    return (
        <motion.div
            initial={{ x: 100, opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 100, opacity: 0, scale: 0.93 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="fixed bottom-20 right-5 z-[200] w-[340px]"
            onMouseEnter={resetDismissTimer}
        >
            {/* Card */}
            <div
                className="rounded-3xl overflow-hidden"
                style={{
                    background: 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(24px)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.06)'
                }}
            >
                {/* Header gradient strip */}
                <div
                    className="px-4 pt-4 pb-3"
                    style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%)' }}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            {/* Icon */}
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                            >
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-indigo-600 leading-tight tracking-wide uppercase" style={{ letterSpacing: '0.06em' }}>
                                    Reading Assistant
                                </p>
                                <p className="text-[13px] font-semibold text-gray-900 leading-tight mt-0.5">
                                    {trigger.sectionName.length > 32
                                        ? trigger.sectionName.slice(0, 32) + '…'
                                        : trigger.sectionName}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onDismiss}
                            className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors shrink-0 mt-0.5"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="px-4 pb-4 space-y-3">
                    {/* Quoted text from the section */}
                    {quote && (
                        <div
                            className="rounded-xl px-3 py-2.5 border-l-2"
                            style={{
                                background: 'rgba(102,126,234,0.04)',
                                borderLeftColor: '#667eea'
                            }}
                        >
                            <p className="text-[12px] text-gray-500 italic leading-relaxed">
                                "{quote}"
                            </p>
                        </div>
                    )}

                    {/* AI diagnostic insight */}
                    <div className="min-h-[44px]">
                        <AnimatePresence mode="wait">
                            {isLoadingInsight ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2 py-1"
                                >
                                    {/* Animated loading dots */}
                                    <div className="flex gap-1">
                                        {[0, 0.15, 0.3].map((delay, i) => (
                                            <motion.div
                                                key={i}
                                                className="w-1.5 h-1.5 rounded-full bg-indigo-300"
                                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                                transition={{ duration: 1.2, repeat: Infinity, delay }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-400">Analyzing section…</span>
                                </motion.div>
                            ) : (
                                <motion.p
                                    key="insight"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[13px] text-gray-700 leading-relaxed"
                                >
                                    {aiInsight}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Inline Content Replacement */}
                    <AnimatePresence mode="popLayout">
                        {showQuestionInput ? (
                            <motion.div
                                key="question-input"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-2"
                            >
                                <div className="flex bg-white rounded-xl border p-1 shadow-sm">
                                    <input
                                        type="text"
                                        placeholder="Ask about this section..."
                                        className="flex-1 bg-transparent border-none text-[13px] px-3 outline-none text-gray-800 placeholder-gray-400"
                                        autoFocus
                                        value={questionText}
                                        onChange={(e) => setQuestionText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && questionText.trim()) {
                                                handleActionClick('question', questionText.trim())
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => questionText.trim() && handleActionClick('question', questionText.trim())}
                                        className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                        disabled={!questionText.trim()}
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </motion.div>
                        ) : isFetchingResponse || inlineResponse ? (
                            <motion.div
                                key="response"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="pt-2"
                            >
                                <div className="rounded-xl px-3 py-3 bg-white border border-gray-100 shadow-sm relative">
                                    <button
                                        onClick={() => {
                                            setInlineResponse(null);
                                            setActiveAction(null);
                                            setIsFetchingResponse(false);
                                            setShowQuestionInput(false);
                                        }}
                                        className="absolute top-2 right-2 p-0.5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                    {isFetchingResponse ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                {[0, 0.15, 0.3].map((delay, i) => (
                                                    <motion.div
                                                        key={i}
                                                        className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                                                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                                        transition={{ duration: 1.2, repeat: Infinity, delay }}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-indigo-500 font-medium tracking-wide">Thinking...</span>
                                        </div>
                                    ) : (
                                        <div className="mt-1 pr-2 max-h-[160px] overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                                            <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap mr-1 mb-3">{inlineResponse}</p>

                                            {/* Micro-Feedback Loop (Google Style) */}
                                            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
                                                <span className="text-[10px] text-gray-400 font-medium">Did this help?</span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setFeedback('up')
                                                            fetch('/api/telemetry', {
                                                                method: 'POST',
                                                                body: JSON.stringify({
                                                                    type: 'ai_feedback',
                                                                    payload: { rating: 'up', action: activeAction, section: trigger.sectionName, text: quote }
                                                                })
                                                            })
                                                        }}
                                                        className={`p-1 rounded-md hover:bg-green-50 transition-colors ${feedback === 'up' ? 'text-green-600 bg-green-50' : 'text-gray-400'}`}
                                                        title="Good response"
                                                    >
                                                        <ThumbsUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setFeedback('down')
                                                            fetch('/api/telemetry', {
                                                                method: 'POST',
                                                                body: JSON.stringify({
                                                                    type: 'ai_feedback',
                                                                    payload: { rating: 'down', action: activeAction, section: trigger.sectionName, text: quote }
                                                                })
                                                            })
                                                        }}
                                                        className={`p-1 rounded-md hover:bg-red-50 transition-colors ${feedback === 'down' ? 'text-red-600 bg-red-50' : 'text-gray-400'}`}
                                                        title="Confusing"
                                                    >
                                                        <ThumbsDown className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                {feedback && (
                                                    <span className="text-[10px] text-indigo-500 font-medium ml-auto">Thanks for your feedback!</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="options"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-3 gap-1.5 pt-1"
                            >
                                {helpOptions.map((option) => (
                                    <motion.button
                                        key={option.id}
                                        whileHover={{ scale: 1.03, y: -1 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => handleActionClick(option.id)}
                                        className={`relative flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-2xl border text-center transition-all ${option.color} ${activeAction === option.id ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                                    >
                                        {preferredAction === option.id && (
                                            <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white p-0.5 rounded-full shadow-sm" title="Your preferred action">
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                            </div>
                                        )}
                                        <div className="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center">
                                            {option.icon}
                                        </div>
                                        <span className="text-[11px] font-semibold leading-tight">{option.label}</span>
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Confidence indicator — subtle, not in your face */}
                    <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <p className="text-[11px] text-gray-400">
                                {trigger.contributingFactors.slice(0, 2).join(' · ')}
                            </p>
                        </div>
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 h-3 rounded-full"
                                    style={{
                                        background: i < Math.round(trigger.confidence * 5)
                                            ? `linear-gradient(to top, #667eea, #764ba2)`
                                            : '#e5e7eb'
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

// ─── Main Export: Orchestrates the 3-stage system ─────────────────────────────
export default function ImplicitHelpCard({
    trigger,
    onDismiss,
    onHelpChosen,
    documentTitle,
    documentContent
}: ImplicitHelpCardProps) {
    const [currentStage, setCurrentStage] = useState<0 | 1 | 2 | 3>(0)
    const prevTrigger = useRef<string | null>(null)

    useEffect(() => {
        if (!trigger) {
            setCurrentStage(0)
            return
        }

        // If this is a new section trigger, reset
        if (prevTrigger.current !== trigger.sectionId) {
            prevTrigger.current = trigger.sectionId
            setCurrentStage(trigger.stage)
        } else {
            // Escalate if same section, higher confidence
            setCurrentStage(prev => Math.max(prev, trigger.stage) as 0 | 1 | 2 | 3)
        }
    }, [trigger])

    const handleDismiss = () => {
        setCurrentStage(0)
        onDismiss()
    }

    return (
        <AnimatePresence mode="wait">
            {currentStage === 1 && trigger && (
                <AmbientDot key="dot" onClick={() => setCurrentStage(2)} />
            )}
            {currentStage === 2 && trigger && (
                <SuggestionChip
                    key="chip"
                    sectionName={trigger.sectionName}
                    onClick={() => setCurrentStage(3)}
                    onDismiss={handleDismiss}
                />
            )}
            {currentStage === 3 && trigger && (
                <FullHelpCard
                    key="card"
                    trigger={trigger}
                    onDismiss={handleDismiss}
                    onHelpChosen={onHelpChosen}
                    documentTitle={documentTitle}
                    documentContent={documentContent}
                />
            )}
        </AnimatePresence>
    )
}
