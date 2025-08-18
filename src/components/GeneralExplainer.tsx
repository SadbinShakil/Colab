'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  BookOpen, 
  X, 
  Copy, 
  Check, 
  Zap,
  Lightbulb,
  Search,
  RefreshCw,
  MessageSquare
} from 'lucide-react'

interface GeneralExplainerProps {
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

export default function GeneralExplainer({
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
}: GeneralExplainerProps) {
  const [explanation, setExplanation] = useState('')
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

  // Fetch explanation from AI Help API
  const generateExplanation = async (customQ?: string) => {
    if (!selectedText.trim() && !customQ?.trim()) return

    setIsLoading(true)
    setError('')
    setExplanation('')

    try {
      const question = customQ || `Please explain this selected text in detail: "${selectedText}"`
      
      const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
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
        setExplanation(data.response.answer)
      } else {
        throw new Error(data.error || 'Failed to generate explanation')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation')
      console.error('General explainer error:', err)
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

  // Auto-fetch explanation when component opens
  useEffect(() => {
    if (isOpen && selectedText && !explanation && !isLoading) {
      console.log('🔍 Auto-fetching general explanation for:', selectedText)
      generateExplanation()
    }
  }, [isOpen, selectedText])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(explanation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-7 h-7" />
              <CardTitle className="text-2xl font-bold">General AI Explainer</CardTitle>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
                📚 Research Assistant
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
              <div className="text-sm opacity-90 mb-3 font-medium">📝 Selected Text to Explain:</div>
              <div className="font-mono text-lg bg-white/20 p-3 rounded border border-white/10 text-white font-bold">
                {selectedText}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          {/* Custom Question Input */}
          {showCustomQuestion && (
            <div className="p-4 border-b bg-gray-50">
              <div className="flex space-x-2">
                <textarea
                  ref={textareaRef}
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Ask a specific question about the selected content..."
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
                <MessageSquare className="w-4 h-4" />
                <span>Ask Custom Question</span>
              </Button>
              
              {explanation && (
                <>
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="flex items-center space-x-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Explanation'}</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => generateExplanation()}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Regenerate</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center bg-white">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">🤖 AI is analyzing...</h3>
              <p className="text-gray-700 text-lg mb-2">Generating detailed explanation for your selected text</p>
              <p className="text-sm text-gray-600">This may take 10-20 seconds</p>
              <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded inline-block">
                GPT-4 is analyzing the content in research context
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-12 text-center bg-white">
              <Search className="w-20 h-20 text-red-500 mx-auto mb-6" />
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
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                    <Lightbulb className="w-6 h-6 text-green-600" />
                    <span>AI Research Explanation</span>
                  </h3>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Powered by GPT-4
                  </Badge>
                </div>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed text-base font-normal bg-green-50 p-6 rounded-lg border border-green-200 shadow-sm">
                  {explanation}
                </div>
              </div>

              {/* Additional Actions */}
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`
                      window.open(searchUrl, '_blank')
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search Web</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(selectedText)}`
                      window.open(scholarUrl, '_blank')
                    }}
                    className="flex items-center space-x-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Scholar Search</span>
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
