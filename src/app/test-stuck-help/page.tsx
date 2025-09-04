'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, HelpCircle, Users, Brain, MessageSquare } from 'lucide-react'
import CollaborativePDFViewer from '@/components/CollaborativePDFViewer'

export default function TestStuckHelpPage() {
  const [showViewer, setShowViewer] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            "I'm Stuck Here" Feature Demo
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Test the collaborative stuck help feature that allows researchers to mark areas where they need assistance and get help from the community and AI.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Feature Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>How It Works</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-red-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Select "I'm Stuck Here" Tool</p>
                    <p className="text-sm text-gray-600">Click the help icon in the toolbar to activate stuck help mode</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-orange-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Mark the Problem Area</p>
                    <p className="text-sm text-gray-600">Drag to select the text or area where you're struggling</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-yellow-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Describe Your Confusion</p>
                    <p className="text-sm text-gray-600">Explain what you don't understand or what's confusing</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-green-600">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Get Help</p>
                    <p className="text-sm text-gray-600">Receive responses from the community and AI assistance</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>Key Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Community Support</p>
                    <p className="text-sm text-gray-600">Get help from other researchers and experts</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">AI Assistance</p>
                    <p className="text-sm text-gray-600">Get instant AI-generated explanations and guidance</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Threaded Discussions</p>
                    <p className="text-sm text-gray-600">Follow up with questions and clarifications</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-gray-900">Status Tracking</p>
                    <p className="text-sm text-gray-600">Track whether your question has been resolved</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Section */}
        <Card>
          <CardHeader>
            <CardTitle>Try the Feature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Click the button below to open the collaborative PDF viewer and test the "I'm Stuck Here" feature.
              </p>
              <Button 
                onClick={() => setShowViewer(true)}
                className="bg-gradient-to-r from-red-600 to-orange-600 text-white"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Open PDF Viewer Demo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Demo Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">Step 1</Badge>
                <p className="text-sm text-gray-700">
                  Click the <HelpCircle className="w-4 h-4 inline mx-1" /> help icon in the toolbar to activate stuck help mode
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">Step 2</Badge>
                <p className="text-sm text-gray-700">
                  Drag to select any text or area in the PDF where you'd like to ask for help
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">Step 3</Badge>
                <p className="text-sm text-gray-700">
                  Describe what you're struggling with and choose whether to post anonymously
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">Step 4</Badge>
                <p className="text-sm text-gray-700">
                  The stuck help modal will open where you can get AI assistance or wait for community responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDF Viewer Modal */}
      {showViewer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full h-[90vh] max-w-7xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Collaborative PDF Viewer - Stuck Help Demo</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowViewer(false)}
              >
                Close
              </Button>
            </div>
            <div className="h-[calc(100%-80px)]">
              <CollaborativePDFViewer 
                fileUrl="/uploads/attention-is-all-you-need.pdf"
                documentId="attention-is-all-you-need"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
