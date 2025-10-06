'use client'

import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, BarChart3, Settings } from 'lucide-react'
import type { NormalizedMetric } from '@/lib/advanced-analysis-pack'

interface CounterfactualPanelProps {
  baseMetrics: NormalizedMetric[]
}

interface CounterfactualKnobs {
  dataPct: number      // Dataset size multiplier (0.5 to 2.0)
  noisePct: number     // Label noise percentage (0 to 0.5)
  computeX: number     // Compute budget multiplier (0.5 to 3.0)
  domainShift: number  // Domain shift severity (0 to 1.0)
}

interface SimulatedMetric extends NormalizedMetric {
  simulated: number
  delta: number
  deltaPercent: number
}

// Counterfactual rules engine
function whatIf(base: NormalizedMetric[], knobs: CounterfactualKnobs): SimulatedMetric[] {
  return base.map(metric => {
    // Calculate delta based on metric type and knobs
    let delta = 0
    
    // Dataset size effects
    if (metric.name.toLowerCase().includes('recall') || metric.name.toLowerCase().includes('sensitivity')) {
      delta += (knobs.dataPct - 1) * 0.4  // Recall benefits more from data
    } else if (metric.name.toLowerCase().includes('precision')) {
      delta += (knobs.dataPct - 1) * 0.15  // Precision less sensitive to data
    } else {
      delta += (knobs.dataPct - 1) * 0.25  // General metrics
    }
    
    // Noise effects
    if (metric.name.toLowerCase().includes('precision') || metric.name.toLowerCase().includes('specificity')) {
      delta -= knobs.noisePct * 0.35  // Precision hurts more from noise
    } else if (metric.name.toLowerCase().includes('recall')) {
      delta -= knobs.noisePct * 0.2   // Recall less sensitive to noise
    } else {
      delta -= knobs.noisePct * 0.25  // General noise impact
    }
    
    // Compute effects (diminishing returns)
    if (metric.name.toLowerCase().includes('accuracy') || metric.name.toLowerCase().includes('f1')) {
      delta += Math.log(knobs.computeX) * 0.1  // Log scale for compute
    } else {
      delta += Math.log(knobs.computeX) * 0.05
    }
    
    // Domain shift effects
    delta -= knobs.domainShift * 0.3
    
    // Clamp to valid range
    const simulated = Math.max(0, Math.min(1, metric.value + delta))
    const deltaValue = simulated - metric.value
    const deltaPercent = metric.value > 0 ? (deltaValue / metric.value) * 100 : 0
    
    return {
      ...metric,
      simulated,
      delta: deltaValue,
      deltaPercent
    }
  })
}

export function CounterfactualPanel({ baseMetrics }: CounterfactualPanelProps) {
  const [knobs, setKnobs] = useState<CounterfactualKnobs>({
    dataPct: 1.0,
    noisePct: 0.0,
    computeX: 1.0,
    domainShift: 0.0
  })

  const simulatedMetrics = useMemo(() => whatIf(baseMetrics, knobs), [baseMetrics, knobs])

  const updateKnob = (key: keyof CounterfactualKnobs, value: number) => {
    setKnobs(prev => ({ ...prev, [key]: value }))
  }

  const resetKnobs = () => {
    setKnobs({
      dataPct: 1.0,
      noisePct: 0.0,
      computeX: 1.0,
      domainShift: 0.0
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Counterfactual Analysis</h3>
            <p className="text-gray-300 text-sm">What-if simulation for research scenarios</p>
          </div>
        </div>
        
        <button
          onClick={resetKnobs}
          className="px-3 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-md hover:bg-gray-500/30 transition-colors border border-gray-400/30"
        >
          Reset
        </button>
      </div>

      {/* Control Knobs */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Simulation Parameters</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Dataset Size */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Dataset Size</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={knobs.dataPct}
                onChange={(e) => updateKnob('dataPct', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-white font-medium w-12">
                {Math.round(knobs.dataPct * 100)}%
              </span>
            </div>
          </div>

          {/* Label Noise */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Label Noise</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={knobs.noisePct}
                onChange={(e) => updateKnob('noisePct', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-white font-medium w-12">
                {Math.round(knobs.noisePct * 100)}%
              </span>
            </div>
          </div>

          {/* Compute Budget */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Compute Budget</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={knobs.computeX}
                onChange={(e) => updateKnob('computeX', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-white font-medium w-12">
                {knobs.computeX.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Domain Shift */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Domain Shift</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.1"
                value={knobs.domainShift}
                onChange={(e) => updateKnob('domainShift', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-white font-medium w-12">
                {Math.round(knobs.domainShift * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h4 className="text-sm font-medium text-white">Simulated vs Reported Metrics</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-gray-300">Metric</th>
                <th className="text-center p-3 text-gray-300">Reported</th>
                <th className="text-center p-3 text-gray-300">Simulated</th>
                <th className="text-center p-3 text-gray-300">Change</th>
                <th className="text-center p-3 text-gray-300">Trend</th>
              </tr>
            </thead>
            <tbody>
              {simulatedMetrics.map((metric, index) => (
                <tr key={index} className="border-b border-white/5">
                  <td className="p-3 text-white font-medium">{metric.name}</td>
                  <td className="p-3 text-center text-gray-300">
                    {metric.value.toFixed(3)}
                  </td>
                  <td className="p-3 text-center text-white font-medium">
                    {metric.simulated.toFixed(3)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge className={
                      metric.deltaPercent > 0 
                        ? 'bg-green-500/20 text-green-300 border-green-400/30'
                        : metric.deltaPercent < 0
                        ? 'bg-red-500/20 text-red-300 border-red-400/30'
                        : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                    }>
                      {metric.deltaPercent > 0 ? '+' : ''}{metric.deltaPercent.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    {metric.deltaPercent > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400 mx-auto" />
                    ) : metric.deltaPercent < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />
                    ) : (
                      <div className="w-4 h-4 mx-auto bg-gray-400 rounded-full" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-500/10 border border-green-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">Improved</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {simulatedMetrics.filter(m => m.deltaPercent > 0).length}
          </p>
        </div>

        <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-300">Declined</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {simulatedMetrics.filter(m => m.deltaPercent < 0).length}
          </p>
        </div>

        <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Avg Change</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {simulatedMetrics.length > 0 
              ? (simulatedMetrics.reduce((sum, m) => sum + m.deltaPercent, 0) / simulatedMetrics.length).toFixed(1)
              : 0}%
          </p>
        </div>
      </div>
    </div>
  )
}
