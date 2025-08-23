'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  GraduationCap, 
  BookOpen, 
  Brain, 
  TrendingUp, 
  Link, 
  FileText,
  Loader2,
  Copy,
  Check
} from 'lucide-react'

interface SmartPrerequisiteHelperProps {
  isOpen: boolean
  onClose: () => void
  documentTitle: string
  documentContent: string
  documentAuthors: string
  documentUrl: string
  selectedText?: string
}

interface FieldPrerequisites {
  math: string[]
  programming?: string[]
  concepts: string[]
  papers: string[]
  tools?: string[]
  background: string[]
}

interface PrerequisiteAnalysis {
  field: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  prerequisites: FieldPrerequisites
  learningPath: string[]
  timeEstimate: string
  resources: string[]
  keyPapers: string[]
}

export default function SmartPrerequisiteHelper({
  isOpen,
  onClose,
  documentTitle,
  documentContent,
  documentAuthors,
  documentUrl,
  selectedText = ''
}: SmartPrerequisiteHelperProps) {
  const [analysis, setAnalysis] = useState<PrerequisiteAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState<string>('')

  // 🧠 Intelligent field detection
  const analyzeDocumentField = (title: string, content: string): { field: string; confidence: number } => {
    const titleLower = title.toLowerCase()
    const contentLower = content.toLowerCase()
    
    const fieldPatterns = {
      'Machine Learning': ['neural', 'deep learning', 'machine learning', 'artificial intelligence', 'cnn', 'rnn', 'transformer'],
      'Computer Vision': ['computer vision', 'image processing', 'opencv', 'convolutional', 'object detection', 'segmentation'],
      'Natural Language Processing': ['nlp', 'natural language', 'text processing', 'language model', 'bert', 'gpt', 'tokenization'],
      'Quantum Computing': ['quantum', 'qubit', 'quantum computing', 'quantum algorithm', 'superposition', 'entanglement'],
      'Bioinformatics': ['bioinformatics', 'genomics', 'dna', 'protein', 'sequence analysis', 'phylogenetics'],
      'Blockchain': ['blockchain', 'cryptocurrency', 'smart contract', 'distributed ledger', 'consensus'],
      'Robotics': ['robotics', 'autonomous', 'robot', 'kinematics', 'control systems', 'sensor fusion'],
      'Cybersecurity': ['cybersecurity', 'encryption', 'security', 'cryptography', 'penetration testing'],
      'Data Science': ['data science', 'data analysis', 'big data', 'analytics', 'visualization', 'statistics'],
      'Software Engineering': ['software engineering', 'software architecture', 'design patterns', 'testing', 'agile']
    }

    let bestMatch = 'Computer Science'
    let bestScore = 0

    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      const score = patterns.reduce((acc, pattern) => {
        const titleMatches = (titleLower.match(new RegExp(pattern, 'g')) || []).length * 3
        const contentMatches = (contentLower.match(new RegExp(pattern, 'g')) || []).length
        return acc + titleMatches + contentMatches
      }, 0)

      if (score > bestScore) {
        bestScore = score
        bestMatch = field
      }
    }

    return { field: bestMatch, confidence: Math.min(bestScore / 10, 1) }
  }

  // 📚 Get field-specific prerequisites
  const getFieldPrerequisites = (field: string): FieldPrerequisites => {
    const prerequisites: { [key: string]: FieldPrerequisites } = {
      'Machine Learning': {
        math: ['Linear Algebra', 'Calculus', 'Statistics', 'Probability Theory', 'Optimization'],
        programming: ['Python', 'NumPy', 'Pandas', 'Scikit-learn', 'TensorFlow/PyTorch'],
        concepts: ['Supervised Learning', 'Unsupervised Learning', 'Neural Networks', 'Feature Engineering', 'Model Evaluation'],
        papers: ['Gradient Descent', 'Backpropagation Algorithm', 'Support Vector Machines', 'Random Forest'],
        tools: ['Jupyter Notebooks', 'Google Colab', 'Matplotlib', 'Seaborn'],
        background: ['Algorithm Design', 'Data Structures', 'Computer Programming Fundamentals']
      },
      'Computer Vision': {
        math: ['Linear Algebra', 'Calculus', 'Signal Processing', 'Fourier Transform'],
        programming: ['Python', 'OpenCV', 'PyTorch', 'TensorFlow', 'PIL/Pillow'],
        concepts: ['Image Processing', 'Convolutional Neural Networks', 'Feature Detection', 'Object Recognition'],
        papers: ['LeNet-5', 'AlexNet', 'ResNet', 'YOLO', 'R-CNN'],
        tools: ['OpenCV', 'ImageJ', 'MATLAB Computer Vision Toolbox'],
        background: ['Digital Image Processing', 'Pattern Recognition', 'Machine Learning Basics']
      },
      'Natural Language Processing': {
        math: ['Linear Algebra', 'Statistics', 'Information Theory', 'Probability'],
        programming: ['Python', 'NLTK', 'spaCy', 'Transformers', 'Hugging Face'],
        concepts: ['Tokenization', 'Word Embeddings', 'Attention Mechanisms', 'Language Models', 'Seq2Seq'],
        papers: ['Word2Vec', 'GloVe', 'BERT', 'Transformer Architecture', 'GPT'],
        tools: ['NLTK', 'spaCy', 'Gensim', 'Stanford CoreNLP'],
        background: ['Linguistics Basics', 'Text Processing', 'Machine Learning']
      },
      'Quantum Computing': {
        math: ['Linear Algebra', 'Complex Numbers', 'Probability Theory', 'Group Theory'],
        programming: ['Python', 'Qiskit', 'Cirq', 'Q#', 'PennyLane'],
        concepts: ['Qubits', 'Quantum Gates', 'Superposition', 'Entanglement', 'Quantum Algorithms'],
        papers: ["Shor's Algorithm", "Grover's Algorithm", 'Quantum Teleportation', 'Quantum Error Correction'],
        tools: ['IBM Quantum Experience', 'Google Cirq', 'Microsoft Q#'],
        background: ['Quantum Mechanics', 'Classical Computing', 'Algorithm Design']
      }
    }

    return prerequisites[field] || {
      math: ['Discrete Mathematics', 'Linear Algebra', 'Statistics'],
      programming: ['Python', 'Algorithms', 'Data Structures'],
      concepts: ['Problem Solving', 'Computational Thinking', 'Research Methodology'],
      papers: ['Foundational Computer Science Papers'],
      background: ['Computer Science Fundamentals', 'Mathematical Reasoning']
    }
  }

  // 🎯 Determine difficulty level
  const assessDifficulty = (field: string, content: string): 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' => {
    const complexTerms = ['algorithm', 'optimization', 'neural network', 'deep learning', 'quantum', 'theorem', 'proof']
    const advancedTerms = ['novel', 'state-of-the-art', 'breakthrough', 'pioneering', 'cutting-edge']
    
    const contentLower = content.toLowerCase()
    const complexCount = complexTerms.filter(term => contentLower.includes(term)).length
    const advancedCount = advancedTerms.filter(term => contentLower.includes(term)).length
    
    if (advancedCount >= 2 || complexCount >= 4) return 'Expert'
    if (complexCount >= 2) return 'Advanced'
    if (complexCount >= 1) return 'Intermediate'
    return 'Beginner'
  }

  // 📈 Generate learning path
  const generateLearningPath = (field: string, difficulty: string, prerequisites: FieldPrerequisites): string[] => {
    const basePath = [
      `Master ${prerequisites.math[0]} fundamentals`,
      `Learn ${prerequisites.programming?.[0] || 'programming'} basics`,
      `Study core ${field.toLowerCase()} concepts`,
      'Read foundational papers in the field',
      'Work on practical projects'
    ]

    const difficultyPaths = {
      'Beginner': [...basePath, 'Take online courses', 'Join study groups'],
      'Intermediate': [...basePath, 'Implement key algorithms', 'Read recent survey papers'],
      'Advanced': [...basePath, 'Study cutting-edge research', 'Attend conferences'],
      'Expert': [...basePath, 'Conduct original research', 'Collaborate with experts']
    }

    return difficultyPaths[difficulty as keyof typeof difficultyPaths] || basePath
  }

  // ⚡ Perform smart analysis using metadata
  const performSmartAnalysis = async () => {
    setIsLoading(true)
    
    try {
      // Try to use metadata-based analysis first
      const documentId = extractDocumentId(documentUrl)
      
      if (documentId) {
        const response = await fetch('/api/metadata-prerequisites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: documentId,
            metadata: {
              title: documentTitle,
              authors: documentAuthors,
              journal: 'Academic Venue', // This would come from document metadata
              year: '2024',
              abstract: '',
              tags: []
            }
          })
        })

        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.analysis) {
            // Convert metadata analysis to our format
            const metadataAnalysis: PrerequisiteAnalysis = {
              field: data.analysis.field,
              difficulty: data.analysis.difficulty,
              prerequisites: {
                math: data.analysis.prerequisites.mathematical || [],
                programming: data.analysis.prerequisites.programming || [],
                concepts: data.analysis.prerequisites.conceptual || [],
                papers: data.analysis.prerequisites.priorPapers || [],
                tools: [], // Could be derived from programming
                background: data.analysis.prerequisites.background || []
              },
              learningPath: data.analysis.learningPath || [],
              timeEstimate: data.analysis.timeEstimate || '3-6 months',
              resources: data.analysis.studyResources || [],
              keyPapers: data.analysis.prerequisites.priorPapers || []
            }
            
            setAnalysis(metadataAnalysis)
            setIsLoading(false)
            return
          }
        }
      }
      
      // Fallback to original analysis
      setTimeout(() => {
        const { field, confidence } = analyzeDocumentField(documentTitle, documentContent + selectedText)
        const prerequisites = getFieldPrerequisites(field)
        const difficulty = assessDifficulty(field, documentContent + selectedText)
        const learningPath = generateLearningPath(field, difficulty, prerequisites)
        
        const timeEstimates = {
          'Beginner': '3-6 months of dedicated study',
          'Intermediate': '6-12 months with prior background',
          'Advanced': '1-2 years including research experience',
          'Expert': '2+ years of specialized study and research'
        }

      const analysis: PrerequisiteAnalysis = {
        field,
        difficulty,
        prerequisites,
        learningPath,
        timeEstimate: timeEstimates[difficulty],
        resources: [
          `${field} textbooks and courses`,
          'Academic papers database access',
          'Online programming platforms',
          'Research community forums',
          'Hands-on project repositories'
        ],
        keyPapers: prerequisites.papers
      }

        setAnalysis(analysis)
        setIsLoading(false)
      }, 1500) // Realistic processing time
      
    } catch (error) {
      console.error('Metadata analysis failed:', error)
      // Fallback to original logic
      setTimeout(() => {
        const { field, confidence } = analyzeDocumentField(documentTitle, documentContent + selectedText)
        const prerequisites = getFieldPrerequisites(field)
        const difficulty = assessDifficulty(field, documentContent + selectedText)
        const learningPath = generateLearningPath(field, difficulty, prerequisites)
        
        const timeEstimates = {
          'Beginner': '3-6 months of dedicated study',
          'Intermediate': '6-12 months with prior background',
          'Advanced': '1-2 years including research experience',
          'Expert': '2+ years of specialized study and research'
        }

        const analysis: PrerequisiteAnalysis = {
          field,
          difficulty,
          prerequisites,
          learningPath,
          timeEstimate: timeEstimates[difficulty],
          resources: [
            `${field} textbooks and courses`,
            'Academic papers database access',
            'Online programming platforms',
            'Research community forums',
            'Hands-on project repositories'
          ],
          keyPapers: prerequisites.papers
        }

        setAnalysis(analysis)
        setIsLoading(false)
      }, 1500)
    }
  }

  // Helper function to extract document ID from URL
  const extractDocumentId = (url: string): string | null => {
    if (!url) return null
    
    // Try to extract ID from various URL patterns
    // Pattern 1: /uploads/timestamp-filename.pdf
    const uploadMatch = url.match(/\/uploads\/(\d+)-/)
    if (uploadMatch) return uploadMatch[1]
    
    // Pattern 2: /document/id
    const documentMatch = url.match(/\/document\/([^\/]+)/)
    if (documentMatch) return documentMatch[1]
    
    // Pattern 3: Just a numeric ID
    if (/^\d+$/.test(url)) return url
    
    return null
  }

  // Auto-analyze when opened
  useEffect(() => {
    if (isOpen && !analysis && !isLoading) {
      performSmartAnalysis()
    }
  }, [isOpen])

  // Copy functionality
  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(''), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  if (!isOpen) return null

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      'Beginner': 'bg-green-100 text-green-800',
      'Intermediate': 'bg-yellow-100 text-yellow-800',
      'Advanced': 'bg-orange-100 text-orange-800',
      'Expert': 'bg-red-100 text-red-800'
    }
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-green-50 to-teal-50">
        <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <GraduationCap className="h-8 w-8" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Smart Prerequisites Helper</CardTitle>
                <p className="text-green-100 opacity-90">AI-powered learning path analysis</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Analyzing Prerequisites...</h3>
              <p className="text-gray-600 text-center max-w-md">
                Using AI to detect field, assess difficulty, and generate personalized learning path
              </p>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-800">📄 {documentTitle}</h3>
                  <Badge className={getDifficultyColor(analysis.difficulty)}>
                    {analysis.difficulty} Level
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Field: {analysis.field}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Time: {analysis.timeEstimate}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Prerequisites: {analysis.prerequisites.concepts.length} concepts</span>
                  </div>
                </div>
              </div>

              {/* Prerequisites Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mathematical Prerequisites */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                      📐 Mathematical Foundation
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(analysis.prerequisites.math.join('\n'), 'math')}
                    >
                      {copied === 'math' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {analysis.prerequisites.math.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Programming Prerequisites */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                      💻 Programming & Tools
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy((analysis.prerequisites.programming || []).join('\n'), 'programming')}
                    >
                      {copied === 'programming' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(analysis.prerequisites.programming || []).map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Core Concepts */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">🧠 Core Concepts</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(analysis.prerequisites.concepts.join('\n'), 'concepts')}
                  >
                    {copied === 'concepts' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysis.prerequisites.concepts.map((concept, idx) => (
                    <div key={idx} className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <span className="text-green-800 font-medium">{concept}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Path */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-100">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">🛤️ Recommended Learning Path</h4>
                <div className="space-y-3">
                  {analysis.learningPath.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="text-gray-700 flex-1">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Papers */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">📚 Essential Papers</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(analysis.keyPapers.join('\n'), 'papers')}
                  >
                    {copied === 'papers' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.keyPapers.map((paper, idx) => (
                    <div key={idx} className="flex items-center space-x-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span className="text-indigo-800">{paper}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => performSmartAnalysis()}
                  className="flex items-center space-x-2"
                >
                  <Brain className="h-4 w-4" />
                  <span>Re-analyze</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://scholar.google.com', '_blank')}
                  className="flex items-center space-x-2"
                >
                  <Link className="h-4 w-4" />
                  <span>Find Papers</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCopy(JSON.stringify(analysis, null, 2), 'full')}
                  className="flex items-center space-x-2"
                >
                  {copied === 'full' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>Copy All</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
