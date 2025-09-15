// Shared document storage for the application
export interface DocumentMetadata {
  id: string
  filename: string
  originalName: string
  size: number
  title: string
  authors: string
  journal: string
  year: string
  abstract: string
  tags: string[]
  visibility: string
  collaborators: string[]
  uploadDate: string
  url: string
  fullText?: string // Full extracted text content
  summary?: {
    fullText?: string
    abstract?: string
    title?: string
    authors?: string
    year?: string
    extractedAt?: string
  }
  enhancedMetadata?: {
    status: 'completed' | 'error' | 'failed'
    extractedTitle?: string
    extractedAuthors?: string
    extractedYear?: string
    extractedAbstract?: string
    textLength?: number
    error?: string
  }
}

const { writeFile, readFile, readdir, mkdir } = require('fs/promises')
const { join } = require('path')
const { existsSync } = require('fs')

// File-based storage directory
const STORAGE_DIR = join(process.cwd(), 'data', 'documents')

// Ensure storage directory exists
async function ensureStorageDir() {
  if (!existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true })
  }
}

// Get file path for a document
function getDocumentPath(id: string): string {
  return join(STORAGE_DIR, `${id}.json`)
}

// Store document to file
export async function storeDocument(id: string, documentData: DocumentMetadata) {
  try {
    await ensureStorageDir()
    const filePath = getDocumentPath(id)
    await writeFile(filePath, JSON.stringify(documentData, null, 2))
    console.log('📁 Document stored to file:', id, documentData.title)
  } catch (error) {
    console.error('❌ Error storing document:', error)
  }
}

// Get document from file
export async function getDocument(id: string): Promise<DocumentMetadata | null> {
  try {
    const filePath = getDocumentPath(id)
    if (!existsSync(filePath)) {
      console.log('📁 Document not found in file:', id)
      return null
    }
    const data = await readFile(filePath, 'utf-8')
    const document = JSON.parse(data) as DocumentMetadata
    console.log('📁 Document retrieved from file:', id, document.title)
    return document
  } catch (error) {
    console.error('❌ Error reading document:', error)
    return null
  }
}

// Get all documents
export async function getAllDocuments(): Promise<DocumentMetadata[]> {
  try {
    await ensureStorageDir()
    const files = await readdir(STORAGE_DIR)
    const jsonFiles = files.filter(file => file.endsWith('.json'))
    
    const documents: DocumentMetadata[] = []
    for (const file of jsonFiles) {
      try {
        const filePath = join(STORAGE_DIR, file)
        const data = await readFile(filePath, 'utf-8')
        const document = JSON.parse(data) as DocumentMetadata
        documents.push(document)
      } catch (error) {
        console.error(`❌ Error reading file ${file}:`, error)
      }
    }
    
    console.log('📁 Retrieved', documents.length, 'documents from storage')
    return documents
  } catch (error) {
    console.error('❌ Error reading documents directory:', error)
    return []
  }
}

export function getDocumentCount(): number {
  return Object.keys(documents).length
}
