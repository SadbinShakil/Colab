'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquare, Send, Bot, User, Users, HelpCircle,
  Brain, Lightbulb, AlertCircle, CheckCircle, Clock,
  X, ChevronRight, MessageCircleQuestion
} from 'lucide-react'

interface ChatMessage {
  id: string
  documentId: string
  userId: string
  userName: string
  content: string
  type: 'TEXT' | 'AI_RESPONSE' | 'SYSTEM'
  timestamp: string
}

interface AIResponse {
  id: string
  question: string
  answer: string
  confidence: number
  sources: { page: number; section: string }[]
  timestamp: string
}

interface ChatSidebarProps {
  documentId: string
  currentUser: {
    id: string
    name: string
    color: string
  }
  isOpen: boolean
  onClose: () => void
  collaboration?: {
    chatMessages: ChatMessage[]
    typingUsers: string[]
    activeUsers: any[]
  }
}

export default function ChatSidebar({ documentId, currentUser, isOpen, onClose, collaboration }: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'ai' | 'help'>('chat')
  const [stuckRequests, setStuckRequests] = useState<any[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const aiInputRef = useRef<HTMLInputElement>(null)

  // Use collaboration data if available, otherwise use local state
  const displayMessages = collaboration?.chatMessages || messages
  const displayTypingUsers = collaboration?.typingUsers || typingUsers
  const displayActiveUsers = collaboration?.activeUsers || activeUsers

  // Load existing messages and set up real-time updates
  useEffect(() => {
    if (isOpen && documentId) {
      loadMessages()
      
      // Join the chat room
      fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join-document',
          documentId,
          userId: currentUser.id,
          userName: currentUser.name
        })
      })
      
      // Set up real-time polling for new messages
      const interval = setInterval(() => {
        loadMessages()
      }, 2000) // Poll every 2 seconds
      
      return () => {
        clearInterval(interval)
        // Leave the chat room
        fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'leave-document',
            documentId,
            userId: currentUser.id,
            userName: currentUser.name
          })
        })
      }
    }
  }, [isOpen, documentId, currentUser.id, currentUser.name])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-messages',
          documentId
        })
      })
      const data = await response.json()
      if (data.success) {
        setMessages(data.messages || [])
        setTypingUsers(data.typingUsers || [])
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    // Create optimistic message
    const optimisticMessage: ChatMessage = {
      id: `temp_${Date.now()}_${currentUser.id}`,
      documentId,
      userId: currentUser.id,
      userName: currentUser.name,
      content: messageContent,
      type: 'TEXT',
      timestamp: new Date().toISOString()
    }

    // Add message immediately for better UX
    setMessages(prev => [...prev, optimisticMessage])

    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-message',
          documentId,
          userId: currentUser.id,
          userName: currentUser.name,
          messageData: {
            content: messageContent,
            type: 'TEXT'
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Replace optimistic message with real one
          setMessages(prev => prev.map(msg => 
            msg.id === optimisticMessage.id ? { ...msg, id: result.chatMessage.id } : msg
          ))
        } else {
          // Remove optimistic message if failed
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
          console.error('Failed to send message')
        }
      } else {
        // Remove optimistic message if failed
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
        console.error('Failed to send message')
      }
    } catch (error) {
      // Remove optimistic message if failed
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const askAI = async () => {
    if (!aiQuestion.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          question: aiQuestion,
          userId: currentUser.id
        })
      })

      const data = await response.json()
      if (data.answer) {
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          documentId,
          userId: 'ai-assistant',
          userName: 'AI Assistant',
          content: data.answer,
          type: 'AI_RESPONSE',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Failed to get AI response:', error)
    }
    setIsLoading(false)
    setAiQuestion('')
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: 'chat' | 'ai') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (action === 'chat') {
        sendMessage()
      } else {
        askAI()
      }
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    // Show exact time for recent messages (within 1 hour)
    if (diffInMinutes < 60) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    }
    
    // Show relative time for older messages
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    
    // Show date and time for older messages
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getMessageIcon = (type: string, userId: string) => {
    if (type === 'AI_RESPONSE') {
      return (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )
    }
    
    if (userId === currentUser.id) {
      return (
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
          style={{ backgroundColor: currentUser.color }}
        >
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
      )
    }
    
    return (
      <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
        <User className="h-4 w-4 text-gray-600" />
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="w-80 h-full bg-white border-l border-gray-100 flex flex-col">
      {/* Clean Header - Anara Style */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Research Assistant</h2>
            {displayActiveUsers.length > 0 && (
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">
                  {displayActiveUsers.length} active
                </span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Clean Tab Navigation */}
      <div className="flex border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 rounded-none border-b-2 transition-colors ${
            activeTab === 'chat' 
              ? 'border-blue-500 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">Chat</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 rounded-none border-b-2 transition-colors ${
            activeTab === 'ai' 
              ? 'border-purple-500 text-purple-600 bg-purple-50' 
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('ai')}
        >
          <Brain className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">AI</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 rounded-none border-b-2 transition-colors ${
            activeTab === 'help' 
              ? 'border-orange-500 text-orange-600 bg-orange-50' 
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('help')}
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">Help</span>
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'chat' && (
          <>
            {/* Chat Messages */}
            <ScrollArea className="flex-1 custom-scrollbar">
              <div className="p-4 space-y-4">
                {displayMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Start the conversation</p>
                    <p className="text-xs text-gray-500 mt-1">Collaborate with your team on this document</p>
                  </div>
                ) : (
                  displayMessages.map((message) => (
                    <div key={message.id} className={`flex items-start space-x-3 ${message.userId === currentUser.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {getMessageIcon(message.type, message.userId)}
                      <div className={`flex-1 min-w-0 ${message.userId === currentUser.id ? 'text-right' : ''}`}>
                        <div className={`flex items-baseline space-x-2 mb-1 ${message.userId === currentUser.id ? 'justify-end' : ''}`}>
                          <span className={`text-sm font-medium truncate ${
                            message.userId === currentUser.id 
                              ? 'text-blue-600' 
                              : message.type === 'AI_RESPONSE' 
                                ? 'text-purple-600' 
                                : 'text-gray-900'
                          }`}>
                            {message.userName}
                            {message.userId === currentUser.id && ' (You)'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div className={`text-sm leading-relaxed ${
                          message.userId === currentUser.id 
                            ? 'bg-blue-500 text-white rounded-lg px-3 py-2 ml-4' 
                            : message.type === 'AI_RESPONSE'
                              ? 'bg-purple-50 text-purple-900 rounded-lg px-3 py-2 border border-purple-200'
                              : 'bg-gray-100 text-gray-700 rounded-lg px-3 py-2 mr-4'
                        }`}>
                          {message.content.includes('**') ? (
                            <div dangerouslySetInnerHTML={{
                              __html: message.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\n/g, '<br>')
                            }} />
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Typing Indicator */}
            {displayTypingUsers.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-600">
                    {displayTypingUsers.length === 1 
                      ? `${displayTypingUsers[0]} is typing...`
                      : `${displayTypingUsers.join(', ')} are typing...`
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <Input
                  ref={chatInputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    // Send typing indicator
                    if (e.target.value.length > 0) {
                      fetch('/api/socket', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'typing-start',
                          documentId,
                          userId: currentUser.id,
                          userName: currentUser.name
                        })
                      })
                    } else {
                      fetch('/api/socket', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'typing-stop',
                          documentId,
                          userId: currentUser.id,
                          userName: currentUser.name
                        })
                      })
                    }
                  }}
                  onBlur={() => {
                    // Stop typing indicator when input loses focus
                    fetch('/api/socket', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'typing-stop',
                        documentId,
                        userId: currentUser.id,
                        userName: currentUser.name
                      })
                    })
                  }}
                  placeholder="Type a message..."
                  className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={isSending}
                />
                <Button 
                  onClick={sendMessage} 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3"
                  disabled={!newMessage.trim() || isSending}
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <div className="flex-1 flex flex-col">
            {/* AI Help Content */}
            <div className="p-4">
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-2">
                  <Brain className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="font-medium text-purple-900">AI Research Assistant</h3>
                </div>
                <p className="text-sm text-purple-700">
                  Ask questions about this document and get instant, AI-powered insights.
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  ref={aiInputRef}
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask about this document..."
                  className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && askAI()}
                />
                <Button 
                  onClick={askAI} 
                  disabled={!aiQuestion.trim() || isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Ask AI
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="px-4 pb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Questions</h4>
              <div className="space-y-2">
                {[
                  "Summarize this document",
                  "What are the key findings?",
                  "Explain the methodology",
                  "What are the main conclusions?"
                ].map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 px-3 text-sm text-gray-700 border-gray-200 hover:bg-purple-50 hover:border-purple-300"
                    onClick={() => setAiQuestion(suggestion)}
                  >
                    <MessageCircleQuestion className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{suggestion}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="flex-1 p-4">
            <div className="bg-orange-50 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <HelpCircle className="h-5 w-5 text-orange-600 mr-2" />
                <h3 className="font-medium text-orange-900">Need Help?</h3>
              </div>
              <p className="text-sm text-orange-700">
                Mark sections where you're stuck and get help from the community.
              </p>
            </div>

            {stuckRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lightbulb className="h-6 w-6 text-orange-500" />
                </div>
                <p className="text-sm text-gray-600 font-medium">No help requests yet</p>
                <p className="text-xs text-gray-500 mt-1">Use the "Stuck Here" tool to mark difficult sections</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stuckRequests.map((request, index) => (
                  <Card key={index} className="border-orange-200">
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{request.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              Page {request.page}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTime(request.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 