// components/SmartHelpPanel.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Bot, Users, MessageCircle, Send } from 'lucide-react'

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
  documentId
}: SmartHelpPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ai')
  const [message, setMessage] = useState('')
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'ai', content: string }>>([])
  const [peerMessages, setPeerMessages] = useState<Array<{ userId: string, userName: string, message: string, timestamp: number }>>([])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [selectedPeer, setSelectedPeer] = useState<PeerInfo | null>(null)

  // Auto-select best default tab
  useEffect(() => {
    if (isOpen) {
      const onlineProficientPeers = availablePeers.filter(p => p.status === 'online' && p.isProficient)
      
      if (onlineProficientPeers.length > 0) {
        setActiveTab('peers')
        setSelectedPeer(onlineProficientPeers[0])
      } else {
        setActiveTab('ai')
      }

      // Generate initial AI greeting with context
      if (confusedHighlights.length > 0) {
        generateInitialAIGreeting()
      }
    }
  }, [isOpen, availablePeers, confusedHighlights])

  const generateInitialAIGreeting = () => {
    const highlightTexts = confusedHighlights.map(h => `"${h.text.substring(0, 50)}..."`).join(', ')
    
    setAiMessages([{
      role: 'ai',
      content: `Hi! I see you're working on **${sectionName}** and marked ${confusedHighlights.length} section${confusedHighlights.length > 1 ? 's' : ''} as confusing.\n\nI'm here to help explain these concepts in simpler terms. What would you like to understand better?`
    }])
  }

  const handleSendAIMessage = async () => {
    if (!message.trim()) return

    const userMessage = message
    setMessage('')
    
    // Add user message
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsAiLoading(true)

    try {
      // Prepare context from confused highlights
      const context = confusedHighlights.map(h => h.text).join('\n\n')
      
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: context,
          sectionName: sectionName,
          conversationHistory: aiMessages,
          userId: userId,
          userName: userName
        })
      })

      const data = await response.json()
      
      setAiMessages(prev => [...prev, { role: 'ai', content: data.response }])
    } catch (error) {
      console.error('AI Help error:', error)
      setAiMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setIsAiLoading(false)
    }
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
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
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
            className={`flex-1 py-3 px-4 text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeTab === 'ai'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Bot className="w-4 h-4" />
            AI Help
          </button>

          <button
            onClick={() => setActiveTab('peers')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition flex items-center justify-center gap-2 relative ${
              activeTab === 'peers'
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
            className={`flex-1 py-3 px-4 text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeTab === 'group'
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
                {aiMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
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
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setMessage('Explain this in simpler terms')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition"
                  >
                    🔄 Simpler
                  </button>
                  <button
                    onClick={() => setMessage('Give me an example')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition"
                  >
                    💡 Example
                  </button>
                  <button
                    onClick={() => setMessage('Can you visualize this?')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition"
                  >
                    📊 Visualize
                  </button>
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
                      <button
                        key={peer.userId}
                        onClick={() => setSelectedPeer(peer)}
                        className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{peer.userName}</p>
                            <p className="text-xs text-gray-600">
                              {peer.isProficient ? '✅ Already understood this' : '⚠️ Also struggling'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              peer.status === 'online' ? 'bg-green-500' :
                              peer.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`} />
                            <span className="text-xs text-gray-500 capitalize">{peer.status}</span>
                          </div>
                        </div>
                      </button>
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
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            selectedPeer.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
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
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.userId === userId
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
            <div className="p-4 text-center">
              {strugglingCount < 2 ? (
                <div className="py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Group study available when 2+ people struggle</p>
                  <p className="text-xs text-gray-400 mt-1">Currently: {strugglingCount} struggling</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900">👥 Group Study Available!</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {strugglingCount} students are working on this section
                    </p>
                  </div>
                  <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition">
                    Join Group Study
                  </button>
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