'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

// Dynamically import ApryseWebViewer to avoid SSR issues
const ApryseWebViewer = dynamic(() => import('@/components/ApryseWebViewer'), {
  ssr: false,
})

export default function TestSelectionPopup() {
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({
    pdfLoaded: null,
    textSelection: null,
    popupAppears: null,
    copyFunction: null,
    highlightFunction: null,
    commentFunction: null,
    aiExplain: null,
    searchFunction: null,
  })

  const testItems = [
    { id: 'pdfLoaded', label: '1. PDF Document Loaded', instruction: 'Check if PDF is visible' },
    { id: 'textSelection', label: '2. Text Selection Works', instruction: 'Try selecting any text in the PDF' },
    { id: 'popupAppears', label: '3. Popup Appears', instruction: 'Popup should appear near selected text' },
    { id: 'copyFunction', label: '4. Copy Button Works', instruction: 'Click Copy and paste somewhere to verify' },
    { id: 'highlightFunction', label: '5. Highlight Works', instruction: 'Select text, choose a highlight color' },
    { id: 'commentFunction', label: '6. Comment Works', instruction: 'Add a comment to selected text' },
    { id: 'aiExplain', label: '7. AI Explain Works', instruction: 'Select math equation and click AI Explain' },
    { id: 'searchFunction', label: '8. Search Works', instruction: 'Click Search or Scholar button' },
  ]

  const markTest = (testId: string, passed: boolean) => {
    setTestResults(prev => ({ ...prev, [testId]: passed }))
  }

  const resetTests = () => {
    setTestResults({
      pdfLoaded: null,
      textSelection: null,
      popupAppears: null,
      copyFunction: null,
      highlightFunction: null,
      commentFunction: null,
      aiExplain: null,
      searchFunction: null,
    })
  }

  // Sample PDF URL - you can change this to any PDF
  const samplePdfUrl = '/uploads/sample.pdf' // Make sure you have a sample PDF

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📝 Text Selection Popup Test Page
          </h1>
          <p className="text-gray-600">
            Test the new text selection popup feature with the checklist below
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Checklist */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Test Checklist</span>
                  <Button size="sm" variant="outline" onClick={resetTests}>
                    Reset
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {testItems.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {testResults[item.id] === true && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {testResults[item.id] === false && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        {testResults[item.id] === null && (
                          <AlertCircle className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 ml-7">{item.instruction}</p>
                    <div className="flex space-x-2 ml-7">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => markTest(item.id, true)}
                      >
                        ✓ Pass
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => markTest(item.id, false)}
                      >
                        ✗ Fail
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Test Summary */}
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium">
                    Test Summary:{' '}
                    <span className="text-green-600">
                      {Object.values(testResults).filter(r => r === true).length} passed
                    </span>
                    {' / '}
                    <span className="text-red-600">
                      {Object.values(testResults).filter(r => r === false).length} failed
                    </span>
                    {' / '}
                    <span className="text-gray-600">
                      {Object.values(testResults).filter(r => r === null).length} pending
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">How to Test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>1. Wait for PDF to load in the viewer</p>
                <p>2. Click and drag to select any text</p>
                <p>3. A popup should appear with action buttons</p>
                <p>4. Test each button and mark Pass/Fail</p>
                <p>5. Try selecting different types of text (normal, equations, etc.)</p>
              </CardContent>
            </Card>
          </div>

          {/* PDF Viewer */}
          <div className="lg:col-span-2">
            <Card className="h-[800px]">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>PDF Viewer with Text Selection Popup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full pb-20">
                <div className="h-full border rounded-lg overflow-hidden bg-white">
                  <ApryseWebViewer
                    documentUrl={samplePdfUrl}
                    documentId="test-doc-001"
                    userName="Test User"
                    userId="test-user-001"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Expected Behavior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-1">📋 Copy</h4>
                <p className="text-gray-600">Copies selected text to clipboard</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">🖍️ Highlight</h4>
                <p className="text-gray-600">Shows 5 color options (Yellow, Green, Blue, Pink, Orange)</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">💬 Comment</h4>
                <p className="text-gray-600">Shows text area to add annotation</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">🤖 AI Explain</h4>
                <p className="text-gray-600">Opens AI explainer for mathematical content</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">🔍 Search</h4>
                <p className="text-gray-600">Opens Google search in new tab</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">📚 Scholar</h4>
                <p className="text-gray-600">Opens Google Scholar in new tab</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
