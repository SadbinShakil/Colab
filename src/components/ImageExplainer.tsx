'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  Image as ImageIcon, 
  X, 
  Copy, 
  Check,
  Eye,
  Zap,
  Search,
  RefreshCw,
  MessageSquare,
  Camera,
  Scan,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  Lightbulb,
  Target,
  AlertTriangle,
  Download,
  Share
} from 'lucide-react'

interface ImageAnalysis {
  description: string
  objects: string[]
  text: string[]
  insights: string[]
  context: string
  technical: string
  recommendations: string[]
}

interface ImageExplainerProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  imageData?: string // Base64 or URL
  hasActualImage?: boolean
  documentContext?: string
  documentContent?: string
  documentTitle?: string
  documentAuthors?: string
  documentUrl?: string
  userId?: string
  userName?: string
}

export default function ImageExplainer({
  isOpen,
  onClose,
  selectedText,
  imageData,
  hasActualImage = false,
  documentContext,
  documentContent,
  documentTitle,
  documentAuthors,
  documentUrl,
  userId,
  userName
}: ImageExplainerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<keyof ImageAnalysis>('description')
  const [copied, setCopied] = useState<string | null>(null)
  const [showCustomQuestion, setShowCustomQuestion] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-analyze when component opens
  useEffect(() => {
    if (isOpen && selectedText && !isLoading) {
      console.log('🖼️ Auto-analyzing image:', selectedText)
      console.log('🔍 ImageExplainer Debug:', {
        hasActualImage,
        hasImageData: !!imageData,
        imageDataType: typeof imageData,
        imageDataLength: imageData ? imageData.length : 0,
        imageDataStart: imageData ? imageData.substring(0, 50) + '...' : 'null'
      })
      analyzeImage()
    }
  }, [isOpen, selectedText])

  const buildImageAnalysisPrompt = (text: string, customQ?: string) => {
    if (customQ) {
      return `Please analyze the following image or visual content and answer this specific question: "${customQ}"

Context: ${text}
Document: ${documentTitle || 'Unknown'}
Authors: ${documentAuthors || 'Unknown'}

Provide a detailed answer based on the visual content.`
    }

    return `Please analyze the following figure caption or description from an academic document. Provide insights based on the description and context.

Visual Content Description/Caption: ${text}
Document: ${documentTitle || 'Research Document'}
Authors: ${documentAuthors || 'Academic Authors'}

Please provide a comprehensive analysis in JSON format with these sections:
{
  "description": "Detailed interpretation of what the figure likely shows based on the caption",
  "objects": ["key elements", "components", "variables mentioned"],
  "text": ["labels", "annotations", "text elements mentioned in caption"],
  "insights": ["key finding 1", "research insight 2", "methodological insight 3"],
  "context": "How this figure relates to the research objectives and broader study",
  "technical": "Technical analysis of the methodology, data presentation, or scientific approach",
  "recommendations": ["research implication 1", "future direction 2"]
}

Focus on:
- Scientific methodology and experimental design implied
- Research findings and their significance
- Data types and analytical approaches suggested
- Technical terminology and its meaning in context
- How this contributes to the research conclusions
- Statistical or quantitative aspects mentioned
- Theoretical framework connections
- Implications for the field of study

Note: Analysis based on figure caption and research context. Emphasizing scientific interpretation and research relevance.`
  }

  // Analyze image content
  const analyzeImage = async (customQ?: string) => {
    if (!selectedText.trim() && !customQ?.trim()) return

    setIsLoading(true)
    setError('')
    setAnalysis(null)

    try {
      // Use vision API if we have actual image data, otherwise use enhanced prompt
      const apiEndpoint = hasActualImage && imageData ? '/api/vision-analysis' : '/api/ai-help'
      
      let requestBody: any = {
        documentTitle: documentTitle,
        documentAuthors: documentAuthors,
        documentUrl: documentUrl,
        userId: userId,
        userName: userName
      }

      if (hasActualImage && imageData) {
        // Use vision API with actual image
        requestBody = {
          ...requestBody,
          question: customQ || 'Please analyze this academic figure in detail',
          imageData: imageData,
          caption: selectedText
        }
      } else {
        // Use text-based analysis
        const prompt = buildImageAnalysisPrompt(selectedText, customQ)
        requestBody = {
          ...requestBody,
          question: prompt,
          documentContent: documentContent
        }
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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
            description: data.response.answer,
            objects: [],
            text: [],
            insights: [],
            context: "Analysis provided as general description",
            technical: "",
            recommendations: []
          })
        }
      } else {
        throw new Error(data.error || 'Failed to analyze image')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image')
      console.error('Image explainer error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomQuestion = () => {
    if (customQuestion.trim()) {
      analyzeImage(customQuestion.trim())
      setShowCustomQuestion(false)
      setCustomQuestion('')
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getTabIcon = (tab: keyof ImageAnalysis) => {
    switch (tab) {
      case 'description': return <Eye className="w-4 h-4 text-blue-600" />
      case 'objects': return <Camera className="w-4 h-4 text-green-600" />
      case 'text': return <Scan className="w-4 h-4 text-purple-600" />
      case 'insights': return <Lightbulb className="w-4 h-4 text-yellow-600" />
      case 'context': return <Target className="w-4 h-4 text-red-600" />
      case 'technical': return <BarChart3 className="w-4 h-4 text-indigo-600" />
      case 'recommendations': return <TrendingUp className="w-4 h-4 text-orange-600" />
      default: return <ImageIcon className="w-4 h-4" />
    }
  }

  const getTabLabel = (tab: keyof ImageAnalysis) => {
    switch (tab) {
      case 'description': return 'Visual Description'
      case 'objects': return 'Objects & Elements'
      case 'text': return 'Text & Labels'
      case 'insights': return 'Key Insights'
      case 'context': return 'Research Context'
      case 'technical': return 'Technical Analysis'
      case 'recommendations': return 'Recommendations'
      default: return tab
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ImageIcon className="w-7 h-7" />
              <CardTitle className="text-2xl font-bold">AI Image Understanding</CardTitle>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {hasActualImage && imageData ? '👁️ Vision AI' : '📝 Caption Analysis'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {selectedText && (
            <div className="mt-4 p-4 bg-white/10 rounded-lg border border-white/20">
              <div className="text-sm opacity-90 mb-3 font-medium">🖼️ Selected Image/Visual Content:</div>
              <div className="font-mono text-sm bg-white/20 p-3 rounded border border-white/10 text-white font-bold max-h-32 overflow-y-auto">
                {selectedText}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col overflow-y-auto">
          {/* Custom Question Input */}
          {showCustomQuestion && (
            <div className="p-4 border-b bg-gray-50">
              <div className="flex space-x-2">
                <textarea
                  ref={textareaRef}
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Ask a specific question about the image or visual content..."
                  className="flex-1 p-2 border rounded-md resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleCustomQuestion()
                    }
                  }}
                />
                <div className="flex flex-col space-y-1">
                  <Button
                    onClick={handleCustomQuestion}
                    disabled={!customQuestion.trim()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setShowCustomQuestion(false)}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
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
              
              {analysis && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2), 'full')}
                    className="flex items-center space-x-2"
                  >
                    {copied === 'full' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>Copy Analysis</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => analyzeImage()}
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
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {hasActualImage && imageData ? '👁️ AI is analyzing the extracted page image...' : '🤖 AI is analyzing the visual content...'}
        </h3>
              <p className="text-gray-700 text-lg mb-2">
                {hasActualImage && imageData 
                  ? 'Using Vision AI to analyze the actual figure/diagram' 
                  : 'Interpreting image caption and visual description'
                }
              </p>
              <p className="text-sm text-gray-600">This may take 20-30 seconds for complex analysis</p>
              <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded inline-block">
                {hasActualImage && imageData 
                  ? '🔬 GPT-4 Vision is processing the actual image content'
                  : '📝 AI is extracting insights from figure descriptions and captions'
                }
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-12 text-center bg-white">
              <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-red-700 mb-3">❌ Analysis Failed</h3>
              <p className="text-red-600 mb-6 text-lg bg-red-50 p-3 rounded border border-red-200">{error}</p>
              <Button 
                onClick={() => analyzeImage()} 
                variant="outline"
                className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100 px-6 py-2"
              >
                🔄 Try Again
              </Button>
            </div>
          )}

          {/* Analysis Content */}
          {analysis && !isLoading && !error && (
            <div className="flex flex-1 bg-white overflow-hidden">
              {/* Tab Navigation */}
              <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
                {Object.entries(analysis).map(([key, content]) => {
                  if (!content || (Array.isArray(content) && content.length === 0)) return null
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as keyof ImageAnalysis)}
                      className={`w-full p-3 text-left border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                        activeTab === key 
                          ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium' 
                          : 'text-gray-800 hover:text-blue-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {getTabIcon(key as keyof ImageAnalysis)}
                        <span className="text-sm font-medium">{getTabLabel(key as keyof ImageAnalysis)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="max-w-none">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center space-x-2">
                        {getTabIcon(activeTab)}
                        <span>{getTabLabel(activeTab)}</span>
                      </h3>
                      <div className="flex justify-between items-center mb-4">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {activeTab === 'description' ? 'Visual overview' :
                           activeTab === 'objects' ? 'Element identification' :
                           activeTab === 'text' ? 'Text extraction' :
                           activeTab === 'insights' ? 'Key findings' :
                           activeTab === 'context' ? 'Research relevance' :
                           activeTab === 'technical' ? 'Technical details' :
                           'Action items'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(
                            Array.isArray(analysis[activeTab]) 
                              ? (analysis[activeTab] as string[]).join('\n')
                              : analysis[activeTab] as string, 
                            activeTab
                          )}
                          className="text-gray-600 hover:text-blue-600"
                        >
                          {copied === activeTab ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="prose prose-gray max-w-none">
                      {Array.isArray(analysis[activeTab]) ? (
                        <ul className="space-y-3">
                          {(analysis[activeTab] as string[]).map((item, index) => (
                            <li key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800">
                              <div className="flex items-start space-x-2">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                  {index + 1}
                                </span>
                                <span className="text-gray-700 leading-relaxed">{item}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {analysis[activeTab] as string}
                          </p>
                        </div>
                      )}
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
