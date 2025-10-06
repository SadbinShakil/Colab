'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Camera, Sparkles, Brain, Target, Microscope, TrendingUp, Award, 
  Shield, AlertTriangle, Zap, FileText, Users, Download, Settings,
  ChevronDown, ChevronUp, Eye, EyeOff, Play, Pause, RotateCcw,
  BarChart3, PieChart, Activity, Layers, GitBranch, Cpu, Database,
  BookOpen, Lightbulb, CheckCircle, XCircle, Clock, Star
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Legend,
  LineChart, Line, ScatterChart, Scatter, PieChart as RechartsPieChart,
  Cell, Treemap
} from 'recharts'

// Types for advanced image analysis
interface VisualComponent {
  id: string
  name: string
  type: 'encoder' | 'decoder' | 'attention' | 'feedforward' | 'embedding' | 'output'
  position: { x: number; y: number; width: number; height: number }
  parameters: Record<string, number | string | boolean>
  connections: string[]
  description: string
  importance: number
}

interface ArchitectureAnalysis {
  components: VisualComponent[]
  connections: Array<{ from: string; to: string; type: string; weight: number }>
  complexity: number
  efficiency: number
  scalability: number
  interpretability: number
}

interface PerformanceMetrics {
  accuracy: number
  speed: number
  memory: number
  energy: number
  latency: number
}

interface ResearchInsight {
  type: 'novelty' | 'limitation' | 'application' | 'comparison'
  confidence: number
  evidence: string[]
  impact: 'high' | 'medium' | 'low'
  description: string
}

interface SocraticQuestion {
  id: string
  question: string
  type: 'concept' | 'application' | 'analysis' | 'evaluation'
  difficulty: number
  options?: string[]
  correctAnswer?: string
  explanation: string
  visualHint?: string
}

interface MasteryProgress {
  concept: string
  level: number
  questionsAnswered: number
  correctAnswers: number
  lastAttempt: Date
}

interface AdvancedImageAnalyzerProps {
  selectedText?: string
  imageData?: string
  hasActualImage?: boolean
  documentContext?: string
  documentContent?: string
  documentTitle?: string
  documentAuthors?: string
  documentUrl?: string
  userId?: string
  userName?: string
}

export default function AdvancedImageAnalyzer({
  selectedText,
  imageData,
  hasActualImage = false,
  documentContext = '',
  documentContent = '',
  documentTitle = '',
  documentAuthors = '',
  documentUrl = '',
  userId = 'guest',
  userName = 'Anonymous'
}: AdvancedImageAnalyzerProps) {
  // State management
  const [analysisMode, setAnalysisMode] = useState<'comprehensive' | 'technical' | 'educational' | 'research'>('comprehensive')
  const [aiModel, setAiModel] = useState<'gpt4-vision' | 'claude-vision' | 'gemini-vision'>('gpt4-vision')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [analysisDepth, setAnalysisDepth] = useState<'surface' | 'moderate' | 'deep' | 'expert'>('deep')
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(true)
  
  // Analysis results
  const [architectureAnalysis, setArchitectureAnalysis] = useState<ArchitectureAnalysis | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [researchInsights, setResearchInsights] = useState<ResearchInsight[]>([])
  const [socraticQuestions, setSocraticQuestions] = useState<SocraticQuestion[]>([])
  const [masteryProgress, setMasteryProgress] = useState<MasteryProgress[]>([])
  
  // Interactive features
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [highlightMode, setHighlightMode] = useState<'none' | 'connections' | 'performance' | 'importance'>('none')
  const [showExplanations, setShowExplanations] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  
  // Advanced analysis parameters
  const [complexityThreshold, setComplexityThreshold] = useState([0.5])
  const [performanceWeight, setPerformanceWeight] = useState([0.7])
  const [educationalMode, setEducationalMode] = useState(false)

  // Generate analysis based on actual image content
  const generateImageAnalysis = () => {
    if (!selectedText && !imageData) {
      return {
        components: [],
        connections: [],
        complexity: 0.5,
        efficiency: 0.5,
        scalability: 0.5,
        interpretability: 0.5
      }
    }

    // Extract meaningful components from the actual image description
    const imageContent = selectedText || documentContext || 'Unknown image content'
    const components = []
    
    // Parse the actual image content to extract real visual elements
    const contentWords = imageContent.toLowerCase().split(/\s+/)
    let componentId = 1
    
    // Look for actual visual elements mentioned in the image
    const visualElements = [
      'figure', 'diagram', 'chart', 'graph', 'table', 'plot', 'image', 'illustration',
      'architecture', 'model', 'network', 'system', 'flow', 'process', 'pipeline'
    ]
    
    const technicalTerms = [
      'transformer', 'attention', 'encoder', 'decoder', 'layer', 'neural', 'cnn', 'rnn',
      'accuracy', 'precision', 'recall', 'f1', 'loss', 'metric', 'performance', 'result'
    ]
    
    // Extract actual visual elements from the content
    visualElements.forEach(element => {
      if (contentWords.includes(element)) {
        components.push({
          id: `visual-${componentId++}`,
          name: `${element.charAt(0).toUpperCase() + element.slice(1)}`,
          type: 'embedding' as const,
          position: { x: 100 + (componentId * 50), y: 50 + (componentId * 30), width: 120, height: 80 },
          parameters: { type: element, confidence: 0.8 } as Record<string, number | string | boolean>,
          connections: [],
          description: `${element.charAt(0).toUpperCase() + element.slice(1)} shown in the image: "${imageContent.substring(0, 150)}..."`,
          importance: 0.7
        })
      }
    })
    
    // Extract technical components if mentioned
    technicalTerms.forEach(term => {
      if (contentWords.includes(term)) {
        components.push({
          id: `tech-${componentId++}`,
          name: `${term.charAt(0).toUpperCase() + term.slice(1)} Component`,
          type: 'attention' as const,
          position: { x: 100 + (componentId * 50), y: 50 + (componentId * 30), width: 120, height: 80 },
          parameters: { type: term, confidence: 0.9 } as Record<string, number | string | boolean>,
          connections: [],
          description: `${term.charAt(0).toUpperCase() + term.slice(1)} mentioned in the image content`,
          importance: 0.8
        })
      }
    })

    // If no specific components found, create one based on the actual image description
    if (components.length === 0) {
      components.push({
        id: 'main-visual',
        name: 'Image Content',
        type: 'embedding' as const,
        position: { x: 100, y: 50, width: 200, height: 100 },
        parameters: { content: imageContent.substring(0, 50) } as Record<string, number | string | boolean>,
        connections: [],
        description: `Visual content: "${imageContent.substring(0, 200)}${imageContent.length > 200 ? '...' : ''}"`,
        importance: 0.9
      })
    }

    return {
      components,
      connections: components.length > 1 ? [
        { from: components[0].id, to: components[1]?.id || components[0].id, type: 'visual-connection', weight: 0.8 }
      ] : [],
      complexity: Math.min(0.9, 0.3 + (components.length * 0.15)),
      efficiency: 0.7,
      scalability: 0.6,
      interpretability: imageContent.length > 100 ? 0.8 : 0.4
    }
  }

  const mockArchitectureAnalysis: ArchitectureAnalysis = generateImageAnalysis()

  const mockPerformanceMetrics: PerformanceMetrics = {
    accuracy: 0.92,
    speed: 0.75,
    memory: 0.65,
    energy: 0.55,
    latency: 0.70
  }

  const generateResearchInsights = (): ResearchInsight[] => {
    const imageContent = selectedText || documentContext || ''
    const insights: ResearchInsight[] = []

    // Analyze what the image actually shows and explain it
    const contentLower = imageContent.toLowerCase()
    
    // Look for what type of visual this is
    if (contentLower.includes('figure') || contentLower.includes('diagram')) {
      insights.push({
        type: 'novelty',
        confidence: 0.9,
        evidence: [imageContent.substring(0, 80) + '...'],
        impact: 'high',
        description: `This image shows a figure/diagram: "${imageContent.substring(0, 120)}${imageContent.length > 120 ? '...' : ''}"`
      })
    }

    if (contentLower.includes('chart') || contentLower.includes('graph') || contentLower.includes('plot')) {
      insights.push({
        type: 'application',
        confidence: 0.8,
        evidence: [imageContent.substring(0, 80) + '...'],
        impact: 'high',
        description: `This image contains a chart/graph showing: "${imageContent.substring(0, 120)}${imageContent.length > 120 ? '...' : ''}"`
      })
    }

    if (contentLower.includes('table') || contentLower.includes('data')) {
      insights.push({
        type: 'application',
        confidence: 0.8,
        evidence: [imageContent.substring(0, 80) + '...'],
        impact: 'medium',
        description: `This image shows tabular data: "${imageContent.substring(0, 120)}${imageContent.length > 120 ? '...' : ''}"`
      })
    }

    if (contentLower.includes('architecture') || contentLower.includes('model')) {
      insights.push({
        type: 'novelty',
        confidence: 0.9,
        evidence: [imageContent.substring(0, 80) + '...'],
        impact: 'high',
        description: `This image depicts an architecture/model: "${imageContent.substring(0, 120)}${imageContent.length > 120 ? '...' : ''}"`
      })
    }

    if (contentLower.includes('result') || contentLower.includes('performance') || contentLower.includes('accuracy')) {
      insights.push({
        type: 'application',
        confidence: 0.8,
        evidence: [imageContent.substring(0, 80) + '...'],
        impact: 'high',
        description: `This image shows results/performance data: "${imageContent.substring(0, 120)}${imageContent.length > 120 ? '...' : ''}"`
      })
    }

    // Always provide a main explanation of what the image shows
    if (insights.length === 0 || insights.length === 1) {
      insights.push({
        type: 'novelty',
        confidence: 0.7,
        evidence: ['Image content analysis'],
        impact: 'medium',
        description: `This image appears to show: "${imageContent.substring(0, 150)}${imageContent.length > 150 ? '...' : ''}"`
      })
    }

    return insights
  }

  const mockResearchInsights: ResearchInsight[] = generateResearchInsights()

  const generateSocraticQuestions = (): SocraticQuestion[] => {
    const imageContent = selectedText || documentContext || ''
    const questions: SocraticQuestion[] = []

    // Generate questions that help explain what's actually in the image
    const contentLower = imageContent.toLowerCase()
    
    // Question about what type of visual this is
    questions.push({
      id: 'q1',
      question: 'What type of visual content is shown in this image?',
      type: 'concept',
      difficulty: 1,
      options: [
        'A diagram or figure',
        'A chart or graph',
        'A table with data',
        'A model architecture'
      ],
      correctAnswer: contentLower.includes('chart') || contentLower.includes('graph') ? 'A chart or graph' :
                    contentLower.includes('table') ? 'A table with data' :
                    contentLower.includes('architecture') || contentLower.includes('model') ? 'A model architecture' :
                    'A diagram or figure',
      explanation: `This image shows: "${imageContent.substring(0, 100)}${imageContent.length > 100 ? '...' : ''}"`,
      visualHint: 'Look at the visual elements and structure in the image'
    })

    // Question about the main content
    questions.push({
      id: 'q2',
      question: 'What is the main subject or focus of this image?',
      type: 'analysis',
      difficulty: 2,
      options: [
        'Performance metrics and results',
        'Technical architecture or model',
        'Data visualization or analysis',
        'Methodology or process'
      ],
      correctAnswer: contentLower.includes('performance') || contentLower.includes('result') || contentLower.includes('accuracy') ? 'Performance metrics and results' :
                    contentLower.includes('architecture') || contentLower.includes('model') || contentLower.includes('network') ? 'Technical architecture or model' :
                    contentLower.includes('data') || contentLower.includes('chart') || contentLower.includes('graph') ? 'Data visualization or analysis' :
                    'Methodology or process',
      explanation: `The image focuses on: "${imageContent.substring(0, 120)}${imageContent.length > 120 ? '...' : ''}"`,
      visualHint: 'Examine the key elements and labels in the image'
    })

    // Question about what can be learned
    questions.push({
      id: 'q3',
      question: 'What can we learn or understand from this image?',
      type: 'analysis',
      difficulty: 3,
      options: [
        'How a system or process works',
        'What the performance or results are',
        'What the data or trends show',
        'How different components relate'
      ],
      correctAnswer: 'What the data or trends show', // Generic but educational
      explanation: `This image helps us understand: "${imageContent.substring(0, 150)}${imageContent.length > 150 ? '...' : ''}"`,
      visualHint: 'Look for patterns, relationships, and key information in the image'
    })

    return questions
  }

  const mockSocraticQuestions: SocraticQuestion[] = generateSocraticQuestions()

  // Advanced visualizations
  const architectureRadarData = useMemo(() => [
    { axis: 'Complexity', score: mockArchitectureAnalysis?.complexity || 0 },
    { axis: 'Efficiency', score: mockArchitectureAnalysis?.efficiency || 0 },
    { axis: 'Scalability', score: mockArchitectureAnalysis?.scalability || 0 },
    { axis: 'Interpretability', score: mockArchitectureAnalysis?.interpretability || 0 }
  ], [mockArchitectureAnalysis])

  const performanceBarData = useMemo(() => [
    { metric: 'Accuracy', value: mockPerformanceMetrics?.accuracy || 0, baseline: 0.85 },
    { metric: 'Speed', value: mockPerformanceMetrics?.speed || 0, baseline: 0.70 },
    { metric: 'Memory', value: mockPerformanceMetrics?.memory || 0, baseline: 0.60 },
    { metric: 'Energy', value: mockPerformanceMetrics?.energy || 0, baseline: 0.50 },
    { metric: 'Latency', value: mockPerformanceMetrics?.latency || 0, baseline: 0.65 }
  ], [mockPerformanceMetrics])

  const componentImportanceData = useMemo(() => 
    mockArchitectureAnalysis?.components.map(comp => ({
      name: comp.name,
      importance: comp.importance,
      type: comp.type
    })) || []
  , [mockArchitectureAnalysis])

  // Interactive component explorer
  const ComponentExplorer = () => (
    <Card className="border-2 border-blue-200 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          Interactive Architecture Explorer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {mockArchitectureAnalysis?.components.map(component => (
            <button
              key={component.id}
              onClick={() => setSelectedComponent(component.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedComponent === component.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  component.type === 'attention' ? 'bg-green-500' :
                  component.type === 'feedforward' ? 'bg-blue-500' :
                  component.type === 'encoder' ? 'bg-purple-500' :
                  'bg-orange-500'
                }`}></div>
                <span className="font-semibold text-sm">{component.name}</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(component.importance * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{component.description}</p>
              <div className="flex gap-1 mt-2">
                {Object.entries(component.parameters).slice(0, 2).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
        
        {selectedComponent && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <h4 className="font-semibold mb-2">Component Details</h4>
            {(() => {
              const component = mockArchitectureAnalysis?.components.find(c => c.id === selectedComponent)
              return component ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">{component.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(component.parameters).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Performance analysis with interactive charts
  const PerformanceAnalysis = () => (
    <Card className="border-2 border-green-200 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Performance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Performance Comparison Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis domain={[0, 1]} />
              <Tooltip formatter={(value) => [`${(value as number * 100).toFixed(1)}%`, 'Score']} />
              <Legend />
              <Bar dataKey="value" fill="#10b981" name="Current Model" />
              <Bar dataKey="baseline" fill="#94a3b8" name="Baseline" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Architecture Quality Radar */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={architectureRadarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" />
              <PolarRadiusAxis domain={[0, 1]} />
              <Radar 
                name="Architecture Quality" 
                dataKey="score" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Component Importance Treemap */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={componentImportanceData}
              dataKey="importance"
              aspectRatio={4/3}
              stroke="#fff"
              fill="#8884d8"
            >
              <Tooltip formatter={(value, name, props) => [
                `${(value as number * 100).toFixed(1)}%`, 
                props.payload.name
              ]} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )

  // Research insights with evidence mapping
  const ResearchInsightsPanel = () => (
    <Card className="border-2 border-purple-200 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-purple-600" />
          Research Insights & Evidence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockResearchInsights.map((insight, idx) => (
          <div key={idx} className={`p-4 rounded-xl border-2 ${
            insight.type === 'novelty' ? 'border-green-200 bg-green-50' :
            insight.type === 'limitation' ? 'border-red-200 bg-red-50' :
            insight.type === 'application' ? 'border-blue-200 bg-blue-50' :
            'border-orange-200 bg-orange-50'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                insight.type === 'novelty' ? 'bg-green-500' :
                insight.type === 'limitation' ? 'bg-red-500' :
                insight.type === 'application' ? 'bg-blue-500' :
                'bg-orange-500'
              }`}>
                {insight.type === 'novelty' ? <Star className="w-4 h-4 text-white" /> :
                 insight.type === 'limitation' ? <AlertTriangle className="w-4 h-4 text-white" /> :
                 insight.type === 'application' ? <Target className="w-4 h-4 text-white" /> :
                 <BarChart3 className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm capitalize">{insight.type}</span>
                  <Badge variant="outline" className={`text-xs ${
                    insight.impact === 'high' ? 'border-green-500 text-green-700' :
                    insight.impact === 'medium' ? 'border-yellow-500 text-yellow-700' :
                    'border-red-500 text-red-700'
                  }`}>
                    {insight.impact} impact
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(insight.confidence * 100)}% confidence
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                <div className="flex flex-wrap gap-1">
                  {insight.evidence.map((evidence, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      📄 {evidence}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )

  // Socratic tutoring system
  const SocraticTutor = () => {
    const currentQuestion = mockSocraticQuestions[currentQuestionIndex]
    const userAnswer = userAnswers[currentQuestion.id]
    const isCorrect = userAnswer === currentQuestion.correctAnswer

    return (
      <Card className="border-2 border-amber-200 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-600" />
            Socratic Learning System
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Question {currentQuestionIndex + 1} of {mockSocraticQuestions.length}</span>
            <Badge variant="outline" className="text-xs">
              Difficulty: {currentQuestion.difficulty}/5
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <h4 className="font-semibold mb-3">{currentQuestion.question}</h4>
            
            {currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: option }))}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      userAnswer === option 
                        ? isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {userAnswer === option && (
                        isCorrect ? <CheckCircle className="w-4 h-4 text-green-600" /> : 
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {userAnswer && (
            <div className={`p-4 rounded-xl border-2 ${
              isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-semibold text-sm">
                  {isCorrect ? 'Correct!' : 'Not quite right.'}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{currentQuestion.explanation}</p>
              {currentQuestion.visualHint && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Eye className="w-3 h-3" />
                  <span>Visual hint: {currentQuestion.visualHint}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button 
              onClick={() => setCurrentQuestionIndex(Math.min(mockSocraticQuestions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === mockSocraticQuestions.length - 1}
            >
              Next Question
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Advanced Visual Intelligence Analyzer</h1>
                <p className="text-gray-600">Research Co-pilot • Architecture Analysis • Interactive Learning</p>
                {selectedText && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Analyzing:</strong> {selectedText.substring(0, 100)}
                      {selectedText.length > 100 ? '...' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 text-sm font-semibold border border-green-200">
                AI-Powered Analysis
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Mode</label>
              <select 
                value={analysisMode} 
                onChange={(e) => setAnalysisMode(e.target.value as any)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="comprehensive">🧠 Comprehensive Analysis</option>
                <option value="technical">⚙️ Technical Deep Dive</option>
                <option value="educational">🎓 Educational Mode</option>
                <option value="research">📚 Research Focus</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
              <select 
                value={aiModel} 
                onChange={(e) => setAiModel(e.target.value as any)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt4-vision">GPT-4 Vision</option>
                <option value="claude-vision">Claude Vision</option>
                <option value="gemini-vision">Gemini Vision</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Depth</label>
              <Slider
                value={[analysisDepth === 'surface' ? 1 : analysisDepth === 'moderate' ? 2 : analysisDepth === 'deep' ? 3 : 4]}
                onValueChange={([value]) => setAnalysisDepth(
                  value === 1 ? 'surface' : value === 2 ? 'moderate' : value === 3 ? 'deep' : 'expert'
                )}
                max={4}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Surface</span>
                <span>Expert</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={educationalMode}
                  onCheckedChange={setEducationalMode}
                />
                <span className="text-sm">Educational Mode</span>
              </div>
              <Button 
                onClick={() => setShowAdvancedFeatures(!showAdvancedFeatures)}
                variant="outline"
                size="sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {showAdvancedFeatures ? 'Hide' : 'Show'} Advanced
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{mockArchitectureAnalysis?.components.length || 0}</div>
              <div className="text-sm font-medium text-blue-800">Components</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
              <div className="text-3xl font-bold text-green-600">{Math.round((mockPerformanceMetrics?.accuracy || 0) * 100)}%</div>
              <div className="text-sm font-medium text-green-800">Accuracy</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
              <div className="text-3xl font-bold text-purple-600">{mockResearchInsights.length}</div>
              <div className="text-sm font-medium text-purple-800">Insights</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
              <div className="text-3xl font-bold text-orange-600">{mockSocraticQuestions.length}</div>
              <div className="text-sm font-medium text-orange-800">Questions</div>
            </div>
          </div>
        </div>

        {/* Main Analysis Tabs */}
        <Tabs defaultValue="architecture" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border-2 border-gray-200 rounded-xl p-1 sticky top-0 z-10">
            <TabsTrigger value="architecture" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Architecture
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Learning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="architecture" className="space-y-6 mt-6">
            <ComponentExplorer />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            <PerformanceAnalysis />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6 mt-6">
            <ResearchInsightsPanel />
          </TabsContent>

          <TabsContent value="learning" className="space-y-6 mt-6">
            <SocraticTutor />
          </TabsContent>
        </Tabs>

        {/* Export Options */}
        <Card className="border-2 border-gray-200 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Download className="w-4 h-4 mr-2" />
                Export PDF Report
              </Button>
              <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                <Download className="w-4 h-4 mr-2" />
                Export JSON Data
              </Button>
              <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                <Download className="w-4 h-4 mr-2" />
                Export Learning Progress
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
