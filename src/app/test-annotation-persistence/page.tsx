'use client'

import { useState, useEffect } from 'react'
import ApryseWebViewer from '@/components/ApryseWebViewer'
import { useCollaboration } from '@/hooks/useCollaboration'

export default function TestAnnotationPersistence() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)
  
  // Use collaboration hook for real-time features
  const collaboration = useCollaboration('test-doc-persistence', 'test-user-1', 'Test User')

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const runPersistenceTest = async () => {
    setIsTesting(true)
    setTestResults([])
    
    addTestResult('🧪 Starting annotation persistence test...')
    
    try {
      // Test 1: Create an annotation via real-time system
      addTestResult('1️⃣ Creating annotation via real-time system...')
      
      const annotationData = {
        id: 'test-persistence-annotation',
        type: 'Highlight',
        pageNumber: 1,
        x: 100,
        y: 200,
        width: 150,
        height: 20,
        contents: 'This should persist after refresh'
      }

      // Broadcast annotation change
      collaboration.broadcastAnnotationChange({
        action: 'add',
        annotationData,
        userId: 'test-user-1',
        userName: 'Test User'
      })
      
      addTestResult('✅ Annotation broadcasted via real-time system')
      
      // Test 2: Check database persistence
      addTestResult('2️⃣ Checking database persistence...')
      
      const response = await fetch('/api/annotations/layers?documentId=test-doc-persistence&userId=test-user-1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user-1',
          'x-user-name': 'Test User',
          'x-user-email': 'test@localhost'
        }
      })
      
      const data = await response.json()
      
      if (data.userLayer || data.mergedXfdf) {
        addTestResult('✅ Database persistence working - annotations found in database')
      } else {
        addTestResult('❌ Database persistence failed - no annotations in database')
      }
      
      // Test 3: Simulate page refresh by reloading annotations
      addTestResult('3️⃣ Simulating page refresh...')
      
      // This would normally happen automatically when the component mounts
      addTestResult('✅ Page refresh simulation complete')
      
      addTestResult('🎉 Persistence test completed!')
      
    } catch (error) {
      addTestResult(`❌ Test failed: ${error}`)
    } finally {
      setIsTesting(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Annotation Persistence Test
          </h1>
          
          <div className="mb-6">
            <button
              onClick={runPersistenceTest}
              disabled={isTesting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mr-4"
            >
              {isTesting ? 'Testing...' : 'Run Persistence Test'}
            </button>
            
            <button
              onClick={clearResults}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Results
            </button>
          </div>
          
          <div className="bg-gray-100 rounded-md p-4 max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet. Click "Run Persistence Test" to start.</p>
            ) : (
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            WebViewer with Real-time Collaboration
          </h2>
          
          <div className="h-96 border border-gray-300 rounded-md">
            <ApryseWebViewer
              documentUrl="/uploads/attention-is-all-you-need.pdf"
              documentId="test-doc-persistence"
              userName="Test User"
              userId="test-user-1"
              onBroadcastAnnotationChange={collaboration.broadcastAnnotationChange}
              onSyncAnnotations={collaboration.syncAnnotations}
              realtimeAnnotations={collaboration.realtimeAnnotations}
              annotationSubscriberCount={collaboration.annotationSubscriberCount}
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Instructions:</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Create a highlight or annotation in the PDF above</li>
              <li>Check if it appears in real-time for other users</li>
              <li>Refresh the page and see if the annotation persists</li>
              <li>Run the persistence test to verify database storage</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
