'use client'

import React from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PageMap {
  [pageNumber: number]: string;
}

export interface Claim {
  id: string;
  text: string;
  type: 'contribution' | 'method' | 'result' | 'limitation' | 'claim';
  confidence: number;
  source?: string;
}

export interface EvidenceHit {
  page: number;
  snippet: string;
  confidence: number;
  coverage: number; // 0-1, how much of the claim this snippet covers
  position: number; // character position in page
}

export interface AlignedClaim {
  claim: Claim;
  hits: EvidenceHit[];
  abstained: boolean;
  overallConfidence: number;
}

export interface EvidenceMatrix {
  claims: Claim[];
  pages: number[];
  matrix: number[][]; // [claimIndex][pageIndex] = confidence
}

export interface IntegrityScore {
  overall: number;
  cherryPickRisk: number;
  claimQuoteDrift: number;
  weakEvidencePockets: number;
  contradictionHints: number;
  coverageGaps: number;
}

export interface NormalizedMetric {
  name: string;
  value: number;
  unit: string;
  direction: 'higher' | 'lower' | 'neutral';
  baseline?: {
    value: number;
    delta: number;
    deltaPercent: number;
  };
  evidence: EvidenceHit[];
}

export interface ReviewerRubric {
  significance: number;
  originality: number;
  technical: number;
  clarity: number;
  reproducibility: number;
  integrity: number;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Split document content into pages using page markers
 */
export function splitByPages(content: string): PageMap {
  const parts = content.split(/\n--- PAGE\s+(\d+)\s+---\n/);
  const pages: PageMap = {};
  
  for (let i = 1; i < parts.length; i += 2) {
    const pageNum = parseInt(parts[i], 10);
    pages[pageNum] = parts[i + 1] || '';
  }
  
  return pages;
}

/**
 * Extract claims from summary fields
 */
export function buildClaims(summary: {
  title?: string;
  abstract?: string;
  intro?: string;
  conclusion?: string;
  keyFindings?: string;
  methods?: string;
  results?: string;
  limitations?: string;
}): Claim[] {
  const claims: Claim[] = [];
  
  // Extract from abstract
  if (summary.abstract) {
    const sentences = summary.abstract.split(/[.!?]+/).filter(s => s.trim().length > 20);
    sentences.forEach((sentence, i) => {
      claims.push({
        id: `abstract_${i}`,
        text: sentence.trim(),
        type: 'contribution',
        confidence: 0.8,
        source: 'abstract'
      });
    });
  }
  
  // Extract from key findings
  if (summary.keyFindings) {
    const findings = summary.keyFindings.split(/[.!?]+/).filter(s => s.trim().length > 30);
    findings.forEach((finding, i) => {
      claims.push({
        id: `finding_${i}`,
        text: finding.trim(),
        type: 'contribution',
        confidence: 0.9,
        source: 'keyFindings'
      });
    });
  }
  
  // Extract from methods
  if (summary.methods) {
    const methods = summary.methods.split(/[.!?]+/).filter(s => s.trim().length > 30);
    methods.forEach((method, i) => {
      claims.push({
        id: `method_${i}`,
        text: method.trim(),
        type: 'method',
        confidence: 0.85,
        source: 'methods'
      });
    });
  }
  
  // Extract from results
  if (summary.results) {
    const results = summary.results.split(/[.!?]+/).filter(s => s.trim().length > 30);
    results.forEach((result, i) => {
      claims.push({
        id: `result_${i}`,
        text: result.trim(),
        type: 'result',
        confidence: 0.9,
        source: 'results'
      });
    });
  }
  
  // Extract from limitations
  if (summary.limitations) {
    const limitations = summary.limitations.split(/[.!?]+/).filter(s => s.trim().length > 20);
    limitations.forEach((limitation, i) => {
      claims.push({
        id: `limitation_${i}`,
        text: limitation.trim(),
        type: 'limitation',
        confidence: 0.8,
        source: 'limitations'
      });
    });
  }
  
  return claims;
}

/**
 * Find evidence for claims in page content
 */
export function alignEvidence(params: {
  claims: Claim[];
  pages: PageMap;
  onGoToPage?: (page: number) => void;
}): AlignedClaim[] {
  const { claims, pages } = params;
  
  return claims.map(claim => {
    const hits: EvidenceHit[] = [];
    
    // Search for evidence in each page
    Object.entries(pages).forEach(([pageStr, content]) => {
      const pageNum = parseInt(pageStr, 10);
      const lowerContent = content.toLowerCase();
      const lowerClaim = claim.text.toLowerCase();
      
      // Try exact phrase matching first
      const exactMatch = lowerContent.indexOf(lowerClaim);
      if (exactMatch !== -1) {
        const snippet = content.substring(
          Math.max(0, exactMatch - 50),
          Math.min(content.length, exactMatch + lowerClaim.length + 50)
        );
        
        hits.push({
          page: pageNum,
          snippet: snippet.trim(),
          confidence: 0.95,
          coverage: 0.9,
          position: exactMatch
        });
        return;
      }
      
      // Try keyword matching
      const keywords = lowerClaim.split(/\s+/).filter(word => word.length > 3);
      const matchedKeywords = keywords.filter(keyword => lowerContent.includes(keyword));
      
      if (matchedKeywords.length >= Math.ceil(keywords.length * 0.6)) {
        // Find the best snippet containing the most keywords
        let bestSnippet = '';
        let bestScore = 0;
        let bestPosition = 0;
        
        for (let i = 0; i < content.length - 100; i += 50) {
          const snippet = content.substring(i, i + 150).toLowerCase();
          const score = matchedKeywords.reduce((acc, keyword) => 
            acc + (snippet.includes(keyword) ? 1 : 0), 0
          );
          
          if (score > bestScore) {
            bestScore = score;
            bestSnippet = content.substring(i, i + 150);
            bestPosition = i;
          }
        }
        
        if (bestSnippet && bestScore > 0) {
          hits.push({
            page: pageNum,
            snippet: bestSnippet.trim(),
            confidence: 0.7 + (bestScore / keywords.length) * 0.2,
            coverage: bestScore / keywords.length,
            position: bestPosition
          });
        }
      }
    });
    
    // Sort hits by confidence and coverage
    hits.sort((a, b) => (b.confidence * b.coverage) - (a.confidence * a.coverage));
    
    // Calculate overall confidence
    const overallConfidence = hits.length > 0 
      ? hits.reduce((acc, hit) => acc + (hit.confidence * hit.coverage), 0) / hits.length
      : 0;
    
    return {
      claim,
      hits: hits.slice(0, 3), // Keep top 3 hits
      abstained: overallConfidence < 0.3,
      overallConfidence
    };
  });
}

/**
 * Hallucination guard - marks low-confidence claims as abstained
 */
export function hallucinationGuard(
  alignedClaims: AlignedClaim[], 
  threshold: number = 0.33
): AlignedClaim[] {
  return alignedClaims.map(aligned => ({
    ...aligned,
    abstained: aligned.overallConfidence < threshold || aligned.hits.length === 0
  }));
}

/**
 * Create evidence matrix for visualization
 */
export function makeEvidenceMatrix(alignedClaims: AlignedClaim[]): EvidenceMatrix {
  const claims = alignedClaims.map(a => a.claim);
  const pages = Array.from(new Set(
    alignedClaims.flatMap(a => a.hits.map(h => h.page))
  )).sort((a, b) => a - b);
  
  const matrix = claims.map(claim => 
    pages.map(page => {
      const aligned = alignedClaims.find(a => a.claim.id === claim.id);
      const hit = aligned?.hits.find(h => h.page === page);
      return hit ? hit.confidence : 0;
    })
  );
  
  return { claims, pages, matrix };
}

/**
 * Score document integrity
 */
export function scoreIntegrity(params: {
  claims: Claim[];
  aligned: AlignedClaim[];
  fullText: string;
}): IntegrityScore {
  const { claims, aligned, fullText } = params;
  
  // Cherry-pick risk: claims with high confidence but low evidence diversity
  const cherryPickRisk = aligned.reduce((acc, a) => {
    if (a.hits.length === 1 && a.overallConfidence > 0.8) {
      return acc + 0.1;
    }
    return acc;
  }, 0) / aligned.length;
  
  // Claim-quote drift: claims that don't match their evidence well
  const claimQuoteDrift = aligned.reduce((acc, a) => {
    if (a.hits.length > 0) {
      const avgCoverage = a.hits.reduce((sum, hit) => sum + hit.coverage, 0) / a.hits.length;
      if (avgCoverage < 0.5) {
        return acc + (0.5 - avgCoverage);
      }
    }
    return acc;
  }, 0) / aligned.length;
  
  // Weak evidence pockets: pages with many claims but low confidence
  const pageConfidences: { [page: number]: number[] } = {};
  aligned.forEach(a => {
    a.hits.forEach(hit => {
      if (!pageConfidences[hit.page]) {
        pageConfidences[hit.page] = [];
      }
      pageConfidences[hit.page].push(hit.confidence);
    });
  });
  
  const weakEvidencePockets = Object.values(pageConfidences).reduce((acc, confidences) => {
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    if (avgConfidence < 0.6 && confidences.length > 2) {
      return acc + 0.1;
    }
    return acc;
  }, 0);
  
  // Contradiction hints: claims that seem to contradict each other
  let contradictionHints = 0;
  for (let i = 0; i < aligned.length; i++) {
    for (let j = i + 1; j < aligned.length; j++) {
      const claim1 = aligned[i].claim.text.toLowerCase();
      const claim2 = aligned[j].claim.text.toLowerCase();
      
      // Simple contradiction detection
      if ((claim1.includes('improve') && claim2.includes('decrease')) ||
          (claim1.includes('increase') && claim2.includes('reduce')) ||
          (claim1.includes('better') && claim2.includes('worse'))) {
        contradictionHints += 0.1;
      }
    }
  }
  
  // Coverage gaps: claims with no evidence
  const coverageGaps = aligned.filter(a => a.hits.length === 0).length / aligned.length;
  
  // Overall integrity score
  const overall = Math.max(0, 1 - (
    cherryPickRisk + 
    claimQuoteDrift + 
    weakEvidencePockets + 
    contradictionHints + 
    coverageGaps
  ));
  
  return {
    overall,
    cherryPickRisk,
    claimQuoteDrift,
    weakEvidencePockets,
    contradictionHints,
    coverageGaps
  };
}

/**
 * Normalize metrics from document content
 */
export function normalizeMetrics(
  pages: PageMap,
  alignedClaims: AlignedClaim[]
): NormalizedMetric[] {
  const metrics: NormalizedMetric[] = [];
  const metricPatterns = [
    { name: 'Accuracy', pattern: /accuracy[:\s]*(\d+\.?\d*)\s*%/gi, direction: 'higher' as const },
    { name: 'Precision', pattern: /precision[:\s]*(\d+\.?\d*)\s*%/gi, direction: 'higher' as const },
    { name: 'Recall', pattern: /recall[:\s]*(\d+\.?\d*)\s*%/gi, direction: 'higher' as const },
    { name: 'F1-Score', pattern: /f1[:\s]*(\d+\.?\d*)\s*%/gi, direction: 'higher' as const },
    { name: 'RMSE', pattern: /rmse[:\s]*(\d+\.?\d*)/gi, direction: 'lower' as const },
    { name: 'MAE', pattern: /mae[:\s]*(\d+\.?\d*)/gi, direction: 'lower' as const },
    { name: 'AUC', pattern: /auc[:\s]*(\d+\.?\d*)/gi, direction: 'higher' as const }
  ];
  
  Object.entries(pages).forEach(([pageStr, content]) => {
    const pageNum = parseInt(pageStr, 10);
    
    metricPatterns.forEach(({ name, pattern, direction }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          // Find evidence for this metric
          const evidence: EvidenceHit[] = [{
            page: pageNum,
            snippet: content.substring(
              Math.max(0, match.index - 50),
              Math.min(content.length, match.index + 100)
            ).trim(),
            confidence: 0.9,
            coverage: 1.0,
            position: match.index
          }];
          
          metrics.push({
            name,
            value,
            unit: name.includes('Score') || name.includes('AUC') ? '' : '%',
            direction,
            evidence
          });
        }
      }
    });
  });
  
  // Add baseline comparisons if available
  const baselineMap: { [key: string]: number } = {
    'Accuracy': 0.85,
    'Precision': 0.80,
    'Recall': 0.78,
    'F1-Score': 0.79,
    'RMSE': 10.0,
    'MAE': 8.0,
    'AUC': 0.90
  };
  
  return metrics.map(metric => {
    const baseline = baselineMap[metric.name];
    if (baseline) {
      const delta = metric.value - baseline;
      const deltaPercent = (delta / baseline) * 100;
      
      return {
        ...metric,
        baseline: {
          value: baseline,
          delta,
          deltaPercent
        }
      };
    }
    return metric;
  });
}

/**
 * Generate minimal reviewer rubric
 */
export function exportMinimalReview(params: {
  integrity: IntegrityScore;
  alignedClaims: AlignedClaim[];
  metrics: NormalizedMetric[];
}): ReviewerRubric {
  const { integrity, alignedClaims, metrics } = params;
  
  // Significance: based on claim importance and novelty
  const significance = Math.min(5, Math.max(1, 
    alignedClaims.filter(a => !a.abstained && a.claim.type === 'contribution').length * 0.8 + 
    (alignedClaims.filter(a => a.claim.text.toLowerCase().includes('novel')).length * 0.5)
  ));
  
  // Originality: based on novel claims and unique contributions
  const originality = Math.min(5, Math.max(1,
    alignedClaims.filter(a => 
      !a.abstained && 
      (a.claim.text.toLowerCase().includes('novel') || 
       a.claim.text.toLowerCase().includes('new') ||
       a.claim.text.toLowerCase().includes('propose'))
    ).length * 0.6
  ));
  
  // Technical: based on method claims and metrics
  const technical = Math.min(5, Math.max(1,
    alignedClaims.filter(a => !a.abstained && a.claim.type === 'method').length * 0.7 +
    metrics.length * 0.3
  ));
  
  // Clarity: based on claim confidence and evidence quality
  const clarity = Math.min(5, Math.max(1,
    alignedClaims.filter(a => !a.abstained).reduce((acc, a) => acc + a.overallConfidence, 0) / 
    alignedClaims.length * 5
  ));
  
  // Reproducibility: based on method detail and limitations
  const reproducibility = Math.min(5, Math.max(1,
    alignedClaims.filter(a => !a.abstained && a.claim.type === 'method').length * 0.5 +
    alignedClaims.filter(a => !a.abstained && a.claim.type === 'limitation').length * 0.3 +
    2 // Base score
  ));
  
  return {
    significance: Math.round(significance * 10) / 10,
    originality: Math.round(originality * 10) / 10,
    technical: Math.round(technical * 10) / 10,
    clarity: Math.round(clarity * 10) / 10,
    reproducibility: Math.round(reproducibility * 10) / 10,
    integrity: Math.round(integrity.overall * 5 * 10) / 10
  };
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

/**
 * Evidence Matrix Component
 */
export function EvidenceMatrixView({ 
  matrix, 
  onGoTo 
}: { 
  matrix: EvidenceMatrix; 
  onGoTo?: (page: number) => void;
}) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h4 className="font-semibold text-gray-900 mb-4">Evidence Matrix</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 font-medium text-gray-600">Claim</th>
              {matrix.pages.map(page => (
                <th key={page} className="text-center p-2 font-medium text-gray-600">
                  P{page}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.claims.map((claim, i) => (
              <tr key={`claim-${claim.id || i}`} className="border-b border-gray-100">
                <td className="p-2 text-gray-800 max-w-xs">
                  <div className="truncate" title={claim.text}>
                    {claim.text}
                  </div>
                </td>
                {matrix.pages.map((page, j) => {
                  const confidence = matrix.matrix[i][j];
                  const colorIntensity = Math.round(confidence * 255);
                  return (
                    <td key={`claim-${claim.id || i}-page-${page}`} className="p-1 text-center">
                      <div
                        className="w-8 h-8 rounded cursor-pointer flex items-center justify-center text-white text-xs font-medium hover:opacity-80"
                        style={{ 
                          backgroundColor: `rgba(59, 130, 246, ${confidence})`,
                          color: confidence > 0.5 ? 'white' : 'gray'
                        }}
                        onClick={() => onGoTo?.(page)}
                        title={`Confidence: ${(confidence * 100).toFixed(0)}%`}
                      >
                        {confidence > 0 ? (confidence * 100).toFixed(0) : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Integrity Score Component
 */
export function IntegrityScoreView({ score }: { score: IntegrityScore }) {
  const getScoreColor = (value: number) => {
    if (value >= 0.8) return 'text-green-600 bg-green-100';
    if (value >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h4 className="font-semibold text-gray-900 mb-4">Integrity Analysis</h4>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Overall Integrity</span>
          <span className={`px-2 py-1 rounded text-sm font-semibold ${getScoreColor(score.overall)}`}>
            {(score.overall * 100).toFixed(0)}%
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Cherry-pick Risk</span>
            <span className="text-xs text-gray-500">{(score.cherryPickRisk * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Claim-Quote Drift</span>
            <span className="text-xs text-gray-500">{(score.claimQuoteDrift * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Weak Evidence</span>
            <span className="text-xs text-gray-500">{(score.weakEvidencePockets * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Contradictions</span>
            <span className="text-xs text-gray-500">{(score.contradictionHints * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Unsupported Claims Component
 */
export function UnsupportedClaimsView({ 
  claims 
}: { 
  claims: AlignedClaim[] 
}) {
  const unsupported = claims.filter(c => c.abstained || c.overallConfidence < 0.4);
  
  if (unsupported.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h4 className="font-semibold text-gray-900 mb-2">Unsupported Claims</h4>
        <p className="text-green-600 text-sm">✅ All claims are well-supported</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h4 className="font-semibold text-gray-900 mb-4">Unsupported Claims</h4>
      <div className="space-y-2">
        {unsupported.map((aligned, i) => (
          <div key={`unsupported-${aligned.claim.id || i}`} className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-gray-800 mb-2">{aligned.claim.text}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">
                Confidence: {(aligned.overallConfidence * 100).toFixed(0)}%
              </span>
              {aligned.abstained && (
                <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                  Abstained
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
