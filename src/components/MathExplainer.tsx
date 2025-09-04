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
      <Card className="w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Calculator className="w-8 h-8" />
                <Zap className="w-4 h-4 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Smart Math AI Analyzer</CardTitle>
                <div className="text-blue-100 text-sm">Mathematical Analysis • Step-by-Step Solutions • Contextual Understanding</div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
                Advanced Math AI
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
          
          {/* Smart Controls */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Mode:</span>
              <Badge variant="outline" className="bg-white/10 border-white/20 text-white px-3 py-1 text-xs">
                <BookOpen className="w-3 h-3 mr-1" />
                Educational
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">AI Model:</span>
              <Badge variant="outline" className="bg-white/10 border-white/20 text-white px-2 py-1 text-xs">
                GPT-4 Math
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex overflow-hidden">
          {/* Left Panel - Context & Controls */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col overflow-y-auto">
            {equation && (
              <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                  <FunctionSquare className="w-4 h-4" />
                  <span>Equation to Analyze:</span>
                </div>
                <div className="font-mono text-sm bg-white p-3 rounded border border-gray-200 text-gray-800 max-h-32 overflow-y-auto">
                  {equation}
                </div>
              </div>
            )}

            {context && (
              <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 mt-4">
                <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Mathematical Context:</span>
                </div>
                <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed">
                  {context}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="p-4 border-b bg-gradient-to-br from-blue-50 to-indigo-50 mt-4">
              <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>Quick Actions</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomQuestion(!showCustomQuestion)}
                  className="text-xs h-8 bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Custom Q
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateExplanation()}
                  className="text-xs h-8 bg-white hover:bg-green-50 border-green-200 text-green-700"
                >
                  <Calculator className="w-3 h-3 mr-1" />
                  Re-analyze
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(rawExplanation, 'full')}
                  className="text-xs h-8 bg-white hover:bg-purple-50 border-purple-200 text-purple-700"
                >
                  {copied === 'full' ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  Copy All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(explanation, null, 2), 'structured')}
                  className="text-xs h-8 bg-white hover:bg-orange-50 border-orange-200 text-orange-700"
                >
                  {copied === 'structured' ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  Copy JSON
                </Button>
              </div>
            </div>

            {/* AI Status */}
            <div className="p-4 border-b bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span>AI Status</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Current Mode:</span>
                  <Badge className="bg-purple-100 text-purple-800 px-2 py-1">
                    Educational
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">AI Model:</span>
                  <Badge variant="outline" className="bg-white text-gray-700 px-2 py-1">
                    GPT-4 Math
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Analysis Type:</span>
                  <Badge className="bg-blue-100 text-blue-800 px-2 py-1">
                    Structured
                  </Badge>
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            {explanation && (
              <div className="p-4 border-b bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                  <span>Analysis Summary</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(explanation).map(([key, content]) => {
                    if (!content) return null
                    return (
                      <div key={key} className="text-xs bg-white p-2 rounded border border-green-200 text-green-700">
                        {getTabIcon(key)} {getTabLabel(key)}: Available
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!explanation && !isLoading && !error && (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center p-4">
                  <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Ready to Analyze</h3>
                  <p className="text-xs text-gray-500 mb-3">Select mathematical content and get step-by-step explanations</p>
                  <div className="flex justify-center space-x-2">
                    <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-xs">
                      Educational Mode
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-800 px-3 py-1 text-xs">
                      GPT-4 Math
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Analysis Content */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-white">
            {/* Custom Question Input */}
            {showCustomQuestion && (
              <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex space-x-2">
                  <textarea
                    ref={textareaRef}
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Ask a specific question about the mathematical content..."
                    className="flex-1 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleCustomQuestion()
                      }
                    }}
                  />
                  <Button onClick={handleCustomQuestion} disabled={!customQuestion.trim()} className="bg-gradient-to-r from-purple-600 to-blue-600">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Ask
                  </Button>
                  <Button variant="outline" onClick={() => setShowCustomQuestion(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="p-12 text-center bg-white">
                <div className="relative mx-auto mb-6 w-20 h-20">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600"></div>
                  <Calculator className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">🧮 AI is analyzing math...</h3>
                <p className="text-gray-700 text-lg mb-2">Generating step-by-step mathematical explanation</p>
                <p className="text-sm text-gray-600">This may take 15-30 seconds for detailed analysis</p>
                <div className="mt-4 flex justify-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                    Educational Mode
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    GPT-4 Math
                  </Badge>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-12 text-center bg-white">
                <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-red-700 mb-3">❌ Math Analysis Failed</h3>
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

            {/* Analysis Content */}
            {explanation && !isLoading && !error && (
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="p-6">
                  {/* Main Analysis Header */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Calculator className="w-6 h-6 text-blue-600" />
                        <span>Mathematical Analysis Results</span>
                      </h3>
                      <div className="flex space-x-2">
                        <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                          Educational Mode
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          Powered by GPT-4 Math
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Sections Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(explanation).map(([key, content]) => {
                      if (!content) return null
                      
                      const sectionLabel = getTabLabel(key)
                      const sectionIcon = getTabIcon(key)
                      
                      return (
                        <Card key={key} className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center space-x-2">
                              {sectionIcon}
                              <span>{sectionLabel}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="prose prose-sm max-w-none">
                              <div className="whitespace-pre-wrap text-gray-900 leading-relaxed bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                                {content}
                              </div>
                            </div>
                            
                            {/* Copy Button */}
                            <div className="mt-3 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(content, key)}
                                className="text-xs"
                              >
                                {copied === key ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                {copied === key ? 'Copied!' : 'Copy'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 