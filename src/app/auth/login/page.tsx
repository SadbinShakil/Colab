'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Lock, Eye, EyeOff, FileText, TrendingUp, Users } from "lucide-react"
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState('/dashboard')
  const router = useRouter()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const redirect = urlParams.get('redirect')
    if (redirect) {
      setRedirectUrl(redirect)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          localStorage.setItem('currentUser', JSON.stringify(data.user))
        }
        router.push(redirectUrl)
      } else {
        const data = await response.json()
        setError(data.message || 'Invalid credentials')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] flex items-center justify-center p-4 relative overflow-hidden text-[hsl(var(--color-foreground))]">
      {/* Ultra-subtle background */}
      <div className="absolute inset-0 -z-10 bg-white">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-50/40 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-50/40 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-20 items-center relative z-10">

        {/* Left Side Branding - Clean & Minimal */}
        <motion.div
          className="hidden lg:flex flex-col justify-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/" className="inline-flex items-center gap-3 mb-10 group">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105">
              <FileText size={20} fill="currentColor" />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">LitSense</span>
          </Link>

          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Research <br />
            <span className="text-blue-600">reimagined.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-sm leading-relaxed mb-10">
            The collaborative workspace for modern science.
          </p>

          <div className="flex gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-green-600 shadow-sm">
                <TrendingUp size={18} />
              </div>
              <div>
                <div className="font-bold text-gray-900">1M+</div>
                <div className="text-xs text-gray-500 font-medium">Papers Index</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-purple-600 shadow-sm">
                <Users size={18} />
              </div>
              <div>
                <div className="font-bold text-gray-900">50K+</div>
                <div className="text-xs text-gray-500 font-medium">Scholars</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side Login Form - Focused */}
        <motion.div
          className="w-full max-w-[420px] mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-100">

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
              <p className="text-gray-500 mt-2 font-medium">to continue to LitSense</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <Input
                    type="email"
                    placeholder="Email"
                    className="pl-11 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium placeholder:text-gray-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="pl-11 pr-11 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium placeholder:text-gray-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 bg-transparent border-none cursor-pointer rounded-full hover:bg-gray-100 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none hover:text-gray-900 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  Remember me
                </label>
                <Link href="/auth/forgot-password" className="text-blue-600 font-bold hover:text-blue-700 hover:underline">
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all transform active:scale-[0.98]"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <button className="h-11 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all font-semibold text-gray-700 text-sm">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  Google
                </button>
                <button className="h-11 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all font-semibold text-gray-700 text-sm">
                  <span className="font-serif font-bold text-gray-800">ORCID</span>
                </button>
              </div>
            </div>

            <div className="mt-8 text-center text-sm">
              <span className="text-gray-500 font-medium">New to LitSense? </span>
              <Link href="/auth/signup" className="text-blue-700 font-bold hover:underline">
                Create account
              </Link>
            </div>

          </div>
        </motion.div>

      </div>
    </div>
  )
} 