'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquarePlus, BookMarked, Trash2, ChevronDown, ChevronUp, X, Send, Clock, User, MessageCircle, ChevronRight } from 'lucide-react'
import EpistemicTagPicker, { type EpistemicTag } from './EpistemicTagPicker'

export interface MarginalNote {
  id: string
  authorName: string
  authorId: string
  content: string
  passageText: string
  pageNumber: number
  sectionName?: string | null
  epistemicTag?: string | null
  createdAt: string
  replyCount?: number
}

interface MarginalNotesSidebarProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  userId: string
  userName: string
  currentPage: number
  currentSectionName?: string
  selectedPassage?: string   // text selected by user to anchor a new note
  socket: unknown            // Socket.IO client instance
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function PassageQuote({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const short = text.length > 120
  return (
    <div className="mt-1.5 mb-2">
      <p className="text-[11px] text-slate-500 italic leading-relaxed border-l-2 border-indigo-200 pl-2">
        {short && !expanded ? `"${text.slice(0, 120)}…"` : `"${text}"`}
      </p>
      {short && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-0.5 flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-600"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> less</> : <><ChevronDown className="w-3 h-3" /> full passage</>}
        </button>
      )}
    </div>
  )
}

export default function MarginalNotesSidebar({
  isOpen,
  onClose,
  documentId,
  userId,
  userName,
  currentPage,
  currentSectionName,
  selectedPassage,
  socket,
}: MarginalNotesSidebarProps) {
  const [notes, setNotes] = useState<MarginalNote[]>([])
  const [loading, setLoading] = useState(false)
  const [composing, setComposing] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [anchorPassage, setAnchorPassage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [epistemicTag, setEpistemicTag] = useState<EpistemicTag | null>(null)
  const [activeFilter, setActiveFilter] = useState<EpistemicTag | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFetchedPage = useRef<number>(-1)
  const lastPassageRef = useRef<string>('')

  // Fetch ALL notes for the document — no page filter.
  // The panel is a team knowledge view; researchers need to see the full picture.
  const fetchNotes = useCallback(async () => {
    if (!documentId || !isOpen) return
    setLoading(true)
    try {
      const res = await fetch(`/api/marginal-notes?documentId=${encodeURIComponent(documentId)}`)
      const data = await res.json()
      if (data.success) setNotes(data.notes)
    } catch {
      // fail silently — don't block reading
    } finally {
      setLoading(false)
    }
  }, [documentId, isOpen])

  // Fetch when panel opens or document changes. Also re-fetch on page change so
  // any notes written by peers on the new page appear immediately.
  useEffect(() => {
    if (!isOpen) return
    fetchNotes()
  }, [isOpen, currentPage, fetchNotes])

  // Reset fetch cache when document changes
  useEffect(() => {
    lastFetchedPage.current = -1
  }, [documentId])

  // Reset passage ref when sidebar closes — so reopening with same passage re-triggers compose
  useEffect(() => {
    if (!isOpen) {
      lastPassageRef.current = ''
      setComposing(false)
      setEpistemicTag(null)
    }
  }, [isOpen])

  // Auto-open compose mode whenever a new passage is passed in.
  // The passage may have a ::timestamp suffix (to force re-trigger for the same text) — strip it before use.
  useEffect(() => {
    if (!isOpen || !selectedPassage) return
    if (selectedPassage === lastPassageRef.current) return
    lastPassageRef.current = selectedPassage
    // Strip the ::timestamp bust suffix if present
    const cleanPassage = selectedPassage.includes('::')
      ? selectedPassage.slice(0, selectedPassage.lastIndexOf('::'))
      : selectedPassage
    setAnchorPassage(cleanPassage)
    setNoteText('')
    setError('')
    setComposing(true)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [isOpen, selectedPassage])

  // Listen for notes from live collaborators — refetch full document notes from DB
  // so we always have the authoritative list regardless of which page the note is on.
  useEffect(() => {
    if (!socket) return
    const s = socket as { on: (event: string, cb: (data: { documentId: string }) => void) => void; off: (event: string) => void }
    const handler = (data: { documentId: string }) => {
      if (data.documentId !== documentId) return
      if (isOpen) fetchNotes()
    }
    s.on('marginal-note-created', handler)
    return () => s.off('marginal-note-created')
  }, [socket, documentId, isOpen, fetchNotes])

  const startComposing = () => {
    const raw = selectedPassage || ''
    const clean = raw.includes('::') ? raw.slice(0, raw.lastIndexOf('::')) : raw
    setAnchorPassage(clean)
    setNoteText('')
    setError('')
    setComposing(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleSubmit = async () => {
    if (!noteText.trim() || noteText.trim().length < 10) {
      setError('Write something useful for the next reader — at least a sentence.')
      return
    }
    // anchorPassage is optional — a page-level note is still valid
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/marginal-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          userId,
          userName,
          content: noteText.trim(),
          passageText: anchorPassage.trim(),
          pageNumber: currentPage,
          sectionName: currentSectionName || null,
          epistemicTag: epistemicTag || null,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to save note')
        return
      }
      // Add to local list immediately
      setNotes(prev => [...prev, data.note])
      // Broadcast to live collaborators via socket
      if (socket) {
        const s = socket as { emit: (event: string, data: unknown) => void }
        s.emit('marginal-note-created', { ...data.note, documentId })
      }
      // Notify page-level panel to refetch team notes
      window.dispatchEvent(new CustomEvent('__team-note-created', { detail: { documentId } }))
      setComposing(false)
      setNoteText('')
      setAnchorPassage('')
    } catch {
      setError('Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    try {
      await fetch(`/api/marginal-notes?id=${noteId}&userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch {
      // fail silently
    }
  }

  if (!isOpen) return null

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-100">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800">Team Notes</p>
            <p className="text-[10px] text-slate-500">{notes.length > 0 ? `${notes.length} note${notes.length !== 1 ? 's' : ''} across paper` : `Currently on p.${currentPage}`}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Compose area */}
        {composing ? (
          <div className="p-4 border-b border-slate-100 bg-indigo-50/40">
            <p className="text-[11px] font-semibold text-indigo-700 mb-2 uppercase tracking-wide">Leave a note for the next reader</p>

            {/* Passage anchor */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-slate-500 font-medium">Anchored passage <span className="text-slate-400">(optional)</span></label>
                {!anchorPassage && selectedPassage && (
                  <button
                    type="button"
                    onClick={() => {
                      const raw = selectedPassage
                      const clean = raw.includes('::') ? raw.slice(0, raw.lastIndexOf('::')) : raw
                      setAnchorPassage(clean)
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Use current selection
                  </button>
                )}
              </div>
              {anchorPassage ? (
                <div className="flex items-start gap-1.5">
                  <p className="flex-1 text-[11px] text-slate-600 italic border-l-2 border-indigo-300 pl-2 leading-relaxed line-clamp-3">
                    "{anchorPassage}"
                  </p>
                  <button
                    type="button"
                    onClick={() => setAnchorPassage('')}
                    className="text-slate-300 hover:text-slate-500 mt-0.5 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                  Highlight text in the PDF to anchor this note to a specific passage — or leave blank for a page-level note.
                </p>
              )}
            </div>

            {/* Epistemic tag */}
            <div className="mb-3">
              <EpistemicTagPicker value={epistemicTag} onChange={setEpistemicTag} />
            </div>

            {/* Note text */}
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. If you're confused here, τ refers to the scaled temperature parameter, not raw temperature. See Eq. 3 for the definition."
              className="w-full text-[12px] text-slate-700 placeholder:text-slate-400 bg-white border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 leading-relaxed"
              rows={4}
            />
            {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}

            <div className="flex gap-2 mt-2.5">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-[12px] font-semibold rounded-xl py-2 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Saving…' : 'Save note'}
              </button>
              <button
                onClick={() => { setComposing(false); setError('') }}
                className="px-3 py-2 text-[12px] text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-3 pb-2">
            <button
              onClick={startComposing}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 text-[12px] font-medium transition-all"
            >
              <MessageSquarePlus className="w-4 h-4 shrink-0" />
              Add a note for the next reader on this page
            </button>
          </div>
        )}

        {/* Epistemic filter bar */}
        {notes.some(n => n.epistemicTag) && (
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-medium">Filter:</span>
            {(['Claim', 'Evidence', 'Gap', 'Assumption', 'Contradiction'] as EpistemicTag[]).map(tag => {
              const count = notes.filter(n => n.epistemicTag === tag).length
              if (count === 0) return null
              return (
                <button
                  key={tag}
                  onClick={() => setActiveFilter(f => f === tag ? null : tag)}
                  className={[
                    'text-[10px] px-2 py-0.5 rounded-full border transition-all',
                    activeFilter === tag
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400',
                  ].join(' ')}
                >
                  {tag} {count}
                </button>
              )
            })}
          </div>
        )}

        {/* Notes list — grouped by page, current page first */}
        <div className="px-3 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-[12px]">Loading notes…</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 px-4">
              <BookMarked className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-[12px] text-slate-400 font-medium">No team notes yet</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Be the first — a well-placed note on a confusing passage is worth more than a re-read.
              </p>
            </div>
          ) : (() => {
            const filtered = notes.filter(n => !activeFilter || n.epistemicTag === activeFilter)
            // Group by page number, sort pages: current page first, then ascending
            const byPage = new Map<number, MarginalNote[]>()
            for (const n of filtered) {
              if (!byPage.has(n.pageNumber)) byPage.set(n.pageNumber, [])
              byPage.get(n.pageNumber)!.push(n)
            }
            const pages = [...byPage.keys()].sort((a, b) =>
              a === currentPage ? -1 : b === currentPage ? 1 : a - b
            )
            return (
              <div className="space-y-4 mt-3">
                {pages.map(page => (
                  <div key={page}>
                    {/* Page group header */}
                    <div className={`flex items-center gap-2 mb-2 ${page === currentPage ? '' : 'opacity-70'}`}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        page === currentPage
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        Page {page}{page === currentPage ? ' · current' : ''}
                      </span>
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-[10px] text-slate-400">{byPage.get(page)!.length} note{byPage.get(page)!.length !== 1 ? 's' : ''}</span>
                    </div>
                    {/* Notes for this page */}
                    <div className="space-y-2.5">
                      {byPage.get(page)!.map(note => (
                        <div
                          key={note.id}
                          className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow transition-shadow ${
                            page === currentPage ? 'border-indigo-100' : 'border-slate-100'
                          }`}
                        >
                          {/* Author + meta */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                                <User className="w-2.5 h-2.5 text-white" />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-700">{note.authorName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Clock className="w-3 h-3" />
                                {timeAgo(note.createdAt)}
                              </div>
                              {note.authorId === userId && (
                                <button
                                  onClick={() => handleDelete(note.id)}
                                  className="p-0.5 text-slate-300 hover:text-red-400 transition-colors"
                                  title="Delete note"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Anchored passage */}
                          {note.passageText && <PassageQuote text={note.passageText} />}

                          {/* Note content */}
                          <p className="text-[12px] text-slate-700 leading-relaxed">{note.content}</p>

                          {/* Tags row */}
                          {(note.sectionName || note.epistemicTag || (note.replyCount ?? 0) > 0) && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              {note.epistemicTag && (
                                <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] text-indigo-600 font-medium">
                                  {note.epistemicTag}
                                </span>
                              )}
                              {note.sectionName && (
                                <span className="inline-block px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-full text-[10px] text-slate-500 font-medium">
                                  {note.sectionName}
                                </span>
                              )}
                              {(note.replyCount ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                                  <MessageCircle className="w-3 h-3" />
                                  {note.replyCount} {note.replyCount === 1 ? 'reply' : 'replies'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
