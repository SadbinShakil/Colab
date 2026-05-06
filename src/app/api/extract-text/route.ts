import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getAllDocuments, storeDocument } from '@/lib/documentStorage'

// POST /api/extract-text { documentId? }
// If documentId is given, re-extracts just that doc.
// If omitted, re-extracts ALL docs missing fullText.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { documentId } = body

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse')

    const allDocs = await getAllDocuments()
    const targets = documentId
      ? allDocs.filter(d => d.id === documentId)
      : allDocs.filter(d => !d.fullText || d.fullText.length === 0)

    if (targets.length === 0) {
      return NextResponse.json({ message: 'No documents need extraction', updated: 0 })
    }

    const results: { id: string; title: string; status: string; chars?: number; error?: string }[] = []

    for (const doc of targets) {
      const pdfPath = join(process.cwd(), 'public', doc.url.replace(/^\//, ''))

      if (!existsSync(pdfPath)) {
        results.push({ id: doc.id, title: doc.title, status: 'skipped', error: 'PDF file not found on disk' })
        continue
      }

      try {
        const pdfBuffer = await readFile(pdfPath)
        const pdfData = await pdfParse(pdfBuffer, { version: 'default' })
        const extractedText = pdfData.text

        // Extract abstract
        let extractedAbstract = doc.abstract || ''
        if (!extractedAbstract || extractedAbstract === 'Abstract not found in document') {
          const abstractPatterns = [
            /abstract\s*:?\s*([\s\S]{50,1500}?)(?:\n\s*\n|\n\s*introduction|\n\s*1\.|\n\s*keywords)/i,
            /abstract\s*:?\s*([\s\S]{200,1500})/i,
            /(?:this\s+paper|this\s+study|we\s+present|we\s+propose)([\s\S]{100,800})/i,
          ]
          for (const pattern of abstractPatterns) {
            const match = extractedText.match(pattern)
            if (match?.[1]) {
              extractedAbstract = match[1].trim().replace(/\s+/g, ' ').substring(0, 1000)
              break
            }
          }
        }

        const updated = {
          ...doc,
          fullText: extractedText,
          abstract: extractedAbstract || doc.abstract,
          summary: {
            ...doc.summary,
            fullText: extractedText,
            abstract: extractedAbstract || doc.abstract,
            extractedAt: new Date().toISOString(),
          },
          enhancedMetadata: {
            status: 'completed' as const,
            textLength: extractedText.length,
            extractedTitle: doc.title,
            extractedAuthors: doc.authors,
            extractedYear: doc.year,
            extractedAbstract: extractedAbstract || doc.abstract,
          },
        }

        await storeDocument(doc.id, updated)
        results.push({ id: doc.id, title: doc.title, status: 'ok', chars: extractedText.length })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        results.push({ id: doc.id, title: doc.title, status: 'error', error: msg })
      }
    }

    const succeeded = results.filter(r => r.status === 'ok').length
    return NextResponse.json({ updated: succeeded, total: targets.length, results })
  } catch (error) {
    console.error('[extract-text]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
