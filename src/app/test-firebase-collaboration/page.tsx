'use client'

import { useState } from 'react'
import FirebaseWebViewer from '@/components/FirebaseWebViewer'

export default function TestFirebaseCollaboration() {
  const [highlights, setHighlights] = useState<any[]>([])
  const [annotations, setAnnotations] = useState<any[]>([])

  const handleHighlightAdd = (highlight: any) => {
    console.log('🎨 Highlight added:', highlight)
    setHighlights(prev => [...prev, highlight])
  }

  const handleAnnotationAdd = (annotation: any) => {
    console.log('📝 Annotation added:', annotation)
    setAnnotations(prev => [...prev, annotation])
  }

  const handlePageChange = (page: number) => {
    console.log('📄 Page changed:', page)
  }

  const handleScroll = (scrollData: any) => {
    console.log('📜 Scroll:', scrollData)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Firebase Real-time Collaboration Test
          </h1>
          
          <div className="mb-6">
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              <strong>Firebase Setup Required:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Update <code>src/lib/firebaseServer.js</code> with your Firebase config</li>
                <li>Set up Firebase Realtime Database rules</li>
                <li>Enable Anonymous authentication in Firebase Console</li>
              </ol>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Highlights ({highlights.length})</h3>
              <div className="bg-gray-100 rounded-md p-4 max-h-48 overflow-y-auto">
                {highlights.length === 0 ? (
                  <p className="text-gray-500">No highlights yet</p>
                ) : (
                  <div className="space-y-2">
                    {highlights.map((highlight, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border">
                        <div className="font-medium">{highlight.userName}</div>
                        <div className="text-gray-600">Page {highlight.pageNumber}</div>
                        <div className="text-gray-500">{highlight.text || 'No text'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Annotations ({annotations.length})</h3>
              <div className="bg-gray-100 rounded-md p-4 max-h-48 overflow-y-auto">
                {annotations.length === 0 ? (
                  <p className="text-gray-500">No annotations yet</p>
                ) : (
                  <div className="space-y-2">
                    {annotations.map((annotation, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border">
                        <div className="font-medium">{annotation.userName}</div>
                        <div className="text-gray-600">Page {annotation.pageNumber}</div>
                        <div className="text-gray-500">{annotation.text || 'No text'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            WebViewer with Firebase Collaboration
          </h2>
          
          <div className="h-96 border border-gray-300 rounded-md">
            <FirebaseWebViewer
              documentUrl="/uploads/1757009999402-Attention_is_all_you_need.pdf"
              documentId="firebase-test-doc"
              userName="Test User"
              userId="test-user-1"
              onHighlightAdd={handleHighlightAdd}
              onAnnotationAdd={handleAnnotationAdd}
              onPageChange={handlePageChange}
              onScroll={handleScroll}
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Instructions:</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Update Firebase configuration in <code>src/lib/firebaseServer.js</code></li>
              <li>Create highlights and annotations in the PDF above</li>
              <li>Open another browser tab to test real-time collaboration</li>
              <li>Check Firebase Console to see real-time data updates</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
