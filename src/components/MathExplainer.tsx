'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  Calculator, 
  BookOpen, 
  Lightbulb, 
  X, 
  Copy, 
  Check,
  Variable,
  FunctionSquare,
  Zap,
  Brain,
  Target,
  AlertTriangle
} from 'lucide-react'

interface MathExplanation {
  overview: string
  breakdown: string
  variables: string
  operations: string
  context: string
  assumptions: string
  examples: string
}

interface MathExplainerProps {
  isOpen: boolean
  onClose: () => void
  equation?: string
  context?: string
  documentContent?: string
  position?: { x: number; y: number }
}

export default function MathExplainer({
  isOpen,
  onClose,
  equation = '',
  context = '',
  documentContent = '',
  position
}: MathExplainerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [explanation, setExplanation] = useState<MathExplanation | null>(null)
  const [rawExplanation, setRawExplanation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'variables' | 'operations' | 'context' | 'assumptions' | 'examples'>('overview')
  const [customQuestion, setCustomQuestion] = useState('')
  const [showCustomQuestion, setShowCustomQuestion] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && equation) {
      generateExplanation()
    }
  }, [isOpen, equation])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen, showCustomQuestion])

  const generateExplanation = async (customQ?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const payload = customQ ? {
        question: customQ,
        context,
        documentContent
      } : {
        equation,
        context,
        documentContent
      }

      const response = await fetch('/api/math-explainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        setExplanation(data.structured)
        setRawExplanation(data.explanation)
      } else {
        throw new Error(data.error || 'Failed to generate explanation')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation')
      console.error('Math explainer error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomQuestion = () => {
    if (customQuestion.trim()) {
      generateExplanation(customQuestion.trim())
      setShowCustomQuestion(false)
      setCustomQuestion('')
    }
  }

  // Auto-fetch explanation when component opens with an equation
  useEffect(() => {
    if (isOpen && equation && !explanation && !isLoading) {
      console.log('🚀 Auto-fetching explanation for:', equation)
      generateExplanation()
    }
  }, [isOpen, equation])

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(section)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'overview': return <BookOpen className="w-4 h-4" />
      case 'breakdown': return <Calculator className="w-4 h-4" />
      case 'variables': return <Variable className="w-4 h-4" />
      case 'operations': return <FunctionSquare className="w-4 h-4" />
      case 'context': return <Target className="w-4 h-4" />
      case 'assumptions': return <AlertTriangle className="w-4 h-4" />
      case 'examples': return <Lightbulb className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'overview': return 'Overview'
      case 'breakdown': return 'Step-by-Step'
      case 'variables': return 'Variables'
      case 'operations': return 'Operations'
      case 'context': return 'Context'
      case 'assumptions': return 'Assumptions'
      case 'examples': return 'Examples'
      default: return tab
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-7 h-7" />
              <CardTitle className="text-2xl font-bold">Advanced Math Explainer</CardTitle>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
                🤖 GPT-4 Powered
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {equation && (
            <div className="mt-4 p-4 bg-white/10 rounded-lg border border-white/20">
              <div className="text-sm opacity-90 mb-3 font-medium">📝 Selected Text to Explain:</div>
              <div className="font-mono text-lg bg-white/20 p-3 rounded border border-white/10 text-white font-bold">
                {equation}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* Custom Question Input */}
          {showCustomQuestion && (
            <div className="p-4 border-b bg-gray-50">
              <div className="flex space-x-2">
                <textarea
                  ref={textareaRef}
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Ask a specific question about the mathematical content..."
                  className="flex-1 p-2 border rounded-md resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleCustomQuestion()
                    }
                  }}
                />
                <Button onClick={handleCustomQuestion} disabled={!customQuestion.trim()}>
                  <Zap className="w-4 h-4 mr-2" />
                  Ask
                </Button>
                <Button variant="outline" onClick={() => setShowCustomQuestion(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCustomQuestion(!showCustomQuestion)}
                className="flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Ask Custom Question</span>
              </Button>
              
              {explanation && (
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(rawExplanation, 'full')}
                  className="flex items-center space-x-2"
                >
                  {copied === 'full' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>Copy Full Explanation</span>
                </Button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center bg-white">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">🧠 AI is analyzing...</h3>
              <p className="text-gray-700 text-lg mb-2">Generating advanced mathematical explanation</p>
              <p className="text-sm text-gray-600">This may take 20-30 seconds for complex equations</p>
              <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded inline-block">
                GPT-4 is breaking down the mathematical concepts step-by-step
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-12 text-center bg-white">
              <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-red-700 mb-3">❌ Explanation Failed</h3>
              <p className="text-red-600 mb-6 text-lg bg-red-50 p-3 rounded border border-red-200">{error}</p>
              <Button 
                onClick={() => generateExplanation()} 
                variant="outline"
                className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100 px-6 py-2"
              >
                🔄 Try Again
              </Button>
            </div>
          )}

          {/* Explanation Content */}
          {explanation && !isLoading && !error && (
            <div className="flex h-96 bg-white">
              {/* Tab Navigation */}
              <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                {Object.entries(explanation).map(([key, content]) => {
                  if (!content.trim()) return null
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`w-full p-3 text-left border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                        activeTab === key 
                          ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium' 
                          : 'text-gray-800 hover:text-blue-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {getTabIcon(key)}
                        <span className="text-sm font-medium">{getTabLabel(key)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-6 overflow-y-auto bg-white">
                <div className="max-w-none">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center space-x-2">
                      {getTabIcon(activeTab)}
                      <span>{getTabLabel(activeTab)}</span>
                    </h3>
                    <div className="flex justify-between items-center mb-4">
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {activeTab === 'overview' ? 'High-level understanding' :
                         activeTab === 'breakdown' ? 'Step-by-step analysis' :
                         activeTab === 'variables' ? 'Symbol definitions' :
                         activeTab === 'operations' ? 'Mathematical processes' :
                         activeTab === 'context' ? 'Research significance' :
                         activeTab === 'assumptions' ? 'Limitations & constraints' :
                         'Practical examples'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(explanation[activeTab], activeTab)}
                        className="h-8 px-3 hover:bg-blue-50"
                      >
                        {copied === activeTab ? (
                          <>
                            <Check className="w-4 h-4 mr-1 text-green-600" />
                            <span className="text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="prose prose-lg max-w-none">
                    <div className="whitespace-pre-wrap text-gray-900 leading-relaxed text-base font-normal bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                      {explanation[activeTab]}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 