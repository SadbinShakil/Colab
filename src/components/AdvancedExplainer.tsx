'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { 
  BookOpen, 
  X, 
  Copy, 
  Check, 
  Zap,
  Lightbulb,
  Search,
  RefreshCw,
  MessageSquare,
  GraduationCap,
  Eye,
  PlayCircle,
  ChevronRight,
  Bookmark,
  History,
  Brain,
  Target,
  Users,
  Sparkles,
  ArrowRight,
  Layers,
  Compass
} from 'lucide-react'

interface AdvancedExplainerProps {
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

type ExplanationType = 'simple' | 'technical' | 'academic' | 'visual' | 'interactive'
type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

interface ExplanationResult {
  content: string
  relatedConcepts: string[]
  followUpQuestions: string[]
  analogies?: string[]
  examples?: string[]
  visualSuggestions?: string[]
}

export default function AdvancedExplainer({
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
}: AdvancedExplainerProps) {
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showCustomQuestion, setShowCustomQuestion] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const [explanationType, setExplanationType] = useState<ExplanationType>('simple')
  const [expertiseLevel, setExpertiseLevel] = useState<ExpertiseLevel>('intermediate')
  const [savedExplanations, setSavedExplanations] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus textarea when custom question is shown
  useEffect(() => {
    if (showCustomQuestion && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [showCustomQuestion])

  // Enhanced AI prompt based on type and level
  const buildEnhancedPrompt = (text: string, type: ExplanationType, level: ExpertiseLevel, customQ?: string) => {
    const basePrompt = customQ || `Explain this text: "${text}"`
    
    const typeInstructions = {
      simple: "Provide a clear, easy-to-understand explanation using everyday language. Focus on the main ideas without jargon.",
      technical: "Give a detailed technical explanation with precise terminology, mechanisms, and implementation details.",
      academic: "Provide a scholarly explanation with theoretical context, citations to related work, and academic perspective.",
      visual: "Explain using visual analogies, metaphors, and descriptive imagery. Suggest diagrams or visual representations.",
      interactive: "Create an engaging explanation with questions, examples, and step-by-step breakdowns that encourage interaction."
    }

    const levelInstructions = {
      beginner: "Assume no prior knowledge. Define all terms and concepts clearly.",
      intermediate: "Assume basic familiarity with the field. Use standard terminology with brief explanations.",
      advanced: "Assume strong background knowledge. Focus on complex relationships and nuanced details.",
      expert: "Assume expert-level understanding. Discuss cutting-edge implications and theoretical considerations."
    }

    return `${basePrompt}

EXPLANATION TYPE: ${typeInstructions[type]}
EXPERTISE LEVEL: ${levelInstructions[level]}

Please provide your response in this JSON format:
{
  "content": "Main explanation content",
  "relatedConcepts": ["concept1", "concept2", "concept3"],
  "followUpQuestions": ["question1", "question2", "question3"],
  "analogies": ["analogy1", "analogy2"] (if visual type),
  "examples": ["example1", "example2"],
  "visualSuggestions": ["suggestion1", "suggestion2"] (if visual type)
}

Make the explanation comprehensive yet accessible for the specified level.`
  }

  // Enhanced API call with structured response
  const generateAdvancedExplanation = async (customQ?: string) => {
    if (!selectedText.trim() && !customQ?.trim()) return

    setIsLoading(true)
    setError('')
    setExplanation(null)

    try {
      const enhancedPrompt = buildEnhancedPrompt(selectedText, explanationType, expertiseLevel, customQ)
      
      const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: enhancedPrompt,
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
          setExplanation(parsedResult)
        } catch (parseError) {
          // Fallback to plain text
          setExplanation({
            content: data.response.answer,
            relatedConcepts: [],
            followUpQuestions: [],
            examples: []
          })
        }
      } else {
        throw new Error(data.error || 'Failed to generate explanation')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation')
      console.error('Advanced explainer error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomQuestion = () => {
    if (customQuestion.trim()) {
      generateAdvancedExplanation(customQuestion.trim())
      setShowCustomQuestion(false)
      setCustomQuestion('')
    }
  }

  const handleFollowUpQuestion = (question: string) => {
    generateAdvancedExplanation(question)
  }

  // Auto-fetch explanation when component opens or settings change
  useEffect(() => {
    if (isOpen && selectedText && !isLoading) {
      console.log('🧠 Auto-fetching advanced explanation for:', selectedText, { type: explanationType, level: expertiseLevel })
      generateAdvancedExplanation()
    }
  }, [isOpen, selectedText, explanationType, expertiseLevel])

  const copyToClipboard = async () => {
    try {
      const textToCopy = explanation?.content || ''
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const saveExplanation = () => {
    if (explanation?.content) {
      setSavedExplanations(prev => [...prev, explanation.content])
    }
  }

  if (!isOpen) return null

  const typeIcons = {
    simple: <Lightbulb className="w-4 h-4" />,
    technical: <Zap className="w-4 h-4" />,
    academic: <GraduationCap className="w-4 h-4" />,
    visual: <Eye className="w-4 h-4" />,
    interactive: <PlayCircle className="w-4 h-4" />
  }

  const levelColors = {
    beginner: 'bg-green-200 text-green-900 border border-green-300',
    intermediate: 'bg-blue-200 text-blue-900 border border-blue-300',
    advanced: 'bg-purple-200 text-purple-900 border border-purple-300',
    expert: 'bg-red-200 text-red-900 border border-red-300'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Brain className="w-8 h-8" />
                <Sparkles className="w-4 h-4 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Smart AI Explainer</CardTitle>
                <div className="text-purple-100 text-sm">Advanced AI • Multiple Formats • Adaptive Learning</div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
                Advanced AI
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
              <span className="text-sm font-medium">Type:</span>
              <Select value={explanationType} onValueChange={(value: ExplanationType) => setExplanationType(value)}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-gray-300 shadow-lg">
                  <SelectItem value="simple" className="bg-yellow-50 text-yellow-900 font-semibold hover:bg-yellow-100 focus:bg-yellow-100 border-b border-yellow-200">
                    🌟 Simple
                  </SelectItem>
                  <SelectItem value="technical" className="bg-orange-50 text-orange-900 font-semibold hover:bg-orange-100 focus:bg-orange-100 border-b border-orange-200">
                    ⚡ Technical
                  </SelectItem>
                  <SelectItem value="academic" className="bg-indigo-50 text-indigo-900 font-semibold hover:bg-indigo-100 focus:bg-indigo-100 border-b border-indigo-200">
                    🎓 Academic
                  </SelectItem>
                  <SelectItem value="visual" className="bg-teal-50 text-teal-900 font-semibold hover:bg-teal-100 focus:bg-teal-100 border-b border-teal-200">
                    👁️ Visual
                  </SelectItem>
                  <SelectItem value="interactive" className="bg-pink-50 text-pink-900 font-semibold hover:bg-pink-100 focus:bg-pink-100">
                    🎮 Interactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Level:</span>
              <Select value={expertiseLevel} onValueChange={(value: ExpertiseLevel) => setExpertiseLevel(value)}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-gray-300 shadow-lg">
                  <SelectItem value="beginner" className="bg-green-50 text-green-900 font-semibold hover:bg-green-100 focus:bg-green-100 border-b border-green-200">
                    🌱 Beginner
                  </SelectItem>
                  <SelectItem value="intermediate" className="bg-blue-50 text-blue-900 font-semibold hover:bg-blue-100 focus:bg-blue-100 border-b border-blue-200">
                    🌿 Intermediate
                  </SelectItem>
                  <SelectItem value="advanced" className="bg-purple-50 text-purple-900 font-semibold hover:bg-purple-100 focus:bg-purple-100 border-b border-purple-200">
                    🌳 Advanced
                  </SelectItem>
                  <SelectItem value="expert" className="bg-red-50 text-red-900 font-semibold hover:bg-red-100 focus:bg-red-100">
                    🚀 Expert
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex overflow-hidden">
          {/* Left Panel - Selected Text & Context */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col overflow-y-auto">
            {selectedText && (
              <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                  <Compass className="w-4 h-4" />
                  <span>Selected Text to Analyze:</span>
                </div>
                <div className="font-mono text-sm bg-white p-3 rounded border border-gray-200 text-gray-800 max-h-32 overflow-y-auto">
                  {selectedText}
                </div>
              </div>
            )}
            {documentContext && (
              <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 mt-4">
                <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                  <History className="w-4 h-4" />
                  <span>Document Context:</span>
                </div>
                <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed">
                  {documentContext}
                </div>
              </div>
            )}

            {/* Quick Actions - Utilizing Empty Space */}
            <div className="p-4 border-b bg-gradient-to-br from-blue-50 to-indigo-50 mt-4">
              <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>Quick Actions</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`
                    window.open(searchUrl, '_blank')
                  }}
                  className="text-xs h-8 bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Web Search
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(selectedText)}`
                    window.open(scholarUrl, '_blank')
                  }}
                  className="text-xs h-8 bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                >
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Scholar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAdvancedExplanation(`Provide a simpler explanation of: ${selectedText}`)}
                  className="text-xs h-8 bg-white hover:bg-green-50 border-green-200 text-green-700"
                >
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Simplify
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAdvancedExplanation(`What are the practical applications of: ${selectedText}`)}
                  className="text-xs h-8 bg-white hover:bg-orange-50 border-orange-200 text-orange-700"
                >
                  <Target className="w-3 h-3 mr-1" />
                  Applications
                </Button>
              </div>
            </div>

            {/* AI Status & Insights - More Space Utilization */}
            <div className="p-4 border-b bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span>AI Status</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Current Mode:</span>
                  <Badge className="bg-purple-100 text-purple-800 px-2 py-1">
                    {explanationType.charAt(0).toUpperCase() + explanationType.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Expertise Level:</span>
                  <Badge className={`${levelColors[expertiseLevel]} px-2 py-1`}>
                    {expertiseLevel.charAt(0).toUpperCase() + expertiseLevel.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">AI Model:</span>
                  <Badge variant="outline" className="bg-white text-gray-700 px-2 py-1">
                    GPT-4
                  </Badge>
                </div>
              </div>
            </div>

            {/* Recent Insights - Utilizing Remaining Space */}
            {explanation && (
              <div className="p-4 border-b bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                  <span>Recent Insights</span>
                </div>
                <div className="space-y-2">
                  {explanation.relatedConcepts && explanation.relatedConcepts.slice(0, 5).map((concept, index) => (
                    <div key={index} className="text-xs bg-white p-2 rounded border border-green-200 text-green-700">
                      💡 {concept}
                    </div>
                  ))}
                  {explanation.followUpQuestions && explanation.followUpQuestions.slice(0, 3).map((question, index) => (
                    <div key={`q-${index}`} className="text-xs bg-blue-50 p-2 rounded border border-blue-200 text-blue-700">
                      ❓ {question}
                    </div>
                  ))}
                  {explanation.analogies && explanation.analogies.slice(0, 2).map((analogy, index) => (
                    <div key={`a-${index}`} className="text-xs bg-orange-50 p-2 rounded border border-orange-200 text-orange-700">
                      🎯 {analogy}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State - When No Explanation Yet */}
            {!explanation && !isLoading && !error && (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center p-4">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Ready to Explain</h3>
                  <p className="text-xs text-gray-500 mb-3">Select text and choose your preferred explanation style</p>
                  <div className="flex justify-center space-x-2">
                    <Badge className="bg-purple-100 text-purple-800 px-3 py-1 text-xs">
                      {explanationType.charAt(0).toUpperCase() + explanationType.slice(1)}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-xs">
                      {expertiseLevel.charAt(0).toUpperCase() + expertiseLevel.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Explanation Content */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-white">
            {/* Custom Question Input */}
            {showCustomQuestion && (
              <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex space-x-2">
                  <textarea
                    ref={textareaRef}
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Ask a specific question about the selected content..."
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
                  <span>Custom Question</span>
                </Button>
                
                {explanation && (
                  <>
                    <Button
                      variant="outline"
                      onClick={copyToClipboard}
                      className="flex items-center space-x-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={saveExplanation}
                      className="flex items-center space-x-2"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>Save</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => generateAdvancedExplanation()}
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
                <div className="relative mx-auto mb-6 w-20 h-20">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-200 border-t-purple-600"></div>
                  <Brain className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">🧠 AI is thinking...</h3>
                <p className="text-gray-700 text-lg mb-2">Generating {explanationType} explanation at {expertiseLevel} level</p>
                <p className="text-sm text-gray-600">This may take 15-30 seconds for advanced processing</p>
                <div className="mt-4 flex justify-center space-x-2">
                  <Badge className={`${levelColors[expertiseLevel]} px-3 py-1`}>
                    {expertiseLevel.charAt(0).toUpperCase() + expertiseLevel.slice(1)} Level
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    {typeIcons[explanationType]}
                    <span className="ml-1">{explanationType.charAt(0).toUpperCase() + explanationType.slice(1)}</span>
                  </Badge>
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
                  onClick={() => generateAdvancedExplanation()} 
                  variant="outline"
                  className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100 px-6 py-2"
                >
                  🔄 Try Again
                </Button>
              </div>
            )}

            {/* Advanced Explanation Content */}
            {explanation && !isLoading && !error && (
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="p-6">
                  {/* Main Explanation */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        {typeIcons[explanationType]}
                        <span>{explanationType.charAt(0).toUpperCase() + explanationType.slice(1)} Explanation</span>
                      </h3>
                      <div className="flex space-x-2">
                        <Badge className={`${levelColors[expertiseLevel]} px-3 py-1`}>
                          {expertiseLevel.charAt(0).toUpperCase() + expertiseLevel.slice(1)}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          Powered by GPT-4
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="prose prose-lg max-w-none">
                      <div className="whitespace-pre-wrap text-gray-900 leading-relaxed text-base font-normal bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-200 shadow-sm">
                        {explanation.content}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Features Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Related Concepts */}
                    {explanation.relatedConcepts && explanation.relatedConcepts.length > 0 && (
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <Layers className="w-5 h-5 text-blue-600" />
                            <span>Related Concepts</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-2">
                            {explanation.relatedConcepts.map((concept, index) => (
                              <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer">
                                {concept}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Follow-up Questions */}
                    {explanation.followUpQuestions && explanation.followUpQuestions.length > 0 && (
                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                            <span>Explore Further</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {explanation.followUpQuestions.map((question, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              onClick={() => handleFollowUpQuestion(question)}
                              className="w-full text-left justify-start h-auto p-3 hover:bg-green-50 text-sm"
                            >
                              <ChevronRight className="w-4 h-4 mr-2 text-green-600" />
                              <span className="text-green-700">{question}</span>
                            </Button>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Visual Analogies */}
                    {explanation.analogies && explanation.analogies.length > 0 && (
                      <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <Eye className="w-5 h-5 text-purple-600" />
                            <span>Visual Analogies</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {explanation.analogies.map((analogy, index) => (
                            <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <p className="text-purple-800 text-sm">{analogy}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Examples */}
                    {explanation.examples && explanation.examples.length > 0 && (
                      <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <Target className="w-5 h-5 text-orange-600" />
                            <span>Real Examples</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {explanation.examples.map((example, index) => (
                            <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <p className="text-orange-800 text-sm">{example}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-8 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <Compass className="w-4 h-4" />
                      <span>Quick Actions</span>
                    </h4>
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
                        <span>Web Search</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(selectedText)}`
                          window.open(scholarUrl, '_blank')
                        }}
                        className="flex items-center space-x-2"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>Scholar Search</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => generateAdvancedExplanation(`Provide a simpler explanation of: ${selectedText}`)}
                        className="flex items-center space-x-2"
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span>Simplify</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => generateAdvancedExplanation(`What are the practical applications of: ${selectedText}`)}
                        className="flex items-center space-x-2"
                      >
                        <Target className="w-4 h-4" />
                        <span>Applications</span>
                      </Button>
                    </div>
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
