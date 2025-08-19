/**
 * Utility functions for detecting and analyzing image-related content
 */

export function isImageContent(text: string): boolean {
  if (!text || text.trim().length === 0) return false
  
  const cleanText = text.trim()
  
  // Image reference patterns
  const imageIndicators = [
    // Direct image references
    /^Figure\s+\d+/i,
    /^Fig\.\s*\d+/i,
    /^Image\s+\d+/i,
    /^Diagram\s+\d+/i,
    /^Chart\s+\d+/i,
    /^Graph\s+\d+/i,
    /^Plot\s+\d+/i,
    /^Illustration\s+\d+/i,
    
    // Roman numerals
    /Figure\s+[IVX]+/i,
    /Fig\s+[IVX]+/i,
    
    // Image-related keywords
    /\b(screenshot|photo|picture|visualization|graphic|flowchart|schematic|blueprint|map|histogram|scatter|pie\s+chart|bar\s+chart|line\s+graph)\b/i,
    
    // Academic image terms
    /\b(micrograph|spectrogram|x-ray|mri|scan|microscopy|telescope|satellite\s+image)\b/i,
    
    // Visual elements
    /\b(legend|caption|axis|scale|grid|plot|curve|trend|pattern|visual)\b/i,
    
    // Image file extensions or formats
    /\.(jpg|jpeg|png|gif|bmp|tiff|svg|pdf|eps)\b/i,
    
    // Common image descriptions
    /\b(shows?|depicts?|illustrates?|displays?|presents?|visualizes?|demonstrates?)\s+(the|a|an)\b/i,
    
    // Positional/layout terms
    /\b(top\s+left|top\s+right|bottom\s+left|bottom\s+right|center|middle|foreground|background)\b/i,
    
    // Color references (often used in image descriptions)
    /\b(red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|grey)\s+(line|bar|dot|circle|square|area|region)\b/i
  ]
  
  // Count how many indicators match
  const matchCount = imageIndicators.filter(pattern => pattern.test(cleanText)).length
  
  // If any image indicators match, it's likely image-related content
  if (matchCount >= 1) return true
  
  // Check for structured visual descriptions
  const visualTerms = [
    'figure', 'image', 'chart', 'graph', 'diagram', 'plot', 'visual', 'graphic',
    'illustration', 'picture', 'photo', 'screenshot', 'visualization'
  ]
  
  const hasVisualTerms = visualTerms.some(term => 
    cleanText.toLowerCase().includes(term)
  )
  
  // Check for dimension or measurement terms (common in image descriptions)
  const hasDimensions = /\b(\d+\s*(x|\*|×)\s*\d+|\d+\s*cm|\d+\s*mm|\d+\s*px|\d+\s*pixels?)\b/i.test(cleanText)
  
  // Check for coordinate or positioning terms
  const hasPositioning = /\b(coordinate|position|location|placement|arrangement|layout|geometry)\b/i.test(cleanText)
  
  return hasVisualTerms || hasDimensions || hasPositioning
}

export function getImageType(text: string): string {
  if (!text) return 'unknown'
  
  const cleanText = text.trim().toLowerCase()
  
  if (/\b(chart|graph|plot|histogram|scatter|bar|pie)\b/.test(cleanText)) return 'chart'
  if (/\b(diagram|flowchart|schematic|blueprint)\b/.test(cleanText)) return 'diagram'
  if (/\b(photo|picture|image|screenshot)\b/.test(cleanText)) return 'photograph'
  if (/\b(map|satellite|aerial)\b/.test(cleanText)) return 'map'
  if (/\b(microscopy|micrograph|x-ray|mri|scan)\b/.test(cleanText)) return 'scientific'
  if (/\b(illustration|drawing|sketch)\b/.test(cleanText)) return 'illustration'
  if (/\b(visualization|graphic|infographic)\b/.test(cleanText)) return 'visualization'
  
  return 'general'
}

export function extractImageMetadata(text: string): {
  hasCaption: boolean
  hasReference: boolean
  imageType: string
  suggestedAnalysis: string[]
} {
  const cleanText = text.trim()
  const imageType = getImageType(text)
  
  // Check for caption-like text
  const hasCaption = /^(Figure|Fig|Image|Chart|Graph|Diagram)\s+\d+[:.]/i.test(cleanText) ||
                    cleanText.includes(':') || cleanText.includes('shows') || cleanText.includes('depicts')
  
  // Check for reference-like text
  const hasReference = /^(Figure|Fig|Image|Chart|Graph|Diagram)\s+\d+$/i.test(cleanText)
  
  // Suggest analysis types based on content
  const suggestedAnalysis: string[] = []
  
  if (imageType === 'chart') {
    suggestedAnalysis.push('Data analysis', 'Trend identification', 'Statistical insights')
  } else if (imageType === 'diagram') {
    suggestedAnalysis.push('Process flow', 'Component relationships', 'System architecture')
  } else if (imageType === 'scientific') {
    suggestedAnalysis.push('Scientific observation', 'Technical details', 'Research findings')
  } else if (imageType === 'map') {
    suggestedAnalysis.push('Geographic analysis', 'Spatial relationships', 'Location insights')
  } else {
    suggestedAnalysis.push('Visual description', 'Object identification', 'Context analysis')
  }
  
  return {
    hasCaption,
    hasReference,
    imageType,
    suggestedAnalysis
  }
}
