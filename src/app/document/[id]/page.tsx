'use client'

import { useState, useRef, useEffect } from 'react'
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
          setDocument(result.document)
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
          
          // For demo purposes, show collaborative insights for any document
          // In production, this would check actual data
          setTimeout(() => {
            // Demo collaborative summary for "Attention Is All You Need"
            const demoSummary = {
              documentId: "attention-is-all-you-need",
              totalReaders: 12,
              totalInsights: 10,
              topInsights: [
                {
                  id: "demo-1",
                  type: "insight",
                  content: "The key innovation here is the multi-head attention mechanism. The paper shows how different attention heads can focus on different aspects of the input sequence, which is crucial for understanding the model's interpretability.",
                  userName: "Dr. Sarah Chen",
                  likes: 12,
                  replies: []
                },
                {
                  id: "demo-2", 
                  type: "understanding",
                  content: "The residual connections and layer normalization are crucial for training deep transformers. Without them, the gradients would vanish in the deeper layers. This is a key insight for architecture design.",
                  userName: "Prof. Lisa Thompson",
                  likes: 18,
                  replies: []
                },
                {
                  id: "demo-3",
                  type: "highlight",
                  content: "The paper's impact on the field is enormous. It introduced a paradigm shift from recurrent to attention-based architectures, influencing almost all subsequent NLP research.",
                  userName: "Prof. Amanda White",
                  likes: 20,
                  replies: []
                }
              ],
              commonConfusions: [
                "Positional encoding formula and sin/cos functions",
                "Why 8 attention heads specifically",
                "Computational complexity for long sequences"
              ],
              keyInsights: [
                "Multi-head attention mechanism enables different focus patterns",
                "Residual connections and layer normalization prevent gradient vanishing",
                "Self-attention handles variable-length sequences better than RNNs",
                "Positional encoding allows learning relative positions",
                "The architecture introduced a paradigm shift in NLP"
              ],
              readingTime: 360, // 6 minutes
              lastUpdated: new Date().toISOString()
            }
            setCollaborativeSummary(demoSummary)
            setShowCollaborativeInsights(true)
          }, 3000) // 3 second delay for demo
        } else {
          console.error('Failed to load document from API, attempting direct file access')
          // Try to find the actual file in uploads directory by looking for files that start with the documentId
          const mockDocument: Document = {
            id: documentId,
            title: 'Research Document',
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
          title: 'Document',
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
    } catch {}
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
  const generateInitialSummary = async () => {
    if (!document) return
    
    setSummaryLoading(true)
    console.log('[AI SUMMARY] Generating initial summary...')
    
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
        toast.error('Failed to generate summary', {
          description: `HTTP ${response.status}`,
          duration: 3000
        })
      }
    } catch (error) {
      console.error('[AI SUMMARY] Error generating summary:', error)
      toast.error('Failed to generate summary', {
        description: 'Network error',
        duration: 3000
      })
    } finally {
      setSummaryLoading(false)
    }
  }

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
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <a href="/dashboard">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </a>
            </Button>
            <div>
              <h1 className="font-semibold text-lg">{document.title}</h1>
              <p className="text-sm text-muted-foreground">{document.authors}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Collaboration Status */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {collaboration.isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm text-gray-600">
                  {collaboration.isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
              {/* Active Users */}
              {collaboration.activeUsers.length > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="flex -space-x-1">
                    {collaboration.activeUsers.slice(0, 3).map((user, index) => (
                      <div key={user.userId || index} className="relative">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs">
                          {(user.userName || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white bg-green-500" />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">
                    {collaboration.activeUsers.length} active
                  </span>
                </div>
              )}
            </div>
            {/* AI Summary Button in header, top right */}
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold flex items-center space-x-2 shadow-md hover:scale-105 transition-transform"
              onClick={async () => {
                if (!summary) {
                  // Generate initial summary if none exists
                  await generateInitialSummary()
                }
                setShowSummary(true)
              }}
              title="Show AI Summary"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden md:inline">AI Summary</span>
            </Button>

            
            {/* AI Research Assistant Trigger Button */}
                    <Button
          variant="outline"
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold flex items-center justify-center shadow-md hover:scale-105 transition-transform border-purple-600 w-8 h-8 p-0"
          onClick={triggerContextualHelp}
          title="Activate AI Research Assistant - Advanced contextual help system"
        >
          <Brain className="h-4 w-4" />
        </Button>
        
                  <Button
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold flex items-center justify-center shadow-md hover:scale-105 transition-transform border-green-600 w-8 h-8 p-0"
            onClick={extractTextFromWebViewer}
            title="Extract and display text from PDF for debugging"
          >
            <FileText className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold flex items-center justify-center shadow-md hover:scale-105 transition-transform border-orange-600 w-8 h-8 p-0"
            onClick={() => setShowAddInsight(true)}
            title="Add your reading insight to help other researchers"
          >
            <Star className="h-4 w-4" />
          </Button>


            {/* User Menu */}
            <div className="relative group">
              <Button variant="outline" size="sm" className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {currentUser?.name || 'User'}
              </Button>
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
             </header>

       <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="w-16 border-r border-gray-200 bg-muted/30 flex flex-col items-center py-4 space-y-2">
          <Button
            variant={selectedTool === 'select' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTool('select')}
            className="w-10 h-10 p-0"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedTool === 'highlight' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTool('highlight')}
            className="w-10 h-10 p-0"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedTool === 'comment' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTool('comment')}
            className="w-10 h-10 p-0"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedTool === 'stuck' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTool('stuck')}
            className="w-10 h-10 p-0"
          >
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLiveActivity(true)}
            className="w-10 h-10 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            title="Live Activity Feed"
          >
            <Users className="h-4 w-4" />
          </Button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 flex flex-col">
          {/* PDF Content */}
          <div className="flex-1 flex flex-col">
            <ApryseWebViewer 
              documentUrl={document.url}
              documentId={documentId}
              userName={currentUser?.name || 'Anonymous'}
              userId={currentUser?.id || 'guest'}
              onHighlightAdd={collaboration.addHighlight}
              // onAnnotationAdd={collaboration.addAnnotation} // DISABLED - using Firestore instead
              onBroadcastAnnotationChange={collaboration.broadcastAnnotationChange}
              onSyncAnnotations={collaboration.syncAnnotations}
              realtimeAnnotations={[]} // DISABLED - using Firestore instead
              annotationSubscriberCount={collaboration.annotationSubscriberCount}
              extractedText={extractedText}
            />
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 border-l border-gray-200 bg-background flex flex-col h-full">
            {/* Chat Header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold">Discussion & AI Help</h3>
                  {collaboration.isConnected && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600">Live</span>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
              
                           {/* Tab Navigation */}
             <div className="bg-gray-100 rounded-lg p-1 overflow-x-auto">
               <div className="flex space-x-1 min-w-max">
                 <Button 
                   variant={activeTab === 'chat' ? 'default' : 'ghost'} 
                   size="sm" 
                   className="h-8 whitespace-nowrap"
                   onClick={() => setActiveTab('chat')}
                 >
                   <MessageCircle className="h-3 w-3 mr-1" />
                   Chat
                 </Button>
                 <Button 
                   variant={activeTab === 'ai' ? 'default' : 'ghost'} 
                   size="sm" 
                   className="h-8 whitespace-nowrap"
                   onClick={() => setActiveTab('ai')}
                 >
                   <Sparkles className="h-3 w-3 mr-1" />
                   AI Help
                 </Button>
                 <Button 
                   variant={activeTab === 'metadata' ? 'default' : 'ghost'} 
                   size="sm" 
                   className="h-8 whitespace-nowrap"
                   onClick={() => setActiveTab('metadata')}
                 >
                   <Brain className="h-3 w-3 mr-1" />
                   Metadata
                 </Button>
                 <Button 
                   variant={activeTab === 'annotations' ? 'default' : 'ghost'} 
                   size="sm" 
                   className="h-8 whitespace-nowrap"
                   onClick={() => setActiveTab('annotations')}
                 >
                   <MessageSquare className="h-3 w-3 mr-1" />
                   Annotations
                 </Button>
               </div>
             </div>
            </div>

            {/* Content Area */}
            {activeTab === 'chat' ? (
              /* Chat Tab */
              <>
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-20 min-h-0 max-h-full">
                  {collaboration.chatMessages.map((msg: any) => (
                    <div key={msg.id} className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-sm text-white">
                          👤
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">
                              {msg.userName}
                              {msg.userId === currentUser?.id && ' (You)'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            {msg.content}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Like
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              <Reply className="h-3 w-3 mr-1" />
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="border-t border-gray-200 p-4 pr-20">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type a message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleSendMessage} disabled={!chatMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Paperclip className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Smile className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">Press Enter to send</span>
                  </div>
                </div>
              </>
            ) : activeTab === 'ai' ? (
              /* AI Help Tab - Simplified */
              <div className="flex flex-col h-full min-h-0">
                {/* AI Messages - Simplified with scrollable header */}
                <div className="flex-1 overflow-y-auto pr-20 min-h-0" style={{ height: '400px' }}>
                  {/* AI Help Info - Now scrollable */}
                  <div className="border-b border-gray-200 p-3 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center space-x-2 mb-1">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-blue-800 text-sm">Advanced AI Research Assistant</h3>
                    </div>
                    <p className="text-xs text-blue-700">
                      I'm your intelligent research companion! I can analyze this paper in detail, answer general questions, help with research, or just chat. What would you like to know?
                    </p>
                  </div>

                  {/* Messages Container */}
                  <div className="p-3 space-y-2">
                  {aiMessages.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-gray-400 mb-1">💡</div>
                      <p className="text-xs text-gray-500">Start a conversation with AI</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-blue-600 font-medium">Try asking:</p>
                        <div className="text-xs text-blue-600 space-y-0.5">
                          <div>• "What is the main research question?"</div>
                          <div>• "Explain the methodology section"</div>
                          <div>• "What are the key findings?"</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    aiMessages.map((msg) => (
                      <div key={msg.id} className="space-y-1">
                        {/* Question */}
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                            👤
                          </div>
                          <div className="flex-1">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm">
                              {msg.question}
                            </div>
                          </div>
                        </div>

                        {/* Answer */}
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white">
                            🤖
                          </div>
                          <div className="flex-1">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-sm">
                              {msg.isLoading ? (
                                <div className="flex items-center space-x-2">
                                  <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                                  <span className="text-purple-700 text-xs">Thinking...</span>
                                </div>
                              ) : (
                                <div className="text-sm">{msg.answer}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={aiMessagesEndRef} />
                  </div>
                </div>

                {/* AI Input - Simplified */}
                <div className="border-t border-gray-200 p-2 pr-20 bg-white">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Ask AI about this document..."
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                      disabled={isAILoading}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAIQuestion}
                      disabled={!aiQuestion.trim() || isAILoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isAILoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
                         ) : activeTab === 'annotations' ? (
               /* Annotations Tab */
               <div className="flex-1 overflow-y-auto p-4">
                 <div className="mb-4">
                   <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                     <MessageSquare className="w-5 h-5 text-purple-500" />
                     Research Annotations ({demoComments.length})
                   </h3>
                   <p className="text-sm text-gray-600">
                     View and manage all annotations and comments on this document
                   </p>
                 </div>
                 
                 <div className="space-y-4">
                   {demoComments.map((comment) => (
                     <div key={comment.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors shadow-sm">
                       <div className="flex items-start justify-between mb-3">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium">
                             {comment.author.split(' ').map(n => n[0]).join('')}
                           </div>
                           <div>
                             <span className="font-medium text-gray-800">{comment.author}</span>
                             <div className="text-sm text-gray-500">Page {comment.page}</div>
                           </div>
                         </div>
                         <div className="text-right">
                           <span className="text-sm text-gray-500">
                             {new Date(comment.timestamp).toLocaleDateString()}
                           </span>
                           <div className="text-xs text-gray-400">
                             {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                         </div>
                       </div>
                       <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-purple-400">
                         <p className="text-gray-700 leading-relaxed">{comment.text}</p>
                       </div>
                       <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                         <div className="flex items-center gap-2">
                           <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                             {comment.type}
                           </span>
                           <span className="text-xs text-gray-500">
                             Position: ({comment.x}, {comment.y})
                           </span>
                         </div>
                         <div className="flex items-center gap-2">
                           <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                             <ThumbsUp className="w-3 h-3 mr-1" />
                             Like
                           </Button>
                           <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                             <Reply className="w-3 h-3 mr-1" />
                             Reply
                           </Button>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             ) : (
               /* Metadata Tab */
               <div className="flex-1 overflow-y-auto p-4 pr-20">
                 <EnhancedMetadataDisplay 
                   documentId={documentId} 
                   filename={document?.filename || ''} 
                 />
               </div>
             )}
          </div>
        )}

        {/* Toggle Chat Button */}
        {!showChat && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChat(true)}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 z-10"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}


      </div>
      {/* Floating AI Summary Button (moved up, no End button) */}
      {/* AI Summary Panel */}
      <AISummaryPanel
        summary={summary || {}}
        loading={summaryLoading || (!summary && !isLoading)}
        open={showSummary}
        onClose={() => setShowSummary(false)}
        onAskMore={handleAskMore}
        documentContent={extractedText}
        onGoToPage={(page) => setCurrentPage(page)}
      />

      {/* Contextual Help Popup */}
      <ContextualHelpPopup />
      
      {/* Extracted Text Modal */}
      {showExtractedText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                📄 Extracted Text from PDF
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExtractedText(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-[60vh] overflow-auto">
                {extractedText || 'No text extracted'}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Total characters: {extractedText.length}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(extractedText)
                    toast.success('Text copied to clipboard!')
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaborative Insights Modal */}
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

      {/* Detailed Insights Modal */}
      {showDetailedInsights && collaborativeSummary && (
        <DetailedInsightsModal
          isOpen={showDetailedInsights}
          onClose={() => setShowDetailedInsights(false)}
          documentId={documentId}
          documentTitle={document?.title || 'Attention Is All You Need'}
          summary={collaborativeSummary}
          onNavigateToPage={(pageNumber, position) => {
            // Close the modal first
            setShowDetailedInsights(false)
            // Navigate to the specific page and position
            // This would typically involve scrolling the PDF viewer to the specific page
            console.log(`Navigating to page ${pageNumber}`, position)
            // You can add PDF viewer navigation logic here
            toast.success(`Navigating to page ${pageNumber}`)
          }}
        />
      )}

      {/* Add Insight Modal */}
      {showAddInsight && currentUser && (
        <AddInsightModal
          isOpen={showAddInsight}
          onClose={() => setShowAddInsight(false)}
          documentId={documentId}
          currentUser={currentUser}
          onInsightAdded={(insight) => {
            toast.success('Insight added successfully!')
            // Optionally refresh collaborative insights
            if (collaborativeSummary) {
              // You could refresh the summary here
            }
          }}
        />
      )}

      {/* Live Activity Modal */}
      {showLiveActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Live Activity Feed</h2>
                  <p className="text-sm text-gray-600">Real-time collaboration on {document?.title || 'this document'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLiveActivity(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <LiveActivityFeed 
                documentId={documentId} 
                isVisible={true}
                onNavigateToPage={(pageNumber, position) => {
                  // Close the modal first
                  setShowLiveActivity(false)
                  // Navigate to the specific page and position
                  console.log(`Navigating to page ${pageNumber}`, position)
                  // You can add PDF viewer navigation logic here
                  toast.success(`Navigating to page ${pageNumber}`)
                }}
              />
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 rounded-b-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  See what other researchers are working on in real-time
                </p>
                <Button
                  onClick={() => setShowLiveActivity(false)}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}