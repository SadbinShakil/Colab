import React, { useState } from 'react'
import { Clipboard, ChevronDown, ChevronUp, Sparkles, Info, Users, Calendar, BookOpen, Lightbulb, FlaskConical, BarChart, AlertTriangle, Globe, Loader2, X, RefreshCw, Check } from 'lucide-react'

interface AISummaryPanelProps {
  summary: Record<string, string>
  loading: boolean
  open: boolean
  onClose: () => void
  onAskMore?: (section: string) => void
  onRegenerate?: () => void
  lastUpdated?: string
}

const sectionMeta: Record<string, { label: string; icon: React.ReactNode; askMore?: boolean; color: string }> = {
  title: { label: 'Title', icon: <BookOpen className="w-4 h-4" />, color: 'bg-blue-100' },
  authors: { label: 'Authors', icon: <Users className="w-4 h-4" />, color: 'bg-green-100' },
  year: { label: 'Year', icon: <Calendar className="w-4 h-4" />, color: 'bg-purple-100' },
  journal: { label: 'Journal/Conference', icon: <Globe className="w-4 h-4" />, color: 'bg-cyan-100' },
  abstract: { label: 'Abstract', icon: <Info className="w-4 h-4" />, color: 'bg-gray-100' },
  keyFindings: { label: 'Key Findings', icon: <Lightbulb className="w-4 h-4" />, color: 'bg-yellow-100', askMore: true },
  methods: { label: 'Methods/Approach', icon: <FlaskConical className="w-4 h-4" />, color: 'bg-pink-100', askMore: true },
  figures: { label: 'Notable Figures/Tables', icon: <BarChart className="w-4 h-4" />, color: 'bg-indigo-100' },
  limitations: { label: 'Limitations', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-100', askMore: true },
  applications: { label: 'Applications/Impact', icon: <Sparkles className="w-4 h-4" />, color: 'bg-teal-100' },
}

const sectionOrder = [
  'title', 'authors', 'year', 'journal', 'abstract', 'keyFindings', 'methods', 'figures', 'limitations', 'applications'
]

export default function AISummaryPanel({ summary, loading, open, onClose, onAskMore, onRegenerate, lastUpdated }: AISummaryPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  const handleToggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className={`fixed top-0 right-0 h-full z-50 transition-transform duration-500 ${open ? 'translate-x-0' : 'translate-x-full'} w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col`} style={{ boxShadow: open ? '0 0 32px 0 rgba(80,80,180,0.10)' : undefined }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-2">
          <span className="bg-blue-200 rounded-full p-2"><Sparkles className="w-5 h-5 text-blue-700" /></span>
          <span className="font-semibold text-lg text-blue-900">AI Paper Summary</span>
        </div>
        <div className="flex items-center space-x-2">
          {onRegenerate && (
            <button onClick={onRegenerate} className="text-blue-500 hover:text-blue-700 p-1 rounded-full transition-colors" title="Regenerate summary">
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full transition-colors" title="Close">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
      {/* Last updated */}
      {lastUpdated && (
        <div className="text-xs text-gray-500 px-5 pt-2 pb-1">Last updated: {lastUpdated}</div>
      )}
      {/* Loading Spinner or Content */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <span className="text-blue-700 font-medium">Generating summary...</span>
          <div className="w-full mt-6 space-y-3">
            {sectionOrder.map(key => (
              <div key={key} className="h-12 bg-gray-100 rounded-lg mx-5 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {sectionOrder.map((key, idx) => {
            const meta = sectionMeta[key]
            const value = summary[key] || 'Not specified'
            const isExpandable = value.length > 120 || meta.askMore
            const isOpen = expanded[key] || !isExpandable
            return (
              <div key={key} className={`bg-white rounded-xl border border-gray-100 shadow-sm mb-2 transition-all duration-300 ${isOpen ? 'ring-1 ring-blue-100' : ''}`}
                style={{ boxShadow: isOpen ? '0 2px 12px 0 rgba(80,80,180,0.07)' : undefined }}>
                <div className="flex items-center justify-between px-4 py-2 cursor-pointer group" onClick={() => isExpandable && handleToggle(key)}>
                  <div className="flex items-center space-x-3">
                    <span className={`p-2 rounded-full ${meta.color} flex items-center justify-center`}>{meta.icon}</span>
                    <span className="font-semibold text-gray-800 text-base">{meta.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-1 rounded hover:bg-gray-200 transition-colors relative"
                      onClick={e => { e.stopPropagation(); handleCopy(key, value) }}
                      title="Copy section"
                    >
                      {copied === key ? <Check className="w-4 h-4 text-green-600" /> : <Clipboard className="w-4 h-4 text-gray-400" />}
                      {copied === key && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs rounded px-2 py-0.5 shadow">Copied!</span>
                      )}
                    </button>
                    {meta.askMore && onAskMore && (
                      <button
                        className="p-1 rounded hover:bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 transition-colors"
                        onClick={e => { e.stopPropagation(); onAskMore(key) }}
                      >
                        Ask more
                      </button>
                    )}
                    {isExpandable && (
                      isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" /> : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </div>
                </div>
                <div className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-96 py-2' : 'max-h-0 py-0'}`}
                  style={{ borderTop: idx > 0 ? '1px solid #f3f4f6' : undefined }}>
                  {isOpen && (
                    <div className="px-4 pb-3 text-gray-700 text-sm whitespace-pre-line">
                      {value}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* Mobile drag handle */}
      <div className="block md:hidden w-16 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-3" />
    </div>
  )
} 