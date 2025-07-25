'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BookOpen, Mail, Lock, Eye, EyeOff, User, GraduationCap, FileText, CheckCircle, ArrowRight, Sparkles } from "lucide-react"

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
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
        headers: {
          'Content-Type': 'application/json',
        },
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side - Branding */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">PaperPal</span>
            </Link>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                Join the Future of
                <span className="block text-blue-600">Academic Collaboration</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Connect with researchers worldwide, annotate papers together, and accelerate your research with AI-powered insights.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">What you'll get:</h3>
            <div className="space-y-4">
              {[
                'Real-time collaborative annotation',
                'AI-powered research insights',
                'Secure document sharing',
                'Advanced search capabilities'
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors duration-300">
                    <CheckCircle className="w-4 h-4 text-green-600 group-hover:text-white" />
                  </div>
                  <span className="text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <div className="flex items-center space-x-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-4 h-4 bg-yellow-400 rounded-full"></div>
              ))}
            </div>
            <p className="text-gray-700 italic leading-relaxed">
              "PaperPal has revolutionized how our research team collaborates. The AI insights are incredibly accurate."
            </p>
            <div className="mt-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Dr. Sarah Chen</p>
                <p className="text-sm text-gray-600">Stanford University</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="border-0 shadow-2xl bg-white/70 backdrop-blur-2xl rounded-3xl p-8">
            <CardHeader className="space-y-4 pb-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-4 py-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Step {currentStep} of 2</span>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {currentStep === 1 ? 'Create Your Account' : 'Complete Your Profile'}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {currentStep === 1 
                    ? 'Enter your basic information to get started' 
                    : 'Tell us about your research interests'
                  }
                </CardDescription>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / 2) * 100}%` }}
                ></div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={currentStep === 1 ? (e) => { e.preventDefault(); nextStep(); } : handleSubmit} className="space-y-4">
                {currentStep === 1 ? (
                  <div className="space-y-4">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">First Name</label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            className="peer pl-10 pr-4 py-4 border border-gray-200 rounded-xl bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm placeholder-transparent"
                            placeholder=" "
                            required
                            aria-label="First Name"
                          />
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 peer-focus:text-blue-500 transition-colors duration-200" />
                          <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600">
                            First Name
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Last Name</label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            className="peer pl-10 pr-4 py-4 border border-gray-200 rounded-xl bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm placeholder-transparent"
                            placeholder=" "
                            required
                            aria-label="Last Name"
                          />
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 peer-focus:text-blue-500 transition-colors duration-200" />
                          <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600">
                            Last Name
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="peer pl-10 pr-4 py-4 border border-gray-200 rounded-xl bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm"
                          placeholder="john.doe@university.edu"
                          required
                          aria-label="Email Address"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 peer-focus:text-blue-500 transition-colors duration-200" />
                        <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600">
                          Email Address
                        </label>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="peer pl-10 pr-10 border border-gray-200 rounded-xl bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm placeholder-transparent"
                          placeholder="Create a strong password"
                          required
                          aria-label="Password"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 peer-focus:text-blue-500 transition-colors duration-200" />
                        <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          className="peer pl-10 pr-10 border border-gray-200 rounded-xl bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm placeholder-transparent"
                          placeholder="Confirm your password"
                          required
                          aria-label="Confirm Password"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 peer-focus:text-blue-500 transition-colors duration-200" />
                        <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600">
                          Confirm Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Institution */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Institution</label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={formData.institution}
                          onChange={(e) => setFormData({...formData, institution: e.target.value})}
                          className="peer pl-10 pr-4 py-4 border border-gray-200 rounded-xl bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm placeholder-transparent"
                          placeholder=" "
                          aria-label="Institution"
                        />
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 peer-focus:text-blue-500 transition-colors duration-200" />
                        <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600">
                          Institution
                        </label>
                      </div>
                    </div>

                    {/* Expertise Areas */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Areas of expertise (select all that apply)
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                        {expertiseAreas.map((area) => (
                          <label key={area} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-white p-2 rounded-md transition-colors duration-200">
                            <input
                              type="checkbox"
                              checked={formData.expertise.includes(area)}
                              onChange={() => handleExpertiseToggle(area)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-700">{area}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        required
                      />
                      <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                        I agree to the{' '}
                        <Link href="/terms" className="text-blue-600 hover:text-blue-800 font-medium">
                          Terms of Service
                        </Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="text-blue-600 hover:text-blue-800 font-medium">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  {currentStep === 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 border-gray-300 hover:bg-gray-50 rounded-xl"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl rounded-xl py-3 text-lg font-semibold transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : currentStep === 1 ? (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>
              </form>

              <div className="flex items-center my-6">
                <span className="flex-1 border-t border-gray-200"></span>
                <span className="mx-4 text-gray-400 text-sm">or</span>
                <span className="flex-1 border-t border-gray-200"></span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="border-gray-300 hover:bg-gray-50 rounded-xl flex items-center justify-center py-3">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button variant="outline" className="border-gray-300 hover:bg-gray-50 rounded-xl flex items-center justify-center py-3">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.404-5.219 1.404-5.219s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.978.114.16.436.085.704-.09.369-.294 1.189-.334 1.357-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                  </svg>
                  ORCID
                </Button>
              </div>

              <div className="text-center">
                <span className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">
                    Sign in
                  </Link>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 