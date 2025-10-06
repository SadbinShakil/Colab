'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Target, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react'
import type { AlignedClaim } from '@/lib/advanced-analysis-pack'

interface ClaimEvidenceEngineProps {
  alignedClaims: AlignedClaim[]
  onGoToPage?: (page: number) => void
}

export function ClaimEvidenceEngine({ alignedClaims, onGoToPage }: ClaimEvidenceEngineProps) {
  const getSupportLevel = (claim: AlignedClaim) => {
    if (claim.abstained) return 'unsupported'
    if (claim.overallConfidence >= 0.7) return 'supported'
    if (claim.overallConfidence >= 0.4) return 'partial'
    return 'unsupported'
  }

  const getSupportIcon = (level: string) => {
    switch (level) {
      case 'supported': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'partial': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'unsupported': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Target className="w-4 h-4 text-gray-500" />
    }
  }

  const getSupportBadge = (level: string) => {
    switch (level) {
      case 'supported': return 'Supported'
      case 'partial': return 'Partially'
      case 'unsupported': return 'Unsupported'
      default: return 'Unknown'
    }
  }

  const getSupportColor = (level: string) => {
    switch (level) {
      case 'supported': return 'bg-green-500/20 text-green-300 border-green-400/30'
      case 'partial': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
      case 'unsupported': return 'bg-red-500/20 text-red-300 border-red-400/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30'
    }
  }

  const supportedClaims = alignedClaims.filter(c => getSupportLevel(c) === 'supported')
  const partialClaims = alignedClaims.filter(c => getSupportLevel(c) === 'partial')
  const unsupportedClaims = alignedClaims.filter(c => getSupportLevel(c) === 'unsupported')

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-lg">
            <Target className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Claim-Evidence Engine</h3>
            <p className="text-gray-300 text-sm">Auditable research claims with evidence mapping</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
            {supportedClaims.length} Supported
          </Badge>
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
            {partialClaims.length} Partial
          </Badge>
          <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
            {unsupportedClaims.length} Unsupported
          </Badge>
        </div>
      </div>

      {/* Claim Cards */}
      <div className="space-y-4">
        {alignedClaims.map((alignedClaim, index) => {
          const supportLevel = getSupportLevel(alignedClaim)
          
          return (
            <div
              key={index}
              className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                supportLevel === 'supported' ? 'bg-green-500/10 border-green-400/30' :
                supportLevel === 'partial' ? 'bg-yellow-500/10 border-yellow-400/30' :
                'bg-red-500/10 border-red-400/30'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getSupportIcon(supportLevel)}
                  <div>
                    <p className="text-gray-200 text-sm font-medium leading-relaxed">
                      {alignedClaim.claim.text}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs px-2 py-1 ${getSupportColor(supportLevel)}`}>
                        {getSupportBadge(supportLevel)}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Confidence: {Math.round(alignedClaim.overallConfidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Links */}
              {alignedClaim.hits.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">Evidence:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {alignedClaim.hits.map((hit, hitIndex) => (
                      <button
                        key={hitIndex}
                        onClick={() => onGoToPage?.(hit.page)}
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-md hover:bg-blue-500/30 transition-colors border border-blue-400/30"
                        title={`Page ${hit.page}: ${hit.snippet.slice(0, 100)}...`}
                      >
                        P{hit.page} ({Math.round(hit.confidence * 100)}%)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Abstained Indicator */}
              {alignedClaim.abstained && (
                <div className="mt-3 p-2 bg-red-500/20 rounded-lg border border-red-400/30">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-300">
                      This claim was marked as unverifiable (hallucination guard)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-green-500/10 border border-green-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">Well Supported</span>
          </div>
          <p className="text-2xl font-bold text-white">{supportedClaims.length}</p>
          <p className="text-xs text-green-200">
            {alignedClaims.length > 0 ? Math.round((supportedClaims.length / alignedClaims.length) * 100) : 0}% of claims
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">Partially Supported</span>
          </div>
          <p className="text-2xl font-bold text-white">{partialClaims.length}</p>
          <p className="text-xs text-yellow-200">
            {alignedClaims.length > 0 ? Math.round((partialClaims.length / alignedClaims.length) * 100) : 0}% of claims
          </p>
        </div>

        <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-300">Unsupported</span>
          </div>
          <p className="text-2xl font-bold text-white">{unsupportedClaims.length}</p>
          <p className="text-xs text-red-200">
            {alignedClaims.length > 0 ? Math.round((unsupportedClaims.length / alignedClaims.length) * 100) : 0}% of claims
          </p>
        </div>
      </div>
    </div>
  )
}
