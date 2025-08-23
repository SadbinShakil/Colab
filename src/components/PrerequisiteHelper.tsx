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
  Brain,
  Lightbulb,
  ArrowRight,
  Link,
  RefreshCw,
  MessageSquare,
  GraduationCap,
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  FileText,
  Calculator,
  Microscope,
  Database,
  GitBranch,
  Target
} from 'lucide-react'

interface PrerequisiteAnalysis {
  prerequisites: string[]
  background: string
  domainContext: string
  priorMethods: string[]
  connections: string
  buildUp: string
  resources: string[]
}

interface PrerequisiteHelperProps {
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

export default function PrerequisiteHelper({ 
  isOpen, 
  onClose, 
  selectedText,
  documentContext,
  documentContent,
  documentTitle,
  documentAuthors,
  documentUrl,
  userId,
  userName
}: PrerequisiteHelperProps) {
  const [analysis, setAnalysis] = useState<PrerequisiteAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCustomQuestion, setShowCustomQuestion] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    background: true,
    prerequisites: true,
    priorMethods: false,
    connections: true,
    buildUp: false,
    resources: false
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-analyze when component opens
  useEffect(() => {
    if (isOpen && selectedText && !isLoading) {
      console.log('🎓 Auto-analyzing prerequisites for:', selectedText)
      analyzePrerequisites()
    }
  }, [isOpen, selectedText])

  const analyzeDocumentField = (title: string, content: string) => {
    const titleLower = title.toLowerCase()
    const contentLower = content.toLowerCase()
    
    // Field detection based on keywords
    if (titleLower.includes('neural') || titleLower.includes('deep learning') || titleLower.includes('machine learning') || 
        contentLower.includes('neural network') || contentLower.includes('deep learning')) {
      return 'machine_learning'
    }
    if (titleLower.includes('quantum') || contentLower.includes('quantum')) {
      return 'quantum_computing'
    }
    if (titleLower.includes('nlp') || titleLower.includes('natural language') || contentLower.includes('language model')) {
      return 'natural_language_processing'
    }
    if (titleLower.includes('computer vision') || titleLower.includes('image') || contentLower.includes('computer vision')) {
      return 'computer_vision'
    }
    if (titleLower.includes('blockchain') || contentLower.includes('blockchain')) {
      return 'blockchain'
    }
    if (titleLower.includes('bioinformatics') || titleLower.includes('genomics') || contentLower.includes('dna')) {
      return 'bioinformatics'
    }
    return 'general_computer_science'
  }

  const getFieldSpecificPrerequisites = (field: string) => {
    const prerequisites = {
      machine_learning: {
        math: ['Linear Algebra', 'Calculus', 'Statistics', 'Probability Theory'],
        programming: ['Python', 'NumPy', 'Pandas', 'Scikit-learn'],
        concepts: ['Supervised Learning', 'Unsupervised Learning', 'Neural Networks', 'Optimization'],
        papers: ['Gradient Descent', 'Backpropagation', 'Support Vector Machines']
      },
      quantum_computing: {
        math: ['Linear Algebra', 'Complex Numbers', 'Probability Theory'],
        physics: ['Quantum Mechanics', 'Quantum States', 'Quantum Gates'],
        concepts: ['Qubits', 'Superposition', 'Entanglement', 'Quantum Algorithms'],
        papers: ['Quantum Teleportation', 'Shor\'s Algorithm', 'Grover\'s Algorithm']
      },
      natural_language_processing: {
        math: ['Linear Algebra', 'Statistics', 'Information Theory'],
        programming: ['Python', 'NLTK', 'spaCy', 'Transformers'],
        concepts: ['Tokenization', 'Word Embeddings', 'Attention Mechanisms', 'Language Models'],
        papers: ['Word2Vec', 'BERT', 'Transformer Architecture', 'GPT']
      },
      computer_vision: {
        math: ['Linear Algebra', 'Calculus', 'Signal Processing'],
        programming: ['Python', 'OpenCV', 'PyTorch', 'TensorFlow'],
        concepts: ['Convolutional Neural Networks', 'Image Processing', 'Feature Detection'],
        papers: ['LeNet', 'AlexNet', 'ResNet', 'YOLO']
      },
      general_computer_science: {
        math: ['Discrete Mathematics', 'Linear Algebra', 'Statistics'],
        programming: ['Python', 'Algorithms', 'Data Structures'],
        concepts: ['Computational Complexity', 'Algorithm Design', 'Data Analysis'],
        papers: ['Foundational Computer Science Papers', 'Algorithm Analysis']
      }
    }
    return prerequisites[field] || prerequisites.general_computer_science
  }

  const buildPrerequisitePrompt = (text: string, customQ?: string) => {
    const isWholeDocumentAnalysis = text.includes('Analyze this entire research paper')
    
    if (customQ) {
      return `Help me understand the prerequisites for this research content: "${text}"

Specific Question: ${customQ}

Document Context:
- Title: ${documentTitle || 'Research Document'}
- Authors: ${documentAuthors || 'N/A'}
- URL: ${documentUrl || 'N/A'}

Please provide the background knowledge needed to understand this concept.`
    }

    if (isWholeDocumentAnalysis) {
      return `I want to understand the prerequisites and background knowledge needed BEFORE reading this research paper:

Document Context:
- Title: ${documentTitle || 'Research Document'}
- Authors: ${documentAuthors || 'Academic Authors'}  
- URL: ${documentUrl || 'N/A'}

Please provide a comprehensive "BEFORE YOU READ" prerequisite analysis:

1. **Key Prerequisites**: What fundamental concepts, theories, or mathematical background do I need BEFORE starting this paper?
2. **Domain Background**: What field knowledge and academic foundations should I have?
3. **Prior Methods**: What earlier research, techniques, or seminal papers should I know about first?
4. **Essential Concepts**: What are the core concepts I need to master before diving in?
5. **Learning Path**: What's the recommended study sequence to prepare for this paper?
6. **Preparation Resources**: Which specific papers, textbooks, or concepts should I study FIRST?

Create a "prerequisite roadmap" that prepares researchers to successfully understand this paper. Focus on what to learn BEFORE reading, not what's IN the paper.

Researcher: ${userName || 'Anonymous'}`
    }

    return `I need help understanding the prerequisites and background knowledge for this research content from an academic paper:

"${text}"

Document Context:
- Title: ${documentTitle || 'Research Document'}
- Authors: ${documentAuthors || 'Academic Authors'}
- URL: ${documentUrl || 'N/A'}

Please provide a comprehensive prerequisite analysis that includes:

1. **Key Prerequisites**: What concepts, theories, or methods do I need to know first?
2. **Domain Background**: Essential background knowledge for this field/area
3. **Prior Methods**: What earlier techniques or approaches led to this?
4. **Connections**: How does the background connect to what's presented here?
5. **Knowledge Build-Up**: Step-by-step path from basics to understanding this content
6. **Learning Resources**: Suggest specific papers, textbooks, or concepts to study

Focus on creating a learning pathway that helps researchers understand the foundations needed to grasp this advanced content.

Researcher: ${userName || 'Anonymous'}`
  }

  // Analyze prerequisites
  const analyzePrerequisites = async (customQ?: string) => {
    if (!selectedText.trim() && !customQ?.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const prompt = buildPrerequisitePrompt(selectedText, customQ)
      
      const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: prompt,
          documentContent: documentContent || '',
          documentTitle: documentTitle,
          documentAuthors: documentAuthors,
          documentUrl: documentUrl,
          userId: userId,
          userName: userName
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.response?.answer) {
        // Parse the response into structured sections
        const answer = data.response.answer
        
        console.log('🔍 Raw AI Response:', answer)
        
        const analysis: PrerequisiteAnalysis = {
          prerequisites: extractSection(answer, 'Key Prerequisites', 'Prerequisites', 'Concepts Needed'),
          background: extractSection(answer, 'Domain Background', 'Background', 'Foundation')[0] || answer.substring(0, 500),
          domainContext: extractSection(answer, 'Domain Context', 'Field Context', 'Academic Context')[0] || '',
          priorMethods: extractSection(answer, 'Prior Methods', 'Previous Approaches', 'Earlier Techniques'),
          connections: extractSection(answer, 'Connections', 'How it Connects', 'Relationship')[0] || '',
          buildUp: extractSection(answer, 'Knowledge Build-Up', 'Learning Path', 'Study Sequence')[0] || '',
          resources: extractSection(answer, 'Learning Resources', 'Resources', 'Further Reading')
        }
        
        console.log('📊 Parsed Analysis:', analysis)
        
        setAnalysis(analysis)
      } else {
        throw new Error(data.error || 'No analysis generated')
      }
    } catch (error) {
      console.error('Prerequisite analysis error:', error)
      setError(error instanceof Error ? error.message : 'Failed to analyze prerequisites')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to extract sections from AI response
  const extractSection = (text: string, ...headers: string[]): string[] => {
    for (const header of headers) {
      const regex = new RegExp(`(?:^|\\n)\\*?\\*?${header}\\*?\\*?:?\\s*\\n?([\\s\\S]*?)(?=\\n\\*?\\*?[A-Z][^:]*:?|$)`, 'i')
      const match = text.match(regex)
      if (match && match[1]) {
        return match[1]
          .split(/[-•]\s*/)
          .filter(item => item.trim().length > 0)
          .map(item => item.trim())
          .slice(0, 8) // Limit to 8 items per section
      }
    }
    return []
  }

  const copyToClipboard = async () => {
    if (!analysis) return
    
    const content = `Prerequisite Analysis: ${selectedText}

Prerequisites: ${analysis.prerequisites.join(', ')}
Background: ${analysis.background}
Prior Methods: ${analysis.priorMethods.join(', ')}
Connections: ${analysis.connections}
Learning Path: ${analysis.buildUp}
Resources: ${analysis.resources.join(', ')}`

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleCustomQuestion = () => {
    if (customQuestion.trim()) {
      analyzePrerequisites(customQuestion.trim())
      setShowCustomQuestion(false)
      setCustomQuestion('')
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'prerequisites': return <GraduationCap className="w-4 h-4" />
      case 'background': return <BookOpen className="w-4 h-4" />
      case 'priorMethods': return <GitBranch className="w-4 h-4" />
      case 'connections': return <Link className="w-4 h-4" />
      case 'buildUp': return <Target className="w-4 h-4" />
      case 'resources': return <Database className="w-4 h-4" />
      default: return <Brain className="w-4 h-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-green-500 to-teal-600 border-0 shadow-2xl">
        <CardHeader className="text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <GraduationCap className="w-8 h-8" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <BookOpen className="w-2 h-2 text-green-600" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {selectedText.includes('Analyze this entire research paper') ? 'Paper Prerequisites' : 'Prerequisite Helper'}
                  </CardTitle>
                  <p className="text-green-100 text-sm">
                    {selectedText.includes('Analyze this entire research paper') 
                      ? 'What to learn BEFORE reading this paper' 
                      : 'Background knowledge & learning path analysis'
                    }
                  </p>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  🎓 Learning Assistant
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Selected Content Display */}
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
              <div className="flex items-start space-x-2">
                <FileText className="w-4 h-4 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-100 mb-1">📚 Analyzing Content:</p>
                  <div className="text-sm text-white font-medium max-h-24 overflow-y-auto bg-white/10 p-2 rounded border">
                    {selectedText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 bg-white max-h-[70vh] overflow-y-auto">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomQuestion(!showCustomQuestion)}
              className="flex items-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask Specific Question</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center space-x-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Analysis'}</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzePrerequisites()}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Re-analyze</span>
            </Button>
          </div>

          {/* Custom Question Input */}
          {showCustomQuestion && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <label className="block text-sm font-medium text-green-700 mb-2">
                What specific background knowledge do you need help with?
              </label>
              <div className="flex gap-2">
                <textarea
                  ref={textareaRef}
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="e.g., 'What mathematical foundations do I need for this neural network architecture?'"
                  className="flex-1 p-3 border border-green-300 rounded-md resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={2}
                />
                <Button 
                  onClick={handleCustomQuestion}
                  disabled={!customQuestion.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                🎓 AI is analyzing prerequisites...
              </h3>
              <p className="text-gray-700">
                Identifying background knowledge and learning paths
              </p>
              <div className="mt-4 text-sm text-gray-600 bg-green-50 p-3 rounded inline-block">
                🔍 Building comprehensive prerequisite analysis
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <h3 className="text-xl font-bold text-red-700 mb-3">❌ Analysis Failed</h3>
              <p className="text-red-600 mb-6 text-lg bg-red-50 p-3 rounded border border-red-200">{error}</p>
              <Button 
                onClick={() => analyzePrerequisites()} 
                variant="outline"
                className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && !isLoading && (
            <div className="space-y-4">
              {/* Prerequisites Section */}
              {analysis.prerequisites.length > 0 && (
                <div className="border border-green-200 rounded-lg">
                  <button
                    onClick={() => toggleSection('prerequisites')}
                    className="w-full p-4 text-left bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-between rounded-t-lg border-b border-green-200"
                  >
                    <div className="flex items-center space-x-3">
                      {getSectionIcon('prerequisites')}
                      <h3 className="text-lg font-bold text-green-800">Key Prerequisites</h3>
                      <Badge variant="secondary" className="bg-green-200 text-green-800">
                        {analysis.prerequisites.length} concepts
                      </Badge>
                    </div>
                    {expandedSections.prerequisites ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.prerequisites && (
                    <div className="p-4 space-y-2">
                      {analysis.prerequisites.map((prereq, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-white border border-green-100 rounded-lg">
                          <div className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <p className="text-gray-700 flex-1">{prereq}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Background Knowledge Section */}
              {analysis.background && (
                <div className="border border-blue-200 rounded-lg">
                  <button
                    onClick={() => toggleSection('background')}
                    className="w-full p-4 text-left bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between rounded-t-lg border-b border-blue-200"
                  >
                    <div className="flex items-center space-x-3">
                      {getSectionIcon('background')}
                      <h3 className="text-lg font-bold text-blue-800">Domain Background</h3>
                    </div>
                    {expandedSections.background ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.background && (
                    <div className="p-4">
                      <div className="bg-white border border-blue-100 rounded-lg p-4">
                        <p className="text-gray-700 leading-relaxed">{analysis.background}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Prior Methods Section */}
              {analysis.priorMethods.length > 0 && (
                <div className="border border-purple-200 rounded-lg">
                  <button
                    onClick={() => toggleSection('priorMethods')}
                    className="w-full p-4 text-left bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-between rounded-t-lg border-b border-purple-200"
                  >
                    <div className="flex items-center space-x-3">
                      {getSectionIcon('priorMethods')}
                      <h3 className="text-lg font-bold text-purple-800">Prior Methods</h3>
                      <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                        {analysis.priorMethods.length} approaches
                      </Badge>
                    </div>
                    {expandedSections.priorMethods ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.priorMethods && (
                    <div className="p-4 space-y-2">
                      {analysis.priorMethods.map((method, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-white border border-purple-100 rounded-lg">
                          <ArrowRight className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700 flex-1">{method}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Connections Section */}
              {analysis.connections && (
                <div className="border border-orange-200 rounded-lg">
                  <button
                    onClick={() => toggleSection('connections')}
                    className="w-full p-4 text-left bg-orange-50 hover:bg-orange-100 transition-colors flex items-center justify-between rounded-t-lg border-b border-orange-200"
                  >
                    <div className="flex items-center space-x-3">
                      {getSectionIcon('connections')}
                      <h3 className="text-lg font-bold text-orange-800">Knowledge Connections</h3>
                    </div>
                    {expandedSections.connections ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.connections && (
                    <div className="p-4">
                      <div className="bg-white border border-orange-100 rounded-lg p-4">
                        <p className="text-gray-700 leading-relaxed">{analysis.connections}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Learning Path Section */}
              {analysis.buildUp && (
                <div className="border border-teal-200 rounded-lg">
                  <button
                    onClick={() => toggleSection('buildUp')}
                    className="w-full p-4 text-left bg-teal-50 hover:bg-teal-100 transition-colors flex items-center justify-between rounded-t-lg border-b border-teal-200"
                  >
                    <div className="flex items-center space-x-3">
                      {getSectionIcon('buildUp')}
                      <h3 className="text-lg font-bold text-teal-800">Learning Path</h3>
                    </div>
                    {expandedSections.buildUp ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.buildUp && (
                    <div className="p-4">
                      <div className="bg-white border border-teal-100 rounded-lg p-4">
                        <p className="text-gray-700 leading-relaxed">{analysis.buildUp}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resources Section */}
              {analysis.resources.length > 0 && (
                <div className="border border-indigo-200 rounded-lg">
                  <button
                    onClick={() => toggleSection('resources')}
                    className="w-full p-4 text-left bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-between rounded-t-lg border-b border-indigo-200"
                  >
                    <div className="flex items-center space-x-3">
                      {getSectionIcon('resources')}
                      <h3 className="text-lg font-bold text-indigo-800">Learning Resources</h3>
                      <Badge variant="secondary" className="bg-indigo-200 text-indigo-800">
                        {analysis.resources.length} resources
                      </Badge>
                    </div>
                    {expandedSections.resources ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.resources && (
                    <div className="p-4 space-y-2">
                      {analysis.resources.map((resource, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-white border border-indigo-100 rounded-lg">
                          <Database className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700 flex-1">{resource}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
