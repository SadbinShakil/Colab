'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Search, Upload, Plus, Filter,
  FileText, Users, Clock, MoreHorizontal,
  Settings, LogOut, ChevronDown,
  Sparkles, Activity,
  Star, Trash2, Folder,
  ChevronRight, Home, MoreVertical, RefreshCw,
  MessageSquare, Send, BookOpen, Link, Hash,
  FolderPlus, FileUp, Loader2, X, ChevronUp,
  CheckCircle2, Circle, BookOpenCheck
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { UploadModal } from "@/components/UploadModal"

interface UserProfile { name: string; email: string }
interface DocFile {
  id: string; name: string; owner?: string; modified: string;
  visibility?: string; starred?: boolean; size?: string
}

const WORKSPACE_NAME = 'CoRead Workspace'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [files, setFiles] = useState<DocFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['recent']))

  // AI Chat widget state
  const [chatQuery, setChatQuery] = useState('')
  const [chatAnswer, setChatAnswer] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importType, setImportType] = useState<'doi' | 'url' | 'arxiv'>('doi')
  const [importValue, setImportValue] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/documents')
      if (res.ok) setFiles(await res.json())
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  useEffect(() => {
    fetchDocs()
    const stored = localStorage.getItem('currentUser')
    if (stored) { try { setUser(JSON.parse(stored)) } catch { } }
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('currentUser')
    router.push('/auth/login')
  }

  const handleMoveToTrash = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setFiles(f => f.map(x => x.id === id ? { ...x, visibility: 'trash' } : x))
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
  }

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setFiles(f => f.map(x => x.id === id ? { ...x, visibility: 'private' } : x))
    await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'restore' }),
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const handleSelectFile = (id: string) => {
    setSelectedFiles(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const handleBulkTrash = async () => {
    const ids = Array.from(selectedFiles)
    setFiles(f => f.map(x => ids.includes(x.id) ? { ...x, visibility: 'trash' } : x))
    setSelectedFiles(new Set())
    await Promise.all(ids.map(id => fetch(`/api/documents/${id}`, { method: 'DELETE' })))
  }

  const handleStarToggle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const file = files.find(f => f.id === id)
    setFiles(f => f.map(x => x.id === id ? { ...x, starred: !x.starred } : x))
    await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'star', starred: !file?.starred }),
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {})
  }

  // AI Chat widget — two-step: rank relevant papers by title, then fetch only those
  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!chatQuery.trim()) return
    setChatLoading(true)
    setChatAnswer(null)
    try {
      const activeDocs = files.filter(f => f.visibility !== 'trash')

      // Step 1: Ask GPT-4o which papers are most relevant (titles only — cheap)
      let relevantIds: string[] = []
      if (activeDocs.length <= 4) {
        // Small library — just use all of them
        relevantIds = activeDocs.map(f => f.id)
      } else {
        const titleList = activeDocs
          .map((f, i) => `${i}: [id:${f.id}] ${f.name}`)
          .join('\n')

        const rankRes = await fetch('/api/ai-help', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: `Given this question: "${chatQuery}"\n\nFrom the list below, return ONLY a JSON array of the IDs of the 3 most relevant papers. Return nothing else, just the JSON array.\n\n${titleList}`,
            documentContent: titleList,
            documentTitle: 'Paper selection task',
          })
        })
        const rankData = await rankRes.json()
        const raw = rankData.response?.answer || rankData.answer || '[]'
        try {
          // Extract JSON array from the response
          const match = raw.match(/\[.*?\]/s)
          const parsed = JSON.parse(match?.[0] || '[]')
          relevantIds = Array.isArray(parsed) ? parsed.slice(0, 4) : []
        } catch {
          // Fallback: use the 3 most recently modified papers
          relevantIds = activeDocs.slice(0, 3).map(f => f.id)
        }
        // Always ensure we have at least something
        if (relevantIds.length === 0) relevantIds = activeDocs.slice(0, 3).map(f => f.id)
      }

      // Step 2: Fetch full text only from the relevant papers
      const docTexts: { title: string; text: string }[] = []
      await Promise.all(
        relevantIds.map(async (id) => {
          try {
            const r = await fetch(`/api/documents/${id}`)
            if (!r.ok) return
            const { document: doc } = await r.json()
            if (doc?.fullText?.length > 100) {
              docTexts.push({
                title: doc.title || doc.originalName || 'Untitled',
                text: doc.fullText.slice(0, 8000),
              })
            }
          } catch {}
        })
      )

      if (docTexts.length === 0) {
        setChatAnswer('No paper text found in your library yet. Upload a PDF and open it first so CoRead can extract its content.')
        return
      }

      const libraryContext = docTexts
        .map((d, i) => `[Paper ${i + 1}: ${d.title}]\n${d.text}`)
        .join('\n\n---\n\n')

      // Step 3: Answer the actual question with grounded context
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: chatQuery,
          documentContent: libraryContext,
          documentTitle: `${docTexts.length} relevant paper${docTexts.length !== 1 ? 's' : ''} from your library`,
        })
      })
      const data = await res.json()
      setChatAnswer(data.answer || data.response?.answer || 'No answer returned.')
    } catch {
      setChatAnswer('Could not reach AI. Please try again.')
    } finally {
      setChatLoading(false)
    }
  }

  // Import via DOI/URL/arXiv (stub — shows success toast)
  const handleImport = async () => {
    if (!importValue.trim()) return
    setImportLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setImportLoading(false)
    setShowImportModal(false)
    setImportValue('')
    toast.success(`Imported via ${importType.toUpperCase()}`, {
      description: importValue.slice(0, 60)
    })
    fetchDocs()
  }

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  // Derived data
  const activeFiles = files.filter(f => f.visibility !== 'trash')
  const trashedFiles = files.filter(f => f.visibility === 'trash')

  const getDisplayFiles = (): DocFile[] => {
    const base = (() => {
      switch (currentTab) {
        case 'home':
        case 'recent': return [...activeFiles].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
        case 'starred': return activeFiles.filter(f => f.starred)
        case 'trash': return trashedFiles
        default: return activeFiles
      }
    })()
    if (!searchQuery.trim()) return base
    return base.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }

  const displayFiles = getDisplayFiles()
  const recentFiles = [...activeFiles]
    .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
    .slice(0, 4)

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ]

  const sidebarFolders = [
    { id: 'recent', label: 'Recent papers', count: recentFiles.length },
    { id: 'starred', label: 'Starred', count: activeFiles.filter(f => f.starred).length },
  ]

  const tabLabel: Record<string, string> = {
    home: 'Home', library: 'Library', recent: 'Recent', starred: 'Starred', trash: 'Trash'
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 font-sans flex flex-col">

      {/* ── Top bar ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 sticky top-0 z-50 shrink-0">
        {/* Workspace switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors min-w-0 shrink-0">
              <div className="w-5 h-5 bg-violet-600 rounded flex items-center justify-center shrink-0">
                <BookOpen className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-800 truncate max-w-[140px]">{WORKSPACE_NAME}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-white shadow-xl border border-gray-100 rounded-xl p-1">
            <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:bg-gray-50">
              <div className="w-4 h-4 bg-violet-600 rounded mr-2 flex items-center justify-center">
                <BookOpen className="w-2.5 h-2.5 text-white" />
              </div>
              {WORKSPACE_NAME}
              <CheckCircle2 className="w-4 h-4 text-violet-600 ml-auto" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-500 focus:bg-gray-50">
              <Plus className="w-4 h-4 mr-2" /> Create workspace
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-500 focus:bg-gray-50">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-500 focus:bg-gray-50" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Global search */}
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-100 rounded-lg border-none outline-none focus:ring-2 focus:ring-violet-400/30 focus:bg-white transition-all placeholder:text-gray-400"
            placeholder="Search your library…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-violet-700 px-2.5 py-1.5 rounded-lg hover:bg-violet-50 transition-colors"
          >
            <Link className="w-3.5 h-3.5" /> Import
          </button>
          <Button
            size="sm"
            className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 gap-1.5"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </Button>
          {/* User avatar */}
          <div
            className="w-7 h-7 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-bold text-xs border border-violet-200 cursor-pointer hover:ring-2 hover:ring-violet-200 transition-all select-none"
            title={user?.name}
            onClick={handleLogout}
          >
            {user?.name?.[0] || 'U'}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ── */}
        <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col py-3 overflow-y-auto">

          {/* New button */}
          <div className="px-3 mb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" /> New
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white shadow-xl border border-gray-100 rounded-xl p-1">
                <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-700 focus:bg-gray-50 cursor-pointer" onClick={() => setIsUploadOpen(true)}>
                  <FileUp className="w-4 h-4 mr-2 text-violet-600" /> Upload PDF
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-700 focus:bg-gray-50 cursor-pointer" onClick={() => { setImportType('doi'); setShowImportModal(true) }}>
                  <Hash className="w-4 h-4 mr-2 text-blue-500" /> Import via DOI
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-700 focus:bg-gray-50 cursor-pointer" onClick={() => { setImportType('url'); setShowImportModal(true) }}>
                  <Link className="w-4 h-4 mr-2 text-green-500" /> Import via URL
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-700 focus:bg-gray-50 cursor-pointer" onClick={() => { setImportType('arxiv'); setShowImportModal(true) }}>
                  <BookOpen className="w-4 h-4 mr-2 text-orange-500" /> Import arXiv ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-500 focus:bg-gray-50 cursor-pointer" onClick={() => toast.info('Folders coming soon')}>
                  <FolderPlus className="w-4 h-4 mr-2" /> New folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nav items */}
          <nav className="px-2 space-y-0.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${currentTab === item.id
                    ? 'bg-violet-50 text-violet-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                {item.id === 'trash' && trashedFiles.length > 0 && (
                  <span className="ml-auto text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 font-medium">{trashedFiles.length}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Folders section */}
          <div className="mt-4 px-2">
            <div className="px-3 py-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Folders</span>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => toast.info('Folders coming soon')}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {sidebarFolders.map(folder => (
              <div key={folder.id}>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  onClick={() => { toggleFolder(folder.id); setCurrentTab(folder.id) }}
                >
                  {expandedFolders.has(folder.id)
                    ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                  <Folder className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="truncate">{folder.label}</span>
                  <span className="ml-auto text-[10px] text-gray-400">{folder.count}</span>
                </button>
                {expandedFolders.has(folder.id) && (
                  <div className="ml-8 pl-2 border-l border-gray-100 space-y-0.5 mt-0.5">
                    {files.filter(f => f.visibility !== 'trash').slice(0, 3).map(f => (
                      <button
                        key={f.id}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors truncate"
                        onClick={() => router.push(`/document/${f.id}`)}
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-auto px-4 pt-4 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 truncate">{user?.email || user?.name}</p>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto">

          {/* Home view */}
          {currentTab === 'home' && (
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

              {/* Greeting */}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Good {getGreeting()}, {user?.name?.split(' ')[0] || 'Researcher'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">What are you reading today?</p>
              </div>

              {/* AI Ask widget — Anara's core hero */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Ask your library</span>
                  <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">GPT-4o</span>
                </div>
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    ref={chatInputRef}
                    type="text"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400/30 focus:bg-white transition-all placeholder:text-gray-400"
                    placeholder="Ask anything about your papers…"
                    value={chatQuery}
                    onChange={e => setChatQuery(e.target.value)}
                  />
                  <Button
                    type="submit"
                    disabled={!chatQuery.trim() || chatLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 h-auto"
                  >
                    {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>

                {/* Suggested prompts */}
                {!chatAnswer && !chatLoading && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      'What research methods are used?',
                      'What are the key findings?',
                      'What open problems are mentioned?',
                    ].map(p => (
                      <button
                        key={p}
                        onClick={() => { setChatQuery(p); chatInputRef.current?.focus() }}
                        className="text-xs text-gray-500 bg-gray-100 hover:bg-violet-50 hover:text-violet-700 px-3 py-1.5 rounded-full transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {/* Answer */}
                {chatLoading && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    Finding relevant papers, then reading them…
                  </div>
                )}
                {chatAnswer && (
                  <div className="mt-4 bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
                    {chatAnswer}
                    <button className="mt-2 block text-xs text-violet-500 hover:text-violet-700" onClick={() => { setChatAnswer(null); setChatQuery('') }}>
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Upload PDF', icon: FileUp, color: 'text-violet-600 bg-violet-50', action: () => setIsUploadOpen(true) },
                  { label: 'Import DOI', icon: Hash, color: 'text-blue-600 bg-blue-50', action: () => { setImportType('doi'); setShowImportModal(true) } },
                  { label: 'Import URL', icon: Link, color: 'text-green-600 bg-green-50', action: () => { setImportType('url'); setShowImportModal(true) } },
                ].map(qa => (
                  <button
                    key={qa.label}
                    onClick={qa.action}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-start gap-2 hover:shadow-sm hover:border-gray-300 transition-all text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${qa.color}`}>
                      <qa.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{qa.label}</span>
                  </button>
                ))}
              </div>

              {/* Recent papers */}
              {recentFiles.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent</h2>
                    <button className="text-xs text-violet-600 hover:underline" onClick={() => setCurrentTab('library')}>View all</button>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-50">
                    {recentFiles.map(file => (
                      <FileRow
                        key={file.id}
                        file={file}
                        onReadAlone={() => router.push(`/document/${file.id}?mode=solo`)}
                        onReadWithTeam={() => {
                          const code = Math.random().toString(36).substring(2, 8).toUpperCase()
                          router.push(`/document/${file.id}?mode=collaborative&code=${code}`)
                        }}
                        onTrash={(e) => handleMoveToTrash(e, file.id)}
                        onStar={(e) => handleStarToggle(e, file.id)}
                        isTrash={false}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Library / other tabs */}
          {currentTab !== 'home' && (
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900">{tabLabel[currentTab]}</h2>
                {selectedFiles.size > 0 && (
                  <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 px-4 py-2 rounded-xl text-sm text-violet-700 font-medium">
                    {selectedFiles.size} selected
                    <button className="ml-2 text-red-500 hover:text-red-700" onClick={handleBulkTrash}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600" onClick={() => setSelectedFiles(new Set())}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <div className="col-span-1">
                    <input type="checkbox"
                      className="rounded"
                      checked={displayFiles.length > 0 && selectedFiles.size === displayFiles.length}
                      onChange={() => {
                        if (selectedFiles.size === displayFiles.length) setSelectedFiles(new Set())
                        else setSelectedFiles(new Set(displayFiles.map(f => f.id)))
                      }}
                    />
                  </div>
                  <div className="col-span-6">Title</div>
                  <div className="col-span-3 hidden sm:block">Modified</div>
                  <div className="col-span-2 hidden sm:block">Progress</div>
                </div>

                {isLoading ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-violet-400" />
                    Loading…
                  </div>
                ) : displayFiles.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {currentTab === 'trash' ? 'Trash is empty' : 'No files here yet'}
                    </p>
                    {currentTab !== 'trash' && (
                      <Button size="sm" className="mt-3 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setIsUploadOpen(true)}>
                        Upload a paper
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {displayFiles.map(file => (
                      <div
                        key={file.id}
                        className={`grid grid-cols-12 gap-4 px-5 py-3 hover:bg-gray-50 transition-colors items-center group cursor-pointer ${selectedFiles.has(file.id) ? 'bg-violet-50' : ''}`}
                        onClick={() => file.visibility !== 'trash' && router.push(`/document/${file.id}`)}
                      >
                        <div className="col-span-1" onClick={e => { e.stopPropagation(); handleSelectFile(file.id) }}>
                          <input type="checkbox" className="rounded" checked={selectedFiles.has(file.id)} onChange={() => {}} />
                        </div>
                        <div className="col-span-6 flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-violet-500" />
                          <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
                          {file.starred && <Star className="w-3 h-3 text-amber-400 fill-current shrink-0" />}
                        </div>
                        <div className="col-span-3 hidden sm:block text-xs text-gray-400">
                          {file.modified || '—'}
                        </div>
                        <div className="col-span-2 hidden sm:flex items-center gap-2">
                          <ReadingProgress value={Math.floor(Math.random() * 80 + 10)} />
                        </div>
                        <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><MoreHorizontal className="w-4 h-4 text-gray-500" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 bg-white shadow-xl border border-gray-100 rounded-xl p-1">
                              <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-700 focus:bg-gray-50" onClick={e => handleStarToggle(e as any, file.id)}>
                                <Star className="w-4 h-4 mr-2 text-amber-400" /> {file.starred ? 'Unstar' : 'Star'}
                              </DropdownMenuItem>
                              {file.visibility === 'trash' ? (
                                <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-gray-700 focus:bg-gray-50" onClick={e => handleRestore(e as any, file.id)}>
                                  <RefreshCw className="w-4 h-4 mr-2" /> Restore
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm text-red-600 focus:bg-red-50" onClick={e => handleMoveToTrash(e as any, file.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Import modal ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900">Import paper</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4">
              {(['doi', 'url', 'arxiv'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setImportType(t)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${importType === t ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t === 'doi' ? 'DOI' : t === 'url' ? 'URL' : 'arXiv ID'}
                </button>
              ))}
            </div>

            <div className="relative mb-4">
              {importType === 'doi' && <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
              {importType === 'url' && <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
              {importType === 'arxiv' && <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
              <input
                type="text"
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 transition-all"
                placeholder={
                  importType === 'doi' ? '10.1145/3544548.3580990' :
                  importType === 'url' ? 'https://arxiv.org/abs/...' :
                  '2312.00752'
                }
                value={importValue}
                onChange={e => setImportValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleImport()}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl text-sm" onClick={() => setShowImportModal(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm gap-1.5"
                disabled={!importValue.trim() || importLoading}
                onClick={handleImport}
              >
                {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Import
              </Button>
            </div>
          </div>
        </div>
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={fetchDocs}
      />
    </div>
  )
}

// ── Sub-components ──

function FileRow({ file, onReadAlone, onReadWithTeam, onTrash, onStar, isTrash }: {
  file: DocFile
  onReadAlone: () => void
  onReadWithTeam: () => void
  onTrash: (e: React.MouseEvent) => void
  onStar: (e: React.MouseEvent) => void
  isTrash: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer group"
      onClick={onReadAlone}
    >
      <FileText className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-violet-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
        <p className="text-[11px] text-gray-400">{file.modified}</p>
      </div>
      {file.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-current shrink-0" />}

      {/* Session actions — visible on hover, inspired by Anara */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity" onClick={e => e.stopPropagation()}>
        <button
          onClick={onReadAlone}
          title="Read alone"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
        >
          <BookOpenCheck className="w-3.5 h-3.5" />
          Solo
        </button>
        <button
          onClick={onReadWithTeam}
          title="Read with team"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Team
        </button>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <button className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-amber-500 transition-colors" onClick={onStar}>
          <Star className="w-3.5 h-3.5" />
        </button>
        <button className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" onClick={onTrash}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function ReadingProgress({ value }: { value: number }) {
  const r = 8
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div className="flex items-center gap-1.5">
      <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
        <circle cx="10" cy="10" r={r} fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
        <circle
          cx="10" cy="10" r={r} fill="none"
          stroke="#7C3AED" strokeWidth="2.5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] text-gray-400">{value}%</span>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
