// lib/paperSummaryGenerator.ts
'use client'

/**
 * Paper Summary Generator
 * 
 * Extracts real information from the PDF document to create an accurate summary
 * including title, authors, abstract, key sections, and metadata.
 */

export interface PaperSummary {
    title: string
    authors: string
    abstract: string
    year: string
    sections: {
        name: string
        page: number
    }[]
    totalPages: number
    estimatedReadingTime: number // minutes
    keywords: string[]
    documentType: 'research_paper' | 'article' | 'report' | 'book' | 'unknown'
}

export class PaperSummaryGenerator {
    private documentViewer: any

    constructor(documentViewer: any) {
        this.documentViewer = documentViewer
    }

    /**
     * Generate comprehensive paper summary from actual PDF content
     */
    async generateSummary(): Promise<PaperSummary> {
        console.log('📄 Generating paper summary from PDF...')

        const doc = this.documentViewer.getDocument()
        const pageCount = this.documentViewer.getPageCount()

        // Extract from first few pages (title, authors, abstract usually on page 1-2)
        const firstPageText = await this.extractPageText(1)
        const secondPageText = pageCount > 1 ? await this.extractPageText(2) : ''
        const combinedText = firstPageText + '\n' + secondPageText

        // Extract components
        const title = this.extractTitle(firstPageText)
        const authors = this.extractAuthors(firstPageText)
        const abstract = this.extractAbstract(combinedText)
        const year = this.extractYear(combinedText)
        const sections = await this.extractSections()
        const keywords = this.extractKeywords(abstract + '\n' + firstPageText)
        const documentType = this.determineDocumentType(combinedText, sections)

        // Estimate reading time (250 words per minute average)
        const estimatedWords = pageCount * 300 // rough estimate
        const estimatedReadingTime = Math.ceil(estimatedWords / 250)

        const summary: PaperSummary = {
            title,
            authors,
            abstract,
            year,
            sections,
            totalPages: pageCount,
            estimatedReadingTime,
            keywords,
            documentType
        }

        console.log('✅ Paper summary generated:', summary)
        return summary
    }

    /**
     * Extract text from a specific page
     */
    private async extractPageText(pageNum: number): Promise<string> {
        try {
            const doc = this.documentViewer.getDocument()
            const result = await doc.loadPageText(pageNum)

            // ✅ Handle case where result is a direct string
            if (typeof result === 'string') {
                return result.replace(/\s+/g, ' ').trim()
            }

            // ✅ Handle case where result is an object with items
            if (result && result.items) {
                return result.items
                    .map((item: any) => item.str || '')
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
            }

            console.warn(`⚠️ Warning: extractPageText returned unexpected format for page ${pageNum}`)
            return ''
        } catch (error) {
            console.error(`Error extracting text from page ${pageNum}:`, error)
            return ''
        }
    }

    /**
     * Extract paper title (usually the largest text on first page)
     */
    private extractTitle(firstPageText: string): string {
        try {
            // Common patterns for titles
            const lines = firstPageText.split('\n').map(l => l.trim()).filter(l => l.length > 0)

            // Title is usually:
            // 1. One of the first few lines
            // 2. Not too short (> 10 chars)
            // 3. Not too long (< 200 chars)
            // 4. Doesn't start with common metadata keywords

            const excludePatterns = /^(abstract|introduction|keywords|doi|arxiv|published|conference|journal|author|email|university|department)/i

            for (const line of lines.slice(0, 10)) {
                if (
                    line.length > 10 &&
                    line.length < 200 &&
                    !excludePatterns.test(line) &&
                    !line.match(/^\d+$/) && // Not just numbers
                    !line.includes('@') && // Not email
                    line.match(/[A-Z]/) // Contains uppercase (titles usually do)
                ) {
                    return line
                }
            }

            // Fallback: first substantial line
            return lines.find(l => l.length > 20) || 'Untitled Document'
        } catch (error) {
            console.error('Error extracting title:', error)
            return 'Untitled Document'
        }
    }

    /**
     * Extract authors
     */
    private extractAuthors(firstPageText: string): string {
        try {
            const lines = firstPageText.split('\n').map(l => l.trim())

            // Look for author patterns:
            // - Names with initials (J. Smith, A. Doe)
            // - Multiple names separated by commas or "and"
            // - Usually after title, before abstract

            const authorPatterns = [
                /([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)/g, // John A. Smith
                /([A-Z]\.\s+[A-Z][a-z]+)/g, // J. Smith
                /([A-Z][a-z]+\s+[A-Z][a-z]+)/g, // John Smith
            ]

            for (let i = 1; i < Math.min(lines.length, 15); i++) {
                const line = lines[i]

                // Skip if it's likely the title or abstract
                if (line.toLowerCase().includes('abstract') || line.length > 150) continue

                // Check if line contains author-like patterns
                for (const pattern of authorPatterns) {
                    const matches = line.match(pattern)
                    if (matches && matches.length > 0) {
                        // Clean up and return
                        return line
                            .replace(/\d+/g, '') // Remove numbers (affiliations)
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 200) // Limit length
                    }
                }
            }

            return 'Authors not identified'
        } catch (error) {
            console.error('Error extracting authors:', error)
            return 'Authors not identified'
        }
    }

    /**
     * Extract abstract
     */
    private extractAbstract(text: string): string {
        try {
            // Find "Abstract" keyword
            // Note: using [\s\S] instead of . with s flag for compatibility
            const abstractMatch = text.match(/abstract[:\s]+([\s\S]*?)(?=\n\n|introduction|keywords|1\.|I\.|$)/i)

            if (abstractMatch && abstractMatch[1]) {
                const abstract = abstractMatch[1]
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 1000) // Limit to 1000 chars

                return abstract || 'Abstract not found'
            }

            // Fallback: Look for substantial paragraph early in document
            const paragraphs = text.split('\n\n')
            for (const para of paragraphs.slice(0, 10)) {
                if (para.length > 200 && para.length < 1500) {
                    return para.substring(0, 500) + '...'
                }
            }

            return 'Abstract not found'
        } catch (error) {
            console.error('Error extracting abstract:', error)
            return 'Abstract not found'
        }
    }

    /**
     * Extract publication year
     */
    private extractYear(text: string): string {
        try {
            // Look for 4-digit year (2000-2099)
            const yearMatch = text.match(/\b(20\d{2})\b/)
            return yearMatch ? yearMatch[1] : new Date().getFullYear().toString()
        } catch (error) {
            return new Date().getFullYear().toString()
        }
    }

    /**
     * Extract section headings
     */
    private async extractSections(): Promise<{ name: string; page: number }[]> {
        try {
            const pageCount = this.documentViewer.getPageCount()
            const sections: { name: string; page: number }[] = []

            const commonSections = [
                'abstract', 'introduction', 'related work', 'background',
                'methodology', 'method', 'approach', 'design', 'implementation',
                'experimental setup', 'experiments', 'evaluation', 'results',
                'discussion', 'limitations', 'conclusion', 'future work',
                'references', 'acknowledgments'
            ]

            // Check first 20 pages for section headings
            for (let page = 1; page <= Math.min(pageCount, 20); page++) {
                const doc = this.documentViewer.getDocument()
                const pageInfo = await doc.loadPageText(page)
                const textItems = pageInfo.items || []

                for (const item of textItems) {
                    const text = (item.str || '').trim().toLowerCase()
                    const fontSize = item.height || 12

                    // Check if it's a section heading (larger font or matches common sections)
                    if (fontSize > 13 || commonSections.some(s => text.includes(s))) {
                        const sectionName = (item.str || '').trim()

                        // Avoid duplicates and very short text
                        if (
                            sectionName.length > 3 &&
                            sectionName.length < 100 &&
                            !sections.some(s => s.name.toLowerCase() === sectionName.toLowerCase())
                        ) {
                            sections.push({
                                name: sectionName,
                                page: page
                            })
                        }
                    }
                }
            }

            return sections.slice(0, 15) // Limit to 15 sections
        } catch (error) {
            console.error('Error extracting sections:', error)
            return []
        }
    }

    /**
     * Extract keywords from abstract and title
     */
    private extractKeywords(text: string): string[] {
        try {
            // Look for explicit keywords section
            const keywordsMatch = text.match(/keywords?[:\s]+([\s\S]*?)(?=\n\n|abstract|introduction|$)/i)

            if (keywordsMatch && keywordsMatch[1]) {
                return keywordsMatch[1]
                    .split(/[,;]/)
                    .map(k => k.trim())
                    .filter(k => k.length > 2)
                    .slice(0, 10)
            }

            // Fallback: Extract important-looking words
            const words = text
                .toLowerCase()
                .replace(/[^\w\s-]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 5)

            // Count frequency
            const frequency: { [key: string]: number } = {}
            words.forEach(word => {
                frequency[word] = (frequency[word] || 0) + 1
            })

            // Get top words
            return Object.entries(frequency)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([word]) => word)
        } catch (error) {
            console.error('Error extracting keywords:', error)
            return []
        }
    }

    /**
     * Determine document type
     */
    private determineDocumentType(
        text: string,
        sections: { name: string; page: number }[]
    ): PaperSummary['documentType'] {
        const lowerText = text.toLowerCase()

        // Check for research paper indicators
        const hasAbstract = lowerText.includes('abstract')
        const hasMethodology = sections.some(s =>
            s.name.toLowerCase().includes('method') ||
            s.name.toLowerCase().includes('approach')
        )
        const hasResults = sections.some(s =>
            s.name.toLowerCase().includes('result') ||
            s.name.toLowerCase().includes('evaluation')
        )
        const hasReferences = sections.some(s =>
            s.name.toLowerCase().includes('reference')
        )

        if (hasAbstract && hasMethodology && hasResults && hasReferences) {
            return 'research_paper'
        }

        if (hasAbstract) {
            return 'article'
        }

        if (sections.length > 5) {
            return 'report'
        }

        return 'unknown'
    }

    /**
     * Generate a quick summary string
     */
    async generateQuickSummary(): Promise<string> {
        const summary = await this.generateSummary()

        return `${summary.title} (${summary.year})
${summary.authors}

${summary.abstract}

Document Type: ${summary.documentType.replace('_', ' ')}
Pages: ${summary.totalPages}
Estimated Reading Time: ${summary.estimatedReadingTime} minutes
Sections: ${summary.sections.length} identified`
    }
}

export const createPaperSummaryGenerator = (documentViewer: any) => {
    return new PaperSummaryGenerator(documentViewer)
}
