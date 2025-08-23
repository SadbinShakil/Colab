import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'
import OpenAI from 'openai'

// Only initialize OpenAI if API key is available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

// Enhanced PDF text extraction inspired by Python libraries
async function extractTextFromPDF(file: File): Promise<{
  text: string,
  metadata: any,
  info: any,
  numpages: number,
  extractionMethod: string,
  pages?: string[]
}> {
  try {
    // Primary method: Use pdf-parse (similar to PyPDF2 approach)
    const buffer = await file.arrayBuffer()
    const data = await pdfParse(Buffer.from(buffer), {
      // Enhanced options for better text extraction (pdfminer.six-like)
      max: 0, // No page limit
      version: 'v2.0.0',
    })

    // Extract pages separately for better layout preservation
    const pageTexts: string[] = []
    const fullText = data.text

    // Split text by common page separators or estimated page breaks
    const estimatedPageTexts = fullText.split(/\n\s*\n\s*(?=\S)/).filter(page => page.trim().length > 100)
    
    return {
      text: data.text,
      metadata: data.metadata || {},
      info: data.info || {},
      numpages: data.numpages,
      extractionMethod: 'pdf-parse-enhanced',
      pages: estimatedPageTexts.slice(0, 20) // Limit to first 20 pages for performance
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error(`Failed to extract text from PDF: ${error}`)
  }
}

// Enhanced metadata extraction considering PDF structure
function extractEnhancedMetadata(text: string, pdfMetadata?: any, pdfInfo?: any) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Extract title - prioritize PDF metadata, then analyze text structure
  let title = pdfMetadata?.Title || pdfInfo?.Title || ''
  
  if (!title || title.length < 5) {
    // Find title from text - usually first substantial line or after title markers
    const titleCandidates = lines.slice(0, 10).filter(line => 
      line.length > 10 && 
      line.length < 200 &&
      !line.toLowerCase().includes('abstract') &&
      !line.toLowerCase().includes('author') &&
      !line.toLowerCase().includes('university') &&
      !/^\d/.test(line) // Not starting with numbers
    )
    title = titleCandidates[0] || 'Untitled Document'
  }
  
  // Extract authors - PDF metadata first, then text analysis
  let authors = pdfMetadata?.Author || pdfInfo?.Author || ''
  
  if (!authors) {
    const authorPatterns = [
      /authors?:\s*(.+)/i,
      /by\s+(.+?)(?:\n|$)/i,
      /(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+[A-Za-z\s,.-]+/g
    ]
    
    for (const pattern of authorPatterns) {
      const match = text.match(pattern)
      if (match) {
        authors = match[1] || match[0]
        break
      }
    }
    
    if (!authors) {
      // Look for lines with typical academic author patterns
      const authorLine = lines.find((line, index) => {
        if (index === 0 || index > 15) return false // Skip title and look in first pages only
        return (
          line.includes(',') && 
          line.split(',').length >= 2 && 
          line.split(',').length <= 6 &&
          /^[A-Za-z\s,.-]+$/.test(line) &&
          (line.includes('Dr.') || line.includes('Prof.') || line.includes('University') || 
           line.split(' ').some(word => word.length > 2 && word[0] === word[0].toUpperCase()))
        )
      })
      authors = authorLine || 'Authors not specified'
    }
  }
  
  // Extract abstract - look for abstract section
  let abstract = ''
  const abstractIndex = lines.findIndex(line => 
    line.toLowerCase().includes('abstract') && line.toLowerCase().indexOf('abstract') < 10
  )
  
  if (abstractIndex !== -1) {
    // Get text after abstract marker
    const abstractStartLine = abstractIndex + 1
    const abstractLines = []
    
    for (let i = abstractStartLine; i < Math.min(abstractStartLine + 20, lines.length); i++) {
      const line = lines[i]
      if (line.toLowerCase().includes('keyword') || 
          line.toLowerCase().includes('introduction') ||
          line.toLowerCase().includes('1.') ||
          line.length < 20) {
        break
      }
      abstractLines.push(line)
    }
    
    abstract = abstractLines.join(' ').substring(0, 1000)
  }
  
  // Extract keywords/tags
  let keywords: string[] = []
  const keywordPatterns = [
    /keywords?:\s*(.+)/i,
    /tags?:\s*(.+)/i,
    /subject:\s*(.+)/i
  ]
  
  for (const pattern of keywordPatterns) {
    const match = text.match(pattern)
    if (match) {
      keywords = match[1].split(/[,;]/).map(k => k.trim()).filter(k => k.length > 0)
      break
    }
  }
  
  // Extract publication year
  let year = ''
  const yearMatches = text.match(/\b(20\d{2})\b/g)
  if (yearMatches) {
    // Get the most recent reasonable year
    const years = yearMatches.map(y => parseInt(y)).filter(y => y >= 1990 && y <= new Date().getFullYear() + 1)
    year = years.length > 0 ? Math.max(...years).toString() : ''
  }
  
  // Extract journal/conference
  let journal = pdfMetadata?.Subject || ''
  if (!journal) {
    const pubPatterns = [
      /published in[:\s]*(.+?)(?:\n|$)/i,
      /journal[:\s]*(.+?)(?:\n|$)/i,
      /conference[:\s]*(.+?)(?:\n|$)/i,
      /proceedings of[:\s]*(.+?)(?:\n|$)/i
    ]
    
    for (const pattern of pubPatterns) {
      const match = text.match(pattern)
      if (match) {
        journal = match[1].trim()
        break
      }
    }
  }
  
  return {
    title: title.substring(0, 200),
    authors: authors.substring(0, 500),
    abstract: abstract,
    keywords: keywords.slice(0, 10),
    year: year,
    journal: journal.substring(0, 200),
    creationDate: pdfInfo?.CreationDate || pdfMetadata?.CreationDate || '',
    modificationDate: pdfInfo?.ModDate || pdfMetadata?.ModDate || '',
    producer: pdfInfo?.Producer || pdfMetadata?.Producer || '',
    creator: pdfInfo?.Creator || pdfMetadata?.Creator || ''
  }
}

// Generate AI summary using extracted content
async function generateAISummary(
  extractedText: string, 
  metadata: any,
  pages?: string[]
): Promise<any> {
  if (!openai) {
    throw new Error('OpenAI client not initialized')
  }
  
  try {
    // Prepare content for AI analysis - focus on key sections
    const contentForAnalysis = extractedText.substring(0, 4000) // First 4000 chars
    const abstractSection = metadata.abstract || 'No abstract available'
    
    const systemPrompt = `You are an expert research assistant. Analyze the provided academic paper content and generate a comprehensive summary. Focus on extracting key information from the title, abstract, and main content. Return a JSON object with the following structure:

{
  "executiveSummary": "2-3 sentence overview of the paper",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "methodology": "Brief description of methods used",
  "significance": "Why this research is important",
  "applications": ["practical application 1", "application 2"],
  "limitations": "Key limitations or future work needed",
  "technicalComplexity": "low|medium|high",
  "researchField": "primary research domain",
  "suggestedFollowUp": ["related topic 1", "related topic 2"]
}`

    const userPrompt = `
Paper Title: ${metadata.title}
Authors: ${metadata.authors}
Abstract: ${abstractSection}
Keywords: ${metadata.keywords?.join(', ') || 'None specified'}
Publication Year: ${metadata.year || 'Not specified'}
Journal/Conference: ${metadata.journal || 'Not specified'}

Content Sample:
${contentForAnalysis}

Please analyze this paper and provide the structured summary as requested.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    
    try {
      return JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      // Return a structured fallback
      return {
        executiveSummary: `Analysis of "${metadata.title}" by ${metadata.authors}`,
        keyFindings: ['AI analysis unavailable - parsing error'],
        methodology: 'Unable to extract methodology',
        significance: 'Research significance could not be determined',
        applications: ['Applications analysis unavailable'],
        limitations: 'Limitations analysis unavailable',
        technicalComplexity: 'medium',
        researchField: metadata.keywords?.[0] || 'General Research',
        suggestedFollowUp: ['Follow-up analysis recommended']
      }
    }
    
  } catch (error) {
    console.error('AI summary generation error:', error)
    // Return fallback summary
    return {
      executiveSummary: `Research paper: ${metadata.title}`,
      keyFindings: ['AI summary generation failed'],
      methodology: 'Methodology extraction failed',
      significance: 'Unable to determine significance',
      applications: ['Applications analysis failed'],
      limitations: 'Could not analyze limitations',
      technicalComplexity: 'unknown',
      researchField: 'Unknown',
      suggestedFollowUp: ['Manual review recommended'],
      error: 'AI analysis failed'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const includeAISummary = formData.get('includeAISummary') === 'true'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }
    
    console.log(`[PDF Extract] Processing file: ${file.name}, Size: ${file.size} bytes`)
    
    // Extract text and metadata from PDF
    const extractionResult = await extractTextFromPDF(file)
    console.log(`[PDF Extract] Extracted ${extractionResult.text.length} characters using ${extractionResult.extractionMethod}`)
    
    // Parse enhanced metadata
    const metadata = extractEnhancedMetadata(
      extractionResult.text, 
      extractionResult.metadata, 
      extractionResult.info
    )
    
    let aiSummary = null
    if (includeAISummary && openai) {
      console.log('[PDF Extract] Generating AI summary...')
      aiSummary = await generateAISummary(
        extractionResult.text, 
        metadata, 
        extractionResult.pages
      )
    } else if (includeAISummary && !openai) {
      // Provide a demo summary when no API key is available
      aiSummary = {
        executiveSummary: `Analysis of "${metadata.title}" - This appears to be a research paper that would benefit from AI-powered analysis.`,
        keyFindings: ['Advanced PDF text extraction completed', 'Document metadata successfully parsed', 'Ready for mathematical analysis'],
        methodology: 'PDF processing using enhanced text extraction methods',
        significance: 'Research document ready for detailed mathematical exploration',
        applications: ['Mathematical equation analysis', 'Research content exploration'],
        limitations: 'Full AI analysis requires OpenAI API key configuration',
        technicalComplexity: 'medium',
        researchField: metadata.keywords?.[0] || 'Research',
        suggestedFollowUp: ['Configure OpenAI API key for full analysis', 'Extract specific equations for detailed explanation']
      }
    }
    
    const response = {
      success: true,
      extraction: {
        method: extractionResult.extractionMethod,
        textLength: extractionResult.text.length,
        numPages: extractionResult.numpages,
        hasText: extractionResult.text.length > 100
      },
      metadata: metadata,
      aiSummary: aiSummary,
      textPreview: extractionResult.text.substring(0, 800) + '...',
      pdfMetadata: extractionResult.metadata,
      pdfInfo: extractionResult.info,
      timestamp: new Date().toISOString()
    }
    
    console.log('[PDF Extract] Processing completed successfully')
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[PDF Extract] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process PDF', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
