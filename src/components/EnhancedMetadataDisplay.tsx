'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  ExternalLink,
  Users,
  Calendar,
  Building,
  Quote,
  Brain,
  TrendingUp,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface EnhancedMetadataDisplayProps {
  documentId: string
  filename: string
}

interface EnhancedMetadata {
  status: 'completed' | 'failed' | 'error' | 'loading'
  doi?: string
  citationCount?: number
  referenceCount?: number
  fieldsOfStudy?: string[]
  openAccessPdf?: string
  gptSummary?: string
  error?: string
}

interface DocumentMetadata {
  title: string
  authors: string
  journal: string
  year: string
  abstract: string
  enhancedMetadata?: EnhancedMetadata
}

export default function EnhancedMetadataDisplay({ documentId, filename }: EnhancedMetadataDisplayProps) {
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetadata()
  }, [documentId])

  const fetchMetadata = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/upload?id=${documentId}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.document) {
          setMetadata(data.document)
        } else {
          setError('Failed to retrieve document metadata')
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'error': 'bg-orange-100 text-orange-800',
      'loading': 'bg-blue-100 text-blue-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">Loading enhanced metadata...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>Error: {error}</span>
          </div>
          <Button onClick={fetchMetadata} className="mt-3">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!metadata) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No metadata found</p>
            <Button onClick={fetchMetadata} className="mt-3">
              Check Metadata
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { enhancedMetadata } = metadata

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>Enhanced Paper Analysis</span>
          {enhancedMetadata && (
            <Badge className={getStatusColor(enhancedMetadata.status)}>
              {getStatusIcon(enhancedMetadata.status)}
              <span className="ml-1">
                {enhancedMetadata.status === 'completed' ? 'AI Enhanced' : 
                 enhancedMetadata.status === 'loading' ? 'Processing' :
                 enhancedMetadata.status === 'failed' ? 'Failed' : 'Error'}
              </span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Paper Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Paper Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Title</label>
              <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded">{metadata.title}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Authors</label>
              <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {metadata.authors || 'Unknown'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Journal/Venue</label>
              <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-center">
                <Building className="h-3 w-3 mr-1" />
                {metadata.journal || 'Unknown'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Year</label>
              <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {metadata.year || 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Metadata Section */}
        {enhancedMetadata && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              AI-Enhanced Analysis
            </h4>
            
            {enhancedMetadata.status === 'completed' ? (
              <div className="space-y-4">
                {/* DOI and External Links */}
                {enhancedMetadata.doi && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">DOI:</span>
                    <Badge variant="outline" className="font-mono">
                      {enhancedMetadata.doi}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <a 
                        href={`https://doi.org/${enhancedMetadata.doi}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>View</span>
                      </a>
                    </Button>
                  </div>
                )}

                {/* Citation Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {enhancedMetadata.citationCount !== undefined && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="text-sm text-blue-600 font-medium">Citations</div>
                          <div className="text-2xl font-bold text-blue-900">{enhancedMetadata.citationCount}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {enhancedMetadata.referenceCount !== undefined && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="text-sm text-green-600 font-medium">References</div>
                          <div className="text-2xl font-bold text-green-900">{enhancedMetadata.referenceCount}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {enhancedMetadata.openAccessPdf && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <ExternalLink className="h-4 w-4 text-purple-600" />
                        <div>
                          <div className="text-sm text-purple-600 font-medium">Open Access</div>
                          <Button variant="outline" size="sm" asChild className="mt-1">
                            <a href={enhancedMetadata.openAccessPdf} target="_blank" rel="noopener noreferrer">
                              View PDF
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fields of Study */}
                {enhancedMetadata.fieldsOfStudy && enhancedMetadata.fieldsOfStudy.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Fields of Study</label>
                    <div className="flex flex-wrap gap-2">
                      {enhancedMetadata.fieldsOfStudy.map((field, index) => (
                        <Badge key={index} variant="secondary">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* GPT Summary */}
                {enhancedMetadata.gptSummary && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center">
                      <Brain className="h-4 w-4 mr-2" />
                      AI-Generated Summary
                    </label>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                          {enhancedMetadata.gptSummary}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : enhancedMetadata.status === 'loading' ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                <span className="text-gray-600">AI is analyzing your paper...</span>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Analysis Failed</span>
                </div>
                <p className="text-sm text-red-700 mt-2">
                  {enhancedMetadata.error || 'Failed to analyze the paper. Please try again.'}
                </p>
                <Button onClick={fetchMetadata} className="mt-3" variant="outline">
                  Retry Analysis
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Abstract */}
        {metadata.abstract && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 flex items-center">
              <Quote className="h-4 w-4 mr-2" />
              Abstract
            </label>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-800">{metadata.abstract}</p>
            </div>
          </div>
        )}

        {/* File Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">File Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Document ID:</span>
              <span className="ml-2 font-mono text-gray-800">{documentId}</span>
            </div>
            <div>
              <span className="text-gray-600">Filename:</span>
              <span className="ml-2 text-gray-800">{filename}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
