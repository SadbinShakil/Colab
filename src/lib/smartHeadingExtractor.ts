// Smart Heading Extractor - Uses text analysis instead of PDF structure
// Works on ANY PDF by analyzing text patterns

interface HeadingCandidate {
    text: string
    page: number
    confidence: number
    features: {
      isShort: boolean
      hasNumber: boolean
      isAllCaps: boolean
      endsWithColon: boolean
      hasKeywords: boolean
      startsLine: boolean
    }
  }
  
  interface ExtractedHeading {
    text: string
    page: number
    level: number
  }
  
  export class SmartHeadingExtractor {
    // Common heading keywords
    private readonly HEADING_KEYWORDS = [
      'introduction', 'background', 'related work', 'methodology', 'method',
      'approach', 'implementation', 'results', 'evaluation', 'discussion',
      'conclusion', 'future work', 'abstract', 'summary', 'overview',
      'system', 'architecture', 'design', 'analysis', 'experiments',
      'findings', 'contributions', 'motivation', 'problem', 'solution',
      'dataset', 'model', 'training', 'testing', 'performance',
      'limitations', 'applications', 'references', 'acknowledgments'
    ]
  
    /**
     * Extract headings from PDF text
     * @param documentViewer - Apryse DocumentViewer instance
     * @returns Promise<ExtractedHeading[]>
     */
    async extractHeadings(documentViewer: any): Promise<ExtractedHeading[]> {
      // Get fresh document reference
      const doc = documentViewer.getDocument()
      if (!doc) {
        console.error('❌ No document available in documentViewer')
        return []
      }

      const pageCount = documentViewer.getPageCount()
      if (pageCount === 0) {
        console.warn('⚠️ Document has 0 pages')
        return []
      }

      const candidates: HeadingCandidate[] = []

      console.log(`📄 Analyzing ${pageCount} pages for headings from current document...`)

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        try {
          // Use callback pattern to get text directly (Apryse API)
          const text = await new Promise<string>((resolve, reject) => {
            try {
              doc.loadPageText(pageNum, (text: string) => {
                resolve(text || '')
              })
            } catch (error) {
              reject(error)
            }
          })
          const pageCandidates = this.findHeadingCandidates(text, pageNum)
          candidates.push(...pageCandidates)
        } catch (error) {
          console.error(`Error extracting text from page ${pageNum}:`, error)
        }
      }
  
      console.log(`🔍 Found ${candidates.length} heading candidates`)
  
      // Score and filter candidates
      const headings = this.selectBestHeadings(candidates)
      
      console.log(`✅ Selected ${headings.length} headings:`, headings.map(h => h.text))
  
      return headings
    }
  
    /**
     * Find potential heading candidates in page text
     */
    private findHeadingCandidates(pageText: string, pageNum: number): HeadingCandidate[] {
      const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      const candidates: HeadingCandidate[] = []
  
      for (const line of lines) {
        // Skip very long lines (likely paragraphs)
        if (line.length > 100) continue
  
        // Skip very short lines (likely page numbers, etc)
        if (line.length < 3) continue
  
        const features = {
          isShort: line.length < 60,
          hasNumber: /^[\d.]+\s/.test(line), // Starts with number like "1." or "1.1"
          isAllCaps: line === line.toUpperCase() && /[A-Z]/.test(line),
          endsWithColon: line.endsWith(':'),
          hasKeywords: this.containsHeadingKeyword(line),
          startsLine: true // We split by lines, so all are line starts
        }
  
        // Calculate confidence score
        const confidence = this.calculateConfidence(features)
  
        if (confidence > 0.3) { // Threshold for considering as heading
          candidates.push({
            text: this.cleanHeadingText(line),
            page: pageNum,
            confidence,
            features
          })
        }
      }
  
      return candidates
    }
  
    /**
     * Calculate confidence score for a heading candidate
     */
    private calculateConfidence(features: HeadingCandidate['features']): number {
      let score = 0
  
      if (features.isShort) score += 0.3
      if (features.hasNumber) score += 0.4 // Strong indicator
      if (features.isAllCaps) score += 0.2
      if (features.endsWithColon) score += 0.3
      if (features.hasKeywords) score += 0.4 // Strong indicator
  
      return Math.min(score, 1.0)
    }
  
    /**
     * Check if text contains common heading keywords
     */
    private containsHeadingKeyword(text: string): boolean {
      const lowerText = text.toLowerCase()
      return this.HEADING_KEYWORDS.some(keyword => 
        lowerText.includes(keyword) || 
        lowerText.startsWith(keyword)
      )
    }
  
    /**
     * Clean heading text (remove numbering, extra spaces, etc)
     */
    private cleanHeadingText(text: string): string {
      // Remove leading numbers like "1.", "1.1", "1.1.1"
      let cleaned = text.replace(/^[\d.]+\s+/, '')
      
      // Remove trailing colons
      cleaned = cleaned.replace(/:$/, '')
      
      // Trim
      cleaned = cleaned.trim()
  
      return cleaned
    }
  
    /**
     * Select best headings from candidates (remove duplicates, low confidence, etc)
     */
    private selectBestHeadings(candidates: HeadingCandidate[]): ExtractedHeading[] {
      // Sort by confidence descending
      candidates.sort((a, b) => b.confidence - a.confidence)
  
      const selected: ExtractedHeading[] = []
      const seenTexts = new Set<string>()
  
      for (const candidate of candidates) {
        // Skip duplicates
        const textLower = candidate.text.toLowerCase()
        if (seenTexts.has(textLower)) continue
  
        // Determine heading level
        let level = 1
        if (candidate.features.hasNumber) {
          // Count dots in numbering to determine level
          const match = candidate.text.match(/^([\d.]+)/)
          if (match) {
            const dots = (match[1].match(/\./g) || []).length
            level = Math.min(dots + 1, 3)
          }
        }
  
        selected.push({
          text: candidate.text,
          page: candidate.page,
          level
        })
  
        seenTexts.add(textLower)
  
        // Limit to reasonable number of headings
        if (selected.length >= 50) break
      }
  
      return selected
    }
  
    /**
     * Convert headings to section format (compatible with existing SectionAssignmentPanel)
     */
    convertToSections(headings: ExtractedHeading[]): any[] {
      return headings.map((heading, index) => ({
        heading: {
          id: `heading_${heading.page}_${index}`,
          text: heading.text,
          page: heading.page,
          level: heading.level
        },
        startPage: heading.page,
        endPage: heading.page, // We don't calculate ranges in this simple version
        content: '',
        subsections: []
      }))
    }
  }