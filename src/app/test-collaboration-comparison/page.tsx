'use client'

import React, { useState } from 'react'
import ApryseWebViewer from '@/components/ApryseWebViewer'
import FirestoreWebViewer from '@/components/FirestoreWebViewer'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Zap, 
  Database, 
  Clock, 
  Shield, 
  Wifi,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react"

export default function CollaborationComparisonPage() {
  const [activeTab, setActiveTab] = useState('comparison')
  const [currentUser] = useState({
    id: `test-user-${Date.now()}`,
    name: 'Test User'
  })

  const documentUrl = "/uploads/1757009999402-Attention_is_all_you_need.pdf"
  const documentId = "test-comparison-doc"

  const comparisonData = [
    {
      feature: 'Real-time Performance',
      current: { value: '2-3 seconds', status: 'warning' },
      firestore: { value: '~100ms', status: 'success' }
    },
    {
      feature: 'Persistence',
      current: { value: 'Custom XFDF + DB', status: 'warning' },
      firestore: { value: 'Built-in Firestore', status: 'success' }
    },
    {
      feature: 'Conflict Resolution',
      current: { value: 'Version conflicts (409)', status: 'error' },
      firestore: { value: 'Per-annotation, no conflicts', status: 'success' }
    },
    {
      feature: 'Scalability',
      current: { value: 'Custom socket API', status: 'warning' },
      firestore: { value: 'Firebase handles millions', status: 'success' }
    },
    {
      feature: 'Offline Support',
      current: { value: 'None', status: 'error' },
      firestore: { value: 'Built-in offline sync', status: 'success' }
    },
    {
      feature: 'Security',
      current: { value: 'Custom auth middleware', status: 'warning' },
      firestore: { value: 'Granular security rules', status: 'success' }
    },
    {
      feature: 'WebViewer Errors',
      current: { value: 'Ia.Uq, b.Wa errors', status: 'error' },
      firestore: { value: 'No WebViewer conflicts', status: 'success' }
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      default: return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="default" className="bg-green-100 text-green-800">Good</Badge>
      case 'warning': return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'error': return <Badge variant="destructive">Issue</Badge>
      default: return null
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Collaboration System Comparison</h1>
          <p className="text-gray-600">Compare current implementation vs Firestore solution</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3 max-w-7xl mx-auto mt-4">
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="current">Current System</TabsTrigger>
            <TabsTrigger value="firestore">Firestore System</TabsTrigger>
          </TabsList>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="h-full p-4">
            <div className="max-w-7xl mx-auto h-full overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Current System */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="w-5 h-5" />
                      <span>Current System</span>
                    </CardTitle>
                    <CardDescription>
                      Custom real-time collaboration with XFDF persistence
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Real-time: 2-3 seconds</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Persistence: Custom XFDF + DB</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">Version conflicts (409 errors)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Firestore System */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="w-5 h-5" />
                      <span>Firestore System</span>
                    </CardTitle>
                    <CardDescription>
                      Firebase Firestore with real-time listeners
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Real-time: ~100ms</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Persistence: Built-in Firestore</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">No conflicts, per-annotation</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Feature Comparison</CardTitle>
                  <CardDescription>
                    Detailed comparison of both collaboration systems
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Feature</th>
                          <th className="text-left p-3">Current System</th>
                          <th className="text-left p-3">Firestore System</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-3 font-medium">{item.feature}</td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(item.current.status)}
                                <span>{item.current.value}</span>
                                {getStatusBadge(item.current.status)}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(item.firestore.status)}
                                <span>{item.firestore.value}</span>
                                {getStatusBadge(item.firestore.status)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Current System Tab */}
          <TabsContent value="current" className="h-full">
            <div className="h-full">
              <ApryseWebViewer
                documentUrl={documentUrl}
                documentId={documentId}
                userName={currentUser.name}
                userId={currentUser.id}
                extractedText=""
              />
            </div>
          </TabsContent>

          {/* Firestore System Tab */}
          <TabsContent value="firestore" className="h-full">
            <div className="h-full">
              <FirestoreWebViewer
                documentUrl={documentUrl}
                documentId={documentId}
                userName={currentUser.name}
                userId={currentUser.id}
                extractedText=""
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
