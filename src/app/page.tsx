'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  FileText, Users, MessageSquare, PenTool, Brain, ArrowRight, CheckCircle,
  Sparkles, Upload, Calculator, Twitter, Linkedin, Github
} from 'lucide-react'

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    {
      icon: PenTool,
      title: "Collaborate",
      description: "Mark up documents together in real-time.",
      color: "bg-blue-100 text-blue-700"
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description: "Summarize and question concepts instantly.",
      color: "bg-purple-100 text-purple-700"
    },
    {
      icon: MessageSquare,
      title: "Discuss",
      description: "Chat directly on the document context.",
      color: "bg-green-100 text-green-700"
    }
  ]

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] text-[hsl(var(--color-foreground))] font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* Floating Navbar - Compact */}
      <header className={`fixed top-4 left-0 right-0 z-50 transition-all duration-300 pointer-events-none`}>
        <div className="max-w-4xl mx-auto px-4 pointer-events-auto">
          <nav className={`flex items-center justify-between px-6 py-2.5 rounded-full transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border border-gray-200/50' : 'bg-transparent'}`}>
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                <FileText size={16} fill="currentColor" className="text-white/90" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900">CoRead</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-gray-100 text-gray-700 font-semibold">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="rounded-full px-5 bg-gray-900 hover:bg-black text-white shadow-md transition-all font-semibold">
                  Sign up
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Compact Hero Section */}
        <section className="relative pt-32 pb-12 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-50/80 rounded-full blur-[80px] opacity-60"></div>
          </div>

          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold mb-6 border border-blue-200">
              <Sparkles size={12} />
              <span>Collaboration 2.0 is live</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-950 mb-6 leading-tight">
              Research is better <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700">together.</span>
            </h1>

            <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8 leading-relaxed font-medium">
              The modern workspace for academic collaboration. Annotate PDFs, discuss findings, and streamline your literature review with AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/auth/signup">
                <Button size="lg" className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all transform hover:-translate-y-0.5 font-bold">
                  Start for free <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Quick Stats Strip */}
            <div className="mt-10 flex justify-center gap-6 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <span>50+ Universities</span>
              <span>•</span>
              <span>1M+ Papers</span>
              <span>•</span>
              <span>4.9/5 Rating</span>
            </div>
          </div>
        </section>

        {/* Combined Features & Spotlight - Dark Mode */}
        <section className="py-16 bg-slate-950 text-white rounded-[2rem] mx-4 md:mx-6 relative shadow-2xl overflow-hidden">

          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="max-w-5xl mx-auto px-6 relative z-10">

            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-100 text-xs font-bold mb-4 border border-blue-500/30">
                  <Brain size={12} className="text-blue-300" />
                  <span>AI-Powered Insights</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 !text-white leading-tight">
                  Understand complex papers in seconds.
                </h2>
                <p className="text-lg !text-gray-300 mb-6 leading-relaxed">
                  CoRead AI reads with you. Highlight text to get instant explanations and methodology critiques.
                </p>
                <Button variant="secondary" className="rounded-full font-bold">Try AI Assistant</Button>
              </div>

              {/* Simplified Feature Cards */}
              <div className="grid gap-4">
                {features.map((feature, i) => (
                  <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-start gap-4 hover:bg-slate-800 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${feature.color}`}>
                      <feature.icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold !text-white text-base">{feature.title}</h3>
                      <p className="text-sm !text-slate-300 leading-snug">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        </section>

        {/* Compact CTA */}
        <section className="py-16 text-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Ready to upgrade your workflow?</h2>
          <Link href="/auth/signup">
            <Button size="lg" className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold text-base">
              Get Started Now
            </Button>
          </Link>
        </section>

      </main>

      {/* Minimal Footer */}
      <footer className="bg-white py-8 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center text-white">
              <FileText size={12} fill="currentColor" />
            </div>
            <span className="font-bold text-gray-900">CoRead</span>
            <span className="mx-2">•</span>
            <span>© 2024</span>
          </div>
          <div className="flex gap-6 font-medium">
            <Link href="#" className="hover:text-gray-900">Privacy</Link>
            <Link href="#" className="hover:text-gray-900">Terms</Link>
            <Link href="#" className="hover:text-gray-900">Contact</Link>
          </div>
          <div className="flex gap-4">
            <Twitter size={16} className="hover:text-gray-900 cursor-pointer" />
            <Github size={16} className="hover:text-gray-900 cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  )
}
