'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 
  Users, 
  MessageSquare, 
  BookOpen,
  Search,
  PenTool,
  Share2,
  Brain,
  Library,
  ArrowRight,
  CheckCircle,
  Star,
  ChevronRight,
  Sparkles,
  Award,
  Globe2
} from 'lucide-react'

export default function HomePage() {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

  const coreFeatures = [
    {
      icon: PenTool,
      title: "Collaborative Annotation",
      description: "Annotate documents together in real-time with advanced markup tools and shared insights.",
      details: "Add highlights, comments, and drawings that sync instantly across your research team."
    },
    {
      icon: MessageSquare,
      title: "Discussion Threads",
      description: "Start contextual discussions directly on document sections with threaded conversations.",
      details: "Keep conversations organized and linked to specific paragraphs or research findings."
    },
    {
      icon: Brain,
      title: "AI Research Assistant",
      description: "Get intelligent insights, summaries, and research suggestions powered by advanced AI.",
      details: "Ask questions about your documents and receive contextual answers and citations."
    },
    {
      icon: Share2,
      title: "Knowledge Sharing",
      description: "Share research findings, create reading lists, and collaborate across research groups.",
      details: "Build a shared knowledge base with version control and access management."
    }
  ]

  const advancedFeatures = [
    "Real-time collaborative editing",
    "Advanced search across all documents", 
    "Citation management and bibliography",
    "Export annotations and summaries",
    "Integration with reference managers",
    "Secure sharing with granular permissions"
  ]

  const testimonials = [
    {
      quote: "PaperPal has transformed how our research team collaborates. The AI insights are remarkably accurate.",
      author: "Dr. Sarah Chen",
      role: "Lead Researcher",
      institution: "Stanford University",
      rating: 5
    },
    {
      quote: "The annotation tools and real-time collaboration features have streamlined our literature review process.",
      author: "Prof. Michael Torres",
      role: "Department Head",
      institution: "MIT",
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors duration-300">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-semibold text-gray-900">PaperPal</span>
              </Link>
              
              <nav className="hidden md:flex items-center space-x-8">
                <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 relative group">
                  Features
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 relative group">
                  Pricing
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link href="#about" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 relative group">
                  About
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-sm font-medium hover:bg-gray-50">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-blue-50/50 to-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-full px-4 py-2 mb-8 shadow-sm">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">AI-Powered Research Collaboration</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Collaborative Research
              <span className="block text-blue-600">Made Elegant</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Read, annotate, and discuss research papers with your team. 
              Powered by AI to enhance your academic workflow and accelerate discovery.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link href="/auth/signup">
                <Button size="lg" className="text-base px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  Start Research
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="text-base px-8 py-4 border-gray-300 hover:border-blue-300 hover:text-blue-600 hover:scale-105 transition-all duration-300">
                  View Demo
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">50+ Universities</span>
                <span className="text-xs text-gray-500">Trusted globally</span>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center mb-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">4.9/5 Rating</span>
                <span className="text-xs text-gray-500">Researcher favorite</span>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-2">
                  <Library className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">1M+ Papers</span>
                <span className="text-xs text-gray-500">Successfully annotated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Everything You Need for Academic Collaboration
            </h2>
            <p className="text-lg text-gray-600">
              From individual research to team projects, PaperPal provides the tools 
              that modern academics need to work together effectively.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {coreFeatures.map((feature, index) => (
              <Card 
                key={feature.title}
                className="border border-gray-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                onMouseEnter={() => setHoveredFeature(feature.title)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300">
                      <feature.icon className="w-5 h-5 text-blue-600 group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold mb-2 text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-base leading-relaxed text-gray-600">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-sm text-gray-500 transition-all duration-500 overflow-hidden ${
                    hoveredFeature === feature.title ? 'opacity-100 max-h-20 mt-2' : 'opacity-0 max-h-0'
                  }`}>
                    {feature.details}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Advanced Research Tools
              </h2>
              <p className="text-lg text-gray-600 mb-10">
                Go beyond basic annotation with professional-grade features designed 
                for serious academic work and research collaboration.
              </p>
              
              <div className="space-y-4 mb-10">
                {advancedFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3 group">
                    <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mt-0.5 group-hover:bg-green-600 group-hover:scale-110 transition-all duration-300">
                      <CheckCircle className="w-4 h-4 text-green-600 group-hover:text-white" />
                    </div>
                    <span className="text-gray-900 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <Link href="/auth/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  Explore All Features
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 hover:-translate-y-2 transition-transform duration-300">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Search className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-100 rounded-lg w-3/4 mb-2"></div>
                      <div className="h-2 bg-gray-50 rounded-lg w-1/2"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="h-2 bg-gray-100 rounded-lg w-full"></div>
                    <div className="h-2 bg-blue-200 rounded-lg w-5/6"></div>
                    <div className="h-2 bg-gray-100 rounded-lg w-4/5"></div>
                    <div className="h-2 bg-gray-100 rounded-lg w-3/4"></div>
                  </div>

                  <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-lg w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Trusted by Leading Researchers
            </h2>
            <p className="text-lg text-gray-600">
              See what academics and research teams are saying about PaperPal.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border border-gray-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-lg font-medium text-gray-900 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Award className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.author}</p>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                      <p className="text-sm text-gray-600">{testimonial.institution}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-blue-700 opacity-95"></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Transform Your Research Workflow?
            </h2>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
              Join thousands of researchers who are already collaborating more effectively with PaperPal.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary" className="text-base px-8 py-4 bg-white text-blue-600 hover:bg-gray-50 shadow-xl">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="text-base px-8 py-4 border-white/20 text-white hover:bg-white/10 hover:border-white/40">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-semibold">PaperPal</span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                Empowering researchers worldwide with collaborative tools for academic excellence.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Globe2 className="w-4 h-4" />
                <span>Used in 50+ countries</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-white">Product</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <Link href="/features" className="block hover:text-white transition-colors duration-200">Features</Link>
                <Link href="/pricing" className="block hover:text-white transition-colors duration-200">Pricing</Link>
                <Link href="/integrations" className="block hover:text-white transition-colors duration-200">Integrations</Link>
                <Link href="/api" className="block hover:text-white transition-colors duration-200">API</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-white">Company</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <Link href="/about" className="block hover:text-white transition-colors duration-200">About</Link>
                <Link href="/blog" className="block hover:text-white transition-colors duration-200">Blog</Link>
                <Link href="/careers" className="block hover:text-white transition-colors duration-200">Careers</Link>
                <Link href="/press" className="block hover:text-white transition-colors duration-200">Press</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-white">Support</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <Link href="/help" className="block hover:text-white transition-colors duration-200">Help Center</Link>
                <Link href="/contact" className="block hover:text-white transition-colors duration-200">Contact</Link>
                <Link href="/privacy" className="block hover:text-white transition-colors duration-200">Privacy</Link>
                <Link href="/terms" className="block hover:text-white transition-colors duration-200">Terms</Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-sm text-gray-400">
              &copy; 2024 PaperPal. All rights reserved. Built with ❤️ for researchers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
