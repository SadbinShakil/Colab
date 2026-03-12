'use client'

import { useState, useCallback } from 'react'
import { Brain, CheckCircle, XCircle, ChevronRight, RotateCcw, Loader2, Lightbulb, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ComprehensionQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
}

interface ComprehensionCheckProps {
  sectionName: string
  sectionContent: string
  documentTitle?: string
  onClose?: () => void
}

const DIFFICULTY_COLORS = {
  basic: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700'
}

export default function ComprehensionCheck({
  sectionName,
  sectionContent,
  documentTitle,
  onClose
}: ComprehensionCheckProps) {
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'idle' | 'quiz' | 'done'>('idle')

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/comprehension-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionName, sectionContent, documentTitle, count: 3 })
      })
      if (!res.ok) throw new Error('Failed to generate questions')
      const data = await res.json()
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
  }, [sectionName, sectionContent, documentTitle])

  const handleSelect = (idx: number) => {
    if (selectedOption !== null) return
    setSelectedOption(idx)
    setShowExplanation(true)
    const q = questions[currentIdx]
    setAnswers(prev => [...prev, { questionId: q.id, correct: idx === q.correctIndex }])
  }

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setPhase('done')
    } else {
      setCurrentIdx(prev => prev + 1)
      setSelectedOption(null)
      setShowExplanation(false)
    }
  }

  const handleRetry = () => {
    setPhase('idle')
    setQuestions([])
    setAnswers([])
  }

  const score = answers.filter(a => a.correct).length

  if (phase === 'idle') {
    return (
      <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Comprehension Check</div>
              <div className="text-[11px] text-gray-500">{sectionName}</div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Test your understanding of this section with 3 AI-generated questions.
          </p>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={fetchQuestions}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating questions…</>
            ) : (
              <><Brain className="w-4 h-4" />Start Quiz</>
            )}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="px-4 py-5 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${pct >= 67 ? 'bg-green-100' : 'bg-amber-100'}`}>
            <span className="text-2xl font-bold">{pct >= 67 ? '🎯' : '📚'}</span>
          </div>
          <div className="text-lg font-bold text-gray-900 mb-1">
            {score} / {questions.length} correct
          </div>
          <div className={`text-sm font-medium mb-4 ${pct >= 67 ? 'text-green-600' : 'text-amber-600'}`}>
            {pct >= 67 ? 'Great understanding!' : 'Review the section for deeper comprehension.'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Try again
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Continue reading
              </button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  const q = questions[currentIdx]

  return (
    <motion.div
      key={q.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">
            Question {currentIdx + 1} of {questions.length}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[q.difficulty]}`}>
            {q.difficulty}
          </span>
        </div>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`w-6 h-1.5 rounded-full transition-colors ${
              i < currentIdx ? 'bg-indigo-500' : i === currentIdx ? 'bg-indigo-300' : 'bg-gray-200'
            }`} />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="p-4">
        <p className="text-sm font-medium text-gray-900 mb-4 leading-snug">{q.question}</p>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((option, i) => {
            const isSelected = selectedOption === i
            const isCorrect = i === q.correctIndex
            const showResult = selectedOption !== null

            let cls = 'border border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
            if (showResult) {
              if (isCorrect) cls = 'border-green-400 bg-green-50 text-green-800'
              else if (isSelected && !isCorrect) cls = 'border-red-300 bg-red-50 text-red-700'
              else cls = 'border-gray-100 bg-gray-50 text-gray-400'
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selectedOption !== null}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${cls}`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  showResult && isCorrect ? 'border-green-500 bg-green-500 text-white' :
                  showResult && isSelected ? 'border-red-400 bg-red-400 text-white' :
                  'border-current'
                }`}>
                  {showResult && isCorrect ? '✓' : showResult && isSelected ? '✕' : String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-indigo-800 leading-relaxed">{q.explanation}</p>
                </div>
              </div>
              <button
                onClick={handleNext}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
