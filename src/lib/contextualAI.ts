// Contextual AI Support Service
// Monitors user behavior and offers help when they're struggling with a section

interface StrugglePattern {
  sectionId: string
  sectionText: string
  struggleType: 'highlighting' | 'time_spent' | 'revisiting' | 'annotations'
  confidence: number
  timestamp: Date
  userActions: UserAction[]
}

interface UserAction {
  type: 'highlight' | 'comment' | 'time_spent' | 'revisit' | 'scroll'
  timestamp: Date
  location: { page: number; x: number; y: number }
  metadata?: any
}

interface ContextualHelp {
  sectionId: string
  originalText: string
  explanation: string
  simplifiedVersion: string
  keyConcepts: string[]
  relatedConcepts: string[]
  examples: string[]
  difficulty: 'basic' | 'intermediate' | 'advanced'
}

class ContextualAIService {
  private struggleThresholds = {
    highlightCount: 4,        // Lowered to 2 highlights for easier testing
    timeSpent: 120000,        // Reduced from 5 minutes to 2 minutes on one section
    revisitCount: 2,          // Reduced from 3 to 2 returns to section
    annotationDensity: 0.2    // Reduced from 30% to 20% of section has annotations
  }
  
  private userBehavior: Map<string, UserAction[]> = new Map()
  private strugglePatterns: StrugglePattern[] = []
  private notifiedSections: Set<string> = new Set()
  private isEnabled: boolean = true

  // Monitor user highlighting behavior
  trackHighlight(sectionId: string, text: string, location: { page: number; x: number; y: number }) {
    console.log('🎨 [ContextualAI] Tracking highlight:', { sectionId, text: text.substring(0, 50), location })
    
    const action: UserAction = {
      type: 'highlight',
      timestamp: new Date(),
      location,
      metadata: { text: text.substring(0, 100) }
    }
    
    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  // Monitor time spent on sections
  trackTimeSpent(sectionId: string, duration: number, location: { page: number; x: number; y: number }) {
    console.log('⏰ [ContextualAI] Tracking time spent:', { sectionId, duration, location })
    
    const action: UserAction = {
      type: 'time_spent',
      timestamp: new Date(),
      location,
      metadata: { duration }
    }
    
    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  // Monitor revisiting behavior
  trackRevisit(sectionId: string, location: { page: number; x: number; y: number }) {
    console.log('🔄 [ContextualAI] Tracking revisit:', { sectionId, location })
    
    const action: UserAction = {
      type: 'revisit',
      timestamp: new Date(),
      location
    }
    
    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  // Monitor annotation density
  trackAnnotation(sectionId: string, text: string, location: { page: number; x: number; y: number }) {
    console.log('💭 [ContextualAI] Tracking annotation:', { sectionId, text: text.substring(0, 50), location })
    
    const action: UserAction = {
      type: 'comment',
      timestamp: new Date(),
      location,
      metadata: { text: text.substring(0, 100) }
    }
    
    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  // Monitor scrolling behavior within sections
  trackScroll(sectionId: string, location: { page: number; x: number; y: number }, scrollDirection: 'up' | 'down') {
    console.log('📜 [ContextualAI] Tracking scroll:', { sectionId, scrollDirection, location })
    
    const action: UserAction = {
      type: 'scroll',
      timestamp: new Date(),
      location,
      metadata: { direction: scrollDirection }
    }
    
    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  private addUserAction(sectionId: string, action: UserAction) {
    if (!this.userBehavior.has(sectionId)) {
      this.userBehavior.set(sectionId, [])
    }
    this.userBehavior.get(sectionId)!.push(action)
  }

  private analyzeStrugglePatterns(sectionId: string) {
    const actions = this.userBehavior.get(sectionId) || []
    const recentActions = actions.filter(a => 
      Date.now() - a.timestamp.getTime() < 600000 // Last 10 minutes
    )

    console.log('🔍 [ContextualAI] Analyzing section:', sectionId, 'Recent actions:', recentActions.length)

    // Check for struggle patterns
    const highlightCount = recentActions.filter(a => a.type === 'highlight').length
    const totalTimeSpent = recentActions
      .filter(a => a.type === 'time_spent')
      .reduce((sum, a) => sum + (a.metadata?.duration || 0), 0)
    const revisitCount = recentActions.filter(a => a.type === 'revisit').length
    const annotationCount = recentActions.filter(a => a.type === 'comment').length

    console.log('📊 [ContextualAI] Pattern counts:', { 
      highlightCount, 
      totalTimeSpent, 
      revisitCount, 
      annotationCount,
      thresholds: this.struggleThresholds
    })

    let struggleType: StrugglePattern['struggleType'] | null = null
    let confidence = 0

    if (highlightCount >= this.struggleThresholds.highlightCount) {
      struggleType = 'highlighting'
      confidence = Math.min(0.9, highlightCount / this.struggleThresholds.highlightCount)
      console.log('🎯 [ContextualAI] Highlight struggle detected!', { highlightCount, threshold: this.struggleThresholds.highlightCount })
    } else if (totalTimeSpent >= this.struggleThresholds.timeSpent) {
      struggleType = 'time_spent'
      confidence = Math.min(0.9, totalTimeSpent / this.struggleThresholds.timeSpent)
      console.log('⏰ [ContextualAI] Time spent struggle detected!', { totalTimeSpent, threshold: this.struggleThresholds.timeSpent })
    } else if (revisitCount >= this.struggleThresholds.revisitCount) {
      struggleType = 'revisiting'
      confidence = Math.min(0.9, revisitCount / this.struggleThresholds.revisitCount)
      console.log('🔄 [ContextualAI] Revisit struggle detected!', { revisitCount, threshold: this.struggleThresholds.revisitCount })
    } else if (annotationCount >= this.struggleThresholds.annotationDensity * 10) { // Assuming 10 is max annotations
      struggleType = 'annotations'
      confidence = Math.min(0.9, annotationCount / (this.struggleThresholds.annotationDensity * 10))
      console.log('💭 [ContextualAI] Annotation struggle detected!', { annotationCount, threshold: this.struggleThresholds.annotationDensity * 10 })
    }

    if (struggleType && confidence > 0.6) {
      console.log('🚨 [ContextualAI] STRUGGLE PATTERN DETECTED!', { struggleType, confidence, sectionId })
      
      const pattern: StrugglePattern = {
        sectionId,
        sectionText: this.getSectionText(sectionId),
        struggleType,
        confidence,
        timestamp: new Date(),
        userActions: recentActions
      }
      
      this.strugglePatterns.push(pattern)
      this.notifyStruggleDetected(pattern)
    } else {
      console.log('✅ [ContextualAI] No struggle pattern detected yet', { 
        struggleType, 
        confidence, 
        required: 0.6,
        counts: { highlightCount, totalTimeSpent, revisitCount, annotationCount }
      })
    }
  }

  private getSectionText(sectionId: string): string {
    // This would get the actual text content of the section
    // For now, return a placeholder
    return `Section ${sectionId} content...`
  }

  private notifyStruggleDetected(pattern: StrugglePattern) {
    // ✅ Check if already notified for this section
    if (this.notifiedSections.has(pattern.sectionId)) {
      console.log('🔇 [ContextualAI] Already notified for section:', pattern.sectionId)
      return
    }
  
    console.log('🔢 [ContextualAI] First-time notification for section:', pattern.sectionId)
    
    // ✅ Mark as notified BEFORE dispatching event
    this.notifiedSections.add(pattern.sectionId)
    
    // Emit event for UI to show help popup
    if (typeof window !== 'undefined') {
      console.log('🌐 [ContextualAI] Window available, dispatching struggle-detected event')
      try {
        const event = new CustomEvent('struggle-detected', {
          detail: pattern
        })
        console.log('📡 [ContextualAI] Event created:', event)
        window.dispatchEvent(event)
        console.log('✅ [ContextualAI] Event dispatched successfully')
      } catch (error) {
        console.error('❌ [ContextualAI] Error dispatching event:', error)
      }
    } else {
      console.log('⚠️ [ContextualAI] Window not available for event dispatch')
    }
  }

  // Clear notifications when user accepts help or resets
clearNotifications(sectionId?: string) {
  if (sectionId) {
    this.notifiedSections.delete(sectionId)
    console.log('🧹 [ContextualAI] Cleared notification for section:', sectionId)
  } else {
    this.notifiedSections.clear()
    console.log('🧹 [ContextualAI] Cleared all notifications')
  }
}

  // Check if user needs help with a specific section
  needsHelp(sectionId: string): boolean {
    const recentPatterns = this.strugglePatterns.filter(p => 
      p.sectionId === sectionId && 
      Date.now() - p.timestamp.getTime() < 300000 // Last 5 minutes
    )
    return recentPatterns.length > 0
  }

  // Get contextual help for a section
  async getContextualHelp(sectionId: string, sectionText: string): Promise<ContextualHelp> {
    // Simulate advanced AI analysis with realistic academic content
    const isAbstract = sectionText.toLowerCase().includes('abstract') || sectionText.includes('transformer') || sectionText.includes('neural')
    const isMethodology = sectionText.toLowerCase().includes('method') || sectionText.includes('approach')
    const isResults = sectionText.toLowerCase().includes('result') || sectionText.includes('performance')
    
    if (isAbstract || sectionText.includes('transformer') || sectionText.includes('attention')) {
      return {
        sectionId,
        originalText: sectionText,
        explanation: `This section introduces the Transformer architecture, a revolutionary neural network model that relies entirely on attention mechanisms. The key innovation is dispensing with recurrence and convolutions, making the model more parallelizable and efficient for sequence-to-sequence tasks like machine translation.`,
        simplifiedVersion: `Think of the Transformer as a highly efficient translator that can process entire sentences at once, rather than word by word. It uses "attention" to focus on the most relevant parts of the input when generating each output word, similar to how you might look back at different parts of a text when writing a summary.`,
        keyConcepts: [
          'Attention Mechanism',
          'Sequence Transduction',
          'Encoder-Decoder Architecture',
          'Parallelization',
          'Self-Attention',
          'Multi-Head Attention'
        ],
        relatedConcepts: [
          'Recurrent Neural Networks (RNNs)',
          'Convolutional Neural Networks (CNNs)',
          'BERT and GPT Models',
          'Machine Translation',
          'Natural Language Processing'
        ],
        examples: [
          'Google Translate uses Transformer-based models',
          'BERT for search query understanding',
          'GPT models for text generation',
          'T5 for text-to-text transfer tasks'
        ],
        difficulty: 'advanced'
      }
    } else if (isMethodology) {
      return {
        sectionId,
        originalText: sectionText,
        explanation: `This methodology section describes the experimental setup, model architecture details, training procedures, and evaluation metrics used in the research. It provides the technical foundation for reproducing and understanding the results.`,
        simplifiedVersion: `This part explains exactly how the researchers conducted their experiments - what data they used, how they trained their model, and how they measured success.`,
        keyConcepts: [
          'Experimental Design',
          'Model Architecture',
          'Training Protocol',
          'Evaluation Metrics',
          'Hyperparameters'
        ],
        relatedConcepts: [
          'Statistical Significance',
          'Baseline Comparisons',
          'Cross-validation',
          'Reproducibility'
        ],
        examples: [
          'WMT translation datasets',
          'BLEU score evaluation',
          'Adam optimizer',
          'Learning rate scheduling'
        ],
        difficulty: 'intermediate'
      }
    } else {
      return {
        sectionId,
        originalText: sectionText,
        explanation: `This section presents important findings and analysis from the research study. It demonstrates the effectiveness of the proposed approach through quantitative results and qualitative analysis.`,
        simplifiedVersion: `This part shows the results of the experiments and explains what they mean for the field of study.`,
        keyConcepts: [
          'Performance Metrics',
          'Statistical Analysis',
          'Comparative Results',
          'Significance Testing'
        ],
        relatedConcepts: [
          'Baseline Methods',
          'State-of-the-art',
          'Error Analysis',
          'Ablation Studies'
        ],
        examples: [
          'BLEU score improvements',
          'Training time reduction',
          'Model size comparison',
          'Quality assessment'
        ],
        difficulty: 'intermediate'
      }
    }
  }

  // Clear struggle patterns when user accepts help
  clearStrugglePatterns(sectionId: string) {
    this.strugglePatterns = this.strugglePatterns.filter(p => p.sectionId !== sectionId)
    this.userBehavior.delete(sectionId)
  }

  // Disable/enable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  // Get current struggle patterns
  getStrugglePatterns(): StrugglePattern[] {
    return [...this.strugglePatterns]
  }
}

// Export singleton instance
export const contextualAI = new ContextualAIService()

// Export types for components
export type { StrugglePattern, UserAction, ContextualHelp }
