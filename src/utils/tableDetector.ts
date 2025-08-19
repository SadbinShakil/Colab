/**
 * Utility functions for detecting and analyzing table content
 */

export function isTableContent(text: string): boolean {
  if (!text || text.trim().length === 0) return false
  
  const cleanText = text.trim()
  
  // Look for table indicators
  const tableIndicators = [
    // Pipe-separated values (markdown tables)
    /\|.*\|.*\|/,
    // Tab-separated values
    /\t.*\t/,
    // Multiple spaces (aligned columns)
    /\s{3,}.*\s{3,}/,
    // Table headers with common patterns
    /^(Name|Date|Value|Count|Total|Amount|Price|Quantity|ID|Type|Category|Status|Score|Percentage|Rate|Number)/i,
    // Row/column numbers or indicators
    /^\s*\d+\.\s*\w+.*\d+/,
    /Row\s*\d+|Column\s*\d+/i,
    // Common table words
    /Table\s*\d+|Figure\s*\d+|Data|Results|Summary/i,
    // CSV-like patterns
    /,.*,.*,/,
    // Multiple numbers in a structured way
    /^\s*\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?/m,
    // Excel-like cell references
    /[A-Z]\d+/
  ]
  
  // Count how many indicators match
  const matchCount = tableIndicators.filter(pattern => pattern.test(cleanText)).length
  
  // If multiple indicators match, it's likely a table
  if (matchCount >= 2) return true
  
  // Check for structured data patterns
  const lines = cleanText.split('\n').filter(line => line.trim().length > 0)
  
  if (lines.length < 2) return false
  
  // Check if lines have similar structure (same number of delimiters)
  const delimiters = ['|', '\t', ',']
  for (const delimiter of delimiters) {
    const counts = lines.map(line => (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length)
    const uniqueCounts = [...new Set(counts)]
    
    // If most lines have the same number of delimiters and it's > 0
    if (uniqueCounts.length <= 2 && Math.max(...counts) > 0) {
      const maxCount = Math.max(...counts)
      const sameDelimiterCount = counts.filter(count => count === maxCount).length
      if (sameDelimiterCount >= lines.length * 0.7) { // 70% of lines have same structure
        return true
      }
    }
  }
  
  // Check for numeric patterns that suggest tabular data
  const numericLines = lines.filter(line => {
    const numbers = line.match(/\d+(\.\d+)?/g) || []
    return numbers.length >= 2 // At least 2 numbers per line
  })
  
  if (numericLines.length >= lines.length * 0.5) { // 50% of lines have multiple numbers
    return true
  }
  
  return false
}

export function getTableType(text: string): string {
  if (!text) return 'unknown'
  
  const cleanText = text.trim()
  
  if (/\|.*\|.*\|/.test(cleanText)) return 'markdown'
  if (/\t.*\t/.test(cleanText)) return 'tab-separated'
  if (/,.*,.*,/.test(cleanText)) return 'comma-separated'
  if (/\s{3,}.*\s{3,}/.test(cleanText)) return 'space-aligned'
  if (/^\s*\d+\.\s*\w+.*\d+/m.test(cleanText)) return 'numbered-list'
  
  return 'structured-data'
}

export function extractTableMetadata(text: string): {
  estimatedRows: number
  estimatedColumns: number
  hasHeaders: boolean
  tableType: string
} {
  const cleanText = text.trim()
  const lines = cleanText.split('\n').filter(line => line.trim().length > 0)
  const estimatedRows = lines.length
  
  let estimatedColumns = 0
  let hasHeaders = false
  const tableType = getTableType(text)
  
  // Estimate columns based on first few lines
  if (lines.length > 0) {
    const firstLine = lines[0]
    
    // Count delimiters in first line
    const pipeCount = (firstLine.match(/\|/g) || []).length
    const tabCount = (firstLine.match(/\t/g) || []).length
    const commaCount = (firstLine.match(/,/g) || []).length
    
    if (pipeCount > 0) estimatedColumns = pipeCount + 1
    else if (tabCount > 0) estimatedColumns = tabCount + 1
    else if (commaCount > 0) estimatedColumns = commaCount + 1
    else {
      // Count words/numbers separated by multiple spaces
      const segments = firstLine.split(/\s{2,}/).filter(s => s.trim().length > 0)
      estimatedColumns = segments.length
    }
  }
  
  // Check if first line looks like headers
  if (lines.length > 0) {
    const firstLine = lines[0].toLowerCase()
    const headerWords = ['name', 'date', 'value', 'count', 'total', 'amount', 'price', 'id', 'type', 'category', 'status', 'score', 'number', 'percentage', 'rate']
    hasHeaders = headerWords.some(word => firstLine.includes(word))
    
    // Also check if first line has fewer numbers than subsequent lines
    const firstLineNumbers = (firstLine.match(/\d+/g) || []).length
    if (lines.length > 1) {
      const secondLineNumbers = (lines[1].match(/\d+/g) || []).length
      if (firstLineNumbers < secondLineNumbers && secondLineNumbers > 0) {
        hasHeaders = true
      }
    }
  }
  
  return {
    estimatedRows,
    estimatedColumns,
    hasHeaders,
    tableType
  }
}
