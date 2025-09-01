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
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ImageIcon className="w-6 h-6" />
              <CardTitle className="text-xl font-bold">Advanced Research Analysis</CardTitle>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {hasActualImage && imageData ? 'Vision AI' : 'Caption Analysis'}
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
            <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
              <div className="text-sm opacity-90 mb-2 font-medium">Selected Content:</div>
              <div className="font-mono text-sm bg-white/20 p-2 rounded border border-white/10 text-white font-bold max-h-24 overflow-y-auto">
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
          <div className="p-3 border-b bg-gray-50">
            <div className="flex space-x-2">
              <Button
                variant={isDetailedMode ? "default" : "outline"}
                onClick={() => {
                  setIsDetailedMode(!isDetailedMode)
                  if (analysis) {
                    // Re-analyze with new mode
                    setTimeout(() => analyzeImage(), 100)
                  }
                }}
                className="flex items-center space-x-2"
                size="sm"
              >
                <Zap className="w-4 h-4" />
                <span>{isDetailedMode ? 'Detailed' : 'Concise'}</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowCustomQuestion(!showCustomQuestion)}
                className="flex items-center space-x-2"
                size="sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Custom Question</span>
              </Button>
              
              {analysis && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2), 'full')}
                    className="flex items-center space-x-2"
                    size="sm"
                  >
                    {copied === 'full' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>Copy</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => analyzeImage()}
                    className="flex items-center space-x-2"
                    size="sm"
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
            <div className="p-8 text-center bg-white">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {hasActualImage && imageData ? 'Analyzing image...' : 'Analyzing content...'}
              </h3>
              <p className="text-gray-700 text-sm mb-2">
                {hasActualImage && imageData 
                  ? 'Processing with Vision AI' 
                  : 'Extracting insights from description'
                }
              </p>
              <p className="text-xs text-gray-600">Processing time: 20-30 seconds</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-8 text-center bg-white">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-red-700 mb-3">Analysis Failed</h3>
              <p className="text-red-600 mb-4 text-sm bg-red-50 p-2 rounded border border-red-200">{error}</p>
              <Button 
                onClick={() => analyzeImage()} 
                variant="outline"
                className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Analysis Content */}
          {analysis && !isLoading && !error && (
            <div className="flex-1 bg-white overflow-hidden">
              <div className="p-3 h-full">
                <div className="grid grid-cols-2 gap-3 h-full">
                  {/* Left Column */}
                  <div className="space-y-2">
                    {Object.entries(analysis).slice(0, Math.ceil(Object.keys(analysis).length / 2)).map(([key, content]) => {
                      if (!content || (Array.isArray(content) && content.length === 0)) return null
                      
                      const sectionLabel = getTabLabel(key as keyof ImageAnalysis)
                      const sectionIcon = getTabIcon(key as keyof ImageAnalysis)
                      
                      return (
                        <div key={key} className="border border-gray-200 rounded-lg bg-white shadow-sm h-32 overflow-hidden">
                          {/* Section Header */}
                          <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {sectionIcon}
                              <span className="font-medium text-gray-900 text-xs">{sectionLabel}</span>
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {key === 'description' ? 'Analysis' :
                                 key === 'objects' ? 'Variables' :
                                 key === 'text' ? 'Details' :
                                 key === 'insights' ? 'Findings' :
                                 key === 'context' ? 'Framework' :
                                 key === 'technical' ? 'Methodology' :
                                 'Implications'}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(
                                Array.isArray(content) 
                                  ? (content as string[]).join('\n')
                                  : content as string, 
                                key
                              )}
                              className="text-gray-600 hover:text-blue-600 h-6 w-6 p-0"
                            >
                              {copied === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                          
                          {/* Section Content */}
                          <div className="p-2 h-24 overflow-y-auto">
                            <div className="prose prose-gray max-w-none">
                              {Array.isArray(content) ? (
                                <ul className="space-y-1">
                                  {(content as string[]).slice(0, 3).map((item, index) => (
                                    <li key={index} className="bg-gray-50 p-1 rounded border border-gray-200 text-gray-800">
                                      <div className="flex items-start space-x-1">
                                        <span className="flex-shrink-0 w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                          {index + 1}
                                        </span>
                                        <span className="text-gray-700 text-xs leading-tight">{item.substring(0, 80)}...</span>
                                      </div>
                                    </li>
                                  ))}
                                  {(content as string[]).length > 3 && (
                                    <li className="text-xs text-gray-500 italic">+{(content as string[]).length - 3} more items</li>
                                  )}
                                </ul>
                              ) : (
                                <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                  <p className="text-gray-800 text-xs leading-tight">
                                    {(content as string).substring(0, 150)}...
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-2">
                    {Object.entries(analysis).slice(Math.ceil(Object.keys(analysis).length / 2)).map(([key, content]) => {
                      if (!content || (Array.isArray(content) && content.length === 0)) return null
                      
                      const sectionLabel = getTabLabel(key as keyof ImageAnalysis)
                      const sectionIcon = getTabIcon(key as keyof ImageAnalysis)
                      
                      return (
                        <div key={key} className="border border-gray-200 rounded-lg bg-white shadow-sm h-32 overflow-hidden">
                          {/* Section Header */}
                          <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {sectionIcon}
                              <span className="font-medium text-gray-900 text-xs">{sectionLabel}</span>
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {key === 'description' ? 'Analysis' :
                                 key === 'objects' ? 'Variables' :
                                 key === 'text' ? 'Details' :
                                 key === 'insights' ? 'Findings' :
                                 key === 'context' ? 'Framework' :
                                 key === 'technical' ? 'Methodology' :
                                 'Implications'}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(
                                Array.isArray(content) 
                                  ? (content as string[]).join('\n')
                                  : content as string, 
                                key
                              )}
                              className="text-gray-600 hover:text-blue-600 h-6 w-6 p-0"
                            >
                              {copied === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                          
                          {/* Section Content */}
                          <div className="p-2 h-24 overflow-y-auto">
                            <div className="prose prose-gray max-w-none">
                              {Array.isArray(content) ? (
                                <ul className="space-y-1">
                                  {(content as string[]).slice(0, 3).map((item, index) => (
                                    <li key={index} className="bg-gray-50 p-1 rounded border border-gray-200 text-gray-800">
                                      <div className="flex items-start space-x-1">
                                        <span className="flex-shrink-0 w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                          {index + 1}
                                        </span>
                                        <span className="text-gray-700 text-xs leading-tight">{item.substring(0, 80)}...</span>
                                      </div>
                                    </li>
                                  ))}
                                  {(content as string[]).length > 3 && (
                                    <li className="text-xs text-gray-500 italic">+{(content as string[]).length - 3} more items</li>
                                  )}
                                </ul>
                              ) : (
                                <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                  <p className="text-gray-800 text-xs leading-tight">
                                    {(content as string).substring(0, 150)}...
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
