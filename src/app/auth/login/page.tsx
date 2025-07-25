'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mail, Lock, Eye, EyeOff, FileText, ArrowRight, Sparkles, Shield, Users, TrendingUp } from "lucide-react"
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

  // Get redirect URL from query params
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
    
    // Validation
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Save user information to localStorage for use in PDF viewer
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side - Branding with animation and illustration */}
        <motion.div
          className="hidden lg:block space-y-8"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">PaperPal</span>
            </Link>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                Welcome Back, Researcher!
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Continue your academic journey with AI-powered collaboration tools trusted by leading researchers worldwide.
              </p>
            </div>
          </div>
          {/* Hero SVG Illustration */}
          <div className="my-8">
            <svg width="320" height="180" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="160" cy="150" rx="140" ry="20" fill="#e0e7ff" />
              <rect x="60" y="40" width="200" height="80" rx="18" fill="#6366f1" fillOpacity="0.15" />
              <rect x="90" y="60" width="140" height="40" rx="10" fill="#6366f1" fillOpacity="0.25" />
              <circle cx="160" cy="80" r="18" fill="#6366f1" fillOpacity="0.4" />
            </svg>
          </div>
          {/* Stats and Recent Activity remain unchanged */}
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">50K+</p>
                <p className="text-sm text-gray-600">Active Researchers</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">1M+</p>
                <p className="text-sm text-gray-600">Papers Analyzed</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">99.9%</p>
                <p className="text-sm text-gray-600">Uptime</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Platform Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-gray-600">Dr. Martinez uploaded "Climate Change Analysis"</p>
                <span className="text-xs text-gray-400 ml-auto">2 min ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm text-gray-600">New AI insights available for Quantum Physics papers</p>
                <span className="text-xs text-gray-400 ml-auto">5 min ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <p className="text-sm text-gray-600">15 new collaborations started today</p>
                <span className="text-xs text-gray-400 ml-auto">10 min ago</span>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Right Side - Login Form with animation */}
        <motion.div
          className="w-full max-w-md mx-auto lg:mx-0"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        >
          <Card className="border-0 shadow-2xl bg-white/70 backdrop-blur-2xl rounded-3xl p-8">
            <CardHeader className="space-y-4 pb-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-4 py-2">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span className="text-sm font-medium text-blue-600">Secure Login</span>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Sign in to your research workspace
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email with floating label */}
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="peer pl-10 pr-4 py-4 border border-gray-200 rounded-xl bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm placeholder-transparent"
                    placeholder=" "
                    required
                    aria-label="Email address"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 peer-focus:text-blue-500 transition-colors duration-200" />
                  <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600">
                    Email address
                  </label>
                </div>
                {/* Password with floating label */}
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="peer pl-10 pr-10 py-4 border border-gray-200 rounded-xl bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm placeholder-transparent"
                    placeholder=" "
                    required
                    aria-label="Password"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 peer-focus:text-blue-500 transition-colors duration-200" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600">
                    Password
                  </label>
                </div>
                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2"
                      aria-label="Remember me for 30 days"
                    />
                    <label htmlFor="remember" className="text-sm text-gray-600">
                      Remember me
                    </label>
                  </div>
                  <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 font-medium focus:underline">
                    Forgot password?
                  </Link>
                </div>
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl rounded-xl py-3 text-lg font-semibold transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  aria-label="Sign in"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              {/* Divider for social login */}
              <div className="flex items-center my-6">
                <span className="flex-1 border-t border-gray-200"></span>
                <span className="mx-4 text-gray-400 text-sm">or</span>
                <span className="flex-1 border-t border-gray-200"></span>
              </div>
              {/* Social login buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="border-gray-300 hover:bg-gray-50 rounded-xl flex items-center justify-center py-3">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button variant="outline" className="border-gray-300 hover:bg-gray-50 rounded-xl flex items-center justify-center py-3">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.404-5.219 1.404-5.219s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.978.114.16.436.085.704-.09.369-.294 1.189-.334 1.357-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                  </svg>
                  ORCID
                </Button>
              </div>

              <div className="text-center">
                <span className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                    Sign up for free
                  </Link>
                </span>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium">Your data is secure</p>
                    <p>We use industry-standard encryption to protect your research data and ensure GDPR compliance.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 