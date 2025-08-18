'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
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
  Zap
} from 'lucide-react'
import MathExplainer from './MathExplainer'
import TextSelectionPopup from './TextSelectionPopup'

interface ApryseWebViewerProps {
  documentUrl: string
  documentId: string
  userName?: string
  userId?: string
  onHighlightAdd?: (highlightData: any) => void
  collaborationHighlights?: any[]
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
  collaborationHighlights = []
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
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-activity',
          documentId,
          userId,
          activity
        })
      });
      activityFailureCount = 0;
    } catch (error) {
      activityFailureCount++;
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
        console.error('Error updating activity:', error);
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

    // Enhanced comment handling system
    const handleAnnotationInteraction = (event: any) => {
      const target = event.target;
      
      // Check if clicked element is an annotation
      if (target && (
        target.classList.contains('annotation') ||
        target.classList.contains('highlight') ||
        target.closest('.annotation') ||
        target.closest('.highlight')
      )) {
        event.preventDefault();
        event.stopPropagation();
        
        // Get annotation ID
        const annotationId = target.getAttribute('data-annotation-id') || 
                           target.closest('.annotation')?.getAttribute('data-annotation-id') ||
                           target.closest('.highlight')?.getAttribute('data-annotation-id');
        
        if (annotationId && webViewerInstance && webViewerInstance.Core) {
          try {
            const { annotationManager } = webViewerInstance.Core;
            const annotation = annotationManager.getAnnotationById(annotationId);
            
            if (annotation) {
              // Try to show comments using WebViewer's built-in method
              if (typeof annotationManager.showAnnotationComments === 'function') {
                annotationManager.showAnnotationComments(annotation);
              } else if (typeof annotationManager.showComments === 'function') {
                annotationManager.showComments(annotation);
              } else {
                // Fallback: manually trigger comment panel
                console.log('Opening comment panel for annotation:', annotationId);
                // You can implement custom comment UI here
                showCustomCommentPanel(annotation);
              }
            }
          } catch (error) {
            console.error('Error handling annotation interaction:', error);
            // Fallback to custom comment panel
            showCustomCommentPanel({ Id: annotationId });
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
        <h3>Add Comment</h3>
        <textarea 
          placeholder="Enter your comment here..." 
        ></textarea>
        <div class="button-group">
          <button class="cancel" onclick="this.closest('.custom-comment-panel').remove()">Cancel</button>
          <button class="save" onclick="saveComment(this)">Save Comment</button>
        </div>
      `;
      
      // Add save function to window
      (window as any).saveComment = function(button: any) {
        const textarea = button.parentElement.previousElementSibling;
        const comment = textarea.value;
        if (comment.trim()) {
          console.log('Saving comment:', comment, 'for annotation:', annotation.Id);
          // Here you can implement saving the comment to your backend
          // For now, just close the panel
          commentPanel.remove();
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

    // Add event listeners for annotation interactions
    document.addEventListener('click', handleAnnotationInteraction);
    document.addEventListener('dblclick', handleAnnotationInteraction);

    return () => {
      document.removeEventListener('click', handleAnnotationInteraction);
      document.removeEventListener('dblclick', handleAnnotationInteraction);
      // Clean up global function
      delete (window as any).saveComment;
    };
  }, [webViewerInstance]);

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
              
              // Update activity to editing
              updateActivity('editing');
            }
          }
        });
        
        documentViewer.addEventListener('documentLoaded', () => {
          documentViewer.setFitMode(documentViewer.FitMode.FitWidth);
          setIsLoading(false);
          
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
          
          // Method 1: Apryse text selection event
          try {
            documentViewer.addEventListener('textSelectionChanged', (quads: any, text: string, pageNumber: number) => {
              console.log('🎯 Apryse text selection event:', { text, pageNumber });
              if (text && text.trim()) {
                captureSelectedText(text, pageNumber);
              }
            });
            console.log('✅ Apryse text selection listener added');
          } catch (error) {
            console.log('❌ Error adding Apryse listener:', error);
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
          className="webviewer flex-1 w-full" 
          ref={viewer}
          style={{ 
            height: 'calc(100vh - 100px)',
            minHeight: '800px',
            width: '100%'
          }}
        />
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
      
      {/* Debug info for text selection */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black text-white p-3 text-xs rounded z-50 max-w-sm">
          <div className="mb-2 font-bold">📝 TEXT CAPTURE DEBUG</div>
          <div>Last Selected: {lastSelectedText ? `"${lastSelectedText.substring(0, 30)}..."` : 'None'}</div>
          <div>Total Captured: {capturedSelections.length}</div>
          <div className="mt-2 border-t pt-2">
            <div className="font-semibold">Recent Selections:</div>
            {capturedSelections.slice(-3).map((sel, idx) => (
              <div key={idx} className="mt-1 text-yellow-300">
                "{sel.text.substring(0, 25)}..." 
                {sel.pageNumber && ` (p.${sel.pageNumber})`}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Text Selection Popup */}
      {showTextSelectionPopup && selectedText && (
        <TextSelectionPopup
          selectedText={selectedText}
          position={selectionPosition}
          onClose={() => setShowTextSelectionPopup(false)}
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
            // Check if it's mathematical content
            if (isMathematicalContent(selectedText)) {
              setSelectedEquation(selectedText);
              setEquationContext(extractContextAroundSelection(selectedText));
              setShowMathExplainer(true);
            } else {
              // For non-mathematical content, you could open a general AI chat
              // or send the text to the chat sidebar
              alert(`AI analysis for: "${selectedText}"\n\nThis feature can be extended to provide AI-powered explanations for any selected text.`);
            }
            setShowTextSelectionPopup(false);
          }}
          onCopy={() => {
            // Copy is handled internally by the popup
            console.log('Text copied to clipboard');
          }}
          documentContext={equationContext}
        />
      )}
    </div>
  )
} 