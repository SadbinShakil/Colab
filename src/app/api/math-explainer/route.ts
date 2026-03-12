import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-development'
})

export async function POST(request: NextRequest) {
  try {
    // Check if we have a valid API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      // Return mock response for testing when no real API key
      const mockResponse = `## Mathematical Analysis (Demo Mode)

### 🔢 **Step-by-Step Breakdown**
This appears to be a mathematical concept or equation that would benefit from detailed analysis.

### 📊 **Key Components**
- **Variables**: Each symbol represents specific mathematical quantities
- **Operations**: The mathematical operations connect different components
- **Context**: This relates to the broader research methodology

### 💡 **Intuitive Understanding**
Think of this as a mathematical tool that helps researchers quantify and analyze their data.

### 🎯 **Practical Application**
This mathematical approach is commonly used in academic research to:
- Model complex relationships
- Quantify research findings
- Validate theoretical frameworks

### 🔬 **Research Context**
Understanding this mathematics is crucial for comprehending the paper's methodology and conclusions.

*Note: This is a demo response. Add your OpenAI API key to .env for detailed mathematical analysis.*`

      return NextResponse.json({ 
        success: true, 
        explanation: mockResponse 
      })
    }

    const { equation, context, documentContent, question } = await request.json()

    if (!equation && !question) {
      return NextResponse.json({ 
        error: 'Equation or question is required' 
      }, { status: 400 })
    }

    // Create a comprehensive prompt for math explanation
    let systemPrompt = `You are an expert mathematics and research paper tutor specializing in explaining complex mathematical concepts, equations, and research methodologies. Your role is to help researchers understand mathematical content in academic papers.

Key Responsibilities:
1. Break down complex equations step-by-step
2. Explain what each variable and symbol means
3. Provide context for why the equation is used
4. Give practical examples when possible
5. Connect mathematical concepts to real-world applications
6. Explain the derivation and assumptions behind equations
7. Help understand the relationship between different mathematical components

Guidelines:
- Always start with a high-level overview of what the equation represents
- Break down complex equations into smaller, understandable parts
- Define every variable and symbol clearly
- Explain the mathematical operations step-by-step
- Provide context about where this equation comes from and why it's important
- Use analogies and examples when helpful
- Mention any assumptions or limitations
- Connect to the broader research context when possible

Format your response in clear sections with headers.`

    let userPrompt = ''

    if (equation) {
      userPrompt = `Please explain this mathematical equation or concept in detail:

EQUATION/CONCEPT: ${equation}

CONTEXT: ${context || 'This equation appears in a research paper'}

DOCUMENT CONTENT (for additional context): ${documentContent || 'No additional context provided'}

Please provide:
1. A high-level overview of what this equation represents
2. Step-by-step breakdown of each component
3. Definition of all variables and symbols
4. Explanation of the mathematical operations
5. Context about why this equation is important
6. Any assumptions or limitations
7. Practical examples or analogies if helpful

Make the explanation accessible to researchers who may not be experts in this specific mathematical area.`
    } else if (question) {
      userPrompt = `Please answer this mathematical question in detail:

QUESTION: ${question}

CONTEXT: ${context || 'This question relates to mathematical content in a research paper'}

DOCUMENT CONTENT (for additional context): ${documentContent || 'No additional context provided'}

Please provide a comprehensive, step-by-step explanation that helps researchers understand the mathematical concepts involved.`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    })

    const explanation = completion.choices[0]?.message?.content || 'No explanation generated'

    // Parse the explanation to extract structured information
    const structuredExplanation = parseExplanation(explanation)

    return NextResponse.json({
      success: true,
      explanation: explanation,
      structured: structuredExplanation,
      model: 'gpt-4',
      timestamp: new Date().toISOString()
    })

  } catch (err: any) {
    console.error('[MATH EXPLAINER] OpenAI API error:', err)
    return NextResponse.json({ 
      error: 'Failed to generate math explanation', 
      details: String(err) 
    }, { status: 500 })
  }
}

// Helper function to parse the explanation into structured format
function parseExplanation(explanation: string) {
  const sections: Record<string, string> = {
    overview: '',
    breakdown: '',
    variables: '',
    operations: '',
    context: '',
    assumptions: '',
    examples: ''
  }

  // Extract sections based on common patterns
  const lines = explanation.split('\n')
  let currentSection = 'overview'
  
  for (const line of lines) {
    const trimmedLine = line.trim().toLowerCase()
    
    if (trimmedLine.includes('overview') || trimmedLine.includes('represents') || trimmedLine.includes('concept')) {
      currentSection = 'overview'
    } else if (trimmedLine.includes('breakdown') || trimmedLine.includes('component') || trimmedLine.includes('step')) {
      currentSection = 'breakdown'
    } else if (trimmedLine.includes('variable') || trimmedLine.includes('symbol') || trimmedLine.includes('define')) {
      currentSection = 'variables'
    } else if (trimmedLine.includes('operation') || trimmedLine.includes('mathematical') || trimmedLine.includes('calculation')) {
      currentSection = 'operations'
    } else if (trimmedLine.includes('context') || trimmedLine.includes('important') || trimmedLine.includes('why')) {
      currentSection = 'context'
    } else if (trimmedLine.includes('assumption') || trimmedLine.includes('limitation') || trimmedLine.includes('constraint')) {
      currentSection = 'assumptions'
    } else if (trimmedLine.includes('example') || trimmedLine.includes('analogy') || trimmedLine.includes('practical')) {
      currentSection = 'examples'
    }
    
    if (line.trim() && !line.trim().startsWith('#')) {
      sections[currentSection] += (sections[currentSection] ? '\n' : '') + line
    }
  }

  return sections
} 