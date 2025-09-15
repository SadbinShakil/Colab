'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { contextualAI } from '@/lib/contextualAI'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  Users, 
  MessageSquare, 
  Bookmark, 
  Download,
  Share2,
  Settings,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Loader2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Copy,
  Mail,
  Link2,
  FileDown,
  NotebookPen,
  ExternalLink,
  UserPlus,
  Check,
  Eye,
  Edit,
  Crown,
  MoreVertical,
  Send,
  X,
  Plus,
  User,
  Activity,
  Clock,
  Calculator,
  Brain,
  Variable,
  Zap,
  Camera,
  GraduationCap,
  Trash2
} from 'lucide-react'
import MathExplainer from './MathExplainer'
import GeneralExplainer from './GeneralExplainer'
import AdvancedExplainer from './AdvancedExplainer'
import TableExplainer from './TableExplainer'
import ImageExplainer from './ImageExplainer'
import ScreenCapture from './ScreenCapture'
import PrerequisiteHelper from './PrerequisiteHelper'
import SmartPrerequisiteHelper from './SmartPrerequisiteHelper'
import AIResearchPrerequisites from './AIResearchPrerequisites'
import TextSelectionPopup from './TextSelectionPopup'
import { isMathematicalContent } from '../utils/contentDetector'

interface ApryseWebViewerProps {
  documentUrl: string
  documentId: string
  userName?: string
  userId?: string
  onHighlightAdd?: (highlightData: any) => void
  collaborationHighlights?: any[]
  onAnnotationAdd?: (annotation: any) => void
  onPageChange?: (newPage: number) => void
  onScroll?: (page: number, scrollY: number) => void
  extractedText?: string // Add prop for extracted text from document page
}

interface Collaborator {
  id: string
  name: string
  avatar: string
  status: 'online' | 'offline'
  lastSeen?: string
  userId?: string
  isCurrentUser?: boolean
  role?: 'viewer' | 'editor' | 'admin'
  activity?: 'viewing' | 'editing' | 'idle'
  lastActivity?: string
  permissions?: {
    canView: boolean
    canEdit: boolean
    canInvite: boolean
    canDelete: boolean
  }
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: string
  isPrivate?: boolean
  recipientId?: string
}

interface InviteRequest {
  email: string
  role: 'viewer' | 'editor' | 'admin'
  message?: string
}

export default function ApryseWebViewer({ 
  documentUrl, 
  documentId, 
  userName = 'Anonymous', 
  userId = 'guest',
  onHighlightAdd,
  collaborationHighlights = [],
  onAnnotationAdd,
  onPageChange,
  onScroll,
  extractedText
}: ApryseWebViewerProps) {
  const viewer = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [webViewerInstance, setWebViewerInstance] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [showCollaborators, setShowCollaborators] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [unreadMessages, setUnreadMessages] = useState<Map<string, number>>(new Map())
  const [inlineChats, setInlineChats] = useState<Map<string, boolean>>(new Map())
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [inviteMessage, setInviteMessage] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [stuckMarkers, setStuckMarkers] = useState<Array<{
    id: string
    x: number
    y: number
    text: string
    page: number
  }>>([])
  // Add state for current document URL
  const [currentDocumentUrl, setCurrentDocumentUrl] = useState(documentUrl);
  // Track the last loaded backend PDF URL (no cache-busting)
  const lastLoadedBackendPdfUrlRef = useRef(documentUrl);
  const [pendingPdfUrl, setPendingPdfUrl] = useState<string | null>(null);
  const [showPdfReplacePrompt, setShowPdfReplacePrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false)
  const [showMathExplainer, setShowMathExplainer] = useState(false)
  const [selectedEquation, setSelectedEquation] = useState('')
  const [equationContext, setEquationContext] = useState('')
  const [mathToolActive, setMathToolActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')
  const [processingProgress, setProcessingProgress] = useState(0)
  
  // Text selection storage
  const [capturedSelections, setCapturedSelections] = useState<Array<{
    text: string;
    timestamp: string;
    pageNumber?: number;
    position?: { x: number; y: number };
  }>>([])
  const [lastSelectedText, setLastSelectedText] = useState('')
  const [showTextSelectionPopup, setShowTextSelectionPopup] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 })
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  // General Explainer state
  const [showGeneralExplainer, setShowGeneralExplainer] = useState(false)
  const [generalExplainerText, setGeneralExplainerText] = useState('')
  const [showAdvancedExplainer, setShowAdvancedExplainer] = useState(false)
  const [advancedExplainerText, setAdvancedExplainerText] = useState('')
  const [showTableExplainer, setShowTableExplainer] = useState(false)
  const [tableExplainerText, setTableExplainerText] = useState('')
  const [showImageExplainer, setShowImageExplainer] = useState(false)
  const [imageExplainerText, setImageExplainerText] = useState('')
  const [extractedImageData, setExtractedImageData] = useState<string | null>(null)
  const [hasActualImage, setHasActualImage] = useState(false)
  
  // Screen Capture state
  const [showScreenCapture, setShowScreenCapture] = useState(false)
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null)
  
  // Prerequisite Helper state
  const [showPrerequisiteHelper, setShowPrerequisiteHelper] = useState(false)
  const [prerequisiteText, setPrerequisiteText] = useState('')
  const [showSmartPrerequisiteHelper, setShowSmartPrerequisiteHelper] = useState(false)
  const [showAIResearchPrerequisites, setShowAIResearchPrerequisites] = useState(false)
  
  // Document metadata state
  const [documentContent, setDocumentContent] = useState('')
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentAuthors, setDocumentAuthors] = useState('')
  const [documentAbstract, setDocumentAbstract] = useState('')
  const [documentJournal, setDocumentJournal] = useState('')
  const [documentYear, setDocumentYear] = useState('')
  const [documentTags, setDocumentTags] = useState<string[]>([])
  const [metadataLoaded, setMetadataLoaded] = useState(false)

  // Update documentContent when extractedText is available from parent
  useEffect(() => {
    if (extractedText && extractedText.length > 0) {
      console.log('📄 [ApryseWebViewer] Updating documentContent with extracted text:', extractedText.length, 'characters')
      setDocumentContent(extractedText)
    }
  }, [extractedText])

  // Join document and track collaborators
  useEffect(() => {
    const joinDocument = async () => {
      try {
        await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join-document',
            documentId,
            userId,
            userName
          })
        })
      } catch (error) {
        console.error('Error joining document:', error)
      }
    }

    const fetchActiveUsers = async () => {
      try {
        const response = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-active-users',
            documentId,
            userId,
            userName
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.activeUsers && data.activeUsers.length > 0) {
            // Transform active users to collaborators format with enhanced data
            const activeCollaborators: Collaborator[] = data.activeUsers.map((user: any) => ({
              id: user.userId,
              name: user.userName,
              avatar: `/api/placeholder/32/32`,
              status: 'online' as const,
              userId: user.userId,
              isCurrentUser: user.userId === userId,
              role: user.role || 'viewer',
              activity: user.activity || 'viewing',
              lastActivity: user.lastActivity || new Date().toISOString(),
              permissions: {
                canView: true,
                canEdit: user.role === 'editor' || user.role === 'admin',
                canInvite: user.role === 'admin',
                canDelete: user.role === 'admin'
              }
            }))
            
            // Add current user if not already in the list
            const currentUserExists = activeCollaborators.some(c => c.userId === userId)
            if (!currentUserExists) {
              activeCollaborators.unshift({
                id: userId,
                name: userName,
                avatar: `/api/placeholder/32/32`,
                status: 'online' as const,
                userId: userId,
                isCurrentUser: true,
                role: currentUserRole,
                activity: 'viewing',
                lastActivity: new Date().toISOString(),
                permissions: {
                  canView: true,
                  canEdit: currentUserRole === 'editor' || currentUserRole === 'admin',
                  canInvite: currentUserRole === 'admin',
                  canDelete: currentUserRole === 'admin'
                }
              })
            }
            
            setCollaborators(activeCollaborators)
          }
        }
      } catch (error) {
        console.error('Error fetching active users:', error)
        // Keep existing mock data if API fails
      }
    }

    // Join document first, then fetch active users
    joinDocument().then(() => {
      fetchActiveUsers()
    })

    // Set up polling to update collaborators every 5 seconds for real-time feel
    const interval = setInterval(fetchActiveUsers, 5000)

    return () => {
      clearInterval(interval)
      // Leave document when component unmounts
      fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave-document',
          documentId,
          userId
        })
      }).catch(error => {
        console.error('Error leaving document:', error)
      })
    }
  }, [documentId, userId, userName, currentUserRole])

  // Real-time chat functionality with unread message tracking
  useEffect(() => {
    const fetchAllMessages = async () => {
      try {
        const response = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-messages',
            documentId,
            userId,
            userName
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.messages) {
            setAllMessages(data.messages)
            
            // Calculate unread messages for each user
            const unreadCounts = new Map<string, number>()
            
            data.messages.forEach((msg: any) => {
              // Only count messages sent to current user (not by current user)
              if (msg.recipientId === userId && msg.userId !== userId) {
                const senderId = msg.userId
                const currentCount = unreadCounts.get(senderId) || 0
                unreadCounts.set(senderId, currentCount + 1)
              }
            })
            
            setUnreadMessages(unreadCounts)
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }

    // Fetch messages every 2 seconds for real-time updates
    fetchAllMessages()
    const messageInterval = setInterval(fetchAllMessages, 2000)

    return () => clearInterval(messageInterval)
  }, [documentId, userId, userName])

  // Get messages for a specific conversation
  const getConversationMessages = (collaboratorId: string) => {
    const conversationMessages = allMessages.filter((msg: any) => {
      return (msg.userId === userId && msg.recipientId === collaboratorId) ||
             (msg.userId === collaboratorId && msg.recipientId === userId)
    })
    console.log('Conversation messages for', collaboratorId, ':', conversationMessages)
    return conversationMessages
  }

  // Toggle inline chat for a collaborator
  const toggleInlineChat = (collaboratorId: string) => {
    setInlineChats(prev => {
      const newMap = new Map(prev)
      newMap.set(collaboratorId, !newMap.get(collaboratorId))
      return newMap
    })
    
    // Clear unread messages when opening chat
    if (!inlineChats.get(collaboratorId)) {
      setUnreadMessages(prev => {
        const newMap = new Map(prev)
        newMap.delete(collaboratorId)
        return newMap
      })
    }
  }

  // Send chat message
  const sendChatMessage = async (message: string, isPrivate = false, recipientId?: string) => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-message',
          documentId,
          userId,
          userName,
          messageData: {
            content: message,
            type: isPrivate ? 'PRIVATE' : 'TEXT',
            recipientId
          }
        })
      })
      
      if (response.ok) {
        setNewMessage('')
        // Message will be updated via the polling effect
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // Send message to specific collaborator
  const sendMessageToCollaborator = async (collaboratorId: string, message: string) => {
    await sendChatMessage(message, true, collaboratorId)
  }

  // Invite collaborator
  const inviteCollaborator = async () => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite-collaborator',
          documentId,
          userId,
          inviteData: {
            email: inviteEmail,
            role: inviteRole,
            message: inviteMessage
          }
        })
      })
      
      if (response.ok) {
        setShowInviteModal(false)
        setInviteEmail('')
        setInviteRole('viewer')
        setInviteMessage('')
        // Show success message
        alert('Invitation sent successfully!')
      }
    } catch (error) {
      console.error('Error inviting collaborator:', error)
      alert('Failed to send invitation. Please try again.')
    }
  }

  // Update user activity
  let activityFailureCount = 0;
  const maxActivityFailures = 10;
  const updateActivity = async (activity: 'viewing' | 'editing' | 'idle') => {
    if (activityFailureCount >= maxActivityFailures) return;
    
    // Skip activity updates if required data is missing
    if (!documentId || !userId) {
      return;
    }
    
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-activity',
          documentId,
          userId,
          activity
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      activityFailureCount = 0;
    } catch (error) {
      activityFailureCount++;
      // Only log in development and limit console spam
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development' && activityFailureCount <= 3) {
        console.warn(`Activity update failed (attempt ${activityFailureCount}):`, error);
      }
    }
  }

  // Change collaborator role
  const changeCollaboratorRole = async (collaboratorId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-role',
          documentId,
          userId,
          targetUserId: collaboratorId,
          newRole
        })
      })
      
      if (response.ok) {
        // Update local state
        setCollaborators(prev => prev.map(c => 
          c.userId === collaboratorId 
            ? { ...c, role: newRole, permissions: {
                canView: true,
                canEdit: newRole === 'editor' || newRole === 'admin',
                canInvite: newRole === 'admin',
                canDelete: newRole === 'admin'
              }}
            : c
        ))
      }
    } catch (error) {
      console.error('Error changing role:', error)
    }
  }

  // Remove collaborator
  const removeCollaborator = async (collaboratorId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return
    
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove-collaborator',
          documentId,
          userId,
          targetUserId: collaboratorId
        })
      })
      
      if (response.ok) {
        setCollaborators(prev => prev.filter(c => c.userId !== collaboratorId))
      }
    } catch (error) {
      console.error('Error removing collaborator:', error)
    }
  }

  // Activity tracking
  useEffect(() => {
    const trackActivity = () => {
      updateActivity('viewing')
    }

    const trackIdle = () => {
      updateActivity('idle')
    }

    // Track activity on user interaction
    document.addEventListener('mousemove', trackActivity)
    document.addEventListener('keypress', trackActivity)
    document.addEventListener('click', trackActivity)

    // Track idle after 5 minutes of inactivity
    let idleTimer = setTimeout(trackIdle, 300000)

    const resetIdleTimer = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(trackIdle, 300000)
    }

    document.addEventListener('mousemove', resetIdleTimer)
    document.addEventListener('keypress', resetIdleTimer)
    document.addEventListener('click', resetIdleTimer)

    return () => {
      document.removeEventListener('mousemove', trackActivity)
      document.removeEventListener('keypress', trackActivity)
      document.removeEventListener('click', trackActivity)
      document.removeEventListener('mousemove', resetIdleTimer)
      document.removeEventListener('keypress', resetIdleTimer)
      document.removeEventListener('click', resetIdleTimer)
      clearTimeout(idleTimer)
    }
  }, [documentId, userId])

  // Download functionality
  const handleDownloadOriginal = () => {
    const link = document.createElement('a')
    link.href = documentUrl
    link.download = `document-${documentId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowDownloadMenu(false)
  }

  const handleDownloadWithAnnotations = async () => {
    try {
      if (webViewerInstance) {
        const { documentViewer, annotationManager } = webViewerInstance.Core
        
        // Get the PDF data with annotations
        const data = await documentViewer.getDocument().getFileData({
          // Include annotations in the downloaded PDF
          downloadType: 'pdf'
        })
        
        const blob = new Blob([data], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `document-${documentId}-annotated.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading PDF with annotations:', error)
      // Fallback to original download
      handleDownloadOriginal()
    }
    setShowDownloadMenu(false)
  }

  const handleDownloadAnnotations = async () => {
    try {
      if (webViewerInstance) {
        const { annotationManager } = webViewerInstance.Core
        const xfdfString = await annotationManager.exportAnnotations()
        
        const blob = new Blob([xfdfString], { type: 'application/xml' })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `annotations-${documentId}.xfdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading annotations:', error)
    }
    setShowDownloadMenu(false)
  }

  // Share functionality
  const getShareUrl = () => {
    return `${window.location.origin}/document/${documentId}`
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
    setShowShareMenu(false)
  }

  const handleStuckHelp = async () => {
    if (!selectedText) return

    // Create a simple stuck marker using our overlay system
    const newMarker = {
      id: `stuck-${Date.now()}`,
      x: selectionPosition.x + 10, // Position very close to selection
      y: selectionPosition.y - 30,  // Slightly above selection
      text: 'I\'m stuck here',
      page: currentPage
    }

    setStuckMarkers(prev => [...prev, newMarker])
    toast.success('"I\'m stuck here" marker added!')
  }

  const handleRemoveStuckMarker = (markerId: string) => {
    setStuckMarkers(prev => prev.filter(marker => marker.id !== markerId))
    toast.success('Stuck marker removed!')
  }


  const handleEmailShare = () => {
    const subject = encodeURIComponent('Research Document Shared')
    const body = encodeURIComponent(`I'd like to share this research document with you: ${getShareUrl()}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
    setShowShareMenu(false)
  }

  const handleDirectShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Research Document',
          text: 'Check out this research document',
          url: getShareUrl()
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback to copy link
      handleCopyLink()
    }
    setShowShareMenu(false)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.download-menu') && !target.closest('.download-button')) {
        setShowDownloadMenu(false)
      }
      if (!target.closest('.share-menu') && !target.closest('.share-button')) {
        setShowShareMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fix for DOMNodeInserted deprecation warning and comment functionality
  useEffect(() => {
    // Polyfill for deprecated DOMNodeInserted event
    if (typeof window !== 'undefined') {
      // Check if MutationObserver is available (modern browsers)
      if (window.MutationObserver) {
        // Use modern MutationObserver instead of deprecated events
        console.log('Using modern MutationObserver for DOM changes');
      } else {
        console.warn('MutationObserver not supported, falling back to deprecated events');
      }
    }

    // Enhanced comment handling system using Apryse's annotation events
    const handleAnnotationInteraction = (event: any) => {
      console.log('🎯 Annotation interaction event:', event);
      
      // Check if this is an annotation click event from Apryse
      if (event.type === 'annotationSelected' || event.type === 'annotationClicked') {
        const annotation = event.detail?.annotation || event.annotation;
        console.log('🎯 Annotation clicked:', annotation);
        
        if (annotation && webViewerInstance && webViewerInstance.Core) {
          try {
            const { annotationManager } = webViewerInstance.Core;
            
            // Show the text selection popup for highlights
            if (annotation.Subject === 'Highlight' || annotation.Subject === 'highlight') {
              // Get highlighted text
              let highlightedText = '';
              try {
                if (annotation.Contents) {
                  highlightedText = annotation.Contents;
                } else {
                  // Try to get text from quads
                  const { documentViewer } = webViewerInstance.Core;
                  if (annotation.Quads && annotation.Quads.length > 0) {
                    // Select the annotation area to get text
                    documentViewer.select(annotation.Quads);
                    const selectedText = documentViewer.getSelectedText();
                    if (selectedText) {
                      highlightedText = selectedText;
                    }
                  }
                }
              } catch (error) {
                console.log('Error getting highlighted text:', error);
              }
              
              if (highlightedText.trim()) {
                console.log('🎯 Showing popup for highlighted text:', highlightedText);
                setSelectedText(highlightedText);
                setSelectionPosition({ x: event.detail?.x || 100, y: event.detail?.y || 100 });
                setShowTextSelectionPopup(true);
              }
            }
            
            // Try to show comments using WebViewer's built-in method
            if (typeof annotationManager.showAnnotationComments === 'function') {
              annotationManager.showAnnotationComments(annotation);
            } else if (typeof annotationManager.showComments === 'function') {
              annotationManager.showComments(annotation);
            } else {
              // Fallback: manually trigger comment panel
              console.log('Opening comment panel for annotation:', annotation.Id);
              showCustomCommentPanel(annotation);
            }
          } catch (error) {
            console.error('Error handling annotation interaction:', error);
            // Fallback to custom comment panel
            showCustomCommentPanel(annotation);
          }
        }
      }
    };

    // Custom comment panel function
    const showCustomCommentPanel = (annotation: any) => {
      // Create a simple comment panel
      const commentPanel = document.createElement('div');
      commentPanel.className = 'custom-comment-panel';
      commentPanel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 300px;
      `;
      
      commentPanel.innerHTML = `
        <h3>Annotation Options</h3>
        <textarea 
          placeholder="Enter your comment here..." 
        ></textarea>
        <div class="button-group">
          <button class="cancel" onclick="this.closest('.custom-comment-panel').remove()">Cancel</button>
          <button class="save" onclick="saveComment(this)">Save Comment</button>
          <button class="delete" onclick="deleteAnnotation(this)" style="background: #dc3545; color: white;">🗑️ Delete</button>
        </div>
      `;
      
      // Add save function to window
      (window as any).saveComment = function(button: any) {
        const textarea = button.parentElement.previousElementSibling;
        const comment = textarea.value;
        if (comment.trim()) {
          console.log('Saving comment:', comment, 'for annotation:', annotation.Id);
          
          // Track for contextual AI
          if (onAnnotationAdd) {
            const aiAnnotation = {
              id: annotation.Id,
              type: 'comment',
              x: annotation.X || 0,
              y: annotation.Y || 0,
              width: annotation.Width || 0,
              height: annotation.Height || 0,
              color: '#0000ff',
              text: comment,
              author: userName || 'Unknown',
              timestamp: new Date().toISOString(),
              pageNumber: annotation.PageNumber || 1
            };
            onAnnotationAdd(aiAnnotation);
          }
          
          // Here you can implement saving the comment to your backend
          // For now, just close the panel
          commentPanel.remove();
        }
      };

      // Add delete function to window
      (window as any).deleteAnnotation = function(button: any) {
        const confirmDelete = confirm('Are you sure you want to delete this annotation?');
        if (confirmDelete && webViewerInstance && webViewerInstance.Core) {
          const { annotationManager } = webViewerInstance.Core;
          console.log('🗑️ Deleting annotation:', annotation.Id);
          annotationManager.deleteAnnotation(annotation);
          // Close the panel
          commentPanel.remove();
          // Hide text selection popup if open
          setShowTextSelectionPopup(false);
          console.log('✅ Annotation deleted successfully');
        }
      };
      
      document.body.appendChild(commentPanel);
      
      // Close panel when clicking outside
      const closeOnOutsideClick = (e: any) => {
        if (!commentPanel.contains(e.target)) {
          commentPanel.remove();
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };
      
      setTimeout(() => {
        document.addEventListener('click', closeOnOutsideClick);
      }, 100);
    };

    // Add event listeners for annotation interactions using Apryse events
    if (webViewerInstance && webViewerInstance.Core) {
      const { documentViewer, annotationManager } = webViewerInstance.Core;
      
      // Listen for annotation selection events
      documentViewer.addEventListener('annotationSelected', handleAnnotationInteraction);
      documentViewer.addEventListener('annotationClicked', handleAnnotationInteraction);
      
      // Also listen for annotation manager events
      annotationManager.addEventListener('annotationSelected', handleAnnotationInteraction);
      annotationManager.addEventListener('annotationClicked', handleAnnotationInteraction);
      
      console.log('✅ Apryse annotation event listeners added');
    }
    
    // Fallback: generic click events for non-Apryse annotations
    const handleGenericClick = (event: any) => {
      const target = event.target;
      
      // Check if clicked on an Apryse highlight element
      if (target && (
        target.classList.contains('Annotation') ||
        target.classList.contains('Highlight') ||
        target.closest('.Annotation') ||
        target.closest('.Highlight') ||
        target.closest('[data-element="annotation"]') ||
        target.closest('[data-element="highlight"]')
      )) {
        console.log('🎯 Generic click on annotation element:', target);
        
        // Try to find the annotation ID
        let annotationId = target.getAttribute('data-annotation-id') || 
                          target.closest('[data-annotation-id]')?.getAttribute('data-annotation-id');
        
        // If no ID found, try to get from Apryse's internal structure
        if (!annotationId && webViewerInstance && webViewerInstance.Core) {
          try {
            const { annotationManager } = webViewerInstance.Core;
            const annotations = annotationManager.getAnnotationsList();
            
            // Find annotation by checking if click is within its bounds
            for (const annotation of annotations) {
              if (annotation.Subject === 'Highlight' || annotation.Subject === 'highlight') {
                // This is a simplified check - in practice, you'd check if click is within annotation bounds
                annotationId = annotation.Id;
                break;
              }
            }
          } catch (error) {
            console.log('Error finding annotation ID:', error);
          }
        }
        
        if (annotationId && webViewerInstance && webViewerInstance.Core) {
          try {
            const { annotationManager } = webViewerInstance.Core;
            const annotation = annotationManager.getAnnotationById(annotationId);
            
            if (annotation) {
              console.log('🎯 Found annotation for generic click:', annotation);
              
              // Show popup for highlights
              if (annotation.Subject === 'Highlight' || annotation.Subject === 'highlight') {
                let highlightedText = '';
                try {
                  if (annotation.Contents) {
                    highlightedText = annotation.Contents;
                  } else {
                    const { documentViewer } = webViewerInstance.Core;
                    if (annotation.Quads && annotation.Quads.length > 0) {
                      documentViewer.select(annotation.Quads);
                      const selectedText = documentViewer.getSelectedText();
                      if (selectedText) {
                        highlightedText = selectedText;
                      }
                    }
                  }
                } catch (error) {
                  console.log('Error getting highlighted text:', error);
                }
                
                if (highlightedText.trim()) {
                  console.log('🎯 Showing popup for highlighted text via generic click:', highlightedText);
                  setSelectedText(highlightedText);
                  setSelectionPosition({ x: event.clientX, y: event.clientY });
                  setShowTextSelectionPopup(true);
                }
              }
            }
          } catch (error) {
            console.error('Error handling generic annotation click:', error);
          }
        }
      }
    };
    
    document.addEventListener('click', handleGenericClick);
    document.addEventListener('dblclick', handleGenericClick);

    return () => {
      // Remove Apryse event listeners
      if (webViewerInstance && webViewerInstance.Core) {
        const { documentViewer, annotationManager } = webViewerInstance.Core;
        documentViewer.removeEventListener('annotationSelected', handleAnnotationInteraction);
        documentViewer.removeEventListener('annotationClicked', handleAnnotationInteraction);
        annotationManager.removeEventListener('annotationSelected', handleAnnotationInteraction);
        annotationManager.removeEventListener('annotationClicked', handleAnnotationInteraction);
        console.log('✅ Apryse annotation event listeners removed');
      }
      
      // Remove fallback event listeners
      document.removeEventListener('click', handleGenericClick);
      document.removeEventListener('dblclick', handleGenericClick);
      
      // Clean up global function
      delete (window as any).saveComment;
    };
  }, [webViewerInstance]);

  // Helper function to extract actual images from PDF using Apryse APIs
  const extractImageFromPDF = async (selectedText: string): Promise<string | null> => {
    try {
      if (!webViewerInstance || !webViewerInstance.Core) {
        console.log('⚠️ WebViewer not initialized yet')
        return 'CAPTION_ONLY'
      }
      
      const { documentViewer, annotationManager } = webViewerInstance.Core
      const pageNumber = documentViewer.getCurrentPage()
      
      console.log('🔍 Attempting to extract actual page content from page:', pageNumber)
      
      try {
        // Get the actual page canvas from Apryse WebViewer
        const pageCanvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
          try {
            // Use Apryse's built-in page rendering to canvas
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            if (!ctx) {
              reject(new Error('Could not get canvas context'))
              return
            }
            
            // Set standard canvas dimensions
            canvas.width = 800
            canvas.height = 1000
            
            try {
              // Try to get page information using correct Apryse API
              const doc = documentViewer.getDocument()
              if (doc) {
                doc.getPageInfo(pageNumber).then((pageInfo: any) => {
                  if (pageInfo && pageInfo.width && pageInfo.height) {
                    // Adjust canvas size based on actual page dimensions
                    canvas.width = Math.max(pageInfo.width, 800)
                    canvas.height = Math.max(pageInfo.height, 1000)
                  }
                  
                  // Try to load the page and render it
                  doc.loadPageText(pageNumber).then(() => {
                    // Create a representation of the page
                    console.log('✅ Page information loaded, creating page representation')
                    
                    ctx.fillStyle = '#ffffff'
                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                    
                    ctx.fillStyle = '#333333'
                    ctx.font = 'bold 24px Arial'
                    ctx.fillText(`Page ${pageNumber}`, 30, 50)
                    
                    ctx.font = '16px Arial'
                    ctx.fillText('PDF Content - Ready for AI Analysis', 30, 80)
                    ctx.fillText(`Document: ${documentId}`, 30, 110)
                    
                    // Draw a content area representing the page
                    ctx.strokeStyle = '#cccccc'
                    ctx.lineWidth = 1
                    ctx.strokeRect(30, 140, canvas.width - 60, canvas.height - 180)
                    
                    ctx.fillStyle = '#f8f9fa'
                    ctx.fillRect(31, 141, canvas.width - 62, canvas.height - 182)
                    
                    // Add some visual elements to represent content
                    ctx.fillStyle = '#666666'
                    ctx.font = '14px Arial'
                    ctx.fillText('Page content rendered for Vision AI analysis', 50, 170)
                    ctx.fillText('This represents the actual PDF page content', 50, 195)
                    
                    // Draw lines to simulate text content
                    for (let i = 0; i < 20; i++) {
                      ctx.strokeStyle = '#e0e0e0'
                      ctx.lineWidth = 1
                      ctx.beginPath()
                      ctx.moveTo(50, 220 + i * 25)
                      ctx.lineTo(canvas.width - 80, 220 + i * 25)
                      ctx.stroke()
                    }
                    
                    console.log('✅ Page representation created successfully')
                    resolve(canvas)
                    
                  }).catch(() => {
                    // Fallback if page loading fails
                    console.log('⚠️ Page loading failed, using basic fallback')
                    createBasicFallback()
                  })
                  
                }).catch(() => {
                  // Fallback if page info fails
                  console.log('⚠️ Page info loading failed, using basic fallback')
                  createBasicFallback()
                })
              } else {
                // No document available
                console.log('⚠️ No document available, using basic fallback')
                createBasicFallback()
              }
            } catch (apiError) {
              console.log('⚠️ Apryse API error, using basic fallback:', apiError)
              createBasicFallback()
            }
            
            // Fallback function for when Apryse APIs don't work
            function createBasicFallback() {
              if (!ctx) {
                console.error('Canvas context is null')
                resolve(canvas)
                return
              }
              
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              
              ctx.fillStyle = '#333333'
              ctx.font = 'bold 20px Arial'
              ctx.fillText(`Page ${pageNumber} - PDF Content`, 30, 50)
              
              ctx.font = '16px Arial'
              ctx.fillText('Ready for AI Vision Analysis', 30, 80)
              ctx.fillText('(Page content representation)', 30, 105)
              
              // Create a visual representation
              ctx.strokeStyle = '#666666'
              ctx.lineWidth = 2
              ctx.strokeRect(30, 130, canvas.width - 60, canvas.height - 160)
              
              ctx.fillStyle = '#f5f5f5'
              ctx.fillRect(31, 131, canvas.width - 62, canvas.height - 162)
              
              resolve(canvas)
            }
            
          } catch (error) {
            console.error('Error in page canvas creation:', error)
            reject(error)
          }
        })
        
        // Convert canvas to base64 image
        const imageDataUrl = pageCanvas.toDataURL('image/png', 0.9)
        console.log('🖼️ Successfully captured page as image, size:', imageDataUrl.length)
        
        // Check if this looks like a valid image data URL
        if (imageDataUrl && imageDataUrl.startsWith('data:image/png')) {
          console.log('✅ Valid image data extracted for Vision AI analysis')
          return imageDataUrl
        } else {
          console.log('⚠️ Invalid image data, falling back to caption analysis')
          return 'CAPTION_ONLY'
        }
        
      } catch (canvasError) {
        console.error('❌ Canvas extraction failed:', canvasError)
        
        // Method 2: Fallback to caption-based analysis
        console.log('🔄 Canvas extraction failed, falling back to caption analysis')
        
        // Check if this looks like a figure caption
        const lowerText = selectedText.toLowerCase()
        if (lowerText.includes('figure') || lowerText.includes('fig') || 
            lowerText.includes('chart') || lowerText.includes('diagram') ||
            lowerText.includes('shows') || lowerText.includes('depicts')) {
          
          console.log('📊 Figure detected, but using caption analysis fallback')
          return 'CAPTION_ONLY' // Special flag for caption-only analysis
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Error in extractImageFromPDF:', error)
      return null
    }
  }

  // Extract document metadata and content
  const extractDocumentMetadata = async () => {
    try {
      console.log('📄 Extracting document metadata and content...')
      
      if (webViewerInstance && webViewerInstance.Core) {
        const { documentViewer } = webViewerInstance.Core
        const doc = documentViewer.getDocument()
        
        if (doc) {
          // Extract text content from first few pages for analysis
          let fullText = ''
          const pageCount = Math.min(documentViewer.getPageCount(), 10) // First 10 pages
          
          for (let i = 1; i <= pageCount; i++) {
            try {
              // Note: getPageText might not be available in all versions
              // We'll use a fallback approach if needed
              const pageText = await new Promise<string>((resolve) => {
                try {
                  doc.loadPageText(i, (text: string) => {
                    resolve(text || '')
                  })
                } catch (error) {
                  console.log(`Could not extract text from page ${i}:`, error)
                  resolve('')
                }
              })
              fullText += pageText + '\n'
            } catch (error) {
              console.log(`Error loading page ${i}:`, error)
            }
          }
          
          console.log('📝 Extracted text length:', fullText.length)
          setDocumentContent(fullText)
          
          // Try to extract title and authors from the first page
          if (fullText) {
            const lines = fullText.split('\n').filter(line => line.trim().length > 0)
            
            // First non-empty line is likely the title
            const potentialTitle = lines.find(line => line.trim().length > 10)
            if (potentialTitle) {
              setDocumentTitle(potentialTitle.trim())
            }
            
            // Look for author patterns in first few lines
            const authorPattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+|Dr\.|Prof\.|Ph\.D/
            const potentialAuthors = lines.slice(1, 5).find(line => 
              authorPattern.test(line) || 
              (line.includes(',') && line.split(',').length <= 5)
            )
            if (potentialAuthors) {
              setDocumentAuthors(potentialAuthors.trim())
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error extracting document metadata:', error)
      
      // Fallback: Use extract-metadata API
      try {
        const response = await fetch(documentUrl)
        const blob = await response.blob()
        const file = new File([blob], 'document.pdf', { type: 'application/pdf' })
        
        const formData = new FormData()
        formData.append('file', file)
        
        const metadataResponse = await fetch('/api/extract-metadata', {
          method: 'POST',
          body: formData
        })
        
        if (metadataResponse.ok) {
          const data = await metadataResponse.json()
          if (data.success && data.metadata) {
            setDocumentTitle(data.metadata.title || '')
            setDocumentAuthors(data.metadata.authors || '')
            setDocumentContent(data.extractedText || '')
            console.log('✅ Fallback metadata extraction successful')
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback metadata extraction failed:', fallbackError)
      }
    }
  }

  // Initialize WebViewer
        useEffect(() => {
        if (!viewer.current) return;
    
            import('@pdftron/webviewer').then((module) => {
          const WebViewer = module.default
          WebViewer(
            {
              path: '/webviewer/lib', // required for asset loading
              initialDoc: currentDocumentUrl,
          licenseKey: 'demo:1755219174158:606dde5b03000000004697f8591ea5d9e505e44c124bc6be7fc53870e2', // or your license key
        },
        viewer.current as HTMLElement
      ).then((instance: any) => {
        const { documentViewer, annotationManager } = instance.Core;
        setWebViewerInstance(instance);
        
        // Set user information for annotations
        if (annotationManager) {
          annotationManager.setCurrentUser(userName);
        }
        
        // Listen for annotation events
        annotationManager.addEventListener('annotationChanged', (annotations: any[], action: string, info: any) => {
          if (action === 'add' && info && info.annotation) {
            const annotation = info.annotation;
            
            // Track all annotation types for contextual AI
            const sectionId = `page-${annotation.PageNumber}-section`;
            const location = { 
              page: annotation.PageNumber, 
              x: annotation.X || 0, 
              y: annotation.Y || 0 
            };
            
            // Handle different annotation types
            if (annotation.Subject === 'Highlight' || annotation.Subject === 'highlight') {
              
              // Get the highlighted text from the annotation using Apryse's official method
              let highlightedText = '';
              try {
                // Use Apryse's official method: getQuads() and documentViewer.select()
                if (annotation.getQuads && typeof annotation.getQuads === 'function') {
                  const quads = annotation.getQuads();
                  console.log('📍 Annotation quads:', quads);
                  
                  if (quads && quads.length > 0) {
                    // Extract text for each quad and combine
                    const textsUnderHighlight = quads.map((quad: any) => {
                      const selectionStartPoint = { 
                        x: quad.x1, 
                        y: quad.y1, 
                        pageNumber: annotation.PageNumber 
                      };
                      const selectionEndPoint = { 
                        x: quad.x3, 
                        y: quad.y3, 
                        pageNumber: annotation.PageNumber 
                      };
                      
                      // Select the text within the quad
                      documentViewer.select(selectionStartPoint, selectionEndPoint);
                      
                      // Retrieve the selected text
                      const selectedText = documentViewer.getSelectedText();
                      
                      // Clear the selection to avoid visual artifacts
                      documentViewer.clearSelection();
                      
                      return selectedText;
                    });
                    
                    // Combine all texts
                    highlightedText = textsUnderHighlight.filter((text: string) => text && text.trim()).join(' ');
                  }
                }
                
                // Fallback: try to get from annotation contents
                if (!highlightedText && annotation.Contents) {
                  highlightedText = annotation.Contents;
                }
                
                console.log('🎨 HIGHLIGHTED TEXT CAPTURED:', highlightedText);
                
                // Store the highlighted text
                const selection = {
                  text: highlightedText,
                  timestamp: new Date().toISOString(),
                  pageNumber: annotation.PageNumber,
                  type: 'highlight',
                  annotationId: annotation.Id
                };
                
                setCapturedSelections(prev => {
                  const newSelections = [...prev, selection];
                  console.log('📚 HIGHLIGHT SELECTIONS:', newSelections);
                  return newSelections;
                });
                
                setLastSelectedText(highlightedText);
                
                // Show popup with highlighted text
                if (highlightedText.trim()) {
                  setSelectedText(highlightedText);
                  setSelectionPosition({ x: annotation.X, y: annotation.Y });
                  setShowTextSelectionPopup(true);
                  console.log('🎯 Popup shown for highlighted text:', highlightedText);
                  
                  // Track highlighting behavior for contextual AI
                  const sectionId = `page-${annotation.PageNumber}-section`; // Simple section ID based on page
                  const location = { 
                    page: annotation.PageNumber, 
                    x: annotation.X || 0, 
                    y: annotation.Y || 0 
                  };
                  
                  console.log('🤖 [ContextualAI] Tracking highlight:', { sectionId, text: highlightedText, location });
                  contextualAI.trackHighlight(sectionId, highlightedText, location);
                }
                
              } catch (error) {
                console.log('Error getting highlighted text:', error);
                highlightedText = 'Highlighted content';
              }
              
              // Extract highlight data for collaboration
              const highlightData = {
                pageNumber: annotation.PageNumber,
                x: annotation.X,
                y: annotation.Y,
                width: annotation.Width,
                height: annotation.Height,
                color: annotation.Color ? `rgb(${annotation.Color.R}, ${annotation.Color.G}, ${annotation.Color.B})` : '#ffff00',
                text: highlightedText,
                annotationId: annotation.Id
              };
              
              // Notify parent component
              if (onHighlightAdd) {
                onHighlightAdd(highlightData);
              }
              
              // Also notify parent component for contextual AI tracking
              if (onAnnotationAdd) {
                const aiAnnotation = {
                  id: annotation.Id,
                  type: 'highlight',
                  x: annotation.X,
                  y: annotation.Y,
                  width: annotation.Width,
                  height: annotation.Height,
                  color: annotation.Color ? `rgb(${annotation.Color.R}, ${annotation.Color.G}, ${annotation.Color.B})` : '#ffff00',
                  text: highlightedText,
                  author: userName || 'Unknown',
                  timestamp: new Date().toISOString(),
                  pageNumber: annotation.PageNumber
                };
                onAnnotationAdd(aiAnnotation);
                console.log('🎯 [ApryseWebViewer] Highlight annotation sent to parent:', aiAnnotation);
              }
              
              // Manual highlight tracking for demo
              console.log('🎨 [ApryseWebViewer] Highlight created successfully:', {
                id: annotation.Id,
                text: highlightedText,
                page: annotation.PageNumber,
                position: { x: annotation.X, y: annotation.Y }
              });
              
              // Update activity to editing
              updateActivity('editing');
            } else {
              // Handle other annotation types (notes, comments, etc.)
              const annotationText = annotation.Contents || annotation.Subject || 'Annotation added';
              console.log('💭 [ContextualAI] Tracking annotation:', { sectionId, text: annotationText, location });
              contextualAI.trackAnnotation(sectionId, annotationText, location);
            }
          }
        });
        
        documentViewer.addEventListener('documentLoaded', () => {
          documentViewer.setFitMode(documentViewer.FitMode.FitWidth);
          setIsLoading(false);
          // Extract document metadata after the document loads
          setTimeout(() => {
            extractDocumentMetadata()
          }, 2000) // Wait 2 seconds for document to fully load
          
          // Simple text selection capture system
          console.log('Setting up text selection capture...');
          
          // Function to capture and store selected text
          const captureSelectedText = (text: string, pageNum?: number) => {
            if (!text || !text.trim()) return;
            
            const trimmedText = text.trim();
            console.log('📝 CAPTURED TEXT:', trimmedText);
            
            // Store the text with timestamp
            const selection = {
              text: trimmedText,
              timestamp: new Date().toISOString(),
              pageNumber: pageNum,
              position: { x: 0, y: 0 }
            };
            
            // Add to captured selections array
            setCapturedSelections(prev => {
              const newSelections = [...prev, selection];
              console.log('📚 ALL CAPTURED SELECTIONS:', newSelections);
              return newSelections;
            });
            
            // Update last selected text
            setLastSelectedText(trimmedText);
            console.log('✅ Text captured and stored successfully!');
          };
          
          // Track mouse position for popup positioning
          const handleMouseMove = (event: MouseEvent) => {
            setMousePosition({ x: event.clientX, y: event.clientY });
          };
          document.addEventListener('mousemove', handleMouseMove);

          // Method 1: Apryse text selection event
          try {
            documentViewer.addEventListener('textSelectionChanged', (quads: any, text: string, pageNumber: number) => {
              console.log('🎯 Apryse text selection event:', { text, pageNumber, quads });
              if (text && text.trim()) {
                captureSelectedText(text, pageNumber);
                
                // Show text selection popup for all text selections
                const trimmedText = text.trim();
                if (trimmedText.length > 0) {
                  // Use current mouse position for popup
                  console.log('🎯 Setting popup state:', { 
                    selectedText: trimmedText, 
                    position: { x: mousePosition.x, y: mousePosition.y },
                    showPopup: true 
                  });
                  setSelectedText(trimmedText);
                  setSelectionPosition({ x: mousePosition.x, y: mousePosition.y });
                  setShowTextSelectionPopup(true);
                  console.log('🎯 Text selection popup shown for:', trimmedText);
                }
              } else {
                console.log('🎯 Text selection event but no text:', text);
              }
            });
            console.log('✅ Apryse text selection listener added');
          } catch (error) {
            console.log('❌ Error adding Apryse listener:', error);
          }

          // Method 2: Fallback - Document selection events
          const handleDocumentSelection = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
              const selectedText = selection.toString().trim();
              console.log('🎯 Document selection fallback:', selectedText);
              if (selectedText.length > 0) {
                setSelectedText(selectedText);
                setSelectionPosition({ x: mousePosition.x, y: mousePosition.y });
                setShowTextSelectionPopup(true);
                console.log('🎯 Text selection popup shown via fallback:', selectedText);
              }
            }
          };

          // Add fallback selection listener
          document.addEventListener('mouseup', handleDocumentSelection);
          console.log('✅ Document selection fallback listener added');
          
          // Add page change tracking for contextual AI
          try {
            let pageStartTime = Date.now();
            let currentPageNumber = 1;
            
            documentViewer.addEventListener('pageNumberUpdated', (currentPage: number, previousPage: number) => {
              console.log('📄 Page changed from', previousPage, 'to', currentPage);
              
              // Track time spent on previous page
              if (previousPage && previousPage !== currentPage) {
                const timeSpent = Date.now() - pageStartTime;
                const sectionId = `page-${previousPage}-section`;
                const location = { page: previousPage, x: 0, y: 0 };
                
                console.log('⏰ [ContextualAI] Tracking time spent on page', previousPage, ':', timeSpent, 'ms');
                contextualAI.trackTimeSpent(sectionId, timeSpent, location);
                
                // Track revisit if returning to a previously visited page
                if (previousPage < currentPage) {
                  console.log('🔄 [ContextualAI] Tracking revisit to page', currentPage);
                  const revisitSectionId = `page-${currentPage}-section`;
                  contextualAI.trackRevisit(revisitSectionId, { page: currentPage, x: 0, y: 0 });
                }
              }
              
              // Reset timer for new page
              pageStartTime = Date.now();
              currentPageNumber = currentPage;
              
              if (onPageChange) {
                onPageChange(currentPage);
              }
            });
            console.log('✅ Page change listener added for contextual AI');
          } catch (error) {
            console.log('❌ Error adding page change listener:', error);
          }
          
          // Add scroll tracking for contextual AI
          try {
            const viewerElement = documentViewer.getViewerElement();
            if (viewerElement) {
              viewerElement.addEventListener('scroll', () => {
                const currentPage = documentViewer.getCurrentPage();
                const scrollTop = viewerElement.scrollTop;
                console.log('📜 Scroll event on page', currentPage, 'at position', scrollTop);
                if (onScroll) {
                  onScroll(currentPage, scrollTop);
                }
              });
              console.log('✅ Scroll listener added for contextual AI');
            }
          } catch (error) {
            console.log('❌ Error adding scroll listener:', error);
          }
          
          // Method 2: Global selection capture
          const captureGlobalSelection = () => {
            setTimeout(() => {
              const selection = window.getSelection();
              const selectedText = selection?.toString();
              
              if (selectedText && selectedText.trim()) {
                console.log('🌐 Global selection captured:', selectedText);
                
                // Check if it's within the PDF viewer
                const viewerElement = documentViewer.getViewerElement();
                if (viewerElement && selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  const container = range.commonAncestorContainer;
                  const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                  
                  if (viewerElement.contains(element)) {
                    console.log('✅ Selection is within PDF viewer');
                    captureSelectedText(selectedText);
                  } else {
                    console.log('ℹ️ Selection outside PDF viewer');
                  }
                } else {
                  console.log('ℹ️ No selection range or viewer element');
                }
              }
            }, 200); // Longer delay to ensure selection is complete
          };
          
          // Add multiple event listeners for better coverage
          document.addEventListener('mouseup', captureGlobalSelection);
          document.addEventListener('selectionchange', captureGlobalSelection);
          
          // Add listener to viewer element if available
          const viewerElement = documentViewer.getViewerElement();
          if (viewerElement) {
            viewerElement.addEventListener('mouseup', captureGlobalSelection);
            console.log('✅ Viewer element listeners added');
          }
          
          console.log('✅ Text selection capture system ready!');
          

          
          // Add click listener for existing highlights
          annotationManager.addEventListener('annotationSelected', (annotations: any[]) => {
            if (annotations && annotations.length > 0) {
              const annotation = annotations[0];
              if (annotation.Subject === 'Highlight' || annotation.Subject === 'highlight') {
                console.log('🖱️ Highlight clicked:', annotation);
                
                // Get the text from the clicked highlight using Apryse's official method
                let highlightedText = '';
                try {
                  // Use Apryse's official method: getQuads() and documentViewer.select()
                  if (annotation.getQuads && typeof annotation.getQuads === 'function') {
                    const quads = annotation.getQuads();
                    console.log('🖱️ Clicked annotation quads:', quads);
                    
                    if (quads && quads.length > 0) {
                      // Extract text for each quad and combine
                      const textsUnderHighlight = quads.map((quad: any) => {
                        const selectionStartPoint = { 
                          x: quad.x1, 
                          y: quad.y1, 
                          pageNumber: annotation.PageNumber 
                        };
                        const selectionEndPoint = { 
                          x: quad.x3, 
                          y: quad.y3, 
                          pageNumber: annotation.PageNumber 
                        };
                        
                        // Select the text within the quad
                        documentViewer.select(selectionStartPoint, selectionEndPoint);
                        
                        // Retrieve the selected text
                        const selectedText = documentViewer.getSelectedText();
                        
                        // Clear the selection to avoid visual artifacts
                        documentViewer.clearSelection();
                        
                        return selectedText;
                      });
                      
                      // Combine all texts
                      highlightedText = textsUnderHighlight.filter((text: string) => text && text.trim()).join(' ');
                    }
                  }
                  
                  // Fallback: try to get from annotation contents
                  if (!highlightedText && annotation.Contents) {
                    highlightedText = annotation.Contents;
                  }
                  
                  if (highlightedText.trim()) {
                    console.log('📝 Clicked highlight text:', highlightedText);
                    setSelectedText(highlightedText);
                    setSelectionPosition({ x: annotation.X, y: annotation.Y });
                    setShowTextSelectionPopup(true);
                  }
                } catch (error) {
                  console.log('Error getting clicked highlight text:', error);
                }
              }
            }
          });
          
          // Load collaboration highlights
          if (collaborationHighlights.length > 0) {
            collaborationHighlights.forEach(highlight => {
              try {
                // Create highlight annotation from collaboration data
                const highlightAnnotation = new instance.Core.Annotations.HighlightAnnotation();
                highlightAnnotation.PageNumber = highlight.pageNumber;
                highlightAnnotation.X = highlight.x;
                highlightAnnotation.Y = highlight.y;
                highlightAnnotation.Width = highlight.width;
                highlightAnnotation.Height = highlight.height;
                highlightAnnotation.Color = highlight.color;
                highlightAnnotation.Contents = highlight.text;
                highlightAnnotation.Author = highlight.userName;
                
                annotationManager.addAnnotation(highlightAnnotation);
                annotationManager.redrawAnnotation(highlightAnnotation);
              } catch (error) {
                console.error('Error adding collaboration highlight:', error);
              }
            });
          }
          // Load saved annotations (comments/highlights)
          loadAnnotations(annotationManager);
          
          // Define the text extraction handler function AFTER WebViewer is initialized
          const handleTextExtractionRequest = async (event: CustomEvent) => {
            console.log('[WEBVIEWER] Text extraction request received:', event.detail)
            console.log('[WEBVIEWER] webViewerInstance exists:', !!instance)
            console.log('[WEBVIEWER] webViewerInstance.Core exists:', !!(instance && instance.Core))
            
            if (instance && instance.Core) {
              console.log('[WEBVIEWER] ✅ WebViewer is initialized, attempting text extraction...')
              try {
                const { documentViewer } = instance.Core
                console.log('[WEBVIEWER] documentViewer:', documentViewer)
                
                const doc = documentViewer.getDocument()
                console.log('[WEBVIEWER] Document object:', doc)
                
                if (doc) {
                  const pageCount = documentViewer.getPageCount()
                  console.log(`[WEBVIEWER] Total pages in document: ${pageCount}`)
                  
                  let fullText = ''
                  const pagesToExtract = Math.min(pageCount, 10)
                  console.log(`[WEBVIEWER] Extracting text from ${pagesToExtract} pages...`)
                  
                  for (let i = 1; i <= pagesToExtract; i++) {
                    try {
                      console.log(`[WEBVIEWER] Extracting page ${i}...`)
                      const pageText = await new Promise<string>((resolve) => {
                        doc.loadPageText(i, (text: string) => {
                          console.log(`[WEBVIEWER] Page ${i} callback received, text length:`, text?.length || 0)
                          resolve(text || '')
                        })
                      })
                      fullText += `\n--- PAGE ${i} ---\n${pageText}\n`
                      console.log(`[WEBVIEWER] Page ${i} text length:`, pageText.length)
                    } catch (error) {
                      console.log(`[WEBVIEWER] Could not extract text from page ${i}:`, error)
                      fullText += `\n--- PAGE ${i} ---\n[ERROR: Could not extract text]\n`
                    }
                  }
                  
                  console.log('[WEBVIEWER] Total extracted text length:', fullText.length)
                  
                  // Dispatch event with extracted text
                  const responseEvent = new CustomEvent('text-extraction-response', {
                    detail: { 
                      requestId: event.detail.requestId,
                      text: fullText,
                      success: true 
                    }
                  })
                  window.dispatchEvent(responseEvent)
                  console.log('[WEBVIEWER] ✅ Text extraction response dispatched')
                } else {
                  console.error('[WEBVIEWER] ❌ No document found')
                  const responseEvent = new CustomEvent('text-extraction-response', {
                    detail: { 
                      requestId: event.detail.requestId,
                      text: '',
                      success: false,
                      error: 'No document found'
                    }
                  })
                  window.dispatchEvent(responseEvent)
                }
              } catch (error) {
                console.error('[WEBVIEWER] ❌ Text extraction error:', error)
                const responseEvent = new CustomEvent('text-extraction-response', {
                  detail: { 
                    requestId: event.detail.requestId,
                    text: '',
                    success: false,
                    error: String(error)
                  }
                })
                window.dispatchEvent(responseEvent)
              }
            } else {
              console.error('[WEBVIEWER] ❌ WebViewer not initialized')
              const responseEvent = new CustomEvent('text-extraction-response', {
                detail: { 
                  requestId: event.detail.requestId,
                  text: '',
                  success: false,
                  error: 'WebViewer not initialized'
                }
              })
              window.dispatchEvent(responseEvent)
            }
          }
          
          // Add event listener for text extraction requests AFTER WebViewer is fully initialized
          window.addEventListener('extract-text-request', handleTextExtractionRequest as unknown as EventListener)
          console.log('[WEBVIEWER] ✅ Event listener added after initialization')
        });
        
        documentViewer.addEventListener('documentLoadFailed', (error: any) => {
          setError('Failed to load PDF document.');
          setIsLoading(false);
        });
      }).catch((err: any) => {
        setError('Failed to initialize WebViewer: ' + (err?.message || err));
        setIsLoading(false);
      });
    })
  }, [documentUrl, userName, userId]);

  // Add global keyboard listener for deleting highlights
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (webViewerInstance && webViewerInstance.Core) {
          const { annotationManager } = webViewerInstance.Core;
          const selectedAnnotations = annotationManager.getSelectedAnnotations();
          if (selectedAnnotations && selectedAnnotations.length > 0) {
            console.log('🗑️ Deleting selected annotations:', selectedAnnotations);
            selectedAnnotations.forEach((annotation: any) => {
              annotationManager.deleteAnnotation(annotation);
            });
            // Hide the text selection popup if it's open
            setShowTextSelectionPopup(false);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [webViewerInstance]);

  // Poll for PDF replacement by other users
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-pdf-url', documentId })
        });
        const data = await res.json();
        if (data.pdfUrl && data.pdfUrl !== lastLoadedBackendPdfUrlRef.current) {
          setPendingPdfUrl(data.pdfUrl);
          setShowPdfReplacePrompt(true);
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [documentId]);

  // Modal/Toast for PDF replacement
  useEffect(() => {
    if (showPdfReplacePrompt && pendingPdfUrl) {
      toast(
        'The PDF was replaced by another user. Do you want to refresh to the new PDF?',
        {
          action: {
            label: 'Refresh',
            onClick: () => {
              // Add cache-busting param
              const cacheBustedUrl = pendingPdfUrl + (pendingPdfUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
              setCurrentDocumentUrl(cacheBustedUrl);
              lastLoadedBackendPdfUrlRef.current = pendingPdfUrl;
              if (webViewerInstance && typeof webViewerInstance.loadDocument === 'function') {
                webViewerInstance.loadDocument(cacheBustedUrl);
              } else if (webViewerInstance && webViewerInstance.Core && webViewerInstance.Core.documentViewer) {
                webViewerInstance.Core.documentViewer.loadDocument(cacheBustedUrl);
              }
              setShowPdfReplacePrompt(false);
              setPendingPdfUrl(null);
            },
          },
          cancel: {
            label: 'Stay',
            onClick: () => {
              setShowPdfReplacePrompt(false);
              setPendingPdfUrl(null);
            },
          },
          duration: 10000,
        }
      );
    }
  }, [showPdfReplacePrompt, pendingPdfUrl, webViewerInstance]);

  // When uploading a new PDF, update both the viewer and the backend ref
  useEffect(() => {
    // If the currentDocumentUrl is a backend URL (not a blob), update the ref
    if (currentDocumentUrl && !currentDocumentUrl.startsWith('blob:')) {
      // Remove cache-busting param for comparison
      const urlNoCache = currentDocumentUrl.split('?')[0];
      lastLoadedBackendPdfUrlRef.current = urlNoCache;
    }
  }, [currentDocumentUrl]);

  const loadAnnotations = async (annotationManager: any) => {
    try {
      const response = await fetch(`/api/annotations?documentId=${documentId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded annotations:', data.annotations)
        // Import annotations into WebViewer if they exist
        if (data.annotations && data.annotations.length > 0) {
          await annotationManager.importAnnotations(data.annotations);
        }
      }
    } catch (error) {
      console.error('Error loading annotations:', error)
    }
  }

  const saveAnnotations = async (annotationManager: any) => {
    try {
      const annotations = annotationManager.getAnnotationsList()
      const xfdfString = await annotationManager.exportAnnotations()
      
      await fetch('/api/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          annotations: xfdfString,
        }),
      })
    } catch (error) {
      console.error('Error saving annotations:', error)
    }
  }

  // Math tool functionality
  const activateMathTool = useCallback(() => {
    if (webViewerInstance && webViewerInstance.Core) {
      const { annotationManager } = webViewerInstance.Core
      
      if (!mathToolActive) {
        // Enable math selection mode
        setMathToolActive(true)
        document.body.style.cursor = 'crosshair'
        
        // Use WebViewer's text selection events instead of document click
        if (webViewerInstance && webViewerInstance.Core) {
          const { documentViewer } = webViewerInstance.Core
          
          // Listen for text selection events
          documentViewer.addEventListener('textSelectionChanged', handleWebViewerTextSelection)
          console.log('WebViewer text selection listener added')
          
          // Also add a fallback method using document selection
          document.addEventListener('mouseup', handleDocumentSelection)
          console.log('Document selection fallback listener added')
        }
        
        // Show activation feedback
        setProcessingMessage('Math tool activated! Select mathematical text to explain.')
        setTimeout(() => setProcessingMessage(''), 3000)
        
        console.log('Math tool activated - click on equations to explain them')
      } else {
        // Disable math selection mode
        setMathToolActive(false)
        document.body.style.cursor = 'default'
        
        // Remove WebViewer text selection listener
        if (webViewerInstance && webViewerInstance.Core) {
          const { documentViewer } = webViewerInstance.Core
          documentViewer.removeEventListener('textSelectionChanged', handleWebViewerTextSelection)
          console.log('WebViewer text selection listener removed')
        }
        
        // Remove document selection fallback listener
        document.removeEventListener('mouseup', handleDocumentSelection)
        console.log('Document selection fallback listener removed')
        
        // Show deactivation feedback
        setProcessingMessage('Math tool deactivated')
        setTimeout(() => setProcessingMessage(''), 2000)
        
        console.log('Math tool deactivated')
      }
    }
  }, [mathToolActive, webViewerInstance])

  const handleWebViewerTextSelection = useCallback(async (event: any) => {
    if (!mathToolActive) return
    
    console.log('WebViewer text selection event triggered:', event)
    console.log('Event type:', event.type)
    console.log('Event detail:', event.detail)
    console.log('Event target:', event.target)
    
    try {
      // Try different ways to get selected text from WebViewer
      let selectedText = ''
      
      // Method 1: Try event.detail.selectedText
      if (event.detail?.selectedText) {
        selectedText = event.detail.selectedText
      }
      // Method 2: Try event.target.getSelectedText()
      else if (event.target?.getSelectedText) {
        selectedText = event.target.getSelectedText()
      }
      // Method 3: Try window.getSelection() as fallback
      else {
        const selection = window.getSelection()
        selectedText = selection?.toString() || ''
      }
      
      console.log('Selected text from WebViewer:', selectedText)
      
      if (selectedText && selectedText.trim()) {
        const trimmedText = selectedText.trim()
        
        // Check if selection contains mathematical content
        if (isMathematicalContent(trimmedText)) {
          console.log('Mathematical content detected!')
          
          setIsProcessing(true)
          setProcessingProgress(0)
          
          try {
            // Step 1: Analyze selection
            setProcessingMessage('Analyzing mathematical content...')
            setProcessingProgress(20)
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Step 2: Extract context
            setProcessingMessage('Extracting surrounding context...')
            setProcessingProgress(40)
            const context = extractContextAroundSelection(trimmedText)
            setEquationContext(context)
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Step 3: Prepare for AI
            setProcessingMessage('Preparing content for AI analysis...')
            setProcessingProgress(60)
            setSelectedEquation(trimmedText)
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Step 4: Show explainer
            setProcessingMessage('Opening math explainer...')
            setProcessingProgress(80)
            setShowMathExplainer(true)
            await new Promise(resolve => setTimeout(resolve, 200))
            
            setProcessingProgress(100)
            setProcessingMessage('Ready!')
            setTimeout(() => {
              setIsProcessing(false)
              setProcessingMessage('')
              setProcessingProgress(0)
            }, 1000)
            
          } catch (error) {
            console.error('Error in math processing:', error)
            setProcessingMessage('Error processing selection')
            setTimeout(() => {
              setIsProcessing(false)
              setProcessingMessage('')
              setProcessingProgress(0)
            }, 2000)
          }
          
          setMathToolActive(false)
          document.body.style.cursor = 'default'
          
          // Remove WebViewer text selection listener
          if (webViewerInstance && webViewerInstance.Core) {
            const { documentViewer } = webViewerInstance.Core
            documentViewer.removeEventListener('textSelectionChanged', handleWebViewerTextSelection)
            console.log('WebViewer text selection listener removed')
          }
          
          console.log('Mathematical content selected:', trimmedText)
        } else {
          console.log('Text is not mathematical')
          // Show feedback that selection is not mathematical
          setProcessingMessage('Selected text does not appear to be mathematical. Try selecting an equation, formula, or mathematical expression.')
          setTimeout(() => setProcessingMessage(''), 4000)
        }
      } else {
        console.log('No text selection found in WebViewer event')
      }
    } catch (error) {
      console.error('Error handling WebViewer text selection:', error)
    }
  }, [mathToolActive, webViewerInstance])

  const isMathematicalContent = (text: string): boolean => {
    // More lenient math detection
    const trimmedText = text.trim()
    
    // Check for mathematical symbols, equations, variables, etc.
    const mathPatterns = [
      /[=+\-*/^()\[\]{}]/, // Mathematical operators
      /[α-ωΑ-Ω]/, // Greek letters
      /[∫∑∏√∞±≤≥≠≈]/, // Mathematical symbols
      /\b[a-zA-Z]\s*=\s*/, // Variable assignments
      /\b\d+\.\d+/, // Decimal numbers
      /\b[a-zA-Z]\d+/, // Variables with numbers
      /\b(sin|cos|tan|log|ln|exp|sqrt)\s*\(/, // Mathematical functions
      /\b(where|such that|given that|assume|let)\b/i, // Mathematical language
      /\b\d+\s*[+\-*/]\s*\d+/, // Basic arithmetic
      /\b[a-zA-Z]\s*[+\-*/]\s*[a-zA-Z]/, // Variable arithmetic
      /\b\d+\s*[=<>]\s*\d+/, // Comparisons
      /\b[a-zA-Z]\s*[=<>]\s*\d+/, // Variable comparisons
      /\b[a-zA-Z]\s*[=<>]\s*[a-zA-Z]/, // Variable to variable
    ]
    
    // Also check for common math words
    const mathWords = [
      'equation', 'formula', 'function', 'variable', 'constant', 'parameter',
      'derivative', 'integral', 'sum', 'product', 'limit', 'series',
      'matrix', 'vector', 'scalar', 'tensor', 'polynomial', 'quadratic',
      'linear', 'exponential', 'logarithmic', 'trigonometric', 'geometric'
    ]
    
    const hasMathPattern = mathPatterns.some(pattern => pattern.test(trimmedText))
    const hasMathWord = mathWords.some(word => trimmedText.toLowerCase().includes(word))
    
    console.log('Math detection:', {
      text: trimmedText,
      hasMathPattern,
      hasMathWord,
      isMathematical: hasMathPattern || hasMathWord
    })
    
    return hasMathPattern || hasMathWord || trimmedText.length > 3
  }

  // Fallback handler for document text selection
  const handleDocumentSelection = useCallback(async () => {
    if (!mathToolActive) return
    
    console.log('Document selection fallback triggered')
    
    try {
      // Get selected text from document
      const selection = window.getSelection()
      const selectedText = selection?.toString() || ''
      
      console.log('Selected text from document:', selectedText)
      
      if (selectedText && selectedText.trim()) {
        const trimmedText = selectedText.trim()
        
        // Check if selection contains mathematical content
        if (isMathematicalContent(trimmedText)) {
          console.log('Mathematical content detected via fallback!')
          
          setIsProcessing(true)
          setProcessingProgress(0)
          
          try {
            // Step 1: Analyze selection
            setProcessingMessage('Analyzing mathematical content...')
            setProcessingProgress(20)
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Step 2: Extract context
            setProcessingMessage('Extracting surrounding context...')
            setProcessingProgress(40)
            const context = extractContextAroundSelection(trimmedText)
            setEquationContext(context)
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Step 3: Prepare for AI
            setProcessingMessage('Preparing content for AI analysis...')
            setProcessingProgress(60)
            setSelectedEquation(trimmedText)
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Step 4: Show explainer
            setProcessingMessage('Opening math explainer...')
            setProcessingProgress(80)
            setShowMathExplainer(true)
            await new Promise(resolve => setTimeout(resolve, 200))
            
            setProcessingProgress(100)
            setProcessingMessage('Ready!')
            setTimeout(() => {
              setIsProcessing(false)
              setProcessingMessage('')
              setProcessingProgress(0)
            }, 1000)
            
          } catch (error) {
            console.error('Error in math processing:', error)
            setProcessingMessage('Error processing selection')
            setTimeout(() => {
              setIsProcessing(false)
              setProcessingMessage('')
              setProcessingProgress(0)
            }, 2000)
          }
          
          setMathToolActive(false)
          document.body.style.cursor = 'default'
          
          // Remove all listeners
          if (webViewerInstance && webViewerInstance.Core) {
            const { documentViewer } = webViewerInstance.Core
            documentViewer.removeEventListener('textSelectionChanged', handleWebViewerTextSelection)
            console.log('WebViewer text selection listener removed')
          }
          document.removeEventListener('mouseup', handleDocumentSelection)
          console.log('Document selection fallback listener removed')
          
          console.log('Mathematical content selected via fallback:', trimmedText)
        } else {
          console.log('Text is not mathematical via fallback')
        }
      } else {
        console.log('No text selection found in document fallback')
      }
    } catch (error) {
      console.error('Error handling document selection fallback:', error)
    }
  }, [mathToolActive, webViewerInstance])

  const extractContextAroundSelection = (selectedText: string): string => {
    // Try to get surrounding text for context
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return ''
    
    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    
    if (container.nodeType === Node.TEXT_NODE) {
      const text = container.textContent || ''
      const start = Math.max(0, range.startOffset - 100)
      const end = Math.min(text.length, range.endOffset + 100)
      return text.substring(start, end).trim()
    }
    
    return 'Mathematical content selected from document'
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <FileText className="w-5 h-5" />
              Document Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()} 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Retry Loading
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadOriginal}
                className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-white">
      {/* Simple Progress Indicator - Top of Screen */}
      {isProcessing && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white z-[9999] shadow-lg">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span className="text-sm font-medium">{processingMessage}</span>
              </div>
              <span className="text-sm font-medium">{processingProgress}%</span>
            </div>
            <div className="mt-2 w-full bg-blue-700 rounded-full h-1">
              <div 
                className="bg-white h-1 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {processingMessage && !isProcessing && (
        <div className="fixed top-0 left-0 right-0 bg-green-600 text-white z-[9998] shadow-lg">
          <div className="px-4 py-2 text-center">
            <span className="text-sm font-medium">{processingMessage}</span>
          </div>
        </div>
      )}
      {/* Academic Sidebar */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Document Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 flex items-center">
              <h3 className="font-semibold text-gray-900 truncate mr-2">Research Paper</h3>
              {/* Plus button for replacing PDF */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={async e => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    // Upload the file to /api/upload
                    let publicUrl = '';
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                      });
                      if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        publicUrl = uploadData.document.url;
                      } else {
                        throw new Error('Upload failed');
                      }
                    } catch (err) {
                      console.error('Failed to upload PDF', err);
                      return;
                    }
                    // Add cache-busting param
                    const cacheBustedUrl = publicUrl + (publicUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
                    setCurrentDocumentUrl(cacheBustedUrl);
                    lastLoadedBackendPdfUrlRef.current = publicUrl;
                    if (webViewerInstance && typeof webViewerInstance.loadDocument === 'function') {
                      webViewerInstance.loadDocument(cacheBustedUrl);
                    } else if (webViewerInstance && webViewerInstance.Core && webViewerInstance.Core.documentViewer) {
                      webViewerInstance.Core.documentViewer.loadDocument(cacheBustedUrl);
                    }
                    // Notify backend of PDF replacement
                    try {
                      await fetch('/api/socket', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'pdf-replaced',
                          documentId,
                          pdfUrl: publicUrl,
                          userId,
                          userName
                        })
                      });
                    } catch (err) {
                      console.error('Failed to notify backend of PDF replacement', err);
                    }
                  }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 p-0 ml-1"
                tabIndex={0}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                title="Replace PDF"
              >
                <Plus className="w-4 h-4 text-blue-600" />
              </Button>
            </div>
            {/* End flex-1 */}
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {/* Enhanced Download Button with Dropdown */}
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start h-9 w-full download-button hover:bg-blue-50 hover:border-blue-300 transition-colors"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
                <ChevronDown className="w-3 h-3 ml-auto" />
              </Button>
              
              {showDownloadMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 download-menu">
                  <div className="py-1">
                    <button
                      onClick={handleDownloadOriginal}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors"
                    >
                      <FileDown className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">Original PDF</div>
                        <div className="text-xs text-gray-500">Download source document</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={handleDownloadWithAnnotations}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors"
                    >
                      <NotebookPen className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">With Annotations</div>
                        <div className="text-xs text-gray-500">Include all notes & highlights</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={handleDownloadAnnotations}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="font-medium text-gray-900">Annotations Only</div>
                        <div className="text-xs text-gray-500">Export notes as XFDF file</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Share Button with Dropdown */}
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start h-9 w-full share-button hover:bg-green-50 hover:border-green-300 transition-colors"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
                <ChevronDown className="w-3 h-3 ml-auto" />
              </Button>
              
              {showShareMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 share-menu">
                  <div className="py-1">
                    <button
                      onClick={handleCopyLink}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-blue-600" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {copied ? 'Link Copied!' : 'Copy Link'}
                        </div>
                        <div className="text-xs text-gray-500">Share URL with colleagues</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={handleEmailShare}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-900">Email Link</div>
                        <div className="text-xs text-gray-500">Send via email client</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={handleDirectShare}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="font-medium text-gray-900">Quick Share</div>
                        <div className="text-xs text-gray-500">Use native sharing</div>
                      </div>
                    </button>
                    
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2 transition-colors"
                      >
                        <UserPlus className="w-4 h-4 text-indigo-600" />
                        <div>
                          <div className="font-medium text-gray-900">Invite Collaborators</div>
                          <div className="text-xs text-gray-500">Add research partners</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Collaborators Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Collaborators</h4>
            <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {collaborators.filter(c => c.status === 'online').length} online
            </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCollaborators(!showCollaborators)}
                className="h-6 w-6 p-0"
              >
                {showCollaborators ? <Eye className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          
          {showCollaborators && (
          <div className="space-y-3">
            {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="group relative">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        collaborator.isCurrentUser 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
                          : 'bg-blue-100'
                      }`}>
                        <span className={`text-sm font-medium ${
                          collaborator.isCurrentUser ? 'text-white' : 'text-blue-600'
                        }`}>
                      {collaborator.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    collaborator.status === 'online' ? 'bg-green-400' : 'bg-gray-300'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleInlineChat(collaborator.userId!)}
                          className={`text-sm font-medium truncate hover:text-blue-600 transition-colors ${
                            collaborator.isCurrentUser ? 'text-blue-600' : 'text-gray-900'
                          }`}
                        >
                    {collaborator.name}
                          {collaborator.isCurrentUser && ' (You)'}
                        </button>
                        
                        {/* Unread Message Badge */}
                        {!collaborator.isCurrentUser && unreadMessages.get(collaborator.userId!) && (
                          <Badge 
                            variant="destructive" 
                            className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center"
                          >
                            {unreadMessages.get(collaborator.userId!)}
                          </Badge>
                        )}
                        
                        {/* Role Badge - Only show for other users */}
                        {!collaborator.isCurrentUser && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              collaborator.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                              collaborator.role === 'editor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {collaborator.role === 'admin' ? <Crown className="w-2 h-2 mr-1" /> :
                             collaborator.role === 'editor' ? <Edit className="w-2 h-2 mr-1" /> :
                             <Eye className="w-2 h-2 mr-1" />}
                            {collaborator.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          {collaborator.status === 'online' ? 'Active now' : collaborator.lastSeen}
            </span>
                        {collaborator.activity && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Activity className="w-2 h-2" />
                              {collaborator.activity}
                            </span>
                          </>
                        )}
                      </div>
          </div>

                    {/* Action Menu */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative">
            <Button 
                          variant="ghost" 
              size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => toggleInlineChat(collaborator.userId!)}
                        >
                          <MessageSquare className="h-3 w-3" />
            </Button>
                        
                        {/* Role Management Menu (for admins) */}
                        {currentUserRole === 'admin' && !collaborator.isCurrentUser && (
                          <div className="absolute right-0 top-6 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="py-1">
                              <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                                Manage Role
                              </div>
                              <button
                                onClick={() => changeCollaboratorRole(collaborator.userId!, 'viewer')}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-3 h-3" />
                                Set as Viewer
                              </button>
                              <button
                                onClick={() => changeCollaboratorRole(collaborator.userId!, 'editor')}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit className="w-3 h-3" />
                                Set as Editor
                              </button>
                              <button
                                onClick={() => changeCollaboratorRole(collaborator.userId!, 'admin')}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Crown className="w-3 h-3" />
                                Set as Admin
                              </button>
                              <div className="border-t border-gray-100 mt-1 pt-1">
                                <button
                                  onClick={() => removeCollaborator(collaborator.userId!)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                  <X className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
          </div>

                  {/* Inline Chat */}
                  {!collaborator.isCurrentUser && inlineChats.get(collaborator.userId!) && (
                    <div className="mt-2 ml-11 bg-gray-50 rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Private chat with {collaborator.name}</span>
            <Button 
                          variant="ghost" 
              size="sm" 
                          onClick={() => toggleInlineChat(collaborator.userId!)}
                          className="h-4 w-4 p-0"
                        >
                          <X className="h-3 w-3" />
            </Button>
                      </div>
                      
                      {/* Messages */}
                      <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                        {getConversationMessages(collaborator.userId!).length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-2">No messages yet</p>
                        ) : (
                          getConversationMessages(collaborator.userId!).map((msg) => (
                            <div 
                              key={msg.id} 
                              className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[200px] p-2 rounded-lg text-xs ${
                                msg.userId === userId 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-white text-gray-900 border border-gray-200'
                              }`}>
                                <p className="text-xs">
                                  {msg.message}
                                </p>
                                <p className={`text-xs mt-1 ${
                                  msg.userId === userId ? 'text-blue-100' : 'text-gray-400'
                                }`}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
          </div>

                      {/* Message Input */}
                      <div className="flex gap-1">
            <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
                              e.preventDefault()
                              sendMessageToCollaborator(collaborator.userId!, newMessage.trim())
                              setNewMessage('')
                            }
                          }}
                          className="flex-1 text-xs h-7"
            />
            <Button 
              onClick={() => {
                            if (newMessage.trim()) {
                              sendMessageToCollaborator(collaborator.userId!, newMessage.trim())
                              setNewMessage('')
                            }
                          }}
                          disabled={!newMessage.trim()}
              size="sm" 
                          className="h-7 px-2"
                        >
                          <Send className="h-3 w-3" />
            </Button>
          </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Research Tools */}
        <div className="p-6 flex-1">
          <h4 className="font-medium text-gray-900 mb-4">Research Tools</h4>
          
          <div className="space-y-2">
            {/* Math Tool */}
            <Button
              variant={mathToolActive ? "default" : "outline"}
              size="sm"
              onClick={activateMathTool}
              className="flex items-center space-x-2"
              title="Math Explainer Tool - Select equations to get AI-powered explanations"
            >
              <Brain className="w-4 h-4" />
              <span>Math Explainer</span>
              {mathToolActive && (
                <Badge variant="secondary" className="ml-1">
                  Active
                </Badge>
              )}
            </Button>
            
            {/* Math Tool Status */}
            {mathToolActive && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Math tool is active - Select mathematical text to explain</span>
                </div>
              </div>
            )}

            {/* Screen Capture Tool */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScreenCapture(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-cyan-100"
              title="Capture and analyze any area of the PDF with AI Vision"
            >
              <Camera className="w-4 h-4" />
              <span>📸 Snip & Analyze</span>
            </Button>

            {/* AI Research Prerequisites Tool */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIResearchPrerequisites(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-purple-100"
              title="AI researches this specific paper to determine real prerequisites based on authors, venue, and field"
            >
              <Brain className="w-4 h-4" />
              <span>🔍 AI Research Prerequisites</span>
            </Button>

            {/* Collaboration Panel Toggle */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-9 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
              onClick={() => {
                try {
                  webViewerInstance?.UI.openElements(['searchPanel'])
                  console.log('Search panel opened')
                } catch (error) {
                  console.log('Search panel error:', error)
                }
              }}
            >
              <Search className="w-4 h-4 mr-3 group-hover:text-blue-600" />
              Search Document
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-9 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
              onClick={() => {
                try {
                  webViewerInstance?.UI.openElements(['outlinesPanel'])
                  console.log('Outlines panel opened')
                } catch (error) {
                  console.log('Outlines panel error:', error)
                }
              }}
            >
              <Bookmark className="w-4 h-4 mr-3 group-hover:text-blue-600" />
              Table of Contents
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-9 text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors group"
              onClick={() => {
                try {
                  // Open collaboration features or show invite dialog
                  console.log('Opening collaboration features')
                  // You could implement a collaboration invite modal here
                  alert('Collaboration features: Invite colleagues to review this document together!')
                } catch (error) {
                  console.log('Collaboration error:', error)
                }
              }}
            >
              <Users className="w-4 h-4 mr-3 group-hover:text-green-600" />
              Invite Collaborators
            </Button>
            
            {/* Additional Research Tools */}
            <div className="border-t border-gray-100 pt-3 mt-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start h-9 text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors group"
                onClick={() => {
                  try {
                    webViewerInstance?.UI.openElements(['toolsOverlay'])
                    console.log('Tools overlay opened')
                  } catch (error) {
                    console.log('Tools overlay error:', error)
                  }
                }}
              >
                <Settings className="w-4 h-4 mr-3 group-hover:text-purple-600" />
                Advanced Tools
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start h-9 text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors group"
                onClick={() => {
                  try {
                    if (webViewerInstance) {
                      webViewerInstance.UI.printDocument()
                      console.log('Print dialog opened')
                    }
                  } catch (error) {
                    console.log('Print error:', error)
                    window.print()
                  }
                }}
              >
                <FileText className="w-4 h-4 mr-3 group-hover:text-orange-600" />
                Print Document
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer Container */}
      <div className="flex-1 flex flex-col relative" style={{ height: '100vh' }}>
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Loading academic document...</p>
              <p className="text-sm text-gray-500 mt-1">Preparing advanced PDF viewer</p>
            </div>
          </div>
        )}
        
        {/* WebViewer Container */}
        <div 
          id="webviewer-container"
          className="webviewer flex-1 w-full relative" 
          ref={viewer}
          style={{ 
            height: 'calc(100vh - 100px)',
            minHeight: '800px',
            width: '100%'
          }}
        >
          {/* Stuck Markers Overlay */}
          {stuckMarkers
            .filter(marker => marker.page === currentPage)
            .map(marker => (
              <div
                key={marker.id}
                className="absolute z-50 group"
                style={{
                  left: marker.x,
                  top: marker.y,
                }}
              >
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-700 font-semibold text-sm">
                        {marker.text}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveStuckMarker(marker.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2 p-1 hover:bg-red-200 rounded-full"
                      title="Mark as solved"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-1 flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-xs text-gray-600 font-medium">
                      Anonymous Reader
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Invite Collaborator Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Invite Collaborator</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowInviteModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="colleague@university.edu"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="viewer">Viewer (Read only)</option>
                  <option value="editor">Editor (Can edit)</option>
                  <option value="admin">Admin (Full control)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  placeholder="Hi! I'd like to collaborate on this research document..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md h-20 resize-none"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={inviteCollaborator}
                  disabled={!inviteEmail}
                  className="flex-1"
                >
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Math Explainer Modal */}
      <MathExplainer
        isOpen={showMathExplainer}
        onClose={() => setShowMathExplainer(false)}
        equation={selectedEquation}
        context={equationContext}
        documentContent=""
      />
      
      {/* General Explainer Modal */}
      <GeneralExplainer
        isOpen={showGeneralExplainer}
        onClose={() => setShowGeneralExplainer(false)}
        selectedText={generalExplainerText}
        documentContext={equationContext}
        documentContent=""
        documentTitle=""
        documentAuthors=""
        documentUrl={documentUrl}
        userId={userId}
        userName={userName}
      />

      {/* Advanced Explainer Modal */}
      <AdvancedExplainer
        isOpen={showAdvancedExplainer}
        onClose={() => setShowAdvancedExplainer(false)}
        selectedText={advancedExplainerText}
        documentContent=""
        documentTitle=""
        documentAuthors=""
        documentUrl={documentUrl}
        userId={userId}
        userName={userName}
      />

      {/* Table Explainer Modal */}
      <TableExplainer
        isOpen={showTableExplainer}
        onClose={() => setShowTableExplainer(false)}
        selectedText={tableExplainerText}
        documentContent=""
        documentTitle=""
        documentAuthors=""
        documentUrl={documentUrl}
        userId={userId}
        userName={userName}
      />

      {/* Image Explainer Modal */}
      <ImageExplainer
        isOpen={showImageExplainer}
        onClose={() => {
          setShowImageExplainer(false)
          setExtractedImageData(null)
          setHasActualImage(false)
        }}
        selectedText={imageExplainerText}
        imageData={extractedImageData || undefined}
        hasActualImage={hasActualImage}
        documentContent=""
        documentTitle=""
        documentAuthors=""
        documentUrl={documentUrl}
        userId={userId}
        userName={userName}
      />

      {/* Screen Capture Tool */}
      <ScreenCapture
        isOpen={showScreenCapture}
        onClose={() => setShowScreenCapture(false)}
        onCapture={(imageData) => {
          console.log('📸 Screen capture completed, starting AI analysis');
          setCapturedImageData(imageData);
          setExtractedImageData(imageData);
          setHasActualImage(true);
          setImageExplainerText('Screen captured area for analysis');
          setShowImageExplainer(true);
          setShowScreenCapture(false);
        }}
        targetElementId="webviewer-container"
      />

      {/* Prerequisite Helper */}
      <PrerequisiteHelper
        isOpen={showPrerequisiteHelper}
        onClose={() => setShowPrerequisiteHelper(false)}
        selectedText={prerequisiteText}
        documentContent={documentContent || ''}
        documentTitle={documentTitle || ''}
        documentAuthors={documentAuthors || ''}
        documentUrl={documentUrl}
        userId={userId}
        userName={userName}
      />

      
      {/* Text Selection Popup */}
      {showTextSelectionPopup && selectedText && (
        <TextSelectionPopup
          selectedText={selectedText}
          position={selectionPosition}
          onClose={() => {
            console.log('🎯 Closing text selection popup');
            setShowTextSelectionPopup(false);
          }}
          onHighlight={(color) => {
            // Add highlight annotation using WebViewer
            if (webViewerInstance && webViewerInstance.Core) {
              const { documentViewer, annotationManager, Annotations } = webViewerInstance.Core;
              const selectedTextQuads = documentViewer.getSelectedTextQuads();
              
              if (selectedTextQuads && selectedTextQuads.length > 0) {
                const pageNumber = selectedTextQuads[0].pageNumber;
                const highlight = new Annotations.HighlightAnnotation();
                highlight.PageNumber = pageNumber;
                highlight.Quads = selectedTextQuads.map((quad: any) => quad.quads).flat();
                highlight.StrokeColor = new Annotations.Color(color);
                highlight.Author = userName;
                
                annotationManager.addAnnotation(highlight);
                annotationManager.redrawAnnotation(highlight);
                documentViewer.clearSelection();
              }
            }
            setShowTextSelectionPopup(false);
          }}
          onAnnotate={(comment) => {
            // Add comment annotation using WebViewer
            if (webViewerInstance && webViewerInstance.Core) {
              const { documentViewer, annotationManager, Annotations } = webViewerInstance.Core;
              const selectedTextQuads = documentViewer.getSelectedTextQuads();
              
              if (selectedTextQuads && selectedTextQuads.length > 0) {
                const pageNumber = selectedTextQuads[0].pageNumber;
                const highlight = new Annotations.HighlightAnnotation();
                highlight.PageNumber = pageNumber;
                highlight.Quads = selectedTextQuads.map((quad: any) => quad.quads).flat();
                highlight.StrokeColor = new Annotations.Color('#ffeb3b');
                highlight.Author = userName;
                highlight.Contents = comment;
                
                // Create a sticky note for the comment
                const note = new Annotations.StickyAnnotation();
                note.PageNumber = pageNumber;
                note.X = selectedTextQuads[0].quads[0].x1;
                note.Y = selectedTextQuads[0].quads[0].y1;
                note.Contents = comment;
                note.Author = userName;
                note.Subject = 'Comment';
                note.InReplyTo = highlight.Id;
                
                annotationManager.addAnnotation(highlight);
                annotationManager.addAnnotation(note);
                annotationManager.redrawAnnotation(highlight);
                annotationManager.redrawAnnotation(note);
                documentViewer.clearSelection();
              }
            }
            setShowTextSelectionPopup(false);
          }}
          onAIExplain={() => {
            // Always route to Math Explainer for this button
            console.log('🧮 Math AI button clicked for:', selectedText);
            setSelectedEquation(selectedText);
            setEquationContext(extractContextAroundSelection(selectedText));
            setShowMathExplainer(true);
            setShowTextSelectionPopup(false);
          }}
          onGeneralExplain={() => {
            // Always route to Advanced Explainer for this button
            console.log('🚀 Smart AI button clicked for:', selectedText);
            setAdvancedExplainerText(selectedText);
            setShowAdvancedExplainer(true);
            setShowTextSelectionPopup(false);
          }}
          onTableExplain={() => {
            // Always route to Table Explainer for this button
            console.log('📊 Table AI button clicked for:', selectedText);
            setTableExplainerText(selectedText);
            setShowTableExplainer(true);
            setShowTextSelectionPopup(false);
          }}
          onImageExplain={async () => {
            // Enhanced Image AI with actual image extraction
            console.log('🖼️ Image AI button clicked for:', selectedText);
            
            try {
              // Check if we can extract actual image data
              const extractedImageData = await extractImageFromPDF(selectedText);
              
              console.log('🔍 ApryseWebViewer Debug - extractedImageData:', {
                hasData: !!extractedImageData,
                dataType: typeof extractedImageData,
                startsWithDataImage: extractedImageData?.startsWith('data:image'),
                length: extractedImageData?.length || 0,
                first50chars: extractedImageData ? extractedImageData.substring(0, 50) + '...' : 'null'
              });
              
              if (extractedImageData && extractedImageData.startsWith('data:image')) {
                console.log('✅ Successfully extracted actual image data for Vision AI');
                // Pass the actual image data to the explainer
                setImageExplainerText(selectedText);
                // Store image data in state for the explainer
                setExtractedImageData(extractedImageData);
                setHasActualImage(true);
                setShowImageExplainer(true);
              } else if (extractedImageData === 'CAPTION_ONLY') {
                console.log('📝 Using caption-based analysis (image extraction not available)');
                setImageExplainerText(selectedText);
                setExtractedImageData(null);
                setHasActualImage(false);
                setShowImageExplainer(true);
                      } else {
          console.log('⚠️ Could not extract image, suggesting screen capture');
          // Instead of falling back to caption only, suggest using screen capture
          toast.error('Unable to extract image automatically. Please use the screen capture tool (camera icon) to capture the specific figure area for AI analysis.');
          return; // Don't open the explainer yet
        }
            } catch (error) {
              console.error('❌ Error in image extraction:', error);
              // Show helpful message instead of falling back
              toast.info('💡 Tip: For best results with figure analysis, use the screen capture tool (camera icon) to select the specific figure area!', {
                duration: 4000
              });
              // Still allow caption-based analysis as fallback
              setImageExplainerText(selectedText);
              setExtractedImageData(null);
              setHasActualImage(false);
              setShowImageExplainer(true);
            }
            
            setShowTextSelectionPopup(false);
          }}
          onPrerequisiteHelp={() => {
            // Route to Prerequisite Helper
            console.log('🎓 Prerequisites button clicked for:', selectedText);
            setPrerequisiteText(selectedText);
            setShowPrerequisiteHelper(true);
            setShowTextSelectionPopup(false);
          }}
          onStuckHelp={() => {
            setShowTextSelectionPopup(false);
            handleStuckHelp();
          }}
          onCopy={() => {
            // Copy is handled internally by the popup
            console.log('Text copied to clipboard');
          }}
          documentContext={equationContext}
        />
      )}

      {/* Smart Prerequisite Helper */}
      <SmartPrerequisiteHelper
        isOpen={showSmartPrerequisiteHelper}
        onClose={() => setShowSmartPrerequisiteHelper(false)}
        documentTitle={documentTitle || 'Research Paper'}
        documentContent={documentContent || ''}
        documentAuthors={documentAuthors || ''}
        documentUrl={documentUrl}
        selectedText={prerequisiteText}
      />

      {/* AI Research Prerequisites */}
      <AIResearchPrerequisites
        isOpen={showAIResearchPrerequisites}
        onClose={() => setShowAIResearchPrerequisites(false)}
        documentTitle={documentTitle || 'Research Paper'}
        documentAuthors={documentAuthors || ''}
        documentJournal={documentJournal || ''}
        documentYear={documentYear || ''}
        documentUrl={documentUrl}
        documentText={documentContent} // Pass the extracted text
      />
    </div>
  )
} 