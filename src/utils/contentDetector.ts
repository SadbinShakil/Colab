/**
 * Smart content detector to determine if selected text is mathematical or general content
 */

export function isMathematicalContent(text: string): boolean {
  if (!text || !text.trim()) return false
  
  const mathPatterns = [
    // Mathematical symbols
    /[∫∑∏√∆∇∂]/g,
    
    // Greek letters commonly used in math
    /[α-ωΑ-Ω]/g,
    
    // Mathematical operators and relations
    /[=<>≤≥≠±∞]/g,
    
    // Mathematical expressions with numbers and operators
    /\b\d+\s*[+\-*/^]\s*\d+/g,
    
    // Mathematical functions
    /\b(sin|cos|tan|log|ln|exp|sqrt|abs|min|max)\s*\(/gi,
    
    // Mathematical keywords
    /\b(equation|formula|theorem|proof|derivative|integral|matrix|vector|coefficient|variable|function|limit|infinity)\b/i,
    
    // Variable assignments and equations
    /\b[xyz]\s*[=<>]/gi,
    
    // Fractions notation
    /\d+\/\d+/g,
    
    // Scientific notation
    /\d+\.?\d*\s*[×x]\s*10\^?[-+]?\d+/gi,
    
    // Mathematical groupings and parentheses with operators
    /\([^)]*\)\s*[+\-*/^]\s*\([^)]*\)/g,
    
    // Differential notation
    /\b(dx|dy|dz|dt|du|dv)\b/gi,
    
    // Mathematical sets and logic
    /[∈∉⊂⊃∪∩∀∃]/g,
    
    // Exponents and subscripts patterns
    /\w+\^[\w\d]+|\w+_[\w\d]+/g
  ]
  
  // Count how many mathematical patterns match
  let mathMatches = 0
  mathPatterns.forEach(pattern => {
    if (pattern.test(text)) {
      mathMatches++
    }
  })
  
  // Additional heuristics
  const hasEqualsSign = /[=]/.test(text)
  const hasNumbers = /\d/.test(text)
  const hasMathWords = /\b(solve|calculate|compute|find|determine|evaluate)\b/i.test(text)
  const isEquationLike = /^\s*[\w\d\s+\-*/^()=<>≤≥±∫∑∏√∆∇∂α-ωΑ-Ω,.]+\s*$/.test(text)
  
  // Decision logic
  if (mathMatches >= 2) return true  // Multiple math patterns
  if (mathMatches >= 1 && (hasEqualsSign || isEquationLike)) return true  // Math pattern + equation structure
  if (hasEqualsSign && hasNumbers && text.length < 100) return true  // Short text with equation
  if (hasMathWords && (hasNumbers || mathMatches >= 1)) return true  // Math context words
  
  return false
}

export function getContentType(text: string): 'mathematical' | 'general' {
  return isMathematicalContent(text) ? 'mathematical' : 'general'
}

export function getExplainerSuggestion(text: string): {
  type: 'mathematical' | 'general'
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
} {
  const isMath = isMathematicalContent(text)
  
  if (isMath) {
    const hasComplexMath = /[∫∑∏√∆∇∂]/.test(text) || /\b(derivative|integral|theorem)\b/i.test(text)
    return {
      type: 'mathematical',
      confidence: hasComplexMath ? 'high' : 'medium',
      reasoning: hasComplexMath ? 'Contains advanced mathematical symbols/concepts' : 'Contains mathematical elements'
    }
  } else {
    const hasResearchTerms = /\b(study|research|analysis|method|result|conclusion|hypothesis)\b/i.test(text)
    return {
      type: 'general',
      confidence: hasResearchTerms ? 'high' : 'medium',
      reasoning: hasResearchTerms ? 'Contains research/academic terminology' : 'General text content'
    }
  }
} 
