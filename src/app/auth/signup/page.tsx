'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BookOpen, Mail, Lock, Eye, EyeOff, User, GraduationCap, FileText, CheckCircle, ArrowRight, Sparkles } from "lucide-react"
import { motion } from 'framer-motion'

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [redirectUrl, setRedirectUrl] = useState('/dashboard')
  const router = useRouter()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const redirect = urlParams.get('redirect')
    if (redirect) {
      setRedirectUrl(redirect)
    }
  }, [])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    institution: '',
    expertise: [] as string[]
  })

  const expertiseAreas = [
    'Computer Science', 'Biology', 'Chemistry', 'Physics', 'Mathematics',
    'Medicine', 'Psychology', 'Economics', 'Engineering', 'Neuroscience',
    'Environmental Science', 'Sociology', 'Philosophy', 'Literature', 'History'
  ]

  const handleExpertiseToggle = (area: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(area)
        ? prev.expertise.filter(e => e !== area)
        : [...prev.expertise, area]
    }))
  }

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all required fields')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long')
        return
      }
    }
    setError('')
    setCurrentStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push(redirectUrl)
      } else {
        const data = await response.json()
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] flex items-center justify-center p-4 relative overflow-hidden text-[hsl(var(--color-foreground))]">
      {/* Soft Background Blobs */}
      <div className="absolute inset-0 -z-10 bg-white">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-100/50 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-16 items-center relative z-10">

        {/* Left Side Branding */}
        <motion.div
          className="hidden lg:flex flex-col gap-8"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div>
            <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <FileText size={24} fill="currentColor" />
              </div>
              <span className="text-3xl font-bold text-gray-900">CoRead</span>
            </Link>

            <h1 className="text-5xl font-bold text-gray-900 leading-[1.1] mb-6">
              Join the future of <br />
              <span className="text-blue-600">academic collaboration.</span>
            </h1>
            <p className="text-xl text-gray-700 max-w-lg leading-relaxed mb-8 font-medium">
              Connect with researchers, annotate papers together, and accelerate discovery with AI.
            </p>

            <div className="space-y-4">
              {[
                'Real-time collaborative annotation',
                'AI-powered research insights',
                'Secure document sharing',
                'Advanced search capabilities'
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-600 transition-colors duration-300">
                    <CheckCircle className="w-4 h-4 text-green-700 group-hover:text-white" />
                  </div>
                  <span className="text-gray-800 font-bold text-lg">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Form */}
        <motion.div
          className="w-full max-w-lg mx-auto lg:mx-0"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        >
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-blue-900/5 border border-gray-100 relative overflow-hidden">

            {/* Decorative top gradient */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>

            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-bold mb-4 border border-blue-100">
                <Sparkles size={14} />
                <span>Step {currentStep} of 2</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentStep === 1 ? 'Create account' : 'Your profile'}
              </h2>
              <p className="text-gray-600 font-medium mt-2">
                {currentStep === 1 ? 'Start your research journey' : 'Tell us about your interests'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8 overflow-hidden">
              <motion.div
                className="bg-blue-600 h-full rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${(currentStep / 2) * 100}%` }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            </div>

            <form onSubmit={currentStep === 1 ? (e) => { e.preventDefault(); nextStep(); } : handleSubmit} className="space-y-6">

              {currentStep === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                      <Input
                        placeholder="First Name"
                        className="pl-12 h-14 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all font-medium placeholder:text-gray-400"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                      <Input
                        placeholder="Last Name"
                        className="pl-12 h-14 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all font-medium placeholder:text-gray-400"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      className="pl-12 h-14 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all font-medium placeholder:text-gray-400"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      className="pl-12 pr-12 h-14 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all font-medium placeholder:text-gray-400"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 bg-transparent border-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      className="pl-12 pr-12 h-14 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all font-medium placeholder:text-gray-400"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 bg-transparent border-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="relative group">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <Input
                      placeholder="Institution / University"
                      className="pl-12 h-14 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all font-medium placeholder:text-gray-400"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 block">
                      Areas of expertise
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                      {expertiseAreas.map((area) => (
                        <label
                          key={area}
                          className={`
                              cursor-pointer px-4 py-2 rounded-full text-sm font-bold transition-all border
                              ${formData.expertise.includes(area)
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}
                            `}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.expertise.includes(area)}
                            onChange={() => handleExpertiseToggle(area)}
                          />
                          {area}
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center mt-1">
                      <input
                        type="checkbox"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="peer sr-only "
                      />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
                      <CheckCircle className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm text-gray-600 font-medium leading-relaxed group-hover:text-gray-800 transition-colors">
                      I agree to the <Link href="/terms" className="text-blue-600 hover:underline font-bold">Terms of Service</Link> and <Link href="/privacy" className="text-blue-600 hover:underline font-bold">Privacy Policy</Link>.
                    </span>
                  </label>
                </motion.div>
              )}

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-bold border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                {currentStep === 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCurrentStep(1)}
                    className="h-14 px-6 rounded-full text-gray-700 hover:bg-gray-100 font-bold"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:shadow-blue-200 transition-all transform active:scale-95"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : currentStep === 1 ? (
                    <span className="flex items-center gap-2">
                      Continue <ArrowRight size={20} />
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <span className="text-gray-700 font-medium">Already have an account? </span>
              <Link href="/auth/login" className="text-blue-700 font-bold hover:underline">
                Sign in
              </Link>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  )
} 