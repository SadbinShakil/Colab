'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Brain, Zap, DollarSign, Clock, Layers } from 'lucide-react'

interface ModelInfo {
  name: string
  description: string
  cost: 'Low' | 'Medium' | 'High' | 'Very Low'
  speed: 'Fast' | 'Medium' | 'Slow'
  quality: 'Good' | 'Very Good' | 'Excellent'
  bestFor: string[]
  contextWindow: string
  pricing?: string
}

const models: Record<string, ModelInfo> = {
  'gpt-4o': {
    name: 'GPT-4o',
    description: 'Latest and most capable model with multimodal abilities',
    cost: 'High',
    speed: 'Medium',
    quality: 'Excellent',
    bestFor: ['Complex reasoning', 'Research analysis', 'Creative tasks', 'Latest capabilities'],
    contextWindow: '128K tokens',
    pricing: '$15.00/1M input tokens'
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    description: 'Balanced performance with large context window',
    cost: 'Medium',
    speed: 'Medium',
    quality: 'Excellent',
    bestFor: ['Technical analysis', 'Code generation', 'Long documents'],
    contextWindow: '128K tokens',
    pricing: '$10.00/1M input tokens'
  },
  'gpt-4': {
    name: 'GPT-4',
    description: 'High-quality reasoning and analysis',
    cost: 'High',
    speed: 'Slow',
    quality: 'Excellent',
    bestFor: ['Complex reasoning', 'Research analysis', 'Academic writing'],
    contextWindow: '8K tokens',
    pricing: '$30.00/1M input tokens'
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective for most tasks',
    cost: 'Low',
    speed: 'Fast',
    quality: 'Very Good',
    bestFor: ['Quick summaries', 'Simple analysis', 'Cost optimization'],
    contextWindow: '16K tokens',
    pricing: '$0.50/1M input tokens'
  }
}

const analysisTypes = {
  'comprehensive': {
    name: 'Comprehensive Analysis',
    description: 'Deep research analysis with methodology, significance, and future directions',
    recommendedModel: 'gpt-4o',
    icon: <Layers className="w-4 h-4" />
  },
  'mathematical': {
    name: 'Mathematical Focus',
    description: 'Focus on equations, proofs, and computational methods',
    recommendedModel: 'gpt-4-turbo',
    icon: <Brain className="w-4 h-4" />
  },
  'summary': {
    name: 'Quick Summary',
    description: 'Fast, clear summaries for general audiences',
    recommendedModel: 'gpt-3.5-turbo',
    icon: <Zap className="w-4 h-4" />
  },
  'research': {
    name: 'Research Analysis',
    description: 'Academic research with detailed methodology analysis',
    recommendedModel: 'gpt-4',
    icon: <Brain className="w-4 h-4" />
  }
}

interface ModelSelectorProps {
  onSelectionChange: (model: string, analysisType: string) => void
  disabled?: boolean
}

export default function ModelSelector({ onSelectionChange, disabled = false }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo')
  const [selectedAnalysis, setSelectedAnalysis] = useState('comprehensive')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSelectionChange = (model?: string, analysis?: string) => {
    const finalModel = model || selectedModel
    const finalAnalysis = analysis || selectedAnalysis
    
    if (model) setSelectedModel(model)
    if (analysis) setSelectedAnalysis(analysis)
    
    onSelectionChange(finalModel, finalAnalysis)
  }

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'Very Low': return 'text-green-600 bg-green-50'
      case 'Low': return 'text-green-600 bg-green-50'
      case 'Medium': return 'text-yellow-600 bg-yellow-50'
      case 'High': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'Fast': return 'text-green-600'
      case 'Medium': return 'text-yellow-600'
      case 'Slow': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <span>AI Model Selection</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Type Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Analysis Type</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(analysisTypes).map(([key, type]) => (
              <Button
                key={key}
                variant={selectedAnalysis === key ? "default" : "outline"}
                size="sm"
                className="h-auto p-3 text-left justify-start"
                onClick={() => handleSelectionChange(undefined, key)}
                disabled={disabled}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {type.icon}
                    <span className="font-medium text-xs">{type.name}</span>
                  </div>
                  <p className="text-xs text-gray-600">{type.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">AI Model</label>
          {showAdvanced ? (
            <div className="space-y-3">
              {Object.entries(models).map(([key, model]) => (
                <div
                  key={key}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedModel === key 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectionChange(key, undefined)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm">{model.name}</h4>
                        <Badge variant="outline" className={getCostColor(model.cost)}>
                          <DollarSign className="w-3 h-3 mr-1" />
                          {model.cost}
                        </Badge>
                        <Badge variant="outline" className={getSpeedColor(model.speed)}>
                          <Clock className="w-3 h-3 mr-1" />
                          {model.speed}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{model.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {model.bestFor.slice(0, 3).map((use, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {use}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex justify-between">
                    <span>Context: {model.contextWindow}</span>
                    <span>{model.pricing}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Select 
              value={selectedModel} 
              onValueChange={(value) => handleSelectionChange(value, undefined)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(models).map(([key, model]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      <div className="flex items-center space-x-1 ml-2">
                        <Badge variant="outline" className={`${getCostColor(model.cost)} text-xs`}>
                          {model.cost}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Recommendation */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Brain className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Recommended</p>
              <p className="text-xs text-blue-600">
                For {analysisTypes[selectedAnalysis as keyof typeof analysisTypes].name.toLowerCase()}, 
                we recommend <strong>{models[analysisTypes[selectedAnalysis as keyof typeof analysisTypes].recommendedModel].name}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Current Selection Summary */}
        <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
          <strong>Selected:</strong> {models[selectedModel].name} for {analysisTypes[selectedAnalysis as keyof typeof analysisTypes].name}
        </div>
      </CardContent>
    </Card>
  )
}
