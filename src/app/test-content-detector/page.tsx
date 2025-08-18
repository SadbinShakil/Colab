'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { isMathematicalContent, getContentType, getExplainerSuggestion } from '@/utils/contentDetector'

export default function TestContentDetector() {
  const [testText, setTestText] = useState('')
  const [results, setResults] = useState<any>(null)

  const testContent = () => {
    if (!testText.trim()) return
    
    const isMath = isMathematicalContent(testText)
    const contentType = getContentType(testText)
    const suggestion = getExplainerSuggestion(testText)
    
    setResults({
      isMath,
      contentType,
      suggestion,
      text: testText
    })
  }

  const testSamples = [
    { label: 'Math: Simple Equation', text: 'x + 2 = 5' },
    { label: 'Math: Complex Equation', text: '∫ sin(x) dx = -cos(x) + C' },
    { label: 'Math: Formula', text: 'E = mc²' },
    { label: 'General: Research Text', text: 'The study methodology involved collecting data from participants over a 6-month period to analyze user behavior patterns.' },
    { label: 'General: Paper Abstract', text: 'This paper presents a novel approach to neural network optimization using adaptive learning rates and batch normalization techniques.' },
    { label: 'Mixed: Math in Context', text: 'The research found that using the formula y = mx + b helped predict user engagement with 95% accuracy.' }
  ]

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Content Detector Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Test Text:</label>
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to test..."
              rows={4}
            />
            <Button onClick={testContent} className="mt-2">
              Test Content Detection
            </Button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Sample Texts:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testSamples.map((sample, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  onClick={() => setTestText(sample.text)}
                  className="text-left p-3 h-auto"
                >
                  <div>
                    <div className="font-medium text-sm">{sample.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{sample.text.substring(0, 50)}...</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {results && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Detection Results:</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Text:</strong> "{results.text}"</div>
                <div><strong>Is Mathematical:</strong> <span className={results.isMath ? 'text-blue-600' : 'text-green-600'}>{results.isMath ? 'YES' : 'NO'}</span></div>
                <div><strong>Content Type:</strong> <span className={results.contentType === 'mathematical' ? 'text-blue-600' : 'text-green-600'}>{results.contentType}</span></div>
                <div><strong>Suggested Explainer:</strong> <span className={results.suggestion.type === 'mathematical' ? 'text-blue-600' : 'text-green-600'}>{results.suggestion.type} (confidence: {results.suggestion.confidence})</span></div>
                <div><strong>Reasoning:</strong> {results.suggestion.reasoning}</div>
                <div><strong>Would Route To:</strong> <span className={results.isMath ? 'text-blue-600' : 'text-green-600'}>{results.isMath ? 'Math Explainer' : 'General Explainer'}</span></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 
