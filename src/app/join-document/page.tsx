'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  FileText, 
  Users, 
  MessageSquare, 
  BookOpen,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Shield,
  Brain,
  Share2
} from 'lucide-react'

export default function JoinDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentId = searchParams.get('id')
  const [documentTitle, setDocumentTitle] = useState('Research Document')

  useEffect(() => {
    // Try to get document title if documentId is available
    if (documentId) {
      fetch(`/api/upload?id=${documentId}`)
        .then(response => response.json())
        .then(data => {
          if (data.document) {
            setDocumentTitle(data.document.title || data.document.originalName || 'Research Document')
          }
        })
        .catch(error => {
          console.error('Error fetching document:', error)
        })
    }
  }, [documentId])

  const features = [
    {
      icon: MessageSquare,
      title: "Real-time Collaboration",
      description: "See highlights and comments from other researchers in real-time"
    },
    {
      icon: Brain,
      title: "AI Research Assistant",
      description: "Get intelligent insights and answers about the document content"
    },
    {
      icon: Share2,
      title: "Secure Sharing",
      description: "Share documents with controlled access and permissions"
    },
    {
      icon: BookOpen,
      title: "Advanced Annotation",
      description: "Highlight, comment, and annotate with professional tools"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side - Document Info */}
        <div className="space-y-8">
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">PaperPal</span>
            </Link>
            
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-4 py-2">
                <Share2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Shared Document</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                Join the Discussion on
                <span className="block text-blue-600">{documentTitle}</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                This document has been shared with you. Create an account or sign in to collaborate with other researchers and access AI-powered insights.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">What you'll be able to do:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 group">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300 mt-1">
                    <feature.icon className="w-4 h-4 text-blue-600 group-hover:text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Secure & Private</h4>
                <p className="text-sm text-gray-600">Your data is protected with enterprise-grade security</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Options */}
        <div className="w-full max-w-md mx-auto lg:mx-0 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
              <div className="text-2xl font-bold text-blue-600">10K+</div>
              <div className="text-sm text-gray-600">Researchers</div>
            </div>
            <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
              <div className="text-2xl font-bold text-green-600">50K+</div>
              <div className="text-sm text-gray-600">Documents</div>
            </div>
            <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
              <div className="text-2xl font-bold text-purple-600">100K+</div>
              <div className="text-sm text-gray-600">Annotations</div>
            </div>
          </div>

          {/* Auth Cards */}
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-lg">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Get Started
              </CardTitle>
              <CardDescription className="text-gray-600">
                Choose how you'd like to join the discussion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href={`/auth/signup?redirect=/document/${documentId}`}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create Free Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <Link href={`/auth/login?redirect=/document/${documentId}`}>
                <Button variant="outline" className="w-full h-12 text-lg font-semibold border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300">
                  <Users className="w-5 h-5 mr-2" />
                  Sign In to Existing Account
                </Button>
              </Link>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  By joining, you agree to our{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Testimonial */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <div className="flex items-center space-x-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-4 h-4 bg-yellow-400 rounded-full"></div>
              ))}
            </div>
            <p className="text-gray-700 italic leading-relaxed">
              "PaperPal has transformed how our research team collaborates. The real-time annotations and AI insights are game-changing."
            </p>
            <div className="mt-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Dr. Michael Chen</p>
                <p className="text-sm text-gray-600">MIT Research Team</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 