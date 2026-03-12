'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Copy,
  Highlighter,
  MessageSquare,
  X,
  Check,
  BookOpen,
  Search,
  Calculator,
  Table2,
  Image as ImageIcon,
  GraduationCap,
  HelpCircle,
  ChevronRight,
  Send
} from 'lucide-react'
import { isTableContent } from '../utils/tableDetector'
import { isImageContent } from '../utils/imageDetector'

interface TextSelectionPopupProps {
  selectedText: string
  position: { x: number; y: number }
  onClose: () => void
  onHighlight?: (color: string) => void
  onAnnotate?: (comment: string) => void
  onAIExplain?: () => void
  onGeneralExplain?: () => void
  onTableExplain?: () => void
  onImageExplain?: () => void
  onPrerequisiteHelp?: () => void
  onStuckHelp?: () => void
  onCopy?: () => void
  documentContext?: string
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#FEF08A', ring: '#EAB308' },
  { name: 'Green',  color: '#BBF7D0', ring: '#22C55E' },
  { name: 'Blue',   color: '#BAE6FD', ring: '#0EA5E9' },
  { name: 'Pink',   color: '#FBCFE8', ring: '#EC4899' },
  { name: 'Orange', color: '#FED7AA', ring: '#F97316' },
]

export default function TextSelectionPopup({
  selectedText,
  position,
  onClose,
  onHighlight,
  onAnnotate,
  onAIExplain,
  onGeneralExplain,
  onTableExplain,
  onImageExplain,
  onPrerequisiteHelp,
  onStuckHelp,
  onCopy,
}: TextSelectionPopupProps) {
  const [view, setView] = useState<'toolbar' | 'highlight' | 'comment'>('toolbar')
  const [annotationText, setAnnotationText] = useState('')
  const [copied, setCopied] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Position the popup
  useEffect(() => {
    if (!popupRef.current) return
    const popup = popupRef.current
    const rect = popup.getBoundingClientRect()
    let left = position.x - rect.width / 2
    let top = position.y - rect.height - 12

    if (left < 8) left = 8
    if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8
    if (top < 8) top = position.y + 20

    popup.style.left = `${left}px`
    popup.style.top = `${top}px`
  }, [position, view])

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(selectedText).catch(() => {})
    setCopied(true)
    if (onCopy) onCopy()
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAnnotate = () => {
    if (annotationText.trim() && onAnnotate) {
      onAnnotate(annotationText)
      setAnnotationText('')
      setView('toolbar')
      onClose()
    }
  }

  const showTable = isTableContent(selectedText)
  const showImage = isImageContent(selectedText)

  if (view === 'highlight') {
    return (
      <div ref={popupRef} className="fixed z-[9999]" style={{ position: 'fixed' }}>
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200/80 p-2 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
          <button onClick={() => setView('toolbar')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
          <div className="w-px h-4 bg-gray-200" />
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.color}
              onClick={() => { onHighlight?.(c.color); onClose() }}
              title={c.name}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110 active:scale-95"
              style={{ backgroundColor: c.color, outline: `2px solid ${c.ring}`, outlineOffset: '1px' }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (view === 'comment') {
    return (
      <div ref={popupRef} className="fixed z-[9999]" style={{ position: 'fixed' }}>
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200/80 w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-600">Add comment</span>
            <button onClick={() => setView('toolbar')} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3">
            <textarea
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Share your thoughts…"
              className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-gray-400"
              rows={3}
              maxLength={500}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnnotate() }}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1">
                {['👍', '❓', '💡', '⚠️'].map((emoji) => (
                  <button key={emoji} type="button" onClick={() => setAnnotationText(p => p + emoji)}
                    className="w-6 h-6 text-sm hover:bg-gray-100 rounded transition-colors">
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAnnotate}
                disabled={!annotationText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Send className="w-3 h-3" />
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main toolbar view
  const Divider = () => <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

  const ToolBtn = ({ icon: Icon, label, onClick, color = 'text-gray-600', bg = 'hover:bg-gray-100' }: {
    icon: React.ElementType; label: string; onClick: () => void; color?: string; bg?: string
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${bg} transition-colors group`}
    >
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-[11px] font-medium ${color}`}>{label}</span>
    </button>
  )

  return (
    <div ref={popupRef} className="fixed z-[9999]" style={{ position: 'fixed' }}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200/80 flex items-center gap-0.5 px-1.5 py-1 animate-in fade-in zoom-in-95 duration-150">

        {/* Core actions */}
        <button onClick={handleCopy} title="Copy" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
        </button>
        <button onClick={() => setView('highlight')} title="Highlight" className="p-2 rounded-lg hover:bg-yellow-50 transition-colors">
          <Highlighter className="w-4 h-4 text-yellow-600" />
        </button>
        <button onClick={() => setView('comment')} title="Comment" className="p-2 rounded-lg hover:bg-blue-50 transition-colors">
          <MessageSquare className="w-4 h-4 text-blue-600" />
        </button>

        <Divider />

        {/* AI actions */}
        <ToolBtn icon={Calculator} label="Math" onClick={() => { onAIExplain?.(); onClose() }} color="text-indigo-600" bg="hover:bg-indigo-50" />
        <ToolBtn icon={BookOpen} label="Explain" onClick={() => { onGeneralExplain?.(); onClose() }} color="text-purple-600" bg="hover:bg-purple-50" />
        {showTable && <ToolBtn icon={Table2} label="Table" onClick={() => { onTableExplain?.(); onClose() }} color="text-orange-600" bg="hover:bg-orange-50" />}
        {showImage && <ToolBtn icon={ImageIcon} label="Image" onClick={() => { onImageExplain?.(); onClose() }} color="text-cyan-600" bg="hover:bg-cyan-50" />}

        <Divider />

        <ToolBtn icon={GraduationCap} label="Prerequisites" onClick={() => { onPrerequisiteHelp?.(); onClose() }} color="text-green-600" bg="hover:bg-green-50" />
        <ToolBtn icon={HelpCircle} label="Stuck?" onClick={() => { onStuckHelp?.(); onClose() }} color="text-rose-600" bg="hover:bg-rose-50" />

        <Divider />

        <button onClick={() => { window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(selectedText)}`, '_blank'); onClose() }}
          title="Search Google Scholar" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Search className="w-4 h-4 text-gray-500" />
        </button>

        <div className="w-px h-5 bg-gray-200" />
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  )
}
