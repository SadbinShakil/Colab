import { NextRequest, NextResponse } from 'next/server'

// Simple PDF text extraction function (in a real app, you'd use a proper PDF parsing library)
async function extractTextFromPDF(file: File): Promise<string> {
  // For this demo, we'll simulate PDF text extraction
  // In a real application, you would use libraries like:
  // - pdf-parse
  // - pdf2pic
  // - Mozilla's PDF.js
  
  const fileName = file.name.toLowerCase()
  
  // Simulate different paper types based on filename
  if (fileName.includes('machine') || fileName.includes('learning') || fileName.includes('ai')) {
    return `
      A Novel Approach to Machine Learning in Distributed Systems
      Authors: John Smith, Sarah Johnson, Michael Chen, Dr. Emily Rodriguez
      Abstract: This paper presents a comprehensive study of machine learning applications in distributed computing environments. We propose a novel framework that significantly improves performance and scalability in large-scale data processing tasks. Our experimental results demonstrate a 40% improvement in processing speed and 60% reduction in resource consumption compared to existing approaches.
      Published in: IEEE Conference on Machine Learning and Applications (ICMLA) 2024
      Keywords: machine learning, distributed systems, scalability, performance optimization
      DOI: 10.1109/ICMLA.2024.00042
    `
  } else if (fileName.includes('neural') || fileName.includes('network')) {
    return `
      Deep Neural Networks for Medical Image Analysis: A Comprehensive Review
      Authors: Dr. Lisa Wong, Ahmed Hassan, Prof. Maria Gonzalez
      Abstract: Medical image analysis has been revolutionized by deep learning techniques. This comprehensive review examines the latest advances in neural network architectures specifically designed for medical imaging applications. We analyze performance metrics across different medical imaging modalities and provide insights into future research directions.
      Published in: Nature Medical Imaging 2024
      Keywords: neural networks, medical imaging, deep learning, healthcare AI
      DOI: 10.1038/s41591-024-02847-2
    `
  } else if (fileName.includes('quantum') || fileName.includes('computing')) {
    return `
      Quantum Computing Applications in Cryptography and Security
      Authors: Prof. Robert Kim, Dr. Anna Petrov, James Wilson
      Abstract: As quantum computing technology advances, its implications for cryptography and cybersecurity become increasingly significant. This paper explores the current state of quantum-resistant encryption methods and analyzes potential vulnerabilities in existing security protocols. We present new quantum algorithms for enhanced security applications.
      Published in: ACM Transactions on Quantum Computing 2024
      Keywords: quantum computing, cryptography, security, quantum algorithms
      DOI: 10.1145/3625468.3625472
    `
  } else {
    // Default academic paper simulation
    return `
      ${(file.name || 'document.pdf').replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' ')}
      Authors: Dr. Academic Researcher, Prof. University Scholar, Research Assistant
      Abstract: This research paper presents findings from our comprehensive study in the field. The methodology employed demonstrates significant improvements over existing approaches. Our results contribute valuable insights to the academic community and suggest promising directions for future research.
      Published in: International Journal of Research 2024
      Keywords: research, methodology, analysis, academic study
      DOI: 10.1000/example.2024.001
    `
  }
}

function extractMetadataFromText(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Extract title (usually the first line or after a title indicator)
  let title = lines[0] || 'Untitled Research Paper'
  
  // Clean up title - remove common prefixes and keep only the actual title
  title = title.replace(/^(title:|paper:|article:)/i, '').trim()
  
  // Extract authors - look for lines that specifically mention authors or have typical author patterns
  let authors = ''
  
  // Look for explicit author lines first
  let authorLine = lines.find(line => 
    line.toLowerCase().startsWith('author') && line.includes(':')
  )
  
  if (authorLine) {
    authors = authorLine.replace(/^authors?:\s*/i, '').trim()
  } else {
    // Look for lines with typical author patterns (Dr., Prof., comma-separated names)
    // but exclude the title line and other metadata lines
    authorLine = lines.find((line, index) => {
      if (index === 0) return false // Skip title line
      if (line.toLowerCase().includes('abstract')) return false
      if (line.toLowerCase().includes('published')) return false
      if (line.toLowerCase().includes('journal')) return false
      if (line.toLowerCase().includes('conference')) return false
      if (line.toLowerCase().includes('doi')) return false
      if (line.toLowerCase().includes('keywords')) return false
      
      // Check for author patterns
      return (
        (line.includes('Dr.') || line.includes('Prof.')) ||
        (line.includes(',') && line.split(',').length >= 2 && line.split(',').length <= 8) ||
        (line.split(' ').length >= 2 && line.split(' ').length <= 10 && 
         /^[A-Za-z\s,.-]+$/.test(line) && 
         !line.toLowerCase().includes('university') &&
         !line.toLowerCase().includes('department'))
      )
    })
    
    if (authorLine) {
      authors = authorLine.trim()
    }
  }
  
  // If no authors found, provide a default but don't use the title
  if (!authors) {
    authors = 'Authors not specified'
  }
  
  // Extract abstract
  let abstract = ''
  const abstractStart = lines.findIndex(line => 
    line.toLowerCase().includes('abstract')
  )
  if (abstractStart !== -1 && abstractStart + 1 < lines.length) {
    abstract = lines[abstractStart + 1] || lines.find(line => 
      line.length > 100 && 
      !line.toLowerCase().includes('author') && 
      !line.toLowerCase().includes('published') &&
      line !== title
    ) || ''
    abstract = abstract.replace(/^abstract:\s*/i, '').trim()
  }
  
  // Extract publication info
  let journal = ''
  const pubLine = lines.find(line => 
    line.toLowerCase().includes('published') || 
    line.toLowerCase().includes('journal') ||
    line.toLowerCase().includes('conference')
  )
  if (pubLine) {
    journal = pubLine.replace(/^published in:\s*/i, '').trim()
  }
  
  // Extract year
  let year = ''
  const yearMatch = text.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    year = yearMatch[1]
  }
  
  // Extract keywords/tags
  let tags: string[] = []
  const keywordsLine = lines.find(line => 
    line.toLowerCase().includes('keyword') || 
    line.toLowerCase().includes('tag')
  )
  if (keywordsLine) {
    const keywordText = keywordsLine.replace(/^keywords?:\s*/i, '').trim()
    tags = keywordText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
  }
  
  return {
    title,
    authors,
    abstract,
    journal,
    year,
    tags
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      )
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { message: 'Only PDF files are supported' },
        { status: 400 }
      )
    }
    
    // Extract text from PDF
    const extractedText = await extractTextFromPDF(file)
    
    // Parse metadata from extracted text
    const metadata = extractMetadataFromText(extractedText)
    
    return NextResponse.json({
      success: true,
      metadata: metadata,
      extractedText: extractedText.substring(0, 500) + '...' // Return preview
    })
    
  } catch (error) {
    console.error('Metadata extraction error:', error)
    return NextResponse.json(
      { message: 'Failed to extract metadata' },
      { status: 500 }
    )
  }
} 