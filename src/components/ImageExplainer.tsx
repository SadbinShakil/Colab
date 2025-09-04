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
  Share,
  Sparkles,
  Users,
  Compass,
  Brain
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
  const [isDetailedMode, setIsDetailedMode] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['description']))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey)
    } else {
      newExpanded.add(sectionKey)
    }
    setExpandedSections(newExpanded)
  }

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

    return `Conduct advanced analysis of this figure caption with publication-quality precision.

Visual Content: ${text}
Document: ${documentTitle || 'Research Document'}
Authors: ${documentAuthors || 'Academic Authors'}

Provide sophisticated analysis in JSON format:
{
  "description": "Advanced interpretation with technical precision",
  "objects": ["experimental variables", "key components", "statistical measures"],
  "text": ["labels", "annotations", "methodological details"],
  "insights": ["primary findings", "statistical outcomes", "theoretical implications"],
  "context": "Theoretical framework and literature integration",
  "technical": "Advanced methodological and statistical analysis",
  "recommendations": ["research implications", "future directions", "methodological refinements"]
}

Focus on:
- Experimental design and statistical methodology
- Theoretical significance and literature integration
- Methodological rigor and analytical precision
- Advanced research implications

Use precise scientific terminology and maintain academic rigor.`
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
        userName: userName,
        documentContent: documentContent,
        isDetailedMode: isDetailedMode
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
      case 'description': return 'Analysis'
      case 'objects': return 'Variables'
      case 'text': return 'Annotations'
      case 'insights': return 'Findings'
      case 'context': return 'Framework'
      case 'technical': return 'Methodology'
      case 'recommendations': return 'Implications'
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
                <ImageIcon className="w-8 h-8" />
                <Sparkles className="w-4 h-4 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Smart Image AI Analyzer</CardTitle>
                <div className="text-blue-100 text-sm">Vision AI • Research Analysis • Contextual Insights</div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
                {hasActualImage && imageData ? 'Vision AI' : 'Caption Analysis'}
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
              <Button
                variant={isDetailedMode ? "default" : "outline"}
                onClick={() => {
                  setIsDetailedMode(!isDetailedMode)
                  if (analysis) {
                    setTimeout(() => analyzeImage(), 100)
                  }
                }}
                className={`${isDetailedMode ? 'bg-white text-blue-600' : 'bg-white/10 border-white/20 text-white'} px-3 py-1 text-xs`}
                size="sm"
              >
                <Zap className="w-3 h-3 mr-1" />
                {isDetailedMode ? 'Detailed' : 'Concise'}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">AI Model:</span>
              <Badge variant="outline" className="bg-white/10 border-white/20 text-white px-2 py-1 text-xs">
                GPT-4 Vision
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex overflow-hidden">
          {/* Left Panel - Context & Controls */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col overflow-y-auto">
            {selectedText && (
              <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                  <Compass className="w-4 h-4" />
                  <span>Selected Content to Analyze:</span>
                </div>
                <div className="font-mono text-sm bg-white p-3 rounded border border-gray-200 text-gray-800 max-h-32 overflow-y-auto">
                  {selectedText}
                </div>
                {documentContent && (
                  <div className="mt-2 flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1">
                      {documentContent.toLowerCase().includes(selectedText.toLowerCase()) ? (
                        <>
                          <Check className="w-3 h-3 text-green-600" />
                          <span className="text-green-700">Caption found in document - Contextual analysis enabled</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-yellow-600" />
                          <span className="text-yellow-700">Caption not found in document - Basic analysis only</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
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
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Custom Q
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeImage()}
                  className="text-xs h-8 bg-white hover:bg-green-50 border-green-200 text-green-700"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Re-analyze
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailedMode(!isDetailedMode)}
                  className="text-xs h-8 bg-white hover:bg-purple-50 border-purple-200 text-purple-700"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Toggle Mode
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2), 'full')}
                  className="text-xs h-8 bg-white hover:bg-orange-50 border-orange-200 text-orange-700"
                >
                  {copied === 'full' ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  Copy All
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
                    {isDetailedMode ? 'Detailed' : 'Concise'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">AI Model:</span>
                  <Badge variant="outline" className="bg-white text-gray-700 px-2 py-1">
                    GPT-4 Vision
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Image Type:</span>
                  <Badge className="bg-blue-100 text-blue-800 px-2 py-1">
                    {hasActualImage && imageData ? 'Vision AI' : 'Caption Analysis'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            {analysis && (
              <div className="p-4 border-b bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="text-sm font-medium mb-3 text-gray-700 flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                  <span>Analysis Summary</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(analysis).map(([key, content]) => {
                    if (!content || (Array.isArray(content) && content.length === 0)) return null
                    return (
                      <div key={key} className="text-xs bg-white p-2 rounded border border-green-200 text-green-700">
                        {getTabIcon(key as keyof ImageAnalysis)} {getTabLabel(key as keyof ImageAnalysis)}: {
                          Array.isArray(content) ? `${content.length} items` : 'Available'
                        }
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!analysis && !isLoading && !error && (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center p-4">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Ready to Analyze</h3>
                  <p className="text-xs text-gray-500 mb-3">Select image content and choose your analysis mode</p>
                  <div className="flex justify-center space-x-2">
                    <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-xs">
                      {isDetailedMode ? 'Detailed' : 'Concise'}
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-800 px-3 py-1 text-xs">
                      GPT-4 Vision
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
                    placeholder="Ask a specific question about the image or visual content..."
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
                    <Search className="w-4 h-4 mr-2" />
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
                  <ImageIcon className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">🖼️ AI is analyzing...</h3>
                <p className="text-gray-700 text-lg mb-2">
                  {hasActualImage && imageData ? 'Processing with Vision AI' : 'Extracting insights from description'}
                </p>
                <p className="text-sm text-gray-600">This may take 20-30 seconds for advanced processing</p>
                <div className="mt-4 flex justify-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                    {isDetailedMode ? 'Detailed' : 'Concise'} Mode
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    GPT-4 Vision
                  </Badge>
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
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="p-6">
                  {/* Main Analysis Header */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <ImageIcon className="w-6 h-6 text-blue-600" />
                        <span>Image Analysis Results</span>
                      </h3>
                      <div className="flex space-x-2">
                        <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                          {isDetailedMode ? 'Detailed' : 'Concise'} Mode
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          Powered by GPT-4 Vision
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Sections Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(analysis).map(([key, content]) => {
                      if (!content || (Array.isArray(content) && content.length === 0)) return null
                      
                      const sectionLabel = getTabLabel(key as keyof ImageAnalysis)
                      const sectionIcon = getTabIcon(key as keyof ImageAnalysis)
                      
                      return (
                        <Card key={key} className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center space-x-2">
                              {sectionIcon}
                              <span>{sectionLabel}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {Array.isArray(content) ? (
                              <div className="space-y-2">
                                {content.slice(0, 5).map((item, index) => (
                                  <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-start space-x-2">
                                      <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        {index + 1}
                                      </span>
                                      <p className="text-gray-800 text-sm leading-relaxed">{item}</p>
                                    </div>
                                  </div>
                                ))}
                                {content.length > 5 && (
                                  <div className="text-center">
                                    <Badge variant="outline" className="text-xs text-gray-500">
                                      +{content.length - 5} more items
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                                  {content}
                                </div>
                              </div>
                            )}
                            
                            {/* Copy Button */}
                            <div className="mt-3 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(
                                  Array.isArray(content) 
                                    ? (content as string[]).join('\n')
                                    : content as string, 
                                  key
                                )}
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
