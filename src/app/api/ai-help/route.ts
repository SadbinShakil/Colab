import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { question, documentContent, documentTitle, documentAuthors, documentUrl, userId, userName } = await request.json()
    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }

    // Check if we have a valid API key
    console.log('🔑 AI Help API Key Check:', {
      hasKey: !!process.env.OPENAI_API_KEY,
      keyLength: process.env.OPENAI_API_KEY?.length,
      keyStartsWith: process.env.OPENAI_API_KEY?.substring(0, 20),
      isDemoKey: process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here'
    })
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      // Return mock response for testing when no real API key
      const mockResponse = {
        content: `## Advanced Analysis (Demo Mode)

**Based on:** ${documentTitle || 'Academic Content'}

### 🎯 **Core Explanation**
This appears to be advanced academic content that would benefit from detailed analysis and explanation.

### 🔬 **Key Concepts**
- **Primary Topic**: The main subject matter requires foundational understanding
- **Related Theories**: Connected to established academic frameworks
- **Methodology**: Follows standard research practices

### 💡 **Deeper Understanding**
This content relates to broader academic discourse and research methodologies in the field.

### 🎓 **Academic Context**
Understanding this requires knowledge of:
- Field-specific terminology
- Research methodologies
- Theoretical frameworks
- Prior research in the area

*Note: This is a demo response. Add your OpenAI API key to .env for personalized analysis.*`,
        relatedConcepts: ["Academic Research", "Methodology", "Theoretical Framework"],
        followUpQuestions: [
          "What are the key prerequisites for understanding this?",
          "How does this relate to current research?",
          "What are the practical applications?"
        ],
        examples: ["Research Paper Analysis", "Academic Discussion", "Literature Review"]
      }

      return NextResponse.json({ 
        success: true, 
        response: { answer: JSON.stringify(mockResponse) }
      })
    }

    const systemPrompt = `You are an expert AI research assistant. You help users understand and analyze academic documents. Use the provided document content and metadata to answer the user's question in detail, citing the document where possible.`
    const userPrompt = `Document Title: ${documentTitle || 'N/A'}\nAuthors: ${documentAuthors || 'N/A'}\nURL: ${documentUrl || 'N/A'}\n\nDocument Content (excerpt):\n${documentContent ? documentContent.slice(0, 3000) : 'No document content provided'}\n\nUser (${userName || 'Anonymous'}): ${question}`
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7,
    })
    const answer = completion.choices[0]?.message?.content || 'No answer generated.'
    return NextResponse.json({ success: true, response: { answer } })
  } catch (error) {
    console.error('AI help error:', error)
    return NextResponse.json({ 
      error: `Failed to get AI response: ${error.message || error}`,
      details: error.toString(),
      type: error.constructor.name
    }, { status: 500 })
  }
} 