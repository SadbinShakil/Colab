import React, { useState } from 'react'
import { Clipboard, ChevronDown, ChevronUp, Sparkles, Info, Users, Calendar, BookOpen, Lightbulb, FlaskConical, BarChart, AlertTriangle, Globe, Loader2, X, RefreshCw, Check, Brain, Target, Zap, GraduationCap, FileText, Star, TrendingUp, Award, Microscope, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface AISummaryPanelProps {
  summary: Record<string, string>
  loading: boolean
  open: boolean
  onClose: () => void
  onAskMore?: (section: string) => void
  onRegenerate?: () => void
  lastUpdated?: string
}

const sectionMeta: Record<string, { label: string; icon: React.ReactNode; askMore?: boolean; color: string; gradient: string; description: string; confidence?: number }> = {
  // Research Paper Sections
  documentInfo: { 
    label: 'Document Information', 
    icon: <BookOpen className="w-5 h-5" />, 
    color: 'bg-blue-100', 
    gradient: 'from-blue-500 to-blue-600',
    description: 'Title, authors, year, journal, and abstract',
    confidence: 98
  },

  motivation: { 
    label: 'Research Motivation', 
    icon: <Lightbulb className="w-5 h-5" />, 
    color: 'bg-yellow-100', 
    gradient: 'from-yellow-500 to-yellow-600',
    description: 'Why this research was conducted - problem statement',
    askMore: true,
    confidence: 91
  },
  keyFindings: { 
    label: 'Key Findings', 
    icon: <Target className="w-5 h-5" />, 
    color: 'bg-green-100', 
    gradient: 'from-green-500 to-green-600',
    description: 'Main research contributions and results',
    askMore: true,
    confidence: 94
  },
  methods: { 
    label: 'Research Methods', 
    icon: <Microscope className="w-5 h-5" />, 
    color: 'bg-blue-100', 
    gradient: 'from-blue-500 to-blue-600',
    description: 'Research design, experiments, and technical approach',
    askMore: true,
    confidence: 89
  },
  results: { 
    label: 'Results & Data', 
    icon: <TrendingUp className="w-5 h-5" />, 
    color: 'bg-indigo-100', 
    gradient: 'from-indigo-500 to-indigo-600',
    description: 'Quantitative results, statistics, and data analysis',
    askMore: true,
    confidence: 91
  },
  limitations: { 
    label: 'Limitations', 
    icon: <AlertTriangle className="w-5 h-5" />, 
    color: 'bg-red-100', 
    gradient: 'from-red-500 to-red-600',
    description: 'Study constraints, weaknesses, and methodological issues',
    askMore: true,
    confidence: 87
  },
  futureWork: { 
    label: 'Future Work', 
    icon: <ArrowRight className="w-5 h-5" />, 
    color: 'bg-purple-100', 
    gradient: 'from-purple-500 to-purple-600',
    description: 'What should be done next - research directions',
    askMore: true,
    confidence: 86
  },
  applications: { 
    label: 'Applications & Impact', 
    icon: <Zap className="w-5 h-5" />, 
    color: 'bg-teal-100', 
    gradient: 'from-teal-500 to-teal-600',
    description: 'Practical applications and industry adoption',
    confidence: 93
  },
  
  // Non-Research Document Sections
  contentType: {
    label: 'Document Type',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-orange-100',
    gradient: 'from-orange-500 to-orange-600',
    description: 'Classification of document content',
    confidence: 95
  },
  summary: {
    label: 'Content Summary',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-blue-100',
    gradient: 'from-blue-500 to-blue-600',
    description: 'Comprehensive content overview',
    confidence: 90
  },
  keyPoints: {
    label: 'Key Points',
    icon: <Target className="w-5 h-5" />,
    color: 'bg-green-100',
    gradient: 'from-green-500 to-green-600',
    description: 'Main takeaways and highlights',
    confidence: 88
  },
  structure: {
    label: 'Document Structure',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'bg-purple-100',
    gradient: 'from-purple-500 to-purple-600',
    description: 'Organization and layout',
    confidence: 85
  },
  audience: {
    label: 'Target Audience',
    icon: <Users className="w-5 h-5" />,
    color: 'bg-cyan-100',
    gradient: 'from-cyan-500 to-cyan-600',
    description: 'Intended readership and purpose',
    confidence: 87
  }
}

const sectionOrder = [
  'documentInfo', 'motivation', 'keyFindings', 'methods', 'results', 'limitations', 'futureWork', 'applications'
]

const nonResearchSectionOrder = [
  'contentType', 'summary', 'keyPoints', 'structure', 'audience'
]

export default function AISummaryPanel({ summary, loading, open, onClose, onAskMore, onRegenerate, lastUpdated }: AISummaryPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  const handleToggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className={`fixed top-0 right-0 h-full z-50 transition-transform duration-500 ${open ? 'translate-x-0' : 'translate-x-full'} w-full max-w-md bg-white shadow-2xl border-l border-gray-300 flex flex-col`} style={{ boxShadow: open ? '0 0 40px 0 rgba(0, 0, 0, 0.1)' : undefined }}>
      {/* Ultra-Compact Header */}
      <div className="bg-white border-b border-gray-300 p-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <div className="p-0.5 bg-gray-100 rounded border border-gray-300">
              <BookOpen className="w-2.5 h-2.5 text-gray-700" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-900">AI Document Analysis</h2>
              <p className="text-gray-600 text-xs">Comprehensive Research Summary</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {onRegenerate && (
              <button onClick={onRegenerate} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Regenerate">
                <RefreshCw className="w-3 h-3 text-gray-600" />
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Close">
              <X className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Inline Status */}
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1">
            <GraduationCap className="w-2.5 h-2.5 text-gray-700" />
            <span className="text-xs text-gray-700">Status:</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1 py-0">
              {loading ? 'Processing...' : 'Complete'}
            </Badge>
          </div>
          {!loading && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span>8 sections</span>
              <span>•</span>
              <span>94% confidence</span>
            </div>
          )}
        </div>
      </div>
      {/* Last updated */}
      {lastUpdated && (
        <div className="text-xs text-gray-600 px-2 pt-1 pb-1 border-t border-gray-200 bg-gray-50">Completed: {lastUpdated}</div>
      )}
      {/* Ultra-Compact Loading State */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="relative mb-4">
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center animate-pulse border border-gray-300">
              <BookOpen className="w-5 h-5 text-white animate-bounce" />
            </div>
          </div>
          
          <div className="text-center mb-4">
            <h3 className="text-sm font-bold text-gray-900 mb-1">AI Analysis in Progress</h3>
            <p className="text-gray-600 text-xs">Processing document...</p>
          </div>

          {/* Compact Progress Indicators */}
          <div className="w-full max-w-xs space-y-2 mb-4">
            <div className="flex justify-between text-xs text-gray-700 mb-1">
              <span>Analysis Progress</span>
              <span>95%</span>
            </div>
            <Progress value={95} className="h-1 bg-gray-200" />
          </div>

          {/* Compact Processing Steps */}
          <div className="w-full space-y-1">
            {sectionOrder.slice(0, 6).map((key, index) => {
              const meta = sectionMeta[key]
              return (
                <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200 animate-pulse" 
                     style={{ animationDelay: `${index * 100}ms` }}>
                  <div className={`p-1 rounded bg-gray-100 border border-gray-300 animate-pulse`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 text-xs">{meta.label}</div>
                  </div>
                  <div className="w-3 h-3 bg-gray-600 rounded-full animate-spin"></div>
                </div>
              )
            })}
          </div>
        </div>
              ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Ultra-Compact Content Type Indicator */}
          {summary.isResearchPaper !== undefined && (
            <div className={`p-1 rounded border ${summary.isResearchPaper ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-1">
                {summary.isResearchPaper ? (
                  <>
                    <div className="p-0.5 bg-blue-100 rounded border border-blue-200">
                      <GraduationCap className="w-2.5 h-2.5 text-blue-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900 text-xs">Research Paper</h3>
                      <p className="text-blue-700 text-xs">Academic publication</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-0.5 bg-gray-100 rounded border border-gray-200">
                      <FileText className="w-2.5 h-2.5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xs">General Document</h3>
                      <p className="text-gray-700 text-xs">Non-academic content</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Render appropriate sections based on content type */}
          {(summary.isResearchPaper ? sectionOrder : nonResearchSectionOrder).map((key, idx) => {
            const meta = sectionMeta[key]
            
            // Special handling for documentInfo section
            let value = summary[key] || 'Analysis pending...'
            let isExpandable = value.length > 120 || meta.askMore
            
            if (key === 'documentInfo' && summary.isResearchPaper) {
              // Combine all basic document information
              const title = summary.title || 'Title not available'
              const authors = summary.authors || 'Authors not available'
              const year = summary.year || 'Year not available'
              const journal = summary.journal || 'Journal not available'
              const abstract = summary.abstract || 'Abstract not available'
              
              value = `**Title:** ${title}\n\n**Authors:** ${authors}\n\n**Year:** ${year}\n\n**Journal/Conference:** ${journal}\n\n**Abstract:** ${abstract}`
              isExpandable = true // Always expandable since it contains multiple pieces of info
            }
            
            const isOpen = expanded[key] || !isExpandable
            return (
              <div key={key} className={`bg-white rounded border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md ${isOpen ? 'ring-1 ring-gray-300 shadow-gray-100' : ''}`}>
                
                {/* Ultra-Compact Section Header */}
                <div className="p-1.5 cursor-pointer group" onClick={() => isExpandable && handleToggle(key)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <div className={`p-0.5 rounded bg-gray-100 border border-gray-300`}>
                        {meta.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-xs">{meta.label}</h3>
                        <p className="text-gray-600 text-xs">{meta.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {/* Compact Confidence Badge */}
                      {meta.confidence && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-semibold text-xs px-1 py-0 border border-gray-300">
                          {meta.confidence}%
                        </Badge>
                      )}
                      
                      {/* Action Buttons */}
                      <button
                        className="p-1 rounded hover:bg-gray-100 transition-colors relative group"
                        onClick={e => { e.stopPropagation(); handleCopy(key, value) }}
                        title="Copy"
                      >
                        {copied === key ? <Check className="w-2.5 h-2.5 text-green-600" /> : <Clipboard className="w-2.5 h-2.5 text-gray-600" />}
                        {copied === key && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs rounded px-1 py-0 shadow-lg">Copied!</span>
                        )}
                      </button>
                      
                      {meta.askMore && onAskMore && (
                        <button
                          className="px-1.5 py-0.5 rounded bg-gray-800 text-white text-xs font-medium hover:bg-gray-700 transition-all"
                          onClick={e => { e.stopPropagation(); onAskMore(key) }}
                          title="Ask AI for more details"
                        >
                          <Brain className="w-2 h-2 mr-0.5 inline" />
                          More
                        </button>
                      )}
                      
                      {isExpandable && (
                        <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                          {isOpen ? 
                            <ChevronUp className="w-2.5 h-2.5 text-gray-500 group-hover:text-gray-700 transition-colors" /> : 
                            <ChevronDown className="w-2.5 h-2.5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compact Progress Bar */}
                  {meta.confidence && (
                    <div className="mt-1">
                      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                        <span>Confidence</span>
                        <span>{meta.confidence}%</span>
                      </div>
                      <Progress value={meta.confidence} className="h-0.5 bg-gray-200" />
                    </div>
                  )}
                </div>

                {/* Ultra-Compact Content Area */}
                <div className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-32' : 'max-h-0'}`}>
                  {isOpen && (
                    <div className="px-2 pb-1">
                      <div className="bg-gray-50 p-1.5 rounded border border-gray-200">
                        <div className="text-gray-800 text-xs leading-relaxed whitespace-pre-line font-serif max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {value}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* Mobile drag handle */}
      <div className="block md:hidden w-16 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-3" />
    </div>
  )
} 