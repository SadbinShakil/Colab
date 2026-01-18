// components/SmartHelpPanel.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Bot, Users, MessageCircle, Send, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface ConfusedHighlight {
  id: string
  text: string
  sectionId: string
  page: number
}

interface PeerInfo {
  userId: string
  userName: string
  status: 'online' | 'offline' | 'busy'
  isProficient: boolean
}

interface SmartHelpPanelProps {
  isOpen: boolean
  onClose: () => void
  confusedHighlights: ConfusedHighlight[]
  sectionName: string
  userId: string
  userName: string
  availablePeers: PeerInfo[]
  documentId: string
  sectionId?: string
  sectionText?: string // ✅ ADDED: Capture full text content for context
  onSendInvitation?: (peerId: string, peerName: string) => void
}

type TabType = 'ai' | 'peers' | 'group'

export default function SmartHelpPanel({
  isOpen,
  onClose,
  confusedHighlights,
  sectionName,
  userId,
  userName,
  availablePeers,
  documentId,
  sectionId,
  sectionText,
  onSendInvitation
}: SmartHelpPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ai')
  const [message, setMessage] = useState('')
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'ai', content: string }>>([])
  const [peerMessages, setPeerMessages] = useState<Array<{ userId: string, userName: string, message: string, timestamp: number }>>([])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [selectedPeer, setSelectedPeer] = useState<PeerInfo | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Auto-select best default tab and reset state when panel opens
  // useEffect(() => {
  //   if (isOpen) {
  //     // Reset messages when panel opens
  //     setAiMessages([])
  //     setPeerMessages([])
  //     setMessage('')
  //     setSelectedPeer(null)

  //     const onlineProficientPeers = availablePeers.filter(p => p.status === 'online' && p.isProficient)

  //     if (onlineProficientPeers.length > 0) {
  //       setActiveTab('peers')
  //       setSelectedPeer(onlineProficientPeers[0])
  //     } else {
  //       setActiveTab('ai')
  //     }

  //     // Generate initial AI greeting with context (always show greeting, even if no highlights)
  //     generateInitialAIGreeting()
  //   }
  // }, [isOpen, availablePeers, confusedHighlights])

  useEffect(() => {
    if (isOpen && !hasInitialized) {
      // Reset messages when panel opens
      setAiMessages([])
      setPeerMessages([])
      setMessage('')
      setSelectedPeer(null)

      const onlineProficientPeers = availablePeers.filter(p => p.status === 'online' && p.isProficient)

      if (onlineProficientPeers.length > 0) {
        setActiveTab('peers')
        setSelectedPeer(onlineProficientPeers[0])
      } else {
        setActiveTab('ai')
      }

      // Generate initial AI greeting
      generateInitialAIGreeting()

      setHasInitialized(true)
    }

    // Reset initialization flag when panel closes
    if (!isOpen && hasInitialized) {
      setHasInitialized(false)
    }
  }, [isOpen]) // ✅ ONLY isOpen dependency

  const generateInitialAIGreeting = () => {
    if (confusedHighlights.length > 0) {
      const highlightTexts = confusedHighlights.map(h => `"${h.text.substring(0, 50)}..."`).join(', ')

      setAiMessages([{
        role: 'ai',
        content: `Hi! I see you're working on **${sectionName}** and marked ${confusedHighlights.length} section${confusedHighlights.length > 1 ? 's' : ''} as confusing.\n\nI'm here to help explain these concepts in simpler terms. What would you like to understand better?`
      }])
    } else {
      // ✅ Don't auto-send message when just section struggle is detected
      // Instead, we'll let the user choose from the "Welcome Options" UI
      setAiMessages([])
    }
  }

  const handleQuickAction = async (text: string) => {
    // Directly send message without setting input state
    await sendAIMessage(text)
  }

  const sendAIMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isAiLoading) return

    setAiMessages(prev => [...prev, { role: 'user', content: textToSend }])
    setIsAiLoading(true)

    try {
      // Prepare context from confused highlights
      const context = confusedHighlights.length > 0
        ? confusedHighlights.map(h => h.text).join('\n\n')
        : (sectionText && sectionText.length > 20 ? `Section Text from PDF:\n${sectionText}` : `User is asking about section: ${sectionName}`)

      console.log('🤖 [AI Help] Sending message:', textToSend)
      console.log('📋 [AI Help] Context:', context.substring(0, 200))

      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          context: context,
          sectionName: sectionName,
          conversationHistory: aiMessages,
          userId: userId,
          userName: userName
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.response) {
        setAiMessages(prev => [...prev, { role: 'ai', content: data.response }])
      } else if (data.error) {
        throw new Error(data.error)
      } else {
        throw new Error('No response from AI service')
      }
    } catch (error: any) {
      console.error('❌ [AI Help] Error:', error)
      const errorMessage = error?.message || 'Unknown error'
      setAiMessages(prev => [...prev, {
        role: 'ai',
        content: `Sorry, I encountered an error: ${errorMessage}\n\nPlease try:\n• Checking your internet connection\n• Refreshing the page\n• Trying again in a moment`
      }])
      toast.error('AI Help Error', {
        description: errorMessage || 'Failed to get AI response'
      })
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleSendAIMessage = async () => {
    if (!message.trim()) return
    const msg = message
    setMessage('')
    await sendAIMessage(msg)
  }

  const handleSendPeerMessage = () => {
    if (!message.trim() || !selectedPeer) return

    const peerMessage = {
      userId: userId,
      userName: userName,
      message: message,
      timestamp: Date.now()
    }

    setPeerMessages(prev => [...prev, peerMessage])
    setMessage('')

    // TODO: Send via Socket.io to the peer
    // socket.emit('peer-message', {
    //   to: selectedPeer.userId,
    //   from: userId,
    //   message: message,
    //   documentId: documentId
    // })
  }

  const onlinePeersCount = availablePeers.filter(p => p.status === 'online').length
  const strugglingCount = availablePeers.filter(p => !p.isProficient).length

  if (!isOpen) return null

  return (
    <>
      {/* Overlay - Only covers right side where panel is */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[450px] bg-black bg-opacity-20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[450px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              🆘 Smart Help Panel
            </h2>
            <p className="text-sm text-blue-100">{sectionName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confused Highlights Summary */}
        {confusedHighlights.length > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-3">
            <p className="text-xs font-semibold text-yellow-800 mb-2">
              📍 Your confused highlights ({confusedHighlights.length}):
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {confusedHighlights.slice(0, 3).map((h, idx) => (
                <div key={idx} className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                  • {h.text.substring(0, 60)}...
                </div>
              ))}
              {confusedHighlights.length > 3 && (
                <p className="text-xs text-yellow-600 italic">
                  +{confusedHighlights.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === 'ai'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
          >
            <Bot className="w-4 h-4" />
            AI Help
          </button>

          <button
            onClick={() => setActiveTab('peers')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition flex items-center justify-center gap-2 relative ${activeTab === 'peers'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
          >
            <MessageCircle className="w-4 h-4" />
            Peers
            {onlinePeersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {onlinePeersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('group')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === 'group'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            disabled={strugglingCount < 2}
          >
            <Users className="w-4 h-4" />
            Group
            {strugglingCount >= 2 && (
              <span className="ml-1 text-xs">({strugglingCount})</span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* ✅ WELCOME OPTIONS - Show when no messages */}
                {aiMessages.length === 0 && (
                  <div className="flex flex-col gap-3 mt-4 animate-slide-in">
                    <p className="text-sm text-gray-600 mb-2 text-center">
                      I noticed you might be stuck on <strong>{sectionName}</strong>.<br />
                      How can I help you?
                    </p>

                    <button
                      onClick={() => handleQuickAction('Explain this section in simple terms')}
                      className="text-left p-4 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition shadow-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 text-blue-600">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Explain Content</p>
                          <p className="text-xs text-gray-500">Get a simple summary of this section</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction('Define key terms in this section')}
                      className="text-left p-4 bg-white border border-purple-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition shadow-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 text-purple-600">
                          <MessageCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Definitions</p>
                          <p className="text-xs text-gray-500">Clarify difficult vocabulary</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction('Give me a real-world example')}
                      className="text-left p-4 bg-white border border-green-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition shadow-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 text-green-600">
                          <Send className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Give Example</p>
                          <p className="text-xs text-gray-500">See a practical scenario</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction('Visualize this concept')}
                      className="text-left p-4 bg-white border border-orange-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 transition shadow-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg group-hover:bg-orange-200 text-orange-600">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Visualize</p>
                          <p className="text-xs text-gray-500">Create a mental model or diagram</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {aiMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                        }`}
                    >
                      {msg.role === 'ai' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-600">AI Assistant</span>
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}

                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="border-t border-gray-200 bg-white p-2">
                <div className="flex gap-2 mb-2 flex-wrap">
                  <button
                    onClick={async () => {
                      const msg = 'Explain this in simpler terms'
                      setAiMessages(prev => [...prev, { role: 'user', content: msg }])
                      setIsAiLoading(true)
                      try {
                        const context = confusedHighlights.length > 0
                          ? confusedHighlights.map(h => h.text).join('\n\n')
                          : (sectionText ? `Section Text:\n${sectionText}` : `Section: ${sectionName}`)
                        const response = await fetch('/api/ai-tutor', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            message: msg,
                            context: context,
                            sectionName: sectionName,
                            conversationHistory: aiMessages,
                            userId: userId,
                            userName: userName
                          })
                        })
                        const data = await response.json()
                        setAiMessages(prev => [...prev, { role: 'ai', content: data.response || 'Sorry, I encountered an error.' }])
                      } catch (error) {
                        setAiMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }])
                      } finally {
                        setIsAiLoading(false)
                      }
                    }}
                    disabled={isAiLoading}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition disabled:opacity-50"
                  >
                    🔄 Simpler
                  </button>
                  <button
                    onClick={async () => {
                      const msg = 'Give me an example'
                      setAiMessages(prev => [...prev, { role: 'user', content: msg }])
                      setIsAiLoading(true)
                      try {
                        const context = confusedHighlights.length > 0
                          ? confusedHighlights.map(h => h.text).join('\n\n')
                          : (sectionText ? `Section Text:\n${sectionText}` : `Section: ${sectionName}`)
                        const response = await fetch('/api/ai-tutor', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            message: msg,
                            context: context,
                            sectionName: sectionName,
                            conversationHistory: aiMessages,
                            userId: userId,
                            userName: userName
                          })
                        })
                        const data = await response.json()
                        setAiMessages(prev => [...prev, { role: 'ai', content: data.response || 'Sorry, I encountered an error.' }])
                      } catch (error) {
                        setAiMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }])
                      } finally {
                        setIsAiLoading(false)
                      }
                    }}
                    disabled={isAiLoading}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition disabled:opacity-50"
                  >
                    💡 Example
                  </button>
                  <button
                    onClick={async () => {
                      const msg = 'Can you visualize this?'
                      setAiMessages(prev => [...prev, { role: 'user', content: msg }])
                      setIsAiLoading(true)
                      try {
                        const context = confusedHighlights.length > 0
                          ? confusedHighlights.map(h => h.text).join('\n\n')
                          : (sectionText ? `Section Text:\n${sectionText}` : `Section: ${sectionName}`)
                        const response = await fetch('/api/ai-tutor', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            message: msg,
                            context: context,
                            sectionName: sectionName,
                            conversationHistory: aiMessages,
                            userId: userId,
                            userName: userName
                          })
                        })
                        const data = await response.json()
                        setAiMessages(prev => [...prev, { role: 'ai', content: data.response || 'Sorry, I encountered an error.' }])
                      } catch (error) {
                        setAiMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }])
                      } finally {
                        setIsAiLoading(false)
                      }
                    }}
                    disabled={isAiLoading}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition disabled:opacity-50"
                  >
                    📊 Visualize
                  </button>
                  {confusedHighlights.length > 0 && (
                    <button
                      onClick={async () => {
                        const highlightText = confusedHighlights[0].text.substring(0, 100)
                        const msg = `Explain this: "${highlightText}..."`
                        setAiMessages(prev => [...prev, { role: 'user', content: msg }])
                        setIsAiLoading(true)
                        try {
                          const context = confusedHighlights.map(h => h.text).join('\n\n')
                          const response = await fetch('/api/ai-tutor', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              message: msg,
                              context: context,
                              sectionName: sectionName,
                              conversationHistory: aiMessages,
                              userId: userId,
                              userName: userName
                            })
                          })
                          const data = await response.json()
                          setAiMessages(prev => [...prev, { role: 'ai', content: data.response || 'Sorry, I encountered an error.' }])
                        } catch (error) {
                          setAiMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }])
                        } finally {
                          setIsAiLoading(false)
                        }
                      }}
                      disabled={isAiLoading}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full transition disabled:opacity-50"
                    >
                      📍 Explain Highlight
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Peers Tab */}
          {activeTab === 'peers' && (
            <div className="h-full flex flex-col">
              {!selectedPeer ? (
                <div className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Available Peers:</p>
                  {availablePeers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No peers available right now</p>
                      <button
                        onClick={() => setActiveTab('ai')}
                        className="mt-4 text-sm text-blue-600 hover:text-blue-700"
                      >
                        Try AI Help instead →
                      </button>
                    </div>
                  ) : (
                    availablePeers.map(peer => (
                      <div
                        key={peer.userId}
                        className="w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setSelectedPeer(peer)}
                            className="flex-1 text-left"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{peer.userName}</p>
                              <p className="text-xs text-gray-600">
                                {peer.isProficient ? '✅ Already understood this' : '⚠️ Also struggling'}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${peer.status === 'online' ? 'bg-green-500' :
                              peer.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                              }`} />
                            <span className="text-xs text-gray-500 capitalize">{peer.status}</span>
                            {peer.status === 'online' && onSendInvitation && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSendInvitation(peer.userId, peer.userName)
                                  toast.success(`Invitation sent to ${peer.userName}!`, {
                                    description: 'They will receive a notification to join you.'
                                  })
                                }}
                                className="ml-2 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                                title="Send invitation to chat"
                              >
                                <UserPlus className="w-3 h-3" />
                                Invite
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Peer Chat Header */}
                  <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPeer(null)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        ←
                      </button>
                      <div>
                        <p className="font-medium text-gray-900">{selectedPeer.userName}</p>
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedPeer.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                          {selectedPeer.status}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('ai')}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Bot className="w-3 h-3" />
                      Invite AI
                    </button>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {peerMessages.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Start the conversation!</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {selectedPeer.userName} can see your confused highlights
                        </p>
                      </div>
                    )}

                    {peerMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${msg.userId === userId
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                            }`}
                        >
                          <p className="text-xs font-semibold mb-1 opacity-75">
                            {msg.userName}
                          </p>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group Tab */}
          {activeTab === 'group' && (
            <div className="p-4">
              {strugglingCount < 2 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-semibold mb-2">Group Study Not Available Yet</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Group study becomes available when 2 or more people are struggling with the same section.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 text-left">
                    <p className="text-xs font-semibold text-gray-700 mb-2">How it works:</p>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                      <li>When multiple people mark sections as confusing</li>
                      <li>You can join a group discussion</li>
                      <li>Learn together and help each other</li>
                      <li>Share insights and questions</li>
                    </ul>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">Currently: {strugglingCount} person{strugglingCount !== 1 ? 's' : ''} struggling</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Group Study Available!
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      {strugglingCount} student{strugglingCount !== 1 ? 's are' : ' is'} working on this section. Join them to learn together!
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">What you can do:</p>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                      <li>Ask questions and get help from peers</li>
                      <li>Share your understanding</li>
                      <li>Discuss difficult concepts together</li>
                      <li>Learn from different perspectives</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      // Switch to peers tab to see all struggling users
                      setActiveTab('peers')
                      toast.success('Group Study Started!', {
                        description: `You can now see and connect with ${strugglingCount} other student${strugglingCount !== 1 ? 's' : ''} working on this section.`
                      })
                    }}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Join Group Study
                  </button>

                  {/* Show list of struggling peers */}
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">Struggling Students:</p>
                    {availablePeers.filter(p => !p.isProficient).map(peer => (
                      <div key={peer.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${peer.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-sm text-gray-700">{peer.userName}</span>
                        </div>
                        {peer.status === 'online' && onSendInvitation && (
                          <button
                            onClick={() => {
                              onSendInvitation(peer.userId, peer.userName)
                              toast.success(`Invited ${peer.userName} to group study!`)
                            }}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        {(activeTab === 'ai' || (activeTab === 'peers' && selectedPeer)) && (
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    activeTab === 'ai' ? handleSendAIMessage() : handleSendPeerMessage()
                  }
                }}
                placeholder={activeTab === 'ai' ? 'Ask AI anything...' : 'Type a message...'}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                disabled={isAiLoading}
              />
              <button
                onClick={activeTab === 'ai' ? handleSendAIMessage : handleSendPeerMessage}
                disabled={!message.trim() || isAiLoading}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  )
}