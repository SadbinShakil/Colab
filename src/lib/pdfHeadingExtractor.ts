// lib/pdfHeadingExtractor.ts
'use client'

export interface PDFHeading {
  id: string
  text: string
  level: number  // 1 = main heading, 2 = subheading, etc.
  page: number
  boundingBox: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
  fontSize: number
  fontWeight: string
  estimatedWordCount?: number  // For workload balancing
}

export interface PDFSection {
  heading: PDFHeading
  startPage: number
  endPage: number
  content: string  // Optional: actual text content
  subsections: PDFHeading[]
}

export class PDFHeadingExtractor {
  private documentViewer: any
  private annotationManager: any

  constructor(documentViewer: any, annotationManager: any) {
    this.documentViewer = documentViewer
    this.annotationManager = annotationManager
  }

  async extractHeadings(): Promise<PDFHeading[]> {
    const doc = this.documentViewer.getDocument()
    const pageCount = this.documentViewer.getPageCount()
    const allHeadings: PDFHeading[] = []

    console.log('🔍 Extracting headings from', pageCount, 'pages...')

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const pageHeadings = await this.extractHeadingsFromPage(pageNum)
      allHeadings.push(...pageHeadings)
    }

    console.log('✅ Found', allHeadings.length, 'headings before categorization')
    const categorized = this.categorizeHeadingLevels(allHeadings)
    console.log('✅ Categorized headings with levels:', categorized)
    return categorized
  }

  private async extractHeadingsFromPage(pageNum: number): Promise<PDFHeading[]> {
    const doc = this.documentViewer.getDocument()
    const pageHeadings: PDFHeading[] = []

    try {
      // Load page text with positioning info
      const pageInfo = await doc.loadPageText(pageNum)
      const textItems = pageInfo.items || []

      for (let i = 0; i < textItems.length; i++) {
        const item = textItems[i]
        
        // Check if this looks like a heading based on:
        // 1. Font size larger than body text (usually > 12pt)
        // 2. Bold or heavy font weight
        // 3. Followed by line break
        const fontSize = item.height || 12
        const isBold = item.fontName?.toLowerCase().includes('bold') || false
        const text = item.str?.trim() || ''

        // Heuristic: Heading if font is large OR bold AND short text
        const isLikelyHeading = (
          (fontSize > 13 || isBold) && 
          text.length > 0 && 
          text.length < 150 &&  // Headings are usually short
          !text.match(/^\d+$/) &&  // Not just a number
          text.match(/[A-Za-z]/)  // Contains letters
        )

        if (isLikelyHeading) {
          pageHeadings.push({
            id: `heading-${pageNum}-${i}`,
            text: text,
            level: 1,  // ✅ Default to 1, will be properly categorized later
            page: pageNum,
            boundingBox: {
              x1: item.x || 0,
              y1: item.y || 0,
              x2: (item.x || 0) + (item.width || 0),
              y2: (item.y || 0) + (item.height || 0)
            },
            fontSize: fontSize,
            fontWeight: isBold ? 'bold' : 'normal'
          })
        }
      }
    } catch (error) {
      console.error('Error extracting headings from page', pageNum, error)
    }

    return pageHeadings
  }

  private categorizeHeadingLevels(headings: PDFHeading[]): PDFHeading[] {
    if (headings.length === 0) return []

    // Sort by font size descending to find size hierarchy
    const sortedBySize = [...headings].sort((a, b) => b.fontSize - a.fontSize)
    
    // Find unique font sizes and sort them
    const fontSizes = [...new Set(sortedBySize.map(h => h.fontSize))].sort((a, b) => b - a)
    
    console.log('📏 Unique font sizes found:', fontSizes)
    
    // ✅ Assign levels based on font size (1 = largest, 2 = second largest, etc.)
    const categorized = headings.map(heading => ({
      ...heading,
      level: fontSizes.indexOf(heading.fontSize) + 1
    }))
    
    console.log('📊 Heading levels assigned:', categorized.map(h => ({ text: h.text, level: h.level, fontSize: h.fontSize })))
    
    return categorized
  }

  // Convert headings to sections (group content between headings)
  convertToSections(headings: PDFHeading[]): PDFSection[] {
    const sections: PDFSection[] = []
    
    // Sort headings by page then position
    const sortedHeadings = [...headings].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page
      return a.boundingBox.y1 - b.boundingBox.y1
    })

    for (let i = 0; i < sortedHeadings.length; i++) {
      const heading = sortedHeadings[i]
      const nextHeading = sortedHeadings[i + 1]

      const section: PDFSection = {
        heading,
        startPage: heading.page,
        endPage: nextHeading ? nextHeading.page : this.documentViewer.getPageCount(),
        content: '',
        subsections: []
      }

      // Find subsections (headings with higher level number = smaller)
      if (nextHeading) {
        for (let j = i + 1; j < sortedHeadings.length; j++) {
          const potentialSub = sortedHeadings[j]
          if (potentialSub.page > section.endPage) break
          if (potentialSub.level > heading.level) {
            section.subsections.push(potentialSub)
          }
        }
      }

      sections.push(section)
    }

    console.log('📚 Created sections:', sections.map(s => ({ 
      text: s.heading.text, 
      level: s.heading.level,
      subsections: s.subsections.length 
    })))

    return sections
  }

  // Simpler fallback: Look for common research paper section names
  async extractCommonSections(): Promise<PDFSection[]> {
    const commonSectionNames = [
      'abstract',
      'introduction',
      'related work',
      'background',
      'methodology',
      'method',
      'approach',
      'design',
      'implementation',
      'experimental setup',
      'experiments',
      'evaluation',
      'results',
      'discussion',
      'limitations',
      'conclusion',
      'future work',
      'references'
    ]

    console.log('🔎 Extracting all headings first...')
    const allHeadings = await this.extractHeadings()
    console.log('📝 All headings extracted:', allHeadings.length)
    
    // Filter to likely section headings
    const sectionHeadings = allHeadings.filter(heading => {
      const lowerText = heading.text.toLowerCase()
      const matches = commonSectionNames.some(name => lowerText.includes(name))
      if (matches) {
        console.log('✅ Matched section:', heading.text, '(level:', heading.level, ')')
      }
      return matches
    })

    console.log('📋 Found section headings:', sectionHeadings.length)

    const sections = this.convertToSections(sectionHeadings)
    console.log('🎯 Final sections created:', sections.length)
    
    return sections
  }
}