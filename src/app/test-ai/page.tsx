'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Loader2 } from 'lucide-react'

export default function TestAIPage() {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const testAI = async () => {
    if (!question.trim()) return

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: 'test-document',
          userId: 'test-user',
          userName: 'Test User',
          question: question,
          documentContent: 'This is a test document about artificial intelligence and machine learning. The document discusses various AI techniques including neural networks, deep learning, and natural language processing.'
        })
      })

      const data = await res.json()

      if (data.success) {
        setResponse(data.response.answer)
      } else {
        setError(data.error || 'Failed to get AI response')
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-6 w-6" />
            <span>AI Assistant Test</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Question:</label>
            <div className="flex space-x-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about the test document..."
                onKeyPress={(e) => e.key === 'Enter' && testAI()}
              />
              <Button onClick={testAI} disabled={isLoading || !question.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    Test AI
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {response && (
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Response:</label>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-900 whitespace-pre-wrap">{response}</p>
              </div>
            </div>
          )}

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-medium mb-2">Test Document Content:</h3>
            <p className="text-sm text-gray-700">
              "This is a test document about artificial intelligence and machine learning. 
              The document discusses various AI techniques including neural networks, deep learning, 
              and natural language processing."
            </p>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium mb-2">💡 Try these test questions:</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• "What is artificial intelligence?"</li>
              <li>• "Explain machine learning techniques"</li>
              <li>• "What are neural networks?"</li>
              <li>• "Summarize the main topics discussed"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 