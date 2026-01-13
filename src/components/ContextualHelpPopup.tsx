'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  X, Lightbulb, Brain, Clock, Highlighter, MessageSquare,
  BookOpen, Sparkles, CheckCircle, ArrowRight, HelpCircle,
  TrendingUp, Target, Zap, GraduationCap, FileText, Star
} from 'lucide-react'
import { contextualAI, StrugglePattern, ContextualHelp } from '@/lib/contextualAI'
import { toast } from 'sonner'

interface ContextualHelpPopupProps {
  onClose?: () => void
}

export default function ContextualHelpPopup({ onClose }: ContextualHelpPopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStruggle, setCurrentStruggle] = useState<StrugglePattern | null>(null)
  const [helpContent, setHelpContent] = useState<ContextualHelp | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Listen for struggle detection events
    const handleStruggleDetected = (event: CustomEvent<StrugglePattern>) => {
      console.log('🎯 [ContextualHelpPopup] Struggle detected event received:', event.detail)
      setCurrentStruggle(event.detail)
      setIsVisible(true)
      toast.info('🤔 I notice you might need help with this section', {
        description: 'Click to get AI-powered explanation',
        duration: 5000
      })
    }

    console.log('👂 [ContextualHelpPopup] Setting up event listener for struggle-detected')
    window.addEventListener('struggle-detected', handleStruggleDetected as EventListener)

    return () => {
      console.log('🧹 [ContextualHelpPopup] Cleaning up event listener')
      window.removeEventListener('struggle-detected', handleStruggleDetected as EventListener)
    }
  }, [])

  const handleGetHelp = async () => {
    if (!currentStruggle) return

    setIsLoading(true)
    try {
      const help = await contextualAI.getContextualHelp(
        currentStruggle.sectionId,
        currentStruggle.sectionText
      )
      setHelpContent(help)
      setIsExpanded(true)

      // Clear the struggle pattern since user accepted help
      contextualAI.clearStrugglePatterns(currentStruggle.sectionId)

      toast.success('💡 Here\'s your personalized explanation!', {
        description: 'AI has analyzed this section for you',
        duration: 4000
      })
    } catch (error) {
      toast.error('Failed to get help. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    setCurrentStruggle(null)
    setHelpContent(null)
    setIsExpanded(false)
    onClose?.()
  }

  const handleDismiss = () => {
    // User dismissed without getting help
    if (currentStruggle) {
      contextualAI.clearStrugglePatterns(currentStruggle.sectionId)
    }
    handleClose()
  }

  if (!isVisible || !currentStruggle) return null

  const getStruggleIcon = (type: string) => {
    switch (type) {
      case 'highlighting': return <Highlighter className="w-5 h-5" />
      case 'time_spent': return <Clock className="w-5 h-5" />
      case 'revisiting': return <BookOpen className="w-5 h-5" />
      case 'annotations': return <MessageSquare className="w-5 h-5" />
      case 'skimming': return <TrendingUp className="w-5 h-5" />
      default: return <HelpCircle className="w-5 h-5" />
    }
  }

  const getStruggleMessage = (type: string) => {
    switch (type) {
      case 'highlighting':
        return 'You\'ve highlighted several parts of this section. Would you like me to explain the key concepts?'
      case 'time_spent':
        return 'You\'ve been reading this section for a while. Need help understanding it better?'
      case 'revisiting':
        return 'You\'ve returned to this section multiple times. Let me help clarify the concepts.'
      case 'annotations':
        return 'You\'ve added several notes here. Would you like me to provide additional context?'
      case 'skimming':
        return 'I notice you\'re scrolling quickly through this section. Would you like a high-level summary of the key points?'
      default:
        return 'I notice you might need help with this section. Can I assist you?'
    }
  }

  const getStruggleReasoning = (type: string) => {
    switch (type) {
      case 'highlighting':
        return 'You\'ve highlighted several parts of this section, indicating a strong interest in understanding the content. This suggests a desire for deeper comprehension and the ability to recall key information effectively.'
      case 'time_spent':
        return 'You\'ve been reading this section for a while, which is a positive sign of engagement. However, the duration might indicate a need for more focused and efficient learning. This could suggest a desire for a more structured approach or a need to break down complex concepts.'
      case 'revisiting':
        return 'You\'ve returned to this section multiple times, which is a strong indicator of your commitment to mastering the material. This suggests a deep desire to understand and retain the information, as well as a willingness to invest time in the learning process.'
      case 'annotations':
        return 'You\'ve added several notes here, which is a great way to organize and reinforce your understanding. This indicates a proactive approach to learning, as well as a strong desire to connect new information with existing knowledge.'
      case 'skimming':
        return 'You\'re moving quickly through this content. This skimming pattern often happens when looking for specific answers or trying to get the "big picture" before diving deep. I can help synthesize the main arguments for you.'
      default:
        return 'Based on your reading behavior, I can infer that you are a diligent learner who values understanding and retention of information. Your engagement with the material is positive, and you show a strong desire to learn and apply the concepts.'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-lg animate-in slide-in-from-bottom-2 duration-300">
      <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50 to-indigo-100 backdrop-blur-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white">
                  🧠 AI Research Assistant
                </CardTitle>
                <CardDescription className="text-blue-100 text-sm">
                  Advanced Contextual Analysis System
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Struggle Pattern Indicator */}
          <div className="flex items-center gap-2 mt-3 p-2 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {getStruggleIcon(currentStruggle.struggleType)}
              <span className="text-sm font-medium">Pattern Detected</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {Math.round((currentStruggle?.confidence || 0) * 100)}% confidence
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {!isExpanded ? (
            // Initial help offer with enhanced analytics
            <div className="space-y-4">
              {/* Analysis Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-800 text-sm">Reading Pattern Analysis</span>
                </div>

                {/* Enhanced reasoning display */}
                <div className="mb-3 p-3 bg-white/60 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {getStruggleReasoning(currentStruggle.struggleType)}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed">
                  {getStruggleMessage(currentStruggle.struggleType)}
                </p>

                {/* Confidence Meter */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Difficulty Assessment</span>
                    <span>{Math.round((currentStruggle?.confidence || 0) * 100)}%</span>
                  </div>
                  <Progress
                    value={(currentStruggle?.confidence || 0) * 100}
                    className="h-2 bg-blue-100"
                  />
                </div>
              </div>

              {/* AI Capabilities Preview */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Concept Breakdown</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Smart Examples</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                  <GraduationCap className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700">Academic Context</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-700">Related Papers</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleGetHelp}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Section...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Get AI Explanation
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="text-sm border-gray-300 hover:bg-gray-50"
                >
                  Later
                </Button>
              </div>
            </div>
          ) : (
            // Enhanced expanded help content
            <div className="space-y-5">
              {/* Analysis Status */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">AI Analysis Complete</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {helpContent?.difficulty || 'intermediate'} level
                </Badge>
              </div>

              {helpContent && (
                <div className="space-y-4">
                  {/* Main Explanation */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-blue-800">Academic Explanation</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      {helpContent.explanation}
                    </p>
                  </div>

                  {/* Simplified Version */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-green-600" />
                      <h4 className="font-bold text-green-800">Simplified Understanding</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {helpContent.simplifiedVersion}
                    </p>
                  </div>

                  {/* Key Concepts */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-purple-600" />
                      <h4 className="font-bold text-gray-800">Key Concepts</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {helpContent.keyConcepts.map((concept, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-purple-100 text-purple-700 border border-purple-200 text-xs font-medium"
                        >
                          {concept}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Real-world Examples */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-5 h-5 text-orange-600" />
                      <h4 className="font-bold text-gray-800">Real-world Applications</h4>
                    </div>
                    <div className="grid gap-2">
                      {helpContent.examples.map((example, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200">
                          <Star className="w-3 h-3 text-orange-500 flex-shrink-0" />
                          <span className="text-xs text-gray-700">{example}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Related Topics */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-bold text-gray-800">Related Research Areas</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {helpContent.relatedConcepts.map((topic, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-3 border-t border-gray-200">
                    <Button
                      onClick={handleClose}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Perfect, thanks!
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsExpanded(false)}
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Ask More
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
