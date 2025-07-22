import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { join } from 'path'
import { readFile } from 'fs/promises'
import pdfParse from 'pdf-parse'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const sectionKeys = [
  'title',
  'authors',
  'year',
  'journal',
  'abstract',
  'keyFindings',
  'methods',
  'figures',
  'limitations',
  'applications',
]

export async function POST(request: NextRequest) {
  try {
    const { documentId, documentTitle, documentAuthors, documentYear, documentJournal, documentAbstract } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Find the PDF file for this document
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    const fs = require('fs')
    let pdfFilename = null
    try {
      const files = fs.readdirSync(uploadsDir)
      pdfFilename = files.find((file: string) => file.startsWith(documentId + '-'))
    } catch (err) {
      console.error('[AI SUMMARY] Could not read uploads directory:', err)
      return NextResponse.json({ error: 'Could not read uploads directory', details: String(err) }, { status: 500 })
    }
    if (!pdfFilename) {
      console.error('[AI SUMMARY] PDF file not found for documentId:', documentId)
      return NextResponse.json({ error: 'PDF file not found for this document', documentId }, { status: 404 })
    }
    const pdfPath = join(uploadsDir, pdfFilename)
    let documentContent = ''
    try {
      const buffer = await readFile(pdfPath)
      const data = await pdfParse(buffer)
      documentContent = data.text || ''
    } catch (err) {
      console.error('[AI SUMMARY] Failed to extract text from PDF:', err)
      return NextResponse.json({ error: 'Failed to extract text from PDF', details: String(err) }, { status: 500 })
    }
    if (!documentContent) {
      console.error('[AI SUMMARY] No text extracted from PDF:', pdfPath)
      return NextResponse.json({ error: 'No text extracted from PDF', pdfPath }, { status: 400 })
    }

    // Use function calling if available, otherwise parse markdown
    const systemPrompt = `You are an expert research assistant. Given the following academic paper content and metadata, generate a structured summary as a JSON object with these keys: title, authors, year, journal, abstract, keyFindings, methods, figures, limitations, applications. Each value should be a string. If any section is missing, use 'Not specified'.\n\nExample output:\n{\n  "title": "...",\n  "authors": "...",\n  ...\n}`

    const userPrompt = `Paper metadata:\nTitle: ${documentTitle || 'Not specified'}\nAuthors: ${documentAuthors || 'Not specified'}\nYear: ${documentYear || 'Not specified'}\nJournal/Conference: ${documentJournal || 'Not specified'}\nAbstract: ${documentAbstract || 'Not specified'}\n\nPaper content (first 3000 chars):\n${documentContent.slice(0, 3000)}`

    let completion, text
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.4,
      })
      text = completion.choices[0]?.message?.content || ''
    } catch (err) {
      console.error('[AI SUMMARY] OpenAI API error:', err)
      return NextResponse.json({ error: 'OpenAI API error', details: String(err) }, { status: 500 })
    }

    let summaryObj: { [key: string]: string } = {}
    try {
      // Try to parse as JSON
      summaryObj = JSON.parse(text)
    } catch {
      // Fallback: try to extract sections from markdown
      sectionKeys.forEach(key => {
        const regex = new RegExp(`${key.replace(/([A-Z])/g, ' $1')}:?\\s*([\\s\\S]*?)(?=\\n\\w+:|$)`, 'i')
        const match = text.match(regex)
        summaryObj[key] = match ? match[1].trim() : 'Not specified'
      })
    }

    return NextResponse.json({ success: true, summary: summaryObj })
  } catch (error) {
    console.error('[AI SUMMARY] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to generate summary', details: String(error) }, { status: 500 })
  }
} 