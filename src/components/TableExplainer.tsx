'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  Table2, 
  X, 
  Copy, 
  Check, 
  Zap,
  BarChart3,
  Search,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  Eye,
  Target,
  Lightbulb,
  Database,
  Activity,
  PieChart,
  LineChart,
  Filter,
  SortAsc,
  Calculator
} from 'lucide-react'

interface TableExplainerProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  documentContext?: string
  documentContent?: string
  documentTitle?: string
  documentAuthors?: string
  documentUrl?: string
  userId?: string
  userName?: string
}

interface TableAnalysis {
  overview: string
  keyFindings: string[]
  patterns: string[]
  insights: string[]
  summary: string
  recommendations?: string[]
}

export default function TableExplainer({
  isOpen,
  onClose,
  selectedText,
  documentContext = '',
  documentContent = '',
  documentTitle = '',
  documentAuthors = '',
  documentUrl = '',
  userId = 'guest',
  userName = 'Anonymous'
}: TableExplainerProps) {
  const [analysis, setAnalysis] = useState<TableAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showCustomQuestion, setShowCustomQuestion] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus textarea when custom question is shown
  useEffect(() => {
    if (showCustomQuestion && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [showCustomQuestion])

  // Enhanced table analysis prompt
  const buildTableAnalysisPrompt = (tableText: string, customQ?: string) => {
    if (customQ) {
      return `Please answer this specific question about the table data: "${customQ}"

Table Data:
${tableText}

Provide a detailed response to the question.`
    }

    return `You are an expert data analyst. Please analyze this table data and provide comprehensive insights.

Table Data:
${tableText}

Please provide your analysis in this JSON format:
{
  "overview": "Brief description of what this table shows and its purpose",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "patterns": ["pattern1", "pattern2", "pattern3"],
  "insights": ["insight1", "insight2", "insight3"],
  "summary": "Plain English summary of the main conclusions",
  "recommendations": ["recommendation1", "recommendation2"]
}

Focus on:
- What the data represents
- Notable trends, patterns, or correlations
- Highest/lowest values and what they mean
- Relationships between different columns/rows
- Practical implications and insights
- Any anomalies or interesting observations`
  }

  // Analyze table data
  const analyzeTable = async (customQ?: string) => {
    if (!selectedText.trim() && !customQ?.trim()) return

    setIsLoading(true)
    setError('')
    setAnalysis(null)

    try {
      const prompt = buildTableAnalysisPrompt(selectedText, customQ)
      
      const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          documentContent: documentContent,
          documentTitle: documentTitle,
          documentAuthors: documentAuthors,
          documentUrl: documentUrl,
          userId: userId,
          userName: userName
        })
      })

      const data = await response.json()

      if (data.success && data.response?.answer) {
        try {
          // Try to parse as JSON first
          const parsedResult = JSON.parse(data.response.answer)
          setAnalysis(parsedResult)
        } catch (parseError) {
          // Fallback to plain text response
          setAnalysis({
            overview: "Table Analysis",
            keyFindings: [],
            patterns: [],
            insights: [],
            summary: data.response.answer,
            recommendations: []
          })
        }
      } else {
        throw new Error(data.error || 'Failed to analyze table')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze table')
      console.error('Table explainer error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomQuestion = () => {
    if (customQuestion.trim()) {
      analyzeTable(customQuestion.trim())
      setShowCustomQuestion(false)
      setCustomQuestion('')
    }
  }

  // Auto-analyze when component opens
  useEffect(() => {
    if (isOpen && selectedText && !isLoading) {
      console.log('📊 Auto-analyzing table data:', selectedText)
      analyzeTable()
    }
  }, [isOpen, selectedText])

  const copyToClipboard = async () => {
    try {
      const textToCopy = analysis?.summary || ''
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Table2 className="w-8 h-8" />
                <Database className="w-4 h-4 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Table AI Explainer</CardTitle>
                <div className="text-orange-100 text-sm">Smart Data Analysis • Pattern Detection • Clear Insights</div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
                📊 Data Expert
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

          {selectedText && (
            <div className="mt-4 p-4 bg-white/10 rounded-lg border border-white/20">
              <div className="text-sm opacity-90 mb-3 font-medium flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>Table Data to Analyze:</span>
              </div>
              <div className="font-mono text-sm bg-white/20 p-3 rounded border border-white/10 text-white font-bold max-h-32 overflow-y-auto">
                {selectedText}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col overflow-y-auto">
          {/* Custom Question Input */}
          {showCustomQuestion && (
            <div className="p-4 border-b bg-gradient-to-r from-orange-50 to-red-50">
              <div className="flex space-x-2">
                <textarea
                  ref={textareaRef}
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Ask a specific question about this table data..."
                  className="flex-1 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-orange-500"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleCustomQuestion()
                    }
                  }}
                />
                <Button onClick={handleCustomQuestion} disabled={!customQuestion.trim()} className="bg-gradient-to-r from-orange-600 to-red-600">
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCustomQuestion(!showCustomQuestion)}
                className="flex items-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask Question</span>
              </Button>
              
              {analysis && (
                <>
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="flex items-center space-x-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => analyzeTable()}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Re-analyze</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center bg-white">
              <div className="relative mx-auto mb-6 w-20 h-20">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-orange-200 border-t-orange-600"></div>
                <BarChart3 className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">📊 Analyzing table data...</h3>
              <p className="text-gray-700 text-lg mb-2">Detecting patterns, trends, and key insights</p>
              <p className="text-sm text-gray-600">This may take 15-25 seconds for comprehensive analysis</p>
              <div className="mt-4 flex justify-center space-x-2">
                <Badge className="bg-orange-100 text-orange-800 px-3 py-1">
                  <Activity className="w-3 h-3 mr-1" />
                  Pattern Detection
                </Badge>
                <Badge className="bg-red-100 text-red-800 px-3 py-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Trend Analysis
                </Badge>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-12 text-center bg-white">
              <Table2 className="w-20 h-20 text-red-500 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-red-700 mb-3">❌ Analysis Failed</h3>
              <p className="text-red-600 mb-6 text-lg bg-red-50 p-3 rounded border border-red-200">{error}</p>
              <Button 
                onClick={() => analyzeTable()} 
                variant="outline"
                className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100 px-6 py-2"
              >
                🔄 Try Again
              </Button>
            </div>
          )}

          {/* Table Analysis Results */}
          {analysis && !isLoading && !error && (
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-6">
                {/* Overview */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                      <Eye className="w-6 h-6 text-orange-600" />
                      <span>Data Overview</span>
                    </h3>
                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                      Powered by GPT-4
                    </Badge>
                  </div>
                  
                  <div className="prose prose-lg max-w-none">
                    <div className="whitespace-pre-wrap text-gray-900 leading-relaxed text-base font-normal bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200 shadow-sm">
                      {analysis.overview}
                    </div>
                  </div>
                </div>

                {/* Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Key Findings */}
                  {analysis.keyFindings && analysis.keyFindings.length > 0 && (
                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Target className="w-5 h-5 text-green-600" />
                          <span>Key Findings</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {analysis.keyFindings.map((finding, index) => (
                          <div key={index} className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <p className="text-green-800 text-sm">{finding}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Patterns */}
                  {analysis.patterns && analysis.patterns.length > 0 && (
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                          <span>Patterns & Trends</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {analysis.patterns.map((pattern, index) => (
                          <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-blue-800 text-sm">{pattern}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Insights */}
                  {analysis.insights && analysis.insights.length > 0 && (
                    <Card className="border-l-4 border-l-purple-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Lightbulb className="w-5 h-5 text-purple-600" />
                          <span>Key Insights</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {analysis.insights.map((insight, index) => (
                          <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-purple-800 text-sm">{insight}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <Card className="border-l-4 border-l-indigo-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Zap className="w-5 h-5 text-indigo-600" />
                          <span>Recommendations</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {analysis.recommendations.map((rec, index) => (
                          <div key={index} className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                            <p className="text-indigo-800 text-sm">{rec}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Summary */}
                {analysis.summary && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                      <Calculator className="w-5 h-5 text-gray-600" />
                      <span>Plain English Summary</span>
                    </h3>
                    <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-gray-800 leading-relaxed">{analysis.summary}</p>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-8 p-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Filter className="w-4 h-4" />
                    <span>Further Analysis</span>
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomQuestion("What are the statistical correlations in this data?")
                        setShowCustomQuestion(true)
                      }}
                      className="flex items-center space-x-2"
                    >
                      <LineChart className="w-4 h-4" />
                      <span>Correlations</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomQuestion("What are the outliers or anomalies in this table?")
                        setShowCustomQuestion(true)
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Search className="w-4 h-4" />
                      <span>Find Outliers</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomQuestion("How can this data be visualized most effectively?")
                        setShowCustomQuestion(true)
                      }}
                      className="flex items-center space-x-2"
                    >
                      <PieChart className="w-4 h-4" />
                      <span>Visualization Ideas</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomQuestion("What are the business implications of this data?")
                        setShowCustomQuestion(true)
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Target className="w-4 h-4" />
                      <span>Business Impact</span>
                    </Button>
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
