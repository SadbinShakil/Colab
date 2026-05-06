import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Import PyMuPDF for better text extraction
let pymupdf: any = null

try {
  pymupdf = require('pymupdf-node')
  console.log('✅ PyMuPDF loaded successfully')
} catch (error) {
  console.warn('⚠️ PyMuPDF not available, falling back to pdf-parse:', error)
}

interface PaperMetadata {
  doi?: string
  title: string
  authors: string[]
  venue: string
  year: string
  abstract: string
  citationCount?: number
  referenceCount?: number
  fieldsOfStudy?: string[]
  openAccessPdf?: string
  crossref?: any
  semanticScholar?: any
  gptSummary?: any
}

// DOI regex pattern
const DOI_REGEX = /\b(10\.\d{4,9}\/[-._;()\/:A-Za-z0-9]+)\b/

// Function to extract text from first few pages
async function extractTextFirstPages(pdfPath: string, maxPages: number = 3): Promise<string> {
  try {
    if (pymupdf) {
      // Use PyMuPDF if available
      const pdfBuffer = await readFile(pdfPath)
      let doc: any = null
      
      // Try different PyMuPDF API patterns
      if (typeof pymupdf.loadPyMuPDF === 'function') {
        doc = await pymupdf.loadPyMuPDF(pdfBuffer)
      } else if (typeof pymupdf.loadPyMuPDF4LLM === 'function') {
        doc = await pymupdf.loadPyMuPDF4LLM(pdfBuffer)
      } else if (typeof pymupdf.open === 'function') {
        doc = await pymupdf.open(pdfBuffer)
      } else if (typeof pymupdf.Document === 'function') {
        doc = new pymupdf.Document(pdfBuffer)
      } else {
        throw new Error('PyMuPDF API not recognized')
      }

      const pageCount = Math.min(maxPages, doc.pageCount || doc.length || 1)
      const textParts: string[] = []

      for (let i = 0; i < pageCount; i++) {
        let page: any = null
        if (typeof doc.loadPage === 'function') {
          page = await doc.loadPage(i)
        } else if (typeof doc.getPage === 'function') {
          page = await doc.getPage(i)
        } else if (doc.pages && doc.pages[i]) {
          page = doc.pages[i]
        }

        if (page) {
          let text = ''
          if (typeof page.getText === 'function') {
            text = await page.getText()
          } else if (typeof page.text === 'string') {
            text = page.text
          } else if (typeof page.extractText === 'function') {
            text = await page.extractText()
          }
          textParts.push(text)
        }
      }

      if (typeof doc.close === 'function') {
        await doc.close()
      }

      return textParts.join('\n\n')
    } else {
      // Fallback to pdf-parse
      const pdfParse = require('pdf-parse')
      const pdfBuffer = await readFile(pdfPath)
      const data = await pdfParse(pdfBuffer)
      const pages = Math.min(maxPages, data.numpages || 1)
      
      // For pdf-parse, we can only get the full text, so we'll limit it
      const fullText = data.text || ''
      const lines = fullText.split('\n')
      const estimatedLinesPerPage = Math.ceil(lines.length / (data.numpages || 1))
      const linesToTake = Math.min(estimatedLinesPerPage * pages, lines.length)
      
      return lines.slice(0, linesToTake).join('\n')
    }
  } catch (error) {
    console.error('Error extracting text:', error)
    return ''
  }
}

// Function to extract candidate title from PDF
async function extractCandidateTitle(pdfPath: string): Promise<string> {
  try {
    if (pymupdf) {
      const pdfBuffer = await readFile(pdfPath)
      let doc: any = null
      
      if (typeof pymupdf.loadPyMuPDF === 'function') {
        doc = await pymupdf.loadPyMuPDF(pdfBuffer)
      } else if (typeof pymupdf.loadPyMuPDF4LLM === 'function') {
        doc = await pymupdf.loadPyMuPDF4LLM(pdfBuffer)
      } else if (typeof pymupdf.open === 'function') {
        doc = await pymupdf.open(pdfBuffer)
      } else if (typeof pymupdf.Document === 'function') {
        doc = new pymupdf.Document(pdfBuffer)
      }

      if (doc) {
        // Try to get metadata first
        if (doc.metadata && doc.metadata.title) {
          const metaTitle = doc.metadata.title.trim()
          if (metaTitle.length > 4) {
            return metaTitle
          }
        }

        // Fallback: analyze first page text blocks
        if (doc.pageCount > 0) {
          let page: any = null
          if (typeof doc.loadPage === 'function') {
            page = await doc.loadPage(0)
          } else if (typeof doc.getPage === 'function') {
            page = await doc.getPage(0)
          } else if (doc.pages && doc.pages[0]) {
            page = doc.pages[0]
          }

          if (page) {
            // Try to get text blocks (if available)
            if (typeof page.getText === 'function') {
              const text = await page.getText()
              const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
              
              // Look for potential title lines
              for (const line of lines) {
                if (line.length >= 5 && line.length <= 180 && 
                    !line.toLowerCase().includes('abstract') && 
                    !line.toLowerCase().includes('introduction') &&
                    !line.toLowerCase().includes('author') &&
                    !line.includes('©') &&
                    !line.includes('all rights reserved')) {
                  return line
                }
              }
            }
          }
        }

        if (typeof doc.close === 'function') {
          await doc.close()
        }
      }
    }

    // Fallback: read first few lines of text
    const text = await extractTextFirstPages(pdfPath, 1)
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    for (const line of lines) {
      if (line.length >= 5 && line.length <= 180 && 
          !line.toLowerCase().includes('abstract') && 
          !line.toLowerCase().includes('introduction') &&
          !line.toLowerCase().includes('author') &&
          !line.includes('©') &&
          !line.includes('all rights reserved')) {
        return line
      }
    }

    return ''
  } catch (error) {
    console.error('Error extracting title:', error)
    return ''
  }
}

// Function to find DOI in text
function findDoiInText(text: string): string | null {
  const match = DOI_REGEX.exec(text)
  return match ? match[1] : null
}

// Function to fetch metadata from Crossref
async function fetchCrossrefMetadata(doi?: string, title?: string): Promise<any> {
  try {
    if (doi) {
      const response = await fetch(`https://api.crossref.org/works/${doi}`, {
        headers: { 'User-Agent': 'CoRead/1.0 (mailto:support@coread.app)' }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.message || {}
      }
    } else if (title) {
      const params = new URLSearchParams({
        'query.title': title,
        'rows': '3',
        'select': 'DOI,title,author,container-title,issued,URL,abstract'
      })
      
      const response = await fetch(`https://api.crossref.org/works?${params}`, {
        headers: { 'User-Agent': 'CoRead/1.0 (mailto:support@coread.app)' }
      })
      
      if (response.ok) {
        const data = await response.json()
        const items = data.message?.items || []
        return items[0] || {}
      }
    }
  } catch (error) {
    console.error('Crossref API error:', error)
  }
  
  return {}
}

// Function to fetch metadata from Semantic Scholar
async function fetchSemanticScholarMetadata(doi?: string, title?: string): Promise<any> {
  try {
    const fields = 'title,abstract,year,venue,authors,citationCount,referenceCount,externalIds,openAccessPdf,fieldsOfStudy'
    
    if (doi) {
      const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=${fields}`)
      
      if (response.ok) {
        return await response.json()
      }
    } else if (title) {
      const params = new URLSearchParams({
        'query': title,
        'limit': '1',
        'fields': fields
      })
      
      const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        const items = data.data || []
        return items[0] || {}
      }
    }
  } catch (error) {
    console.error('Semantic Scholar API error:', error)
  }
  
  return {}
}

// Function to generate GPT summary
async function generateGPTSummary(metadata: any): Promise<any> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { error: 'Missing OPENAI_API_KEY' }
    }

    const prompt = `You are assisting a research reading platform. Using the JSON below, produce:
1) A 4–6 sentence plain-English summary
2) 4–6 bullet key contributions (short phrases)
3) Venue, year, and DOI (if available)
4) Suggested reading level (undergraduate/graduate/expert)
5) Key concepts and terminology

Keep it neutral, specific, and non-fluffy. Focus on academic value and readability.

JSON:
${JSON.stringify(metadata, null, 2).substring(0, 15000)}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert academic research assistant. Provide clear, concise analysis of research papers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      })
    })

    if (response.ok) {
      const data = await response.json()
      return { summary: data.choices[0]?.message?.content || 'No summary generated' }
    } else {
      const errorData = await response.json()
      return { error: `OpenAI API error: ${errorData.error?.message || response.statusText}` }
    }
  } catch (error) {
    console.error('GPT API error:', error)
    return { error: 'Failed to generate GPT summary' }
  }
}

// Function to store extracted metadata
async function storeMetadata(documentId: string, metadata: PaperMetadata): Promise<void> {
  try {
    const storageDir = join(process.cwd(), 'data', 'extracted-metadata')
    if (!existsSync(storageDir)) {
      await mkdir(storageDir, { recursive: true })
    }
    
    const metadataPath = join(storageDir, `${documentId}.json`)
    const metadataData = {
      documentId,
      metadata,
      extractedAt: new Date().toISOString(),
      version: '1.0'
    }
    
    await writeFile(metadataPath, JSON.stringify(metadataData, null, 2))
    console.log('✅ Metadata stored successfully:', metadataPath)
  } catch (error) {
    console.error('❌ Error storing metadata:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 })
    }

    // Create temporary file
    const tempDir = join(process.cwd(), 'tmp')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }
    
    const tempPath = join(tempDir, `${Date.now()}-${file.name}`)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(tempPath, buffer)

    try {
      // Extract text and find DOI
      const firstText = await extractTextFirstPages(tempPath, 3)
      const doi = findDoiInText(firstText)
      
      // Extract candidate title
      const title = await extractCandidateTitle(tempPath)
      
      // Fetch metadata from external APIs
      const crossref = await fetchCrossrefMetadata(doi, title)
      const semanticScholar = await fetchSemanticScholarMetadata(doi, title)
      
      // Normalize metadata
      const normalizedMetadata: PaperMetadata = {
        doi: doi || crossref.DOI || undefined,
        title: title || 
               (crossref.title ? (Array.isArray(crossref.title) ? crossref.title[0] : crossref.title) : '') ||
               semanticScholar.title || 
               'Untitled Document',
        authors: crossref.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) ||
                 semanticScholar.authors?.map((a: any) => a.name) ||
                 [],
        venue: (crossref['container-title'] ? (Array.isArray(crossref['container-title']) ? crossref['container-title'][0] : crossref['container-title']) : '') ||
               semanticScholar.venue ||
               'Unknown Venue',
        year: crossref.issued?.['date-parts']?.[0]?.[0]?.toString() ||
              semanticScholar.year?.toString() ||
              'Unknown Year',
        abstract: crossref.abstract ||
                  semanticScholar.abstract ||
                  '',
        citationCount: semanticScholar.citationCount,
        referenceCount: semanticScholar.referenceCount,
        fieldsOfStudy: semanticScholar.fieldsOfStudy,
        openAccessPdf: semanticScholar.openAccessPdf?.url,
        crossref,
        semanticScholar
      }
      
      // Generate GPT summary
      const gptSummary = await generateGPTSummary(normalizedMetadata)
      if (gptSummary.summary) {
        normalizedMetadata.gptSummary = gptSummary
      }
      
      // Store metadata for future use
      const documentId = Date.now().toString()
      await storeMetadata(documentId, normalizedMetadata)
      
      return NextResponse.json({
        success: true,
        documentId,
        metadata: normalizedMetadata,
        gptSummary: gptSummary.summary || gptSummary.error
      })
      
    } finally {
      // Clean up temporary file
      try {
        const fs = require('fs')
        fs.unlinkSync(tempPath)
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError)
      }
    }
    
  } catch (error) {
    console.error('Paper ingest error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
