'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Bot, Send, Loader2, Sparkles } from 'lucide-react'

interface AIChatInputProps {
  documentId: string
  userId: string
  userName: string
  onSendMessage: (message: string) => void
  onAIResponse: (aiResponse: any) => void
  documentUrl?: string
}

export function AIChatInput({ 
  documentId, 
  userId, 
  userName, 
  onSendMessage, 
  onAIResponse,
  documentUrl 
}: AIChatInputProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAIInput, setShowAIInput] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAIQuestion = async () => {
    if (!aiQuestion.trim() || isLoading) return

    setIsLoading(true)
    
    try {
      // Send the AI question to the chat first
      const userMessage = `🤖 AI Question: ${aiQuestion}`
      onSendMessage(userMessage)

      // Get AI response
      const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          userId,
          userName,
          question: aiQuestion,
          documentUrl
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Send AI response to chat
          const aiMessage = `🤖 AI Assistant: ${data.response.answer}`
          onAIResponse({
            id: data.response.id,
            documentId,
            userId: 'ai-assistant',
            userName: 'AI Assistant',
            content: data.response.answer,
            type: 'AI_RESPONSE',
            timestamp: new Date().toISOString(),
            confidence: data.response.confidence,
            sources: data.response.sources,
            relatedTopics: data.response.relatedTopics
          })
        }
      } else {
        const errorData = await response.json()
        const errorMessage = `❌ AI Error: ${errorData.error || 'Failed to get AI response'}`
        onSendMessage(errorMessage)
      }
    } catch (error) {
      console.error('AI request failed:', error)
      const errorMessage = `❌ AI Error: Failed to connect to AI service`
      onSendMessage(errorMessage)
    } finally {
      setIsLoading(false)
      setAiQuestion('')
      setShowAIInput(false)
    }
  }

  const handleAIKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAIQuestion()
    }
  }

  return (
    <div className="space-y-4">
      {/* Regular Chat Input */}
      <div className="flex space-x-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button onClick={handleSendMessage} disabled={!message.trim() || isLoading}>
          <Send className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAIInput(!showAIInput)}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <Sparkles className="h-4 w-4" />
          <span>AI</span>
        </Button>
      </div>

      {/* AI Question Input */}
      {showAIInput && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Bot className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Ask AI Assistant</span>
            </div>
            <div className="space-y-3">
              <Input
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyPress={handleAIKeyPress}
                placeholder="Ask anything about this document..."
                className="border-blue-300 focus:border-blue-500"
                disabled={isLoading}
              />
              <div className="flex space-x-2">
                <Button
                  onClick={handleAIQuestion}
                  disabled={!aiQuestion.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Ask AI
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAIInput(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-blue-600">
                💡 Ask about concepts, methodology, findings, or request explanations of specific sections.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 