// lib/pdfHeadingExtractor.ts
'use client'

export interface PDFHeading {
  id: string
  text: string
  level: number  // 1 = main heading, 2 = subheading
  page: number
  boundingBox: { x1: number; y1: number; x2: number; y2: number }
  fontSize: number
  fontWeight: string
  estimatedWordCount?: number
}

export interface PDFSection {
  heading: PDFHeading
  startPage: number
  endPage: number
  content: string
  subsections: PDFHeading[]
}

// Common academic paper section names used as fallback matching
const COMMON_SECTION_NAMES = [
  'abstract', 'introduction', 'related work', 'background', 'literature review',
  'methodology', 'method', 'methods', 'approach', 'design', 'implementation',
  'experimental setup', 'experiments', 'experiment', 'evaluation', 'results',
  'discussion', 'limitations', 'conclusion', 'conclusions', 'future work',
  'acknowledgements', 'acknowledgments', 'references', 'appendix', 'overview',
  'system design', 'framework', 'architecture', 'study', 'analysis', 'findings',
  'contributions', 'motivation', 'problem statement', 'proposed'
]

export class PDFHeadingExtractor {
  private documentViewer: any
  private annotationManager: any

  constructor(documentViewer: any, annotationManager: any) {
    this.documentViewer = documentViewer
    this.annotationManager = annotationManager
  }

  // ============================================================================
  // PRIMARY: Apryse ContentExtractor-based extraction (most accurate)
  // ============================================================================

  async extractHeadings(): Promise<PDFHeading[]> {
    const pageCount = this.documentViewer.getPageCount()
    console.log('🔍 Extracting headings from', pageCount, 'pages using ContentExtractor...')

    const allHeadings: PDFHeading[] = []

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const headings = await this.extractHeadingsFromPageApryse(pageNum)
      allHeadings.push(...headings)
    }

    console.log('✅ Found', allHeadings.length, 'headings before categorization')
    const categorized = this.categorizeHeadingLevels(allHeadings)
    console.log('✅ Categorized headings with levels:', categorized)
    return categorized
  }

  private async extractHeadingsFromPageApryse(pageNum: number): Promise<PDFHeading[]> {
    // Always use the plain text fallback — it's robust, doesn't require PDFNet,
    // and works across all Apryse configurations.
    return this.extractHeadingsFromPageTextFallback(pageNum)
  }

  // ============================================================================
  // FALLBACK A: Plain text regex heuristic (works well for most academic PDFs)
  // ============================================================================

  private async extractHeadingsFromPageTextFallback(pageNum: number): Promise<PDFHeading[]> {
    const doc = this.documentViewer.getDocument()
    const pageHeadings: PDFHeading[] = []

    const rawText = await doc.loadPageText(pageNum)
    if (!rawText || typeof rawText !== 'string') return []

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

    lines.forEach((line, i) => {
      // Heading heuristics on plain text:
      // - Short (< 100 chars)
      // - Starts with ALL CAPS, or Title Case, or section number (1. 2. etc)
      // - Not a sentence (ends without period, or very short)
      const isAllCaps = line === line.toUpperCase() && line.match(/[A-Z]/)
      const isTitleCase = line.match(/^([A-Z][a-z]+ ?)+$/)
      const isNumbered = line.match(/^(\d+\.?\s+|[IVXLC]+\.?\s+)[A-Z]/)
      const isShort = line.length > 3 && line.length < 100
      const noTrailingPeriod = !line.endsWith('.')

      const isCommonSection = COMMON_SECTION_NAMES.some(name =>
        line.toLowerCase().trim() === name ||
        line.toLowerCase().trim().startsWith(name)
      )

      if (isShort && noTrailingPeriod && (isAllCaps || isTitleCase || isNumbered || isCommonSection)) {
        pageHeadings.push({
          id: `heading-${pageNum}-${i}`,
          text: line,
          level: 1,
          page: pageNum,
          boundingBox: { x1: 0, y1: i * 14, x2: 500, y2: (i + 1) * 14 },
          fontSize: isAllCaps ? 14 : 12,
          fontWeight: isAllCaps ? 'bold' : 'normal'
        })
      }
    })

    return pageHeadings
  }

  // ============================================================================
  // FALLBACK B: Common section name matching (used by extractCommonSections)
  // ============================================================================

  async extractCommonSections(): Promise<PDFSection[]> {
    console.log('🔎 Extracting all headings first...')
    const allHeadings = await this.extractHeadings()
    console.log('📝 All headings extracted:', allHeadings.length)

    const sectionHeadings = allHeadings.filter(heading => {
      const lowerText = heading.text.toLowerCase()
      const matches = COMMON_SECTION_NAMES.some(name => lowerText.includes(name))
      if (matches) console.log('✅ Matched section:', heading.text, '(level:', heading.level, ')')
      return matches
    })

    console.log('📋 Found section headings:', sectionHeadings.length)

    // ✅ ALWAYS create at least page-range sections even if no headings found
    if (sectionHeadings.length === 0) {
      return this.createPageRangeSections()
    }

    const sections = this.convertToSections(sectionHeadings)
    console.log('🎯 Final sections created:', sections.length)
    return sections
  }

  // ============================================================================
  // GUARANTEED FALLBACK: Split document into page-based sections
  // The agent system ALWAYS has something to work with.
  // ============================================================================

  createPageRangeSections(): PDFSection[] {
    const pageCount = this.documentViewer.getPageCount()

    console.log(`📄 [HeadingExtractor] No headings found. Creating ${pageCount} page-range sections as fallback.`)

    // Create one "section" per page (or group every 2 pages for longer docs)
    const groupSize = pageCount > 20 ? 3 : pageCount > 10 ? 2 : 1
    const sections: PDFSection[] = []

    for (let startPage = 1; startPage <= pageCount; startPage += groupSize) {
      const endPage = Math.min(startPage + groupSize - 1, pageCount)
      const label = endPage > startPage
        ? `Pages ${startPage}–${endPage}`
        : `Page ${startPage}`

      sections.push({
        heading: {
          id: `page-range-${startPage}`,
          text: label,
          level: 1,
          page: startPage,
          boundingBox: { x1: 0, y1: 0, x2: 595, y2: 842 },
          fontSize: 12,
          fontWeight: 'normal'
        },
        startPage,
        endPage,
        content: '',
        subsections: []
      })
    }

    console.log(`✅ [HeadingExtractor] Created ${sections.length} fallback sections`)
    return sections
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private categorizeHeadingLevels(headings: PDFHeading[]): PDFHeading[] {
    if (headings.length === 0) return []

    const fontSizes = [...new Set(headings.map(h => h.fontSize))].sort((a, b) => b - a)

    return headings.map(heading => ({
      ...heading,
      level: fontSizes.indexOf(heading.fontSize) + 1
    }))
  }

  convertToSections(headings: PDFHeading[]): PDFSection[] {
    const sections: PDFSection[] = []
    const pageCount = this.documentViewer.getPageCount()

    const sorted = [...headings].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page
      return a.boundingBox.y1 - b.boundingBox.y1
    })

    for (let i = 0; i < sorted.length; i++) {
      const heading = sorted[i]
      const nextHeading = sorted[i + 1]

      const section: PDFSection = {
        heading,
        startPage: heading.page,
        endPage: nextHeading ? Math.max(heading.page, nextHeading.page - 1) : pageCount,
        content: '',
        subsections: []
      }

      sections.push(section)
    }

    console.log('📚 Created sections:', sections.map(s => ({
      text: s.heading.text,
      level: s.heading.level,
      pages: `${s.startPage}–${s.endPage}`
    })))

    return sections
  }
}