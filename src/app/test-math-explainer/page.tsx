'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import MathExplainer from '@/components/MathExplainer'
import { 
  Calculator, 
  Brain, 
  Variable, 
  BookOpen, 
  Lightbulb,
  Zap,
  Target,
  AlertTriangle
} from 'lucide-react'

export default function TestMathExplainer() {
  const [showExplainer, setShowExplainer] = useState(false)
  const [equation, setEquation] = useState('')
  const [context, setContext] = useState('')
  const [documentContent, setDocumentContent] = useState('')

  const sampleEquations = [
    'E = mc²',
    'F = ma',
    '∫ f(x) dx = F(x) + C',
    'y = mx + b',
    'P(A|B) = P(B|A) × P(A) / P(B)',
    '∇²ψ + k²ψ = 0',
    '∑(i=1 to n) x_i = x_1 + x_2 + ... + x_n',
    'e^(iπ) + 1 = 0'
  ]

  const sampleContexts = [
    'This equation appears in Einstein\'s theory of relativity, describing the relationship between energy and mass.',
    'Newton\'s second law of motion, fundamental to classical mechanics.',
    'The fundamental theorem of calculus, showing the relationship between derivatives and integrals.',
    'Linear equation in slope-intercept form, commonly used in algebra.',
    'Bayes\' theorem, fundamental to probability theory and statistics.',
    'Helmholtz equation, important in wave physics and quantum mechanics.',
    'Summation notation, commonly used in mathematics and statistics.',
    'Euler\'s identity, considered one of the most beautiful equations in mathematics.'
  ]

  const sampleDocuments = [
    'This research paper investigates the application of machine learning algorithms in quantum physics. The study focuses on understanding particle behavior through mathematical modeling and statistical analysis.',
    'The paper presents a novel approach to neural network optimization using gradient descent methods. Mathematical foundations are established through rigorous analysis of convergence properties.',
    'This study examines the relationship between economic indicators and market performance using regression analysis and statistical modeling techniques.'
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧮 Advanced Math Explainer Test
          </h1>
          <p className="text-xl text-gray-600">
            Test the GPT-4 powered mathematical explanation system
          </p>
          <Badge variant="secondary" className="mt-2 text-lg px-4 py-2">
            GPT-4 Powered • Advanced AI • Research-Grade
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-6 h-6 text-blue-600" />
                <span>Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="equation">Equation or Mathematical Concept</Label>
                <Input
                  id="equation"
                  value={equation}
                  onChange={(e) => setEquation(e.target.value)}
                  placeholder="e.g., E = mc², ∫ f(x) dx, or your custom equation"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="context">Context (Optional)</Label>
                <Textarea
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Where does this equation appear? What field is it from?"
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="document">Document Content (Optional)</Label>
                <Textarea
                  id="document"
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="Relevant text from the research paper or document"
                  className="mt-1"
                  rows={4}
                />
              </div>

              <Button 
                onClick={() => setShowExplainer(true)}
                disabled={!equation.trim()}
                className="w-full"
                size="lg"
              >
                <Brain className="w-5 h-5 mr-2" />
                Generate Mathematical Explanation
              </Button>
            </CardContent>
          </Card>

          {/* Quick Test Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-6 h-6 text-yellow-600" />
                <span>Quick Test Examples</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Click any example to quickly test the math explainer:
                </p>
                
                {sampleEquations.map((eq, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => {
                      setEquation(eq)
                      setContext(sampleContexts[index])
                      setDocumentContent(sampleDocuments[Math.floor(index / 3)])
                      setShowExplainer(true)
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <span className="font-mono text-sm">{eq}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              🚀 Advanced Math Explainer Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">High-Level Overview</h3>
                <p className="text-sm text-gray-600">
                  Understand what the equation represents in plain language
                </p>
              </div>
              
              <div className="text-center">
                <Calculator className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Step-by-Step Breakdown</h3>
                <p className="text-sm text-gray-600">
                  Detailed analysis of each mathematical component
                </p>
              </div>
              
              <div className="text-center">
                <Variable className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Variable Definitions</h3>
                <p className="text-sm text-gray-600">
                  Clear explanations of all symbols and variables
                </p>
              </div>
              
              <div className="text-center">
                <Lightbulb className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Practical Examples</h3>
                <p className="text-sm text-gray-600">
                  Real-world applications and analogies
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              🔧 How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 rounded-full p-2">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold">Input Mathematical Content</h4>
                  <p className="text-gray-600">
                    Enter equations, mathematical concepts, or ask specific questions about mathematical content.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-green-100 rounded-full p-2">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold">AI-Powered Analysis</h4>
                  <p className="text-gray-600">
                    GPT-4 analyzes the mathematical content using advanced AI to understand context and relationships.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-purple-100 rounded-full p-2">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold">Structured Explanation</h4>
                  <p className="text-gray-600">
                    Receive organized explanations with overview, breakdown, variables, operations, context, and examples.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-yellow-100 rounded-full p-2">
                  <span className="text-yellow-600 font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-semibold">Interactive Learning</h4>
                  <p className="text-gray-600">
                    Navigate between different explanation sections and ask follow-up questions for deeper understanding.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Math Explainer Modal */}
      <MathExplainer
        isOpen={showExplainer}
        onClose={() => setShowExplainer(false)}
        equation={equation}
        context={context}
        documentContent={documentContent}
      />
    </div>
  )
} 