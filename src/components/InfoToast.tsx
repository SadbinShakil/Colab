'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Upload, Highlighter, MessageSquare, HelpCircle, Users, Brain, Sparkles, CheckCircle, ArrowRight, FileText } from "lucide-react"

export default function InfoToast({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-white/95 backdrop-blur-lg">
        <CardHeader className="relative pb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Welcome to PaperPal!</CardTitle>
              <CardDescription className="text-gray-600 text-base">
                Your AI-powered research collaboration platform is ready
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-green-50 rounded-full px-4 py-2 w-fit">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Fully Functional Platform</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Platform Overview */}
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Research Collaboration Reimagined</h3>
            <p className="text-gray-600 leading-relaxed">
              Upload research papers, collaborate with peers in real-time, and get AI-powered insights to accelerate your academic journey.
            </p>
          </div>

          {/* Key Features */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
              Platform Features
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Smart PDF Upload</h4>
                  <p className="text-sm text-gray-600">Upload research papers with automatic metadata extraction and AI analysis</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Highlighter className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Collaborative Annotations</h4>
                  <p className="text-sm text-gray-600">Highlight, comment, and discuss research with your team in real-time</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">AI Research Assistant</h4>
                  <p className="text-sm text-gray-600">Get intelligent insights, summaries, and answers about your research papers</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Live Discussion</h4>
                  <p className="text-sm text-gray-600">Chat with collaborators and share insights in document-specific channels</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Expert Help Network</h4>
                  <p className="text-sm text-gray-600">Get unstuck with help from domain experts and experienced researchers</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Research Teams</h4>
                  <p className="text-sm text-gray-600">Collaborate seamlessly with your research group and academic peers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ArrowRight className="w-5 h-5 mr-2 text-green-600" />
              Quick Start Guide
            </h3>
            
            <div className="space-y-4">
              {[
                { step: 1, title: "Upload Your First Paper", desc: "Click 'Upload Paper' and add your research PDF with metadata" },
                { step: 2, title: "Explore AI Insights", desc: "Review automatically generated summaries and key concepts" },
                { step: 3, title: "Start Annotating", desc: "Highlight important sections and add your research notes" },
                { step: 4, title: "Invite Collaborators", desc: "Share documents with your research team for real-time collaboration" },
                { step: 5, title: "Use AI Assistant", desc: "Ask questions about the paper content and get intelligent responses" }
              ].map((item) => (
                <div key={item.step} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-green-200">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Pro Tip</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Start by exploring the sample documents in your dashboard. You can test all annotation features and AI capabilities without uploading anything new!
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              onClick={onClose}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Start Exploring PaperPal
            </Button>
            <Button 
              variant="outline"
              className="flex-1 border-gray-300 hover:bg-gray-50"
              onClick={() => {
                onClose()
                router.push('/upload')
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload First Paper
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 