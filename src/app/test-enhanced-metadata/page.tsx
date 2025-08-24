'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Upload,
  Brain,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Users,
  Calendar,
  Building,
  TrendingUp,
  BookOpen
} from 'lucide-react'

interface MetadataResult {
  success: boolean
  documentId: string
  metadata: {
    doi?: string
    title: string
    authors: string[]
    venue: string
    year: string
    abstract: string
    citationCount?: number
    referenceCount?: number
    fieldsOfStudy?: string[]
    openAccessPdf?: string
    crossref?: any
    semanticScholar?: any
    gptSummary?: any
  }
  gptSummary: string
}

export default function TestEnhancedMetadata() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<MetadataResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setError(null)
      setResult(null)
    } else if (file) {
      setError('Please select a PDF file')
      setSelectedFile(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/paper-ingest', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsProcessing(false)
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
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'error': 'bg-orange-100 text-orange-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Enhanced Metadata Extraction Test
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Test the new AI-powered metadata extraction system that uses Crossref, Semantic Scholar, 
            and GPT-4 to analyze research papers and extract comprehensive metadata.
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload Research Paper</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Select PDF File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <p className="text-sm text-gray-500">
                Upload a research paper PDF to test the enhanced metadata extraction
              </p>
            </div>

            {selectedFile && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing Paper...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Extract Enhanced Metadata
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-4 text-green-600" />
                  <span>Extraction Successful</span>
                  <Badge variant="outline" className="ml-2">
                    Document ID: {result.documentId}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Title</Label>
                    <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded">
                      {result.metadata.title}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Authors</Label>
                    <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {result.metadata.authors?.join(', ') || 'Unknown'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Venue</Label>
                    <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-center">
                      <Building className="h-3 w-3 mr-1" />
                      {result.metadata.venue || 'Unknown'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Year</Label>
                    <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {result.metadata.year || 'Unknown'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-4 text-purple-600" />
                  <span>AI-Enhanced Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* DOI and External Links */}
                {result.metadata.doi && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">DOI</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="font-mono">
                        {result.metadata.doi}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={`https://doi.org/${result.metadata.doi}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>View on DOI</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Citation Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.metadata.citationCount !== undefined && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="text-sm text-blue-600 font-medium">Citations</div>
                          <div className="text-2xl font-bold text-blue-900">
                            {result.metadata.citationCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {result.metadata.referenceCount !== undefined && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="text-sm text-green-600 font-medium">References</div>
                          <div className="text-2xl font-bold text-green-900">
                            {result.metadata.referenceCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {result.metadata.openAccessPdf && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <ExternalLink className="h-5 w-5 text-purple-600" />
                        <div>
                          <div className="text-sm text-purple-600 font-medium">Open Access</div>
                          <Button variant="outline" size="sm" asChild className="mt-2">
                            <a href={result.metadata.openAccessPdf} target="_blank" rel="noopener noreferrer">
                              View PDF
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fields of Study */}
                {result.metadata.fieldsOfStudy && result.metadata.fieldsOfStudy.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Fields of Study</Label>
                    <div className="flex flex-wrap gap-2">
                      {result.metadata.fieldsOfStudy.map((field, index) => (
                        <Badge key={index} variant="secondary">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Abstract */}
                {result.metadata.abstract && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Abstract</Label>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-800">{result.metadata.abstract}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GPT Summary */}
            {result.gptSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-4 text-purple-600" />
                    <span>AI-Generated Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                        {result.gptSummary}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Raw Data */}
            <Card>
              <CardHeader>
                <CardTitle>Raw API Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">1. PDF Upload</h4>
                  <p className="text-sm text-gray-600">Upload your research paper PDF</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Brain className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">2. AI Analysis</h4>
                  <p className="text-sm text-gray-600">Extract metadata using multiple APIs</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">3. Enhanced Results</h4>
                  <p className="text-sm text-gray-600">Get comprehensive paper analysis</p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">APIs Used:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Crossref:</strong> Academic paper metadata and DOI resolution</li>
                  <li>• <strong>Semantic Scholar:</strong> Citations, references, and field classification</li>
                  <li>• <strong>GPT-4:</strong> Intelligent summary and analysis generation</li>
                  <li>• <strong>PyMuPDF:</strong> High-quality PDF text extraction</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
