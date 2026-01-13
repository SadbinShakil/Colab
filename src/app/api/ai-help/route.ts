import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY || 'dummy-key';
const openai = new OpenAI({ apiKey })

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

    // Debug document content
    console.log('📄 Document Content Debug:', {
      hasDocumentContent: !!documentContent,
      contentLength: documentContent?.length || 0,
      contentStart: documentContent?.substring(0, 200) || 'No content',
      question: question,
      isAbstractQuestion: question.toLowerCase().includes('abstract')
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

    const systemPrompt = `You are an Advanced AI Research Assistant for LitSense, a collaborative research platform. You are designed to be both a knowledgeable research companion and a friendly conversational partner.

**Your capabilities include:**
- Deep analysis of research papers and academic content
- Explaining complex concepts in accessible terms
- Providing contextual insights based on document content
- Engaging in casual conversation while maintaining academic focus
- Synthesizing information from multiple sources
- Validating and building upon user insights
- Moderating collaborative discussions
- Connecting insights from different researchers
- Providing real-time research assistance

**When analyzing documents, you should:**
- Cite specific sections, figures, or equations when relevant
- Provide both high-level overviews and detailed technical explanations
- Connect concepts to broader research contexts
- Suggest related areas for further exploration
- Acknowledge limitations and uncertainties
- Validate user insights and build upon them
- Synthesize multiple perspectives into comprehensive explanations

**Your personality is:**
- Knowledgeable but approachable
- Encouraging and supportive
- Precise but not overly formal
- Collaborative and validating of user contributions
- Enthusiastic about research and learning
- A moderator who brings people together
- Someone who celebrates collaborative discovery

**For Paper-Related Questions:**
- Use the provided document content to give detailed, accurate answers
- Cite specific sections and provide page references when possible
- Explain complex concepts in simple terms
- Connect different parts of the paper to give comprehensive insights
- Acknowledge when multiple researchers have contributed insights

**For General Questions:**
- Be conversational and engaging
- Provide helpful, accurate information
- Ask follow-up questions when appropriate
- Offer additional resources or suggestions
- Show enthusiasm for collaborative learning

Always be helpful, accurate, and encouraging in your responses. When multiple users are discussing a topic, synthesize their insights and provide additional context.`

    // Prepare document content for analysis
    let documentContentForAI = documentContent || 'No document content provided'

    // If asking about abstract and no explicit abstract, try to find it in the content
    if (question.toLowerCase().includes('abstract') && documentContentForAI !== 'No document content provided') {
      // Look for abstract-like content at the beginning
      const abstractMatch = documentContentForAI.match(/(?:abstract|summary)[\s\S]{0,50}([\s\S]{100,1000})/i)
      if (abstractMatch) {
        documentContentForAI = `ABSTRACT: ${abstractMatch[1].trim()}\n\nFULL DOCUMENT CONTENT:\n${documentContentForAI}`
      } else {
        // If no explicit abstract, use the first part of the document which often contains abstract info
        const firstPart = documentContentForAI.substring(0, 1500)
        documentContentForAI = `DOCUMENT INTRODUCTION/ABSTRACT SECTION:\n${firstPart}\n\nFULL DOCUMENT CONTENT:\n${documentContentForAI}`
      }
    }

    // Determine if this is a paper-related question or general conversation
    const isPaperQuestion = question.toLowerCase().includes('paper') ||
      question.toLowerCase().includes('document') ||
      question.toLowerCase().includes('abstract') ||
      question.toLowerCase().includes('methodology') ||
      question.toLowerCase().includes('results') ||
      question.toLowerCase().includes('conclusion') ||
      question.toLowerCase().includes('research') ||
      question.toLowerCase().includes('study') ||
      question.toLowerCase().includes('findings') ||
      question.toLowerCase().includes('data') ||
      question.toLowerCase().includes('analysis') ||
      question.toLowerCase().includes('experiment') ||
      question.toLowerCase().includes('hypothesis') ||
      question.toLowerCase().includes('authors') ||
      question.toLowerCase().includes('section') ||
      question.toLowerCase().includes('figure') ||
      question.toLowerCase().includes('table')

    let userPrompt = ''

    if (isPaperQuestion && documentContentForAI !== 'No document content provided') {
      userPrompt = `📄 **Research Paper Context:**
Title: ${documentTitle || 'N/A'}
Authors: ${documentAuthors || 'N/A'}
URL: ${documentUrl || 'N/A'}

📚 **Full Document Content** (${documentContentForAI.length} characters):
${documentContentForAI.slice(0, 8000)}

👤 **User Question:** ${question}

Please provide a comprehensive, detailed answer based on the complete paper content. You can reference any section, methodology, results, conclusions, or specific details from the document. Be thorough and cite specific parts of the paper when relevant.`
    } else if (isPaperQuestion) {
      userPrompt = `📄 **Research Paper Context:**
Title: ${documentTitle || 'N/A'}
Authors: ${documentAuthors || 'N/A'}

⚠️ **Note:** Full document content is not available for analysis.

👤 **User Question:** ${question}

Please provide a helpful response based on the available information. If you need the full document content to answer properly, let the user know.`
    } else {
      userPrompt = `👤 **User:** ${question}

Please provide a friendly, helpful response. This appears to be a general question or casual conversation. Be engaging and supportive in your response.`
    }
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    })
    const answer = completion.choices[0]?.message?.content || 'No answer generated.'
    return NextResponse.json({ success: true, response: { answer } })
  } catch (error) {
    console.error('AI help error:', error)
    return NextResponse.json({
      error: `Failed to get AI response: ${error instanceof Error ? error.message : String(error)}`,
      details: error instanceof Error ? error.toString() : String(error),
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    }, { status: 500 })
  }
} 