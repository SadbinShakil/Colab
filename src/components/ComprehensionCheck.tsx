'use client'

import { useState, useCallback } from 'react'
import { Brain, CheckCircle, XCircle, ChevronRight, RotateCcw, Loader2, Lightbulb, PenLine, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ComprehensionQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
  scope: 'section' | 'paper'
}

interface ReasoningEvaluation {
  score: 'strong' | 'partial' | 'weak'
  feedback: string
  keyIssue: string
  missing?: string
}

interface ComprehensionCheckProps {
  sectionName: string
  sectionContent: string
  documentTitle?: string
  fullDocumentText?: string
  onClose?: () => void
}

const DIFFICULTY_COLORS = {
  basic: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  intermediate: 'bg-amber-50 text-amber-700 border border-amber-200',
  advanced: 'bg-red-50 text-red-700 border border-red-200',
}

const SCORE_CONFIG = {
  strong: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Strong reasoning' },
  partial: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Partially correct' },
  weak: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Needs revision' },
}

type TestMode = 'section' | 'paper'
type InputMode = 'mcq' | 'freetext'

export default function ComprehensionCheck({
  sectionName,
  sectionContent,
  documentTitle,
  fullDocumentText,
  onClose,
}: ComprehensionCheckProps) {
  const [testMode, setTestMode] = useState<TestMode>('section')
  const [inputMode, setInputMode] = useState<InputMode>('mcq')

  // MCQ state
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean }[]>([])

  // Free-text state
  const [ftQuestion, setFtQuestion] = useState('')
  const [ftAnswer, setFtAnswer] = useState('')
  const [ftEval, setFtEval] = useState<ReasoningEvaluation | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'idle' | 'quiz' | 'done' | 'freetext' | 'ftdone'>('idle')

  // ── Fetch MCQ questions ───────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/comprehension-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: testMode,
          sectionName,
          sectionContent,
          documentTitle,
          fullDocumentText: testMode === 'paper' ? fullDocumentText : undefined,
          count: 5,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions')
      if (!data.questions?.length) throw new Error('No questions returned')
      setQuestions(data.questions)
      setCurrentIdx(0)
      setSelectedOption(null)
      setShowExplanation(false)
      setAnswers([])
      setPhase('quiz')
    } catch (e: any) {
      setError(e.message || 'Failed to generate questions')
    } finally {
      setIsLoading(false)
    }
  }, [testMode, sectionName, sectionContent, documentTitle, fullDocumentText])

  // ── Evaluate free-text answer ─────────────────────────────────────────────
  const evaluateAnswer = useCallback(async () => {
    if (!ftQuestion.trim() || !ftAnswer.trim()) return
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/comprehension-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'evaluate',
          questionText: ftQuestion,
          userAnswer: ftAnswer,
          sectionContent,
          fullDocumentText,
          documentTitle,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Evaluation failed')
      setFtEval(data.evaluation)
      setPhase('ftdone')
    } catch (e: any) {
      setError(e.message || 'Evaluation failed')
    } finally {
      setIsLoading(false)
    }
  }, [ftQuestion, ftAnswer, sectionContent, fullDocumentText, documentTitle])

  const handleSelect = (idx: number) => {
    if (selectedOption !== null) return
    setSelectedOption(idx)
    setShowExplanation(true)
    const q = questions[currentIdx]
    setAnswers(prev => [...prev, { questionId: q.id, correct: idx === q.correctIndex }])
  }

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) setPhase('done')
    else { setCurrentIdx(p => p + 1); setSelectedOption(null); setShowExplanation(false) }
  }

  const handleReset = () => {
    setPhase('idle'); setQuestions([]); setAnswers([])
    setFtQuestion(''); setFtAnswer(''); setFtEval(null); setError('')
  }

  const score = answers.filter(a => a.correct).length

  // ── Idle / mode selection ─────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-indigo-900">Self-Test</p>
            <p className="text-[10px] text-indigo-500">{sectionName}</p>
          </div>
        </div>

        <div className="p-3 space-y-3">
          {/* Scope */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Scope</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([['section', 'This section', BookOpen], ['paper', 'Whole paper', Brain]] as const).map(([val, label, Icon]) => (
                <button
                  key={val}
                  onClick={() => setTestMode(val)}
                  disabled={val === 'paper' && !fullDocumentText}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] font-medium transition-all ${
                    testMode === val
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : val === 'paper' && !fullDocumentText
                        ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            {testMode === 'paper' && (
              <p className="text-[10px] text-indigo-500 mt-1">Questions span the whole paper — tests synthesis, not recall</p>
            )}
          </div>

          {/* Input mode */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Format</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([['mcq', 'Multiple choice', CheckCircle], ['freetext', 'Write & evaluate', PenLine]] as const).map(([val, label, Icon]) => (
                <button
                  key={val}
                  onClick={() => setInputMode(val)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] font-medium transition-all ${
                    inputMode === val
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            {inputMode === 'freetext' && (
              <p className="text-[10px] text-slate-400 mt-1">Write your own question and answer — GPT-4o evaluates your reasoning</p>
            )}
          </div>

          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}

          {inputMode === 'mcq' ? (
            <button
              onClick={fetchQuestions}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-[12px] font-semibold rounded-xl transition-colors"
            >
              {isLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</> : <><Brain className="w-3.5 h-3.5" />Start — 5 questions</>}
            </button>
          ) : (
            <button
              onClick={() => setPhase('freetext')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-xl transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" />Write a question
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Free-text input ───────────────────────────────────────────────────────
  if (phase === 'freetext') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-indigo-900">Write & Evaluate</p>
          <button onClick={handleReset} className="text-[10px] text-indigo-400 hover:text-indigo-600">← Back</button>
        </div>
        <div className="p-3 space-y-2.5">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Your question</p>
            <textarea
              value={ftQuestion}
              onChange={e => setFtQuestion(e.target.value)}
              placeholder="e.g. Why do the authors choose τ=0.72 as the notification threshold? Is this empirically justified?"
              className="w-full h-20 text-[12px] text-slate-800 placeholder:text-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Your answer</p>
            <textarea
              value={ftAnswer}
              onChange={e => setFtAnswer(e.target.value)}
              placeholder="Write your reasoning — cite specific claims, evidence, or sections from the paper."
              className="w-full h-28 text-[12px] text-slate-800 placeholder:text-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          {error && <p className="text-[11px] text-red-600">{error}</p>}
          <button
            onClick={evaluateAnswer}
            disabled={isLoading || !ftQuestion.trim() || !ftAnswer.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-xl transition-colors"
          >
            {isLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Evaluating…</> : <><Brain className="w-3.5 h-3.5" />Evaluate my reasoning</>}
          </button>
        </div>
      </div>
    )
  }

  // ── Free-text evaluation result ───────────────────────────────────────────
  if (phase === 'ftdone' && ftEval) {
    const cfg = SCORE_CONFIG[ftEval.score]
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
          <p className="text-[12px] font-semibold text-indigo-900">Reasoning Evaluation</p>
        </div>
        <div className="p-3 space-y-3">
          <div className={`rounded-xl border px-3 py-2.5 ${cfg.bg}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${cfg.color}`}>{cfg.label}</p>
            <p className="text-[12px] text-slate-700 leading-relaxed">{ftEval.feedback}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Key issue</p>
            <p className="text-[12px] text-slate-700 leading-relaxed">{ftEval.keyIssue}</p>
          </div>
          {ftEval.missing && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">What a strong answer would address</p>
              <p className="text-[12px] text-amber-800 leading-relaxed">{ftEval.missing}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setPhase('freetext'); setFtEval(null) }} className="flex-1 py-2 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 hover:bg-slate-50">
              Revise answer
            </button>
            <button onClick={handleReset} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-semibold hover:bg-indigo-700">
              New question
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const pct = Math.round((score / questions.length) * 100)
    const hasPaperQ = questions.some(q => q.scope === 'paper')
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-5 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${pct >= 80 ? 'bg-emerald-100' : pct >= 60 ? 'bg-amber-100' : 'bg-red-50'}`}>
            <span className="text-2xl">{pct >= 80 ? '🎯' : pct >= 60 ? '📖' : '🔍'}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 mb-0.5">{score} / {questions.length} correct</p>
          <p className={`text-[12px] font-medium mb-1 ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
            {pct >= 80 ? 'Strong comprehension' : pct >= 60 ? 'Partial understanding — review flagged sections' : 'Re-read carefully before the session'}
          </p>
          {hasPaperQ && <p className="text-[10px] text-slate-400 mb-4">Includes paper-level synthesis questions</p>}
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 hover:bg-slate-50">
              <RotateCcw className="w-3 h-3" />Try again
            </button>
            {onClose && (
              <button onClick={onClose}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-semibold">
                Continue reading
              </button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // ── MCQ Quiz ──────────────────────────────────────────────────────────────
  const q = questions[currentIdx]
  return (
    <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">Q{currentIdx + 1}/{questions.length}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[q.difficulty]}`}>{q.difficulty}</span>
          {q.scope === 'paper' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">synthesis</span>}
        </div>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`w-5 h-1 rounded-full transition-colors ${i < currentIdx ? 'bg-indigo-500' : i === currentIdx ? 'bg-indigo-300' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="p-3">
        <p className="text-[13px] font-medium text-slate-900 mb-3 leading-snug">{q.question}</p>
        <div className="space-y-1.5">
          {q.options.map((option, i) => {
            const isSelected = selectedOption === i
            const isCorrect = i === q.correctIndex
            const showResult = selectedOption !== null
            let cls = 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
            if (showResult) {
              if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800'
              else if (isSelected) cls = 'border-red-300 bg-red-50 text-red-700'
              else cls = 'border-slate-100 bg-slate-50 text-slate-400'
            }
            return (
              <button key={i} onClick={() => handleSelect(i)} disabled={selectedOption !== null}
                className={`w-full text-left px-3 py-2 rounded-xl text-[12px] border transition-all flex items-center gap-2.5 ${cls}`}>
                <span className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center text-[9px] font-bold ${
                  showResult && isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                  showResult && isSelected ? 'border-red-400 bg-red-400 text-white' : 'border-current'
                }`}>
                  {showResult && isCorrect ? '✓' : showResult && isSelected ? '✕' : String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            )
          })}
        </div>

        <AnimatePresence>
          {showExplanation && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-indigo-800 leading-relaxed">{q.explanation}</p>
              </div>
              <button onClick={handleNext}
                className="mt-2.5 w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-xl transition-colors">
                {currentIdx + 1 >= questions.length ? 'See Results' : 'Next'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
