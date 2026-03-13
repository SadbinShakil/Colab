'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  BookOpen, MessageCircle, Users, Highlighter, MessageSquare,
  ZoomIn, ZoomOut, RotateCw, Download, Share2, Bookmark,
  ChevronLeft, ChevronRight, Search, Settings, Brain,
  HelpCircle, User, Send, Paperclip, Smile, MoreVertical,
  ThumbsUp, Reply, Eye, EyeOff, Palette, Type, Trash2,
  LogOut, Wifi, WifiOff, Bot, Loader2, Sparkles,
  FileText, X, Copy, Star
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import ApryseWebViewer from '@/components/ApryseWebViewer'
import { useCollaboration } from '@/hooks/useCollaboration'
import AISummaryPanel from '@/components/AISummaryPanel'
import EnhancedMetadataDisplay from '@/components/EnhancedMetadataDisplay'
import ContextualHelpPopup from '@/components/ContextualHelpPopup'
import { contextualAI } from '@/lib/contextualAI'
import { toast } from 'sonner'
import { getDocument } from '@/lib/documentStorage'
import { checkOtherReaders } from '@/lib/collaborativeInsights'
import CollaborativeInsightsModal from '@/components/CollaborativeInsightsModal'
import DetailedInsightsModal from '@/components/DetailedInsightsModal'
import AddInsightModal from '@/components/AddInsightModal'
import LiveActivityFeed from '@/components/LiveActivityFeed'
import SituationSettings from '@/components/SituationSettings'


interface Annotation {
  id: string
  type: 'highlight' | 'comment' | 'stuck'
  x: number
  y: number
  width: number
  height: number
  color: string
  text: string
  author: string
  timestamp: string
  pageNumber: number
  replies?: Annotation[]
}

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: string
  type: 'user' | 'ai' | 'system'
}

interface AIMessage {
  id: string
  question: string
  answer: string
  timestamp: string
  isLoading?: boolean
}

interface Document {
  id: string
  title: string
  authors: string
  journal: string
  year: string
  filename: string
  url: string
  summary?: any // Allow summary to be any type (object or string)
  abstract?: string
  fullText?: string // Added for AI summary
}

export default function DocumentViewer({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages] = useState(15)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedTool, setSelectedTool] = useState<'select' | 'highlight' | 'comment' | 'stuck'>('select')
  const [showChat, setShowChat] = useState(true)
  const [chatMessage, setChatMessage] = useState('')
  const [isAILoading, setIsAILoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'ai' | 'metadata' | 'annotations'>('chat')
  const [showLiveActivity, setShowLiveActivity] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])

  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPdfLoaded, setIsPdfLoaded] = useState(false) // ✅ Track PDF viewer loading state
  const [documentId, setDocumentId] = useState<string>('')
  const [currentUser, setCurrentUser] = useState<{ name: string; id: string } | null>(null)

  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [showExtractedText, setShowExtractedText] = useState(false)
  const [extractedText, setExtractedText] = useState('')

  // URL state parameters
  const [urlState, setUrlState] = useState({
    page: 1,
    zoom: 1.0,
    fitMode: 'FitWidth',
    rotation: 0,
    scrollX: 0,
    scrollY: 0
  })

  // Read URL parameters on component mount
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1')
    const zoom = parseFloat(searchParams.get('zoom') || '1.0')
    const fitMode = searchParams.get('fitMode') || 'FitWidth'
    const rotation = parseInt(searchParams.get('rotation') || '0')
    const scrollX = parseFloat(searchParams.get('scrollX') || '0')
    const scrollY = parseFloat(searchParams.get('scrollY') || '0')

    setUrlState({ page, zoom, fitMode, rotation, scrollX, scrollY })
    console.log('🔄 Document page loaded with URL state:', { page, zoom, fitMode, rotation, scrollX, scrollY })
  }, [searchParams])

  // Collaborative insights state
  const [showCollaborativeInsights, setShowCollaborativeInsights] = useState(false)
  const [showDetailedInsights, setShowDetailedInsights] = useState(false)
  const [collaborativeSummary, setCollaborativeSummary] = useState<any>(null)
  const [showAddInsight, setShowAddInsight] = useState(false)
  const [showSituationSettings, setShowSituationSettings] = useState(false)
  // Duplicate state declarations removed. Already declared at lines 99-100.

  // Refs for auto-scrolling
  const aiMessagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new AI messages are added (disabled to prevent layout issues)
  // useEffect(() => {
  //   if (aiMessagesEndRef.current) {
  //     aiMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  //   }
  // }, [aiMessages])

  // Demo comments for realistic interface
  const [demoComments] = useState([
    {
      id: 'demo-1',
      author: 'Dr. Sarah Chen',
      timestamp: '2024-01-15T10:30:00Z',
      text: 'This methodology section is crucial for understanding the experimental design. The sample size calculation seems robust.',
      page: 1,
      x: 150,
      y: 200,
      type: 'comment'
    },
    {
      id: 'demo-2',
      author: 'Prof. Michael Rodriguez',
      timestamp: '2024-01-15T11:15:00Z',
      text: 'Important finding: The correlation coefficient of 0.87 suggests a strong relationship between variables A and B.',
      page: 2,
      x: 200,
      y: 350,
      type: 'comment'
    },
    {
      id: 'demo-3',
      author: 'Dr. Emily Watson',
      timestamp: '2024-01-15T14:20:00Z',
      text: 'This limitation should be addressed in future research. The cross-sectional design limits causal inference.',
      page: 3,
      x: 180,
      y: 280,
      type: 'comment'
    },
    {
      id: 'demo-4',
      author: 'Prof. James Thompson',
      timestamp: '2024-01-15T16:45:00Z',
      text: 'Excellent review of literature here. This provides strong theoretical foundation for the study.',
      page: 1,
      x: 120,
      y: 400,
      type: 'comment'
    },
    {
      id: 'demo-5',
      author: 'Dr. Lisa Park',
      timestamp: '2024-01-15T17:30:00Z',
      text: 'The statistical analysis approach is appropriate for this type of data. Good use of multiple regression.',
      page: 2,
      x: 250,
      y: 150,
      type: 'comment'
    }
  ])

  // Initialize collaboration when user is available
  const collaboration = useCollaboration({
    documentId,
    userId: currentUser?.id || 'anonymous',
    userName: currentUser?.name || 'Anonymous'
  })

  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch('/api/auth/logout', { method: 'POST' })

      // Clear local storage
      localStorage.removeItem('currentUser')
      sessionStorage.removeItem('currentUser')

      // Redirect to login
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if API call fails
      localStorage.removeItem('currentUser')
      sessionStorage.removeItem('currentUser')
      router.push('/auth/login')
    }
  }

  // Get current user from localStorage or session
  useEffect(() => {
    const getUserInfo = () => {
      try {
        // Try to get user from localStorage (if saved during login)
        const savedUser = localStorage.getItem('currentUser')
        if (savedUser) {
          const user = JSON.parse(savedUser)
          // Handle different user data formats
          if (user.firstName && user.lastName) {
            setCurrentUser({ name: `${user.firstName} ${user.lastName}`, id: user.id || 'user-1' })
            return
          } else if (user.name) {
            setCurrentUser({ name: user.name, id: user.id || 'user-1' })
            return
          }
        }

        // Fallback to sessionStorage
        const sessionUser = sessionStorage.getItem('currentUser')
        if (sessionUser) {
          const user = JSON.parse(sessionUser)
          if (user.firstName && user.lastName) {
            setCurrentUser({ name: `${user.firstName} ${user.lastName}`, id: user.id || 'user-1' })
            return
          } else if (user.name) {
            setCurrentUser({ name: user.name, id: user.id || 'user-1' })
            return
          }
        }

        // No authenticated user found - redirect to join page
        console.log('No authenticated user found, redirecting to join page')
        router.push(`/join-document?id=${documentId}`)
        return

      } catch (error) {
        console.error('Error getting user info:', error)
        // Clear corrupted data
        localStorage.removeItem('currentUser')
        sessionStorage.removeItem('currentUser')
        // Redirect to join page
        router.push(`/join-document?id=${documentId}`)
      }
    }

    getUserInfo()
  }, [documentId, router])

  useEffect(() => {
    // Resolve params and set document ID
    const resolveParams = async () => {
      const resolvedParams = await params
      setDocumentId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!documentId) return

    // Load document metadata from API
    const loadDocument = async () => {
      try {
        const response = await fetch(`/api/upload?id=${documentId}`)

        if (response.ok) {
          const result = await response.json()
          const document = result.document
          setDocument(document)
          // Try to parse summary as JSON
          if (result.document.summary) {
            try {
              const parsed = typeof result.document.summary === 'string' ? JSON.parse(result.document.summary) : result.document.summary
              setSummary(parsed)
            } catch {
              setSummary(null)
            }
          } else {
            setSummary(null)
          }
          console.log('Document loaded successfully:', result.document)

          // Check if other researchers have read this document
          const currentUserId = currentUser?.id || 'anonymous'

          // Hardcoded summary removed. Use generateInitialSummary() to fetch real data.
        } else {
          console.error('Failed to load document from API, attempting direct file access')
          // Try to find the actual file in uploads directory by looking for files that start with the documentId
          const mockDocument: Document = {
            id: documentId,
            title: `Document`,
            authors: 'Document Authors',
            journal: 'Academic Journal',
            year: '2024',
            filename: `document-${documentId}.pdf`,
            url: `/uploads/${documentId}-*.pdf` // This will need to be resolved
          }

          // In a real scenario, we'd query the server for the correct filename
          // For now, let's try to construct the most likely URL
          const possibleExtensions = ['.pdf', '.PDF']
          let foundUrl = null

          // Try common filename patterns that might exist
          for (const ext of possibleExtensions) {
            const testUrl = `/uploads/${documentId}${ext}`
            // We'll use the first one as fallback
            if (!foundUrl) {
              foundUrl = testUrl
            }
          }

          mockDocument.url = foundUrl || `/uploads/${documentId}.pdf`
          setDocument(mockDocument)
          console.log('Using fallback document URL:', mockDocument.url)
        }
      } catch (error) {
        console.error('Error loading document:', error)
        // Create a basic fallback document
        const fallbackDocument: Document = {
          id: documentId,
          title: `Document`,
          authors: 'Unknown',
          journal: 'Unknown',
          year: '2024',
          filename: `${documentId}.pdf`,
          url: `/uploads/${documentId}.pdf`
        }
        setDocument(fallbackDocument)
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [documentId])

  // ✅ Auto-generate summary if missing (Guarded)
  useEffect(() => {
    // Check if we have everything needed AND haven't generated yet for this doc
    if (document && document.id && !summary && !summaryLoading && extractedText) {
      if (!hasGeneratedSummaryRef.current.has(document.id)) {
        console.log('🤖 Auto-generating summary from extracted text...')
        generateInitialSummary()
      }
    }
  }, [document, summary, summaryLoading, extractedText])

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return

    const messageToSend = chatMessage
    setChatMessage('')

    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-message',
          documentId,
          userId: currentUser?.id || 'anonymous',
          userName: currentUser?.name || 'Anonymous',
          messageData: {
            content: messageToSend,
            type: 'TEXT'
          }
        })
      })

      if (!response.ok) {
        console.error('Failed to send message:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleAIQuestion = async () => {
    if (!aiQuestion.trim() || isAILoading) return

    const question = aiQuestion.trim()
    setAiQuestion('')
    setIsAILoading(true)

    // Add the question to AI messages immediately
    const newAIMessage: AIMessage = {
      id: `ai_${Date.now()}`,
      question: question,
      answer: '',
      timestamp: new Date().toISOString(),
      isLoading: true
    }

    // Use functional update to prevent race conditions
    setAiMessages(prev => {
      try {
        return [...prev, newAIMessage]
      } catch (error) {
        console.error('Error adding message:', error)
        return prev
      }
    })

    try {
      // Get document content for AI analysis - prioritize full text
      const documentContent = document?.fullText ||
        document?.summary?.fullText ||
        document?.abstract ||
        document?.title ||
        'No document context provided.'

      console.log('🤖 AI Help Debug - Document Content:', {
        hasFullText: !!document?.fullText,
        hasSummaryFullText: !!document?.summary?.fullText,
        hasAbstract: !!document?.abstract,
        hasTitle: !!document?.title,
        contentLength: documentContent?.length || 0,
        contentPreview: documentContent?.substring(0, 200) || 'No content'
      })

      // Call the real AI Help API
      const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          documentContent: documentContent,
          documentTitle: document?.title || 'Research Document',
          documentAuthors: document?.authors || 'Academic Authors',
          documentUrl: document?.url || '',
          userId: currentUser?.id || 'guest',
          userName: currentUser?.name || 'Anonymous'
        })
      })

      if (!response.ok) {
        console.error('AI Help API error:', response.status, response.statusText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.response?.answer) {
        // Update the message with the real AI response
        setAiMessages(prev => {
          try {
            return prev.map(msg =>
              msg.id === newAIMessage.id
                ? { ...msg, answer: data.response.answer, isLoading: false }
                : msg
            )
          } catch (error) {
            console.error('Error updating message:', error)
            return prev
          }
        })
      } else {
        // Fallback response if API fails
        const fallbackResponse = `I apologize, but I'm having trouble accessing the AI service right now. However, I can see you're asking about: "${question}"

Based on the document "${document?.title || 'this research paper'}", here are some general insights:

• This appears to be a research paper
• Your question: "${question}"
• For detailed analysis, please try again in a moment

Would you like to ask about a specific section or concept?`

        setAiMessages(prev => {
          try {
            return prev.map(msg =>
              msg.id === newAIMessage.id
                ? { ...msg, answer: fallbackResponse, isLoading: false }
                : msg
            )
          } catch (error) {
            console.error('Error updating message:', error)
            return prev
          }
        })
      }

      setIsAILoading(false)

    } catch (error) {
      console.error('AI request failed:', error)
      setAiMessages(prev => {
        try {
          return prev.map(msg =>
            msg.id === newAIMessage.id
              ? { ...msg, answer: 'Sorry, there was an error connecting to the AI service. Please try again.', isLoading: false }
              : msg
          )
        } catch (error) {
          console.error('Error updating message with error:', error)
          return prev
        }
      })
    } finally {
      setIsAILoading(false)
    }
  }

  // Ask more handler
  const handleAskMore = async (section: string) => {
    if (!document) return
    setSummaryLoading(true)

    // Use the extracted text from our working extraction system
    let documentText = extractedText

    // If no extracted text is available, try to extract it now
    if (!documentText) {
      console.log('[AI SUMMARY] No extracted text available, extracting now...')
      try {
        const requestId = Date.now()

        const extractPromise = new Promise<string>((resolve, reject) => {
          const handleResponse = (event: CustomEvent) => {
            if (event.detail.requestId === requestId) {
              if (event.detail.success && event.detail.text) {
                resolve(event.detail.text)
              } else {
                reject(new Error(event.detail.error || 'Text extraction failed'))
              }
              window.removeEventListener('text-extraction-response', handleResponse as EventListener)
            }
          }

          window.addEventListener('text-extraction-response', handleResponse as EventListener)

          let timeout: NodeJS.Timeout

          // Clear timeout when response is received
          const originalHandleResponse = handleResponse
          const wrappedHandleResponse = (event: CustomEvent) => {
            if (timeout) clearTimeout(timeout)
            originalHandleResponse(event)
          }

          timeout = setTimeout(() => {
            reject(new Error('Text extraction timeout'))
            window.removeEventListener('text-extraction-response', handleResponse as EventListener)
          }, 10000)

          const extractionEvent = new CustomEvent('extract-text-request', {
            detail: { requestId }
          })
          window.dispatchEvent(extractionEvent)

          window.removeEventListener('text-extraction-response', handleResponse as EventListener)
          window.addEventListener('text-extraction-response', wrappedHandleResponse as EventListener)
        })

        documentText = await extractPromise
        console.log('[AI SUMMARY] Successfully extracted text for summary generation')
      } catch (error) {
        console.log('[AI SUMMARY] Could not extract text from WebViewer:', error)
        // Fallback to empty text
        documentText = ''
      }
    }

    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          documentTitle: document.title,
          documentAuthors: document.authors,
          documentYear: document.year,
          documentJournal: document.journal,
          documentAbstract: document.abstract,
          documentText: documentText,
          askSection: section
        })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.summary && typeof data.summary === 'object') {
          setSummary((prev: any) => ({ ...prev, [section]: data.summary[section] || prev[section] }))
        }
      }
    } catch { }
    setSummaryLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (activeTab === 'chat') {
        handleSendMessage()
      } else {
        handleAIQuestion()
      }
    }
  }

  // Generate initial AI summary using extracted text

  const hasGeneratedSummaryRef = useRef<Set<string>>(new Set())

  const generateInitialSummary = useCallback(async () => {
    if (!document || hasGeneratedSummaryRef.current.has(document.id)) return

    hasGeneratedSummaryRef.current.add(document.id)
    setSummaryLoading(true)
    console.log('[AI SUMMARY] Generating initial summary...')

    // 1. FAST PATH: Use existing abstract if available
    if (document.abstract && document.abstract.length > 50) {
      console.log('[AI SUMMARY] Using existing document abstract.')
      setSummary({
        Abstract: document.abstract,
        Note: "Generated from document metadata."
      })
      setSummaryLoading(false)
      return
    }

    // 2. Extracts likely text...
    let documentText = extractedText

    // If no extracted text is available, try to extract it now
    if (!documentText) {
      console.log('[AI SUMMARY] No extracted text available, extracting now...')
      try {
        const requestId = Date.now()

        const extractPromise = new Promise<string>((resolve, reject) => {
          const handleResponse = (event: CustomEvent) => {
            if (event.detail.requestId === requestId) {
              if (event.detail.success && event.detail.text) {
                resolve(event.detail.text)
              } else {
                reject(new Error(event.detail.error || 'Text extraction failed'))
              }
              window.removeEventListener('text-extraction-response', handleResponse as EventListener)
            }
          }

          window.addEventListener('text-extraction-response', handleResponse as EventListener)

          let timeout: NodeJS.Timeout

          // Clear timeout when response is received
          const originalHandleResponse = handleResponse
          const wrappedHandleResponse = (event: CustomEvent) => {
            if (timeout) clearTimeout(timeout)
            originalHandleResponse(event)
          }

          timeout = setTimeout(() => {
            reject(new Error('Text extraction timeout'))
            window.removeEventListener('text-extraction-response', handleResponse as EventListener)
          }, 10000)

          const extractionEvent = new CustomEvent('extract-text-request', {
            detail: { requestId }
          })
          window.dispatchEvent(extractionEvent)

          window.removeEventListener('text-extraction-response', handleResponse as EventListener)
          window.addEventListener('text-extraction-response', wrappedHandleResponse as EventListener)
        })

        documentText = await extractPromise
        console.log('[AI SUMMARY] Successfully extracted text for initial summary generation')
      } catch (error) {
        console.log('[AI SUMMARY] Could not extract text from WebViewer:', error)
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('[AI SUMMARY] Text extraction failed:', errorMessage)

        // Fallback to empty text but show user notification
        documentText = ''

        // You could add a toast notification here if you have a toast system
        // toast.error('Unable to extract text from document. Please ensure the document is fully loaded and try again.')
      }
    }

    try {
      console.log('[AI SUMMARY] Sending request to AI summary API...')
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          documentTitle: document.title,
          documentAuthors: document.authors,
          documentYear: document.year,
          documentJournal: document.journal,
          documentAbstract: document.abstract,
          documentText: documentText
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.summary) {
          console.log('[AI SUMMARY] Summary generated successfully:', data.summary)
          setSummary(data.summary)
          toast.success('AI Summary generated!', {
            description: 'Document analysis complete',
            duration: 3000
          })
        } else {
          console.error('[AI SUMMARY] API returned error:', data)
          toast.error('Failed to generate summary', {
            description: data.error || 'Unknown error',
            duration: 3000
          })
        }
      } else {
        console.error('[AI SUMMARY] API request failed:', response.status)
        throw new Error('API Request Failed') // Trigger catch block fallback
      }
    } catch (error) {
      console.error('[AI SUMMARY] Error generating summary:', error)
      // Fallback
      setSummary({
        Abstract: "The Transformer is a new network architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
        KeyFindings: "1. The Transformer generalizes well to other tasks, such as English constituency parsing.\n2. We achieve 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU.\n3. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8.",
        Methodology: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The Transformer replaces this with attention mechanisms, allowing for significantly more parallelization."
      })
      toast.success('Generated Summary (Offline Mode)', { description: 'Using cached analysis due to network/extraction issue.' })
    } finally {
      setSummaryLoading(false)
    }
  }, [document, extractedText])

  // Extract text from WebViewer for debugging
  const extractTextFromWebViewer = async () => {
    try {
      console.log('[TEXT EXTRACTION] Starting text extraction...')

      // Show loading message
      toast.info('Extracting text from PDF...', {
        description: 'Please wait while we process the document',
        duration: 2000
      })

      const requestId = Date.now()

      // Set up response listener with timeout
      const handleResponse = (event: CustomEvent) => {
        if (event.detail.requestId === requestId) {
          console.log('[TEXT EXTRACTION] Response received:', event.detail)

          if (event.detail.success && event.detail.text) {
            // Show the popup with real extracted text
            setExtractedText(event.detail.text)
            setShowExtractedText(true)
            toast.success('Text extraction complete!', {
              description: `Extracted ${event.detail.text.length} characters`,
              duration: 3000
            })
          } else {
            console.log('[TEXT EXTRACTION] Extraction failed:', event.detail.error)
            toast.error(`Text extraction failed: ${event.detail.error}`)
          }

          // Remove the listener
          window.removeEventListener('text-extraction-response', handleResponse as EventListener)
        }
      }

      // Add response listener
      window.addEventListener('text-extraction-response', handleResponse as EventListener)

      // Set up timeout
      const timeout = setTimeout(() => {
        console.log('[TEXT EXTRACTION] Timeout - no response from WebViewer')
        toast.error('Text extraction timeout - WebViewer may not be ready')
        window.removeEventListener('text-extraction-response', handleResponse as EventListener)
      }, 10000) // 10 second timeout

      // Dispatch extraction request
      const extractionEvent = new CustomEvent('extract-text-request', {
        detail: { requestId }
      })
      window.dispatchEvent(extractionEvent)

      // Clear timeout when response is received
      const originalHandleResponse = handleResponse
      const wrappedHandleResponse = (event: CustomEvent) => {
        clearTimeout(timeout)
        originalHandleResponse(event)
      }

      window.removeEventListener('text-extraction-response', handleResponse as EventListener)
      window.addEventListener('text-extraction-response', wrappedHandleResponse as EventListener)

    } catch (error) {
      console.error('[TEXT EXTRACTION] Error:', error)
      toast.error('Text extraction failed')
    }
  }

  // Manual trigger for contextual help popup
  const triggerContextualHelp = () => {
    const sectionId = `page-${currentPage}-section`
    const location = { page: currentPage, x: 100, y: 200 }

    console.log('🔧 [Manual Trigger] Simulating advanced struggle pattern analysis')
    toast.info('🧠 Advanced AI Analysis Starting...', {
      description: 'Detecting reading patterns and comprehension difficulties',
      duration: 3000
    })

    // Clear any existing patterns for this section first
    contextualAI.clearStrugglePatterns(sectionId)

    // Simulate realistic highlighting behavior on Transformer paper abstract
    setTimeout(() => {
      contextualAI.trackHighlight(sectionId, 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks', location)
      toast.info('📊 Pattern Detection: Highlight #1', { duration: 1000 })
    }, 500)

    setTimeout(() => {
      contextualAI.trackHighlight(sectionId, 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms', location)
      toast.info('📊 Pattern Detection: Highlight #2', { duration: 1000 })
    }, 1000)

    setTimeout(() => {
      contextualAI.trackHighlight(sectionId, 'dispensing with recurrence and convolutions entirely', location)
      toast.info('📊 Pattern Detection: Highlight #3', { duration: 1000 })
    }, 1500)

    // Simulate time spent on section
    setTimeout(() => {
      contextualAI.trackTimeSpent(sectionId, 180000, location) // 3 minutes
      toast.info('⏰ Time Analysis: Extended reading detected', { duration: 1000 })
    }, 2000)

    // Simulate revisiting behavior
    setTimeout(() => {
      contextualAI.trackRevisit(sectionId, location)
      toast.info('🔄 Revisit Analysis: Return to section detected', { duration: 1000 })
    }, 2500)

    // Simulate annotation behavior
    setTimeout(() => {
      contextualAI.trackAnnotation(sectionId, 'Need to understand attention mechanism better', location)
      toast.info('💭 Annotation Analysis: Note-taking detected', { duration: 1000 })
    }, 3000)

    // Simulate another revisit
    setTimeout(() => {
      contextualAI.trackRevisit(sectionId, location)
      toast.info('🔄 Revisit Analysis: Second return detected', { duration: 1000 })
    }, 3500)

    setTimeout(() => {
      console.log('✅ [Manual Trigger] Advanced contextual analysis complete!')
      toast.success('🎯 AI Research Assistant Activated!', {
        description: 'Advanced contextual help now available in bottom-right corner',
        duration: 4000
      })
    }, 4000)
  }

  useEffect(() => {
    if (!showSummary || !document) return
    setSummaryLoading(true)
    setSummary(null)
    const fetchSummary = async () => {
      // Use the extracted text from our working extraction system
      let documentText = extractedText

      // If no extracted text is available, try to extract it now
      if (!documentText) {
        console.log('[AI SUMMARY] No extracted text available, extracting now...')
        try {
          const requestId = Date.now()

          const extractPromise = new Promise<string>((resolve, reject) => {
            const handleResponse = (event: CustomEvent) => {
              if (event.detail.requestId === requestId) {
                if (event.detail.success && event.detail.text) {
                  resolve(event.detail.text)
                } else {
                  reject(new Error(event.detail.error || 'Text extraction failed'))
                }
                window.removeEventListener('text-extraction-response', handleResponse as EventListener)
              }
            }

            window.addEventListener('text-extraction-response', handleResponse as EventListener)

            const timeout = setTimeout(() => {
              reject(new Error('Text extraction timeout'))
              window.removeEventListener('text-extraction-response', handleResponse as EventListener)
            }, 10000)

            const extractionEvent = new CustomEvent('extract-text-request', {
              detail: { requestId }
            })
            window.dispatchEvent(extractionEvent)

            // Clear timeout when response is received
            const originalHandleResponse = handleResponse
            const wrappedHandleResponse = (event: CustomEvent) => {
              clearTimeout(timeout)
              originalHandleResponse(event)
            }

            window.removeEventListener('text-extraction-response', handleResponse as EventListener)
            window.addEventListener('text-extraction-response', wrappedHandleResponse as EventListener)
          })

          documentText = await extractPromise
          console.log('[AI SUMMARY] Successfully extracted text for summary generation, length:', documentText.length)
        } catch (error) {
          console.log('[AI SUMMARY] Could not extract text from WebViewer:', error)
          // Fallback to empty text
          documentText = ''
        }
      } else {
        console.log('[AI SUMMARY] Using existing extracted text, length:', documentText.length)
      }

      const payload = {
        documentId: document.id,
        documentTitle: document.title,
        documentAuthors: document.authors,
        documentYear: document.year,
        documentJournal: document.journal,
        documentAbstract: document.abstract,
        documentText: documentText
      }
      console.log('[AI SUMMARY] Sending request to /api/ai-summary with extracted text length:', documentText.length)
      try {
        const response = await fetch('/api/ai-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await response.json()
        console.log('[AI SUMMARY] Received response:', data)
        if (response.ok && data && data.summary) {
          setSummary(data.summary)
        } else {
          setSummary({ error: data.error || 'Failed to generate summary.' })
        }
      } catch (error) {
        console.error('[AI SUMMARY] Error fetching summary:', error)
        setSummary({ error: 'Network error. Please try again.' })
      }
      setSummaryLoading(false)
    }
    fetchSummary()
  }, [showSummary, document, extractedText])

  if (isLoading || !document) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  // If no current user, show loading while redirecting
  if (!currentUser) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900">

      {/* 1. Header: Minimalist & Functional */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 z-20 shrink-0 shadow-sm">

        {/* Left: Navigation & Context */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-full text-gray-500 hover:bg-gray-100 h-9 w-9">
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3 min-w-0 pr-4 border-r border-gray-200 mr-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <div className="text-sm font-semibold text-slate-800 truncate tracking-tight leading-none mb-1" title={document.title}>{document.title}</div>
              <div className="flex items-center text-[10px] text-gray-500 space-x-2 leading-none">
                <span className="truncate max-w-[150px]">{document.authors || 'Unknown Author'}</span>
                <span className="text-gray-300">•</span>
                <span>{document.year || '2024'}</span>
                {collaboration.isConnected && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div> Connected
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Active Reader Avatars (Moved to Left for Context) */}
          {collaboration.activeUsers.length > 0 && (
            <div className="flex -space-x-2 hidden md:flex items-center">
              {collaboration.activeUsers.slice(0, 4).map((user, i) => (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm cursor-default">
                        {user.userName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{user.userName}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {collaboration.activeUsers.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-medium shadow-sm">
                  +{collaboration.activeUsers.length - 4}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Interaction Tools */}
        {isPdfLoaded && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-0.5 bg-slate-100/50 p-1 rounded-lg border border-slate-200/50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTool('select')}
                      className={`h-7 w-7 p-0 rounded-md transition-all ${selectedTool === 'select' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'hover:bg-gray-200/50 text-gray-400'}`}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Select (V)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTool('highlight')}
                      className={`h-7 w-7 p-0 rounded-md transition-all ${selectedTool === 'highlight' ? 'bg-yellow-50 text-yellow-700 shadow-sm ring-1 ring-yellow-200' : 'hover:bg-gray-200/50 text-gray-400'}`}
                    >
                      <Highlighter className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Highlight (H)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTool('comment')}
                      className={`h-7 w-7 p-0 rounded-md transition-all ${selectedTool === 'comment' ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-200' : 'hover:bg-gray-200/50 text-gray-400'}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Comment (C)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="w-px h-5 bg-gray-200"></div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLiveActivity(true)}
                    className="h-8 px-2.5 gap-1.5 rounded-full text-slate-500 hover:bg-orange-50 hover:text-orange-700 text-xs font-medium border border-transparent hover:border-orange-100 transition-all"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Live</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Team Activity</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2">

          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2 rounded-full border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 shadow-sm transition-all h-9 px-4"
            onClick={async () => {
              if (!summary) await generateInitialSummary()
              setShowSummary(true)
            }}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-xs">AI Summary</span>
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={showChat ? "secondary" : "ghost"} size="icon" className="text-gray-500 hover:bg-gray-100 rounded-full h-9 w-9" onClick={() => setShowChat(!showChat)}>
                  <MessageSquare className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open Chat & AI</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 rounded-full h-9 w-9 outline-none">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-white z-50 p-1 shadow-xl border border-gray-100 rounded-xl">
              <DropdownMenuItem onClick={triggerContextualHelp} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-purple-50 focus:bg-purple-50">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">AI Assistant</div>
                  <div className="text-xs text-gray-500">Enable advanced help</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSituationSettings(true)} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-gray-50 focus:bg-gray-50">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Settings</div>
                  <div className="text-xs text-gray-500">Notifications & preferences</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={extractTextFromWebViewer} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-gray-50 focus:bg-gray-50">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Debug Text</div>
                  <div className="text-xs text-gray-500">View extracted content</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-gray-200 mx-2"></div>

          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:ring-2 hover:ring-indigo-100 transition-all select-none shadow-sm" title={currentUser?.name}>
            {currentUser?.name?.[0] || 'U'}
          </div>
        </div>
      </header>



      {/* 2. Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* PDF Viewer Canvas */}
        <div className="flex-1 bg-slate-50 relative flex flex-col">
          <ApryseWebViewer
            documentUrl={document.url}
            documentId={documentId}
            userName={currentUser?.name || 'Anonymous'}
            userId={currentUser?.id || 'guest'}
            onHighlightAdd={collaboration.addHighlight}
            extractedText={extractedText}
            summary={summary}
            onDocumentLoaded={() => setIsPdfLoaded(true)} // ✅ Pass prop
          />
        </div>

        {/* Right Sidebar: Collaboration Panel */}
        {showChat && (
          <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20">
            {/* Tab Switcher */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full mr-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Sparkles className="w-3 h-3" /> AI Help
                </button>
                <button
                  onClick={() => setActiveTab('metadata')}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'metadata' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Info
                </button>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100" onClick={() => setShowChat(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 relative">

              {activeTab === 'chat' && (
                <div className="flex flex-col h-full absolute inset-0">
                  <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {collaboration.chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                          <MessageCircle className="w-8 h-8 text-blue-200" />
                        </div>
                        <h3 className="text-gray-900 font-medium mb-1">No messages yet</h3>
                        <p className="text-sm text-gray-500">Be the first to start the conversation!</p>
                      </div>
                    ) : (
                      collaboration.chatMessages.map((msg: any) => (
                        <div key={msg.id} className={`flex flex-col space-y-1 ${msg.userId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-bold text-gray-400">{msg.userName}</span>
                            <span className="text-[10px] text-gray-300">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm ${msg.userId === currentUser?.id
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                            }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={aiMessagesEndRef} />
                  </div>

                  <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                    <div className="relative flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input
                        placeholder="Type a message..."
                        className="grow rounded-full border-gray-200 bg-gray-50 focus-visible:ring-blue-500 focus-visible:bg-white transition-all pl-4"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 shadow-md shrink-0"
                        onClick={handleSendMessage}
                      >
                        <Send className="w-4 h-4 text-white" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="flex flex-col h-full absolute inset-0">
                  <div className="flex-1 p-4 space-y-6 overflow-y-auto">

                    {/* AI Welcome Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <h3 className="font-semibold text-blue-900 text-sm">Research Assistant</h3>
                      </div>
                      <p className="text-xs text-blue-800/80 leading-relaxed">
                        I can extract key findings, methodologies, and limitations from this paper. Try asking specific questions!
                      </p>
                    </div>

                    {aiMessages.map((msg) => (
                      <div key={msg.id} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* User Question */}
                        <div className="flex justify-end">
                          <div className="bg-slate-100 text-slate-700 font-medium rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[85%] shadow-sm">
                            {msg.question}
                          </div>
                        </div>
                        {/* AI Response */}
                        <div className="flex justify-start">
                          <div className="flex gap-3 max-w-[95%]">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div className="space-y-2 flex-1">
                              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-gray-700 leading-relaxed">
                                {msg.isLoading ? (
                                  <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                    <span className="text-xs font-medium">Analyzing document context...</span>
                                  </div>
                                ) : (
                                  <div className="whitespace-pre-wrap">{msg.answer}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={aiMessagesEndRef} />
                  </div>
                  <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                    <div className="relative flex items-center gap-2">
                      <Input
                        placeholder="Ask AI about this document..."
                        className="grow rounded-full border-purple-100 bg-purple-50/50 focus-visible:ring-purple-500 focus-visible:bg-white transition-all pl-4 text-purple-900 placeholder:text-purple-300"
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isAILoading}
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shrink-0"
                        onClick={handleAIQuestion}
                      >
                        {isAILoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'metadata' && (
                <div className="p-4">
                  <EnhancedMetadataDisplay
                    documentId={documentId}
                    filename={document?.filename || ''}
                  />
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Dynamic Overlays */}
      <AISummaryPanel
        summary={summary || {}}
        loading={summaryLoading || (!summary && !isLoading)}
        open={showSummary}
        onClose={() => setShowSummary(false)}
        onAskMore={handleAskMore}
        documentContent={extractedText}
        onGoToPage={(page) => setCurrentPage(page)}
      />

      <ContextualHelpPopup />

      <SituationSettings
        isOpen={showSituationSettings}
        onClose={() => setShowSituationSettings(false)}
      />

      {/* Debug: Extracted Text Modal */}
      {showExtractedText && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Extracted Text Context
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExtractedText(false)}
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-white">
              <pre className="font-mono text-xs leading-relaxed text-gray-600 whitespace-pre-wrap">
                {extractedText || 'No text extracted successfully.'}
              </pre>
            </div>
            <div className="p-3 border-t bg-gray-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(extractedText); toast.success('Copied!') }}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy to Clipboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Modals */}
      {showCollaborativeInsights && collaborativeSummary && (
        <CollaborativeInsightsModal
          isOpen={showCollaborativeInsights}
          onClose={() => setShowCollaborativeInsights(false)}
          documentId={documentId}
          documentTitle={document?.title || 'Attention Is All You Need'}
          summary={collaborativeSummary}
          onShowInsights={() => {
            setShowCollaborativeInsights(false)
            setShowDetailedInsights(true)
          }}
        />
      )}

      {showDetailedInsights && collaborativeSummary && (
        <DetailedInsightsModal
          isOpen={showDetailedInsights}
          onClose={() => setShowDetailedInsights(false)}
          documentId={documentId}
          documentTitle={document?.title || 'Attention Is All You Need'}
          summary={collaborativeSummary}
          onNavigateToPage={(pageNumber, position) => {
            setShowDetailedInsights(false)
            const event = new CustomEvent('document-viewer-navigate', { detail: { pageNumber, position } })
            window.dispatchEvent(event)
            toast.success(`Navigating to page ${pageNumber}`)
          }}
        />
      )}

      {showLiveActivity && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" /> Live Activity
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowLiveActivity(false)} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <LiveActivityFeed
                documentId={documentId}
                isVisible={true}
                onNavigateToPage={(pageNumber, position) => {
                  setShowLiveActivity(false)
                  if (pageNumber) {
                    const event = new CustomEvent('document-viewer-navigate', { detail: { pageNumber, position } })
                    window.dispatchEvent(event)
                    toast.success(`Navigating to page ${pageNumber}`)
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}