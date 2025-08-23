import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

// Multi-model PDF analysis using different OpenAI models for different tasks
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const analysisType = formData.get('analysisType') as string || 'comprehensive'
    
    if (!file || !openai) {
      return NextResponse.json(
        { error: 'File and API key required' },
        { status: 400 }
      )
    }

    console.log(`[Smart Analysis] Processing ${file.name} with ${analysisType} analysis`)

    // Step 1: Extract text from PDF
    const buffer = await file.arrayBuffer()
    const pdfData = await pdfParse(Buffer.from(buffer))
    const fullText = pdfData.text
    
    // Step 2: Use different models for different analysis tasks
    const results = await Promise.all([
      // Fast metadata extraction using GPT-3.5 Turbo (cost-effective)
      extractMetadataFast(fullText),
      
      // Comprehensive analysis using GPT-4 (high-quality)
      generateComprehensiveAnalysis(fullText, analysisType),
      
      // Mathematical content detection using GPT-4 Turbo
      detectMathematicalContent(fullText),
      
      // Generate embeddings for semantic search
      generateTextEmbeddings(fullText.substring(0, 8000))
    ])

    const [metadata, analysis, mathContent, embeddings] = results

    return NextResponse.json({
      success: true,
      document: {
        filename: file.name,
        size: file.size,
        pages: pdfData.numpages,
        textLength: fullText.length
      },
      metadata,
      analysis,
      mathContent,
      embeddings: embeddings ? 'Generated' : 'Not available',
      processing: {
        models_used: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'text-embedding-3-small'],
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[Smart Analysis] Error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: String(error) },
      { status: 500 }
    )
  }
}

// Fast metadata extraction using GPT-3.5 Turbo (cheaper, faster)
async function extractMetadataFast(text: string) {
  try {
    const response = await openai!.chat.completions.create({
      model: 'gpt-3.5-turbo', // Fast and economical
      messages: [{
        role: 'system',
        content: 'Extract basic metadata from this academic paper. Return JSON with: title, authors, year, journal, abstract, keywords.'
      }, {
        role: 'user',
        content: text.substring(0, 2000) // First 2000 chars for metadata
      }],
      max_tokens: 500,
      temperature: 0.1
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Metadata extraction error:', error)
    return { error: 'Metadata extraction failed' }
  }
}

// Comprehensive analysis using GPT-4 (highest quality)
async function generateComprehensiveAnalysis(text: string, analysisType: string) {
  try {
    let systemPrompt = ''
    let model = 'gpt-4'

    switch (analysisType) {
      case 'research':
        systemPrompt = 'You are a research analyst. Provide deep academic analysis including methodology, significance, limitations, and future research directions.'
        model = 'gpt-4' // Best for complex analysis
        break
      case 'mathematical':
        systemPrompt = 'You are a mathematics expert. Focus on mathematical concepts, equations, proofs, and computational methods in this paper.'
        model = 'gpt-4-turbo' // Good balance for technical analysis
        break
      case 'summary':
        systemPrompt = 'You are a summarization expert. Provide clear, concise summaries for general audiences.'
        model = 'gpt-3.5-turbo' // Sufficient for summaries
        break
      default:
        systemPrompt = 'You are an academic assistant. Provide comprehensive analysis of this research paper.'
        model = 'gpt-4'
    }

    const response = await openai!.chat.completions.create({
      model,
      messages: [{
        role: 'system',
        content: systemPrompt + ' Return detailed JSON analysis.'
      }, {
        role: 'user',
        content: `Analyze this paper:\n\n${text.substring(0, 4000)}`
      }],
      max_tokens: 1500,
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content || '{}'
    return { 
      analysis: JSON.parse(content),
      model_used: model,
      analysis_type: analysisType
    }
  } catch (error) {
    console.error('Comprehensive analysis error:', error)
    return { error: 'Analysis failed' }
  }
}

// Mathematical content detection using GPT-4 Turbo
async function detectMathematicalContent(text: string) {
  try {
    const response = await openai!.chat.completions.create({
      model: 'gpt-4-turbo', // Good for structured analysis
      messages: [{
        role: 'system',
        content: 'Identify and extract mathematical content: equations, formulas, theorems, proofs, mathematical concepts. Return structured JSON.'
      }, {
        role: 'user',
        content: text.substring(0, 6000)
      }],
      max_tokens: 800,
      temperature: 0.2
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Math detection error:', error)
    return { equations: [], concepts: [], error: 'Math detection failed' }
  }
}

// Generate embeddings for semantic search
async function generateTextEmbeddings(text: string) {
  try {
    const response = await openai!.embeddings.create({
      model: 'text-embedding-3-small', // Cost-effective embedding model
      input: text,
      encoding_format: 'float'
    })

    return {
      embedding: response.data[0].embedding,
      dimensions: response.data[0].embedding.length,
      model: 'text-embedding-3-small'
    }
  } catch (error) {
    console.error('Embedding generation error:', error)
    return null
  }
}

// GET endpoint to list available models and capabilities
export async function GET() {
  const modelCapabilities = {
    'gpt-4': {
      best_for: ['Complex reasoning', 'Research analysis', 'Creative tasks'],
      cost: 'High',
      speed: 'Slow',
      context_window: '8K tokens'
    },
    'gpt-4-turbo': {
      best_for: ['Balanced performance', 'Technical analysis', 'Code generation'],
      cost: 'Medium-High',
      speed: 'Medium',
      context_window: '128K tokens'
    },
    'gpt-4o': {
      best_for: ['Latest capabilities', 'Multimodal tasks', 'Best reasoning'],
      cost: 'High',
      speed: 'Medium',
      context_window: '128K tokens'
    },
    'gpt-3.5-turbo': {
      best_for: ['Fast responses', 'Simple tasks', 'Cost optimization'],
      cost: 'Low',
      speed: 'Fast',
      context_window: '16K tokens'
    },
    'text-embedding-3-small': {
      best_for: ['Semantic search', 'Similarity matching', 'Vector databases'],
      cost: 'Very Low',
      speed: 'Fast',
      dimensions: '1536'
    }
  }

  return NextResponse.json({
    available_models: modelCapabilities,
    recommendations: {
      pdf_metadata: 'gpt-3.5-turbo',
      research_analysis: 'gpt-4',
      mathematical_analysis: 'gpt-4-turbo',
      quick_summaries: 'gpt-3.5-turbo',
      semantic_search: 'text-embedding-3-small'
    }
  })
}
