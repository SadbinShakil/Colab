import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Import the document storage function
// In-memory storage for demo purposes
const documents: { [key: string]: any } = {}

function storeDocument(id: string, documentData: any) {
  documents[id] = documentData
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large (max 50MB)' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filepath = join(uploadsDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Get metadata from form
    const metadata = {
      id: timestamp.toString(),
      filename: filename,
      originalName: file.name,
      size: file.size,
      title: formData.get('title') as string || file.name,
      authors: formData.get('authors') as string || '',
      journal: formData.get('journal') as string || '',
      year: formData.get('year') as string || '',
      abstract: formData.get('abstract') as string || '',
      tags: JSON.parse(formData.get('tags') as string || '[]'),
      visibility: formData.get('visibility') as string || 'private',
      collaborators: JSON.parse(formData.get('collaborators') as string || '[]'),
      uploadDate: new Date().toISOString(),
      url: `/uploads/${filename}`
    }

    // Store document metadata for retrieval
    storeDocument(metadata.id, metadata)

    // In a real app, you'd save this to a database
    // For now, we'll just return the metadata
    
    return NextResponse.json({
      success: true,
      document: metadata
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 

// Also export the function to get documents by ID
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      )
    }
    
    console.log('Looking for document with ID:', id)
    const document = documents[id]
    
    if (!document) {
      console.log('Document not found in memory, available documents:', Object.keys(documents))
      
      // Try to construct a fallback document based on existing files
      // Look for files in uploads directory that start with this ID
      const fs = require('fs')
      const path = require('path')
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      
      try {
        const files = fs.readdirSync(uploadsDir)
        const matchingFile = files.find((file: string) => file.startsWith(id + '-'))
        
        if (matchingFile) {
          console.log('Found matching file:', matchingFile)
          const fallbackDocument = {
            id: id,
            filename: matchingFile,
            originalName: matchingFile.replace(/^\d+-/, ''), // Remove timestamp prefix
            size: 0,
            title: matchingFile.replace(/^\d+-/, '').replace(/\.[^.]+$/, ''), // Remove timestamp and extension
            authors: 'Unknown Authors',
            journal: 'Unknown Journal',
            year: '2024',
            abstract: '',
            tags: [],
            visibility: 'private',
            collaborators: [],
            uploadDate: new Date().toISOString(),
            url: `/uploads/${matchingFile}`
          }
          
          console.log('Returning fallback document:', fallbackDocument)
          return NextResponse.json({
            success: true,
            document: fallbackDocument
          })
        }
      } catch (fsError) {
        console.error('Error reading uploads directory:', fsError)
      }
      
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }
    
    console.log('Returning stored document:', document)
    return NextResponse.json({
      success: true,
      document
    })
    
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}