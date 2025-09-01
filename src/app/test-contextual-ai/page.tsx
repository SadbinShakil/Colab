'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { contextualAI } from '@/lib/contextualAI'
import ContextualHelpPopup from '@/components/ContextualHelpPopup'
import { Brain, Highlighter, Clock, BookOpen, MessageSquare } from 'lucide-react'

export default function TestContextualAIPage() {
  const [testResults, setTestResults] = useState<string[]>([])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const testHighlightTracking = () => {
    const sectionId = 'test-section-1'
    const location = { page: 1, x: 100, y: 200 }
    
    // Simulate 3 highlights in the same section
    contextualAI.trackHighlight(sectionId, 'This is test highlight 1', location)
    addTestResult('✅ Tracked highlight 1')
    
    setTimeout(() => {
      contextualAI.trackHighlight(sectionId, 'This is test highlight 2', location)
      addTestResult('✅ Tracked highlight 2')
    }, 1000)
    
    setTimeout(() => {
      contextualAI.trackHighlight(sectionId, 'This is test highlight 3', location)
      addTestResult('✅ Tracked highlight 3 - Should trigger help popup!')
    }, 2000)
  }

  const testTimeSpentTracking = () => {
    const sectionId = 'test-section-2'
    const location = { page: 2, x: 150, y: 250 }
    
    // Simulate spending 2+ minutes on a section (using 130000ms = 2.17 minutes)
    contextualAI.trackTimeSpent(sectionId, 130000, location)
    addTestResult('✅ Tracked 2+ minutes time spent - Should trigger help popup!')
  }

  const testRevisitTracking = () => {
    const sectionId = 'test-section-3'
    const location = { page: 3, x: 200, y: 300 }
    
    // Simulate revisiting a section 2 times
    contextualAI.trackRevisit(sectionId, location)
    addTestResult('✅ Tracked revisit 1')
    
    setTimeout(() => {
      contextualAI.trackRevisit(sectionId, location)
      addTestResult('✅ Tracked revisit 2 - Should trigger help popup!')
    }, 1000)
  }

  const testAnnotationTracking = () => {
    const sectionId = 'test-section-4'
    const location = { page: 4, x: 250, y: 350 }
    
    // Simulate adding multiple annotations (threshold is 2 annotations)
    contextualAI.trackAnnotation(sectionId, 'This is test annotation 1', location)
    addTestResult('✅ Tracked annotation 1')
    
    setTimeout(() => {
      contextualAI.trackAnnotation(sectionId, 'This is test annotation 2', location)
      addTestResult('✅ Tracked annotation 2 - Should trigger help popup!')
    }, 1000)
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🧠 Contextual AI Test Page</h1>
        <p className="text-gray-600">
          Test the implicit AI help system by simulating different user behaviors.
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Highlighter className="w-5 h-5" />
              Highlight Tracking Test
            </CardTitle>
            <CardDescription>
              Simulates 3 highlights in the same section (threshold: 3)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testHighlightTracking} className="w-full">
              Test Highlight Tracking
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time Spent Tracking Test
            </CardTitle>
            <CardDescription>
              Simulates spending 2+ minutes on a section (threshold: 2 minutes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testTimeSpentTracking} className="w-full">
              Test Time Spent Tracking
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Revisit Tracking Test
            </CardTitle>
            <CardDescription>
              Simulates revisiting a section 2 times (threshold: 2)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testRevisitTracking} className="w-full">
              Test Revisit Tracking
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Annotation Tracking Test
            </CardTitle>
            <CardDescription>
              Simulates adding 2 annotations to a section (threshold: 2)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testAnnotationTracking} className="w-full">
              Test Annotation Tracking
            </Button>
          </CardContent>
        </Card>
      </div>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Test Results
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={clearResults} variant="outline" size="sm">
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">📋 How to Test:</h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Click any test button above</li>
          <li>2. Watch the test results appear</li>
          <li>3. Look for the contextual help popup in the bottom-right corner</li>
          <li>4. Check browser console for detailed logs</li>
        </ol>
      </div>

      {/* Contextual Help Popup - this will show when struggle is detected */}
      <ContextualHelpPopup />
    </div>
  )
}