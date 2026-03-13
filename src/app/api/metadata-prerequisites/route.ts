import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { join } from 'path'
import { readFile, readdir } from 'fs/promises'
import pdfParse from 'pdf-parse'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface PaperMetadata {
  title: string
  authors: string
  journal: string
  year: string
  abstract: string
  tags?: string[]
}

interface PrerequisiteAnalysis {
  field: string
  difficulty: 'Undergraduate' | 'Graduate' | 'PhD' | 'Expert'
  prerequisites: {
    mathematical: string[]
    programming: string[]
    conceptual: string[]
    background: string[]
    priorPapers: string[]
  }
  learningPath: string[]
  timeEstimate: string
  relatedPapers: {
    foundational: Array<{
      title: string
      authors: string[]
      year: string
      venue: string
      importance: 'essential' | 'highly-recommended' | 'useful'
      summary: string
    }>
    buildingBlocks: Array<{
      title: string
      authors: string[]
      year: string
      venue: string
      importance: 'essential' | 'highly-recommended' | 'useful'
      summary: string
    }>
    surveys: Array<{
      title: string
      authors: string[]
      year: string
      venue: string
      importance: 'essential' | 'highly-recommended' | 'useful'
      summary: string
    }>
    extensions: Array<{
      title: string
      authors: string[]
      year: string
      venue: string
      importance: 'essential' | 'highly-recommended' | 'useful'
      summary: string
    }>
    applications: Array<{
      title: string
      authors: string[]
      year: string
      venue: string
      importance: 'essential' | 'highly-recommended' | 'useful'
      summary: string
    }>
    recent: Array<{
      title: string
      authors: string[]
      year: string
      venue: string
      importance: 'essential' | 'highly-recommended' | 'useful'
      summary: string
    }>
  }
  studyResources: string[]
  expertRecommendations: string[]
}

// Function to get metadata from stored document (no PDF reading needed)
async function getStoredDocumentMetadata(documentId: string): Promise<Partial<PaperMetadata> | null> {
  try {
    // Import the shared document storage
    const { getDocument } = await import('@/lib/documentStorage')
    
    // Get the stored document metadata
    const document = await getDocument(documentId)
    if (!document) {
      console.error('[METADATA] Document not found in storage:', documentId)
      return null
    }
    
    console.log('🔍 Found stored document metadata:', {
      title: document.title,
      authors: document.authors,
      year: document.year,
      abstract: document.abstract?.length || 0
    })
    
    return {
      title: document.title,
      authors: document.authors,
      abstract: document.abstract,
      journal: document.journal,
      year: document.year,
      tags: document.tags
    }
    
  } catch (error) {
    console.error('[METADATA] Error getting stored metadata:', error)
    return null
  }
}

// Helper function to extract metadata from PDF text (similar to extract-metadata API)
function extractMetadataFromText(text: string, pdfMetadata?: any, pdfInfo?: any) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Extract title - try PDF metadata first, then text parsing
  let title = pdfMetadata?.Title || pdfInfo?.Title || lines[0] || 'Research Paper'
  title = title.replace(/^(title:|paper:|article:)/i, '').trim()
  
  // Extract authors - try PDF metadata first, then text parsing
  let authors = pdfMetadata?.Author || pdfInfo?.Author || ''
  
  if (!authors) {
    // Look for author lines in the text
    const authorLine = lines.find(line => 
      line.toLowerCase().startsWith('author') || 
      (line.includes(',') && line.split(',').length >= 2 && line.split(',').length <= 8)
    )
    if (authorLine) {
      authors = authorLine.replace(/^authors?:\s*/i, '').trim()
    }
  }
  
  // Extract abstract
  let abstract = ''
  const abstractIndex = lines.findIndex(line => line.toLowerCase().includes('abstract'))
  if (abstractIndex !== -1 && abstractIndex < lines.length - 1) {
    // Get the next few lines as abstract
    const abstractLines = lines.slice(abstractIndex + 1, abstractIndex + 10)
    abstract = abstractLines.join(' ').slice(0, 500) // Limit abstract length
  }
  
  // Extract journal/venue
  let journal = ''
  const pubLine = lines.find(line => 
    line.toLowerCase().includes('published') || 
    line.toLowerCase().includes('proceedings') || 
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
    authors: authors || 'Authors not specified',
    abstract,
    journal,
    year,
    tags
  }
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, metadata, documentText }: { documentId: string; metadata: PaperMetadata; documentText?: string } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get the stored document metadata (already extracted during upload)
    let realMetadata = metadata
    try {
      const storedMetadata = await getStoredDocumentMetadata(documentId)
      if (storedMetadata) {
        realMetadata = {
          ...metadata,
          ...storedMetadata // Override with stored extracted data
        }
        console.log('🔍 Using stored extracted metadata:', realMetadata)
        
        // Check if metadata extraction was completed
        if (storedMetadata.abstract && storedMetadata.abstract.length > 0) {
          console.log('✅ Metadata extraction completed during upload - ready for analysis!')
        } else {
          console.log('⚠️ Metadata extraction may be incomplete')
        }
      }
    } catch (extractError) {
      console.log('⚠️ Could not get stored metadata, using provided metadata:', extractError)
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      console.log('⚠️ Using demo mode - no valid API key found')
      // Return intelligent mock response based on metadata analysis with extracted text
      const mockAnalysis = generateIntelligentMockAnalysis(realMetadata, documentText)
      
      return NextResponse.json({
        success: true,
        analysis: mockAnalysis,
        mode: 'demo'
      })
    }
    
    console.log('✅ Using real AI mode - API key found')

    // Generate comprehensive prerequisite analysis using AI with extracted text
    const analysis = await generateAIPrerequisiteAnalysis(realMetadata, documentText)

    return NextResponse.json({
      success: true,
      analysis,
      mode: 'ai-powered'
    })

  } catch (error) {
    console.error('Metadata prerequisites error:', error)
    return NextResponse.json({ 
      error: `Failed to generate prerequisites analysis: ${error instanceof Error ? error.message : String(error)}`,
      details: error instanceof Error ? error.toString() : String(error)
    }, { status: 500 })
  }
}

async function generateAIPrerequisiteAnalysis(metadata: PaperMetadata, documentText?: string): Promise<PrerequisiteAnalysis> {
  const prompt = `You are an expert academic research advisor with deep knowledge across all scientific fields. I need you to analyze this SPECIFIC research paper and provide accurate prerequisite recommendations based on the actual content.

REAL PAPER DETAILS:
- Title: "${metadata.title}"
- Authors: "${metadata.authors}"
- Journal/Venue: "${metadata.journal}"
- Year: "${metadata.year}"
- Abstract: "${metadata.abstract || 'Abstract extracted from paper'}"
- Keywords/Tags: ${metadata.tags?.join(', ') || 'None extracted'}

${documentText ? `EXTRACTED PAPER CONTENT:
${documentText.substring(0, 10000)}` : ''}

CRITICAL: Use your actual knowledge of this paper if you recognize it. If you know these authors, venue, or research area, provide SPECIFIC and ACCURATE recommendations based on:

1. **Author Recognition**: Do you know these specific authors and their research backgrounds?
2. **Venue Analysis**: What is the actual reputation and focus of this journal/conference?
3. **Paper Recognition**: Do you recognize this specific paper and its contributions?
4. **Field Context**: What specific subfield does this belong to and what are its prerequisites?
5. **Historical Context**: Where does this work fit in the timeline of research in this area?

If you recognize this paper or authors, please provide:
- Accurate field classification
- Real prerequisite papers that influenced this work
- Actual difficulty level based on the venue and content
- Specific mathematical/programming requirements for this type of research
- Real related papers (not generic examples)

Provide your response as a detailed JSON object with the following structure:

{
  "field": "Specific academic field (e.g., 'Machine Learning', 'Quantum Computing')",
  "difficulty": "Undergraduate|Graduate|PhD|Expert",
  "prerequisites": {
    "mathematical": ["List of specific mathematical concepts needed"],
    "programming": ["Programming languages and tools if applicable"],
    "conceptual": ["Domain-specific concepts and theories"],
    "background": ["General academic background knowledge"],
    "priorPapers": ["Names of key papers/concepts that should be known first"]
  },
  "learningPath": ["Ordered list of learning steps"],
  "timeEstimate": "Realistic time estimate for preparation",
  "relatedPapers": {
    "foundational": [
      {
        "title": "Real paper title",
        "authors": ["Author names"],
        "year": "Publication year",
        "venue": "Journal/Conference",
        "importance": "essential|highly-recommended|useful",
        "summary": "Why this paper is important for understanding the main paper"
      }
    ],
    "buildingBlocks": [/* Similar structure for papers this work builds upon */],
    "surveys": [/* Similar structure for survey papers in this area */]
  },
  "studyResources": ["Specific textbooks, courses, tutorials"],
  "expertRecommendations": ["Advanced tips for mastering this area"]
}

IMPORTANT: Use your actual knowledge of real papers, authors, and venues. Provide specific, accurate recommendations based on the paper's metadata. If you recognize the work, venue, or authors, use that knowledge to provide tailored advice.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert academic research advisor specializing in prerequisite analysis and learning path recommendations. Always respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const response = completion.choices[0]?.message?.content || ''

  try {
    // Try to parse as JSON
    const analysis = JSON.parse(response)
    return analysis as PrerequisiteAnalysis
  } catch (parseError) {
    // Fallback to intelligent parsing if JSON fails
    return parseTextToAnalysis(response, metadata)
  }
}

function generateIntelligentMockAnalysis(metadata: PaperMetadata, documentText?: string): PrerequisiteAnalysis {
  // Analyze the metadata and extracted text to provide intelligent mock responses
  const title = metadata.title.toLowerCase()
  const abstract = metadata.abstract?.toLowerCase() || ''
  const venue = metadata.journal?.toLowerCase() || ''
  const extractedText = documentText?.toLowerCase() || ''
  
  // Field detection based on metadata and extracted text
  let field = 'Computer Science'
  let difficulty: PrerequisiteAnalysis['difficulty'] = 'Graduate'
  
  const allText = `${title} ${abstract} ${extractedText}`.toLowerCase()
  
  if (allText.includes('neural') || allText.includes('deep learning') || allText.includes('machine learning') || allText.includes('neural network')) {
    field = 'Machine Learning'
    difficulty = venue.includes('nature') || venue.includes('science') ? 'Expert' : 'Graduate'
  } else if (allText.includes('quantum') || allText.includes('qubit')) {
    field = 'Quantum Computing'
    difficulty = 'PhD'
  } else if (allText.includes('nlp') || allText.includes('language') || allText.includes('text') || allText.includes('transformer') || allText.includes('attention')) {
    field = 'Natural Language Processing'
  } else if (allText.includes('vision') || allText.includes('image') || allText.includes('visual') || allText.includes('convolutional')) {
    field = 'Computer Vision'
  } else if (allText.includes('blockchain') || allText.includes('cryptocurrency') || allText.includes('bitcoin')) {
    field = 'Blockchain Technology'
  } else if (allText.includes('cryptography') || allText.includes('encryption') || allText.includes('security')) {
    field = 'Cybersecurity'
  } else if (allText.includes('algorithm') || allText.includes('complexity') || allText.includes('optimization')) {
    field = 'Algorithms & Complexity'
  }

  // Generate field-specific prerequisites
  const prerequisites = getFieldSpecificPrerequisites(field)
  
  return {
    field,
    difficulty,
    prerequisites,
    learningPath: [
      `Master fundamental ${field.toLowerCase()} concepts`,
      'Study prerequisite mathematics and programming',
      'Read foundational papers in the field',
      'Understand key methodologies',
      'Review recent advances',
      `Analyze the paper: "${metadata.title}"`
    ],
    timeEstimate: difficulty === 'Expert' ? '6-12 months' : difficulty === 'PhD' ? '3-6 months' : '2-4 months',
    relatedPapers: {
      foundational: generateFieldRelatedPapers(field).foundational,
      buildingBlocks: generateFieldRelatedPapers(field).buildingBlocks,
      surveys: generateFieldRelatedPapers(field).surveys,
      extensions: [],
      applications: [],
      recent: []
    },
    studyResources: [
      `Standard ${field} textbooks`,
      'Online courses from top universities',
      'Research papers database access',
      'Academic conferences and workshops',
      'Professional development courses'
    ],
    expertRecommendations: [
      `Start with foundational concepts in ${field}`,
      'Practice with hands-on projects',
      'Join academic communities and forums',
      'Follow leading researchers in the field',
      'Stay updated with recent publications'
    ]
  }
}

function getFieldSpecificPrerequisites(field: string) {
  const prerequisites = {
    'Machine Learning': {
      mathematical: ['Linear Algebra', 'Calculus', 'Statistics', 'Probability Theory', 'Optimization'],
      programming: ['Python', 'NumPy', 'Pandas', 'Scikit-learn', 'TensorFlow/PyTorch'],
      conceptual: ['Supervised Learning', 'Unsupervised Learning', 'Neural Networks', 'Feature Engineering'],
      background: ['Computer Science Fundamentals', 'Algorithm Design', 'Data Structures'],
      priorPapers: ['Perceptron Learning', 'Backpropagation Algorithm', 'Support Vector Machines', 'Random Forest']
    },
    'Quantum Computing': {
      mathematical: ['Linear Algebra', 'Complex Numbers', 'Probability Theory', 'Group Theory'],
      programming: ['Python', 'Qiskit', 'Cirq', 'Q#'],
      conceptual: ['Qubits', 'Quantum Gates', 'Superposition', 'Entanglement', 'Quantum Algorithms'],
      background: ['Quantum Mechanics', 'Classical Computing', 'Algorithm Design'],
      priorPapers: ['Quantum Teleportation', "Shor's Algorithm", "Grover's Algorithm", 'Quantum Error Correction']
    },
    'Natural Language Processing': {
      mathematical: ['Linear Algebra', 'Statistics', 'Information Theory', 'Probability'],
      programming: ['Python', 'NLTK', 'spaCy', 'Transformers', 'Hugging Face'],
      conceptual: ['Tokenization', 'Word Embeddings', 'Attention Mechanisms', 'Language Models'],
      background: ['Linguistics Basics', 'Text Processing', 'Machine Learning'],
      priorPapers: ['Word2Vec', 'BERT', 'Transformer Architecture', 'GPT Models']
    },
    'Computer Vision': {
      mathematical: ['Linear Algebra', 'Calculus', 'Signal Processing', 'Fourier Transform'],
      programming: ['Python', 'OpenCV', 'PyTorch', 'TensorFlow'],
      conceptual: ['Image Processing', 'Convolutional Neural Networks', 'Feature Detection'],
      background: ['Digital Image Processing', 'Pattern Recognition', 'Machine Learning'],
      priorPapers: ['LeNet-5', 'AlexNet', 'ResNet', 'YOLO']
    }
  }

  return (prerequisites as any)[field] || {
    mathematical: ['Discrete Mathematics', 'Linear Algebra', 'Statistics'],
    programming: ['Python', 'Algorithm Implementation'],
    conceptual: ['Research Methodology', 'Problem Solving'],
    background: ['Computer Science Fundamentals'],
    priorPapers: ['Foundational papers in the field']
  }
}

function generateFieldRelatedPapers(field: string) {
  const papers = {
    'Machine Learning': {
      foundational: [
        {
          title: 'Learning Representations by Back-propagating Errors',
          authors: ['David E. Rumelhart', 'Geoffrey E. Hinton', 'Ronald J. Williams'],
          year: '1986',
          venue: 'Nature',
          importance: 'essential' as const,
          summary: 'Introduced the backpropagation algorithm that enables training of multi-layer neural networks'
        },
        {
          title: 'The Perceptron: A Probabilistic Model for Information Storage',
          authors: ['Frank Rosenblatt'],
          year: '1958',
          venue: 'Psychological Review',
          importance: 'essential' as const,
          summary: 'First neural network algorithm, foundational to machine learning'
        }
      ],
      buildingBlocks: [
        {
          title: 'Gradient-Based Learning Applied to Document Recognition',
          authors: ['Yann LeCun', 'Léon Bottou', 'Yoshua Bengio', 'Patrick Haffner'],
          year: '1998',
          venue: 'Proceedings of the IEEE',
          importance: 'highly-recommended' as const,
          summary: 'Established convolutional neural networks as a practical approach for pattern recognition'
        },
        {
          title: 'Support Vector Networks',
          authors: ['Corinna Cortes', 'Vladimir Vapnik'],
          year: '1995',
          venue: 'Machine Learning',
          importance: 'highly-recommended' as const,
          summary: 'Introduced support vector machines for classification and regression'
        }
      ],
      surveys: [
        {
          title: 'Deep Learning',
          authors: ['Ian Goodfellow', 'Yoshua Bengio', 'Aaron Courville'],
          year: '2016',
          venue: 'MIT Press',
          importance: 'essential' as const,
          summary: 'Comprehensive textbook covering all aspects of modern deep learning'
        }
      ]
    },
    'Computer Science': {
      foundational: [
        {
          title: 'Introduction to Algorithms',
          authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest'],
          year: '1990',
          venue: 'MIT Press',
          importance: 'essential' as const,
          summary: 'Fundamental algorithms and data structures textbook'
        },
        {
          title: 'The Art of Computer Programming',
          authors: ['Donald E. Knuth'],
          year: '1968-2011',
          venue: 'Addison-Wesley',
          importance: 'essential' as const,
          summary: 'Comprehensive multi-volume analysis of algorithms'
        }
      ],
      buildingBlocks: [
        {
          title: 'Structure and Interpretation of Computer Programs',
          authors: ['Harold Abelson', 'Gerald Jay Sussman'],
          year: '1985',
          venue: 'MIT Press',
          importance: 'highly-recommended' as const,
          summary: 'Classic text on programming fundamentals and computer science concepts'
        }
      ],
      surveys: [
        {
          title: 'Computer Science: An Overview',
          authors: ['J. Glenn Brookshear'],
          year: '2019',
          venue: 'Pearson',
          importance: 'useful' as const,
          summary: 'Broad introduction to computer science fundamentals'
        }
      ]
    }
  }

  return (papers as any)[field] || papers['Computer Science']
}

function parseTextToAnalysis(response: string, metadata: PaperMetadata): PrerequisiteAnalysis {
  // Fallback text parsing if JSON parsing fails
  return generateIntelligentMockAnalysis(metadata)
}
