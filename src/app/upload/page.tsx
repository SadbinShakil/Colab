'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from 'sonner'
import { 
  Upload, FileText, ArrowLeft, Users, Zap, 
  Eye, Share2, MessageSquare, Highlighter, 
  Sparkles, Globe, CheckCircle, Clock, Brain,
  Shield, Target, Bookmark, Star
} from 'lucide-react'

export default function ElegantUploadPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadFile = async (file: File): Promise<string | null> => {
    console.log('Starting upload for file:', file.name, 'Size:', file.size, 'Type:', file.type)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Sending upload request...')

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 15
        })
      }, 200)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      console.log('Upload response status:', response.status)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed with status:', response.status, 'Error:', errorText)
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Upload successful, result:', result)
      return result.document.id
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed. Please try again.')
      setUploadProgress(0)
      return null
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles)
    
    if (acceptedFiles.length === 0) {
      console.log('No files accepted')
      toast.error('No valid files selected')
      return
    }
    
    const file = acceptedFiles[0]
    console.log('Processing file:', file)
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      console.log('Invalid file type:', file.type)
      toast.error('Only PDF files are supported')
      return
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      console.log('File too large:', file.size)
      toast.error('File size must be less than 50MB')
      return
    }

    console.log('File validation passed, starting upload...')
    setIsUploading(true)
    setUploadProgress(5)
    
    const documentId = await uploadFile(file)
    
    if (documentId) {
      toast.success('Document uploaded successfully!')
      console.log('Redirecting to document:', documentId)
      setTimeout(() => {
        router.push(`/document/${documentId}`)
      }, 1500)
    } else {
      console.log('Upload failed, resetting state')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isUploading
  })

  // Test button for debugging
  const testUpload = () => {
    console.log('Test button clicked')
    toast.success('Test toast working!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Upload Research Paper</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-blue-50 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">AI Analysis Ready</span>
              </div>
              
              {/* Debug Test Button */}
              <Button
                onClick={testUpload}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-gray-50"
              >
                Test Toast
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upload Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Upload Your Research Paper
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Drag and drop your PDF or click to browse files
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div
                  {...getRootProps()}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
                    ${isDragActive 
                      ? 'border-blue-500 bg-blue-50 scale-105' 
                      : isUploading
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                    }
                  `}
                >
                  <input {...getInputProps()} />
                  
                  {!isUploading ? (
                    <div className="space-y-6">
                      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {isDragActive ? 'Drop your PDF here' : 'Upload PDF Document'}
                        </h3>
                        <p className="text-gray-600">
                          {isDragActive 
                            ? 'Release to upload your research paper'
                            : 'Drag and drop your PDF file here, or click to browse'
                          }
                        </p>
                      </div>

                      <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          PDF only
                        </span>
                        <span className="flex items-center">
                          <Shield className="w-4 h-4 mr-1" />
                          Max 50MB
                        </span>
                        <span className="flex items-center">
                          <Zap className="w-4 h-4 mr-1" />
                          AI Analysis
                        </span>
                      </div>

                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                        disabled={isUploading}
                      >
                        Choose File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Uploading your research paper...
                        </h3>
                        <p className="text-gray-600">
                          Please wait while we process your document
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full max-w-xs mx-auto">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Brain className="w-4 h-4 mr-1" />
                          Analyzing content
                        </span>
                        <span className="flex items-center">
                          <Target className="w-4 h-4 mr-1" />
                          Extracting metadata
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Debug Info */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                  <p><strong>Debug Info:</strong></p>
                  <p>Drag Active: {isDragActive ? 'Yes' : 'No'}</p>
                  <p>Is Uploading: {isUploading ? 'Yes' : 'No'}</p>
                  <p>Upload Progress: {uploadProgress}%</p>
                </div>
              </CardContent>
            </Card>

            {/* Features Preview */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  What happens after upload?
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Your document will be enhanced with powerful collaboration tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">AI Analysis</h4>
                      <p className="text-sm text-gray-600">
                        Get intelligent insights, key concepts, and research summaries
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Highlighter className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Smart Annotations</h4>
                      <p className="text-sm text-gray-600">
                        Highlight, comment, and collaborate with your team
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Team Collaboration</h4>
                      <p className="text-sm text-gray-600">
                        Invite colleagues and discuss research in real-time
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Secure Sharing</h4>
                      <p className="text-sm text-gray-600">
                        Share with controlled access and privacy settings
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                  Platform Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Papers Uploaded</span>
                  <span className="text-lg font-bold text-blue-600">1.2M+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Active Researchers</span>
                  <span className="text-lg font-bold text-green-600">50K+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">AI Insights Generated</span>
                  <span className="text-lg font-bold text-purple-600">5M+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Collaborations</span>
                  <span className="text-lg font-bold text-yellow-600">100K+</span>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                  <Bookmark className="w-5 h-5 mr-2 text-green-600" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Star className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">High-quality PDFs</p>
                    <p className="text-xs text-gray-600">Text-based PDFs work best for AI analysis</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Star className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Metadata matters</p>
                    <p className="text-xs text-gray-600">Files with clear titles and authors get better insights</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Star className="w-3 h-3 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Team collaboration</p>
                    <p className="text-xs text-gray-600">Invite your research team after upload for better discussions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Secure & Private</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Your documents are encrypted and stored securely. You control who can access your research.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-600" />
                  Recent Uploads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { title: 'Attention Is All You Need', time: '2 hours ago' },
                  { title: 'BERT: Pre-training Guide', time: '1 day ago' },
                  { title: 'GPT-4 Technical Report', time: '3 days ago' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.time}</p>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  View All
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 