'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Search, Upload, Plus, Filter, Grid3X3, List,
  FileText, Users, Clock, MoreHorizontal,
  Settings, User, Bell, LogOut, ChevronDown,
  Sparkles, Calculator, Zap, Activity,
  LayoutDashboard, Star, Trash2, Folder,
  File, ChevronRight, Home, MoreVertical, RefreshCw
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

import { UploadModal } from "@/components/UploadModal"

interface UserProfile {
  name: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [files, setFiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  // Navigation State
  const [currentTab, setCurrentTab] = useState('home')

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/documents')
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      }
    } catch (e) {
      console.error("Failed to fetch documents", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()

    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) { console.error(e) }
    }
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('currentUser')
      router.push('/auth/login')
    } catch { router.push('/auth/login') }
  }

  const handleMoveToTrash = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      // Optimistic update
      setFiles(files.map(f => f.id === id ? { ...f, visibility: 'trash' } : f))

      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE' // DELETE now moves to trash
      })
      if (!res.ok) throw new Error('Failed to move to trash')
    } catch (error) {
      console.error(error)
      // Revert optimistic update if needed, but for now just log
    }
  }

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      setFiles(files.map(f => f.id === id ? { ...f, visibility: 'private' } : f))
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'restore' }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('Failed to restore')
    } catch (error) { console.error(error) }
  }

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // Selection Logic
  const handleSelectFile = (id: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSelectAll = (filesToSelect: any[]) => {
    if (selectedFiles.size === filesToSelect.length && filesToSelect.length > 0) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filesToSelect.map(f => f.id)))
    }
  }

  const handleBulkMoveToTrash = async () => {
    try {
      const selectedIds = Array.from(selectedFiles)
      // Optimistic update
      setFiles(files.map(f => selectedIds.includes(f.id) ? { ...f, visibility: 'trash' } : f))
      setSelectedFiles(new Set()) // Clear selection

      await Promise.all(selectedIds.map(id =>
        fetch(`/api/documents/${id}`, { method: 'DELETE' })
      ))
    } catch (e) { console.error('Bulk delete failed', e) }
  }

  const handleBulkRestore = async () => {
    try {
      const selectedIds = Array.from(selectedFiles)
      setFiles(files.map(f => selectedIds.includes(f.id) ? { ...f, visibility: 'private' } : f))
      setSelectedFiles(new Set())

      await Promise.all(selectedIds.map(id =>
        fetch(`/api/documents/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'restore' }),
          headers: { 'Content-Type': 'application/json' }
        })
      ))
    } catch (e) { console.error('Bulk restore failed', e) }
  }

  const handleBulkDeleteForever = async () => {
    if (!confirm('Are you sure you want to delete these files forever? This cannot be undone.')) return
    try {
      const selectedIds = Array.from(selectedFiles)
      setFiles(files.filter(f => !selectedIds.includes(f.id))) // Remove from state entirely
      setSelectedFiles(new Set())

      await Promise.all(selectedIds.map(id =>
        fetch(`/api/documents/${id}?permanent=true`, { method: 'DELETE' })
      ))
    } catch (e) { console.error('Bulk delete forever failed', e) }
  }

  // Filtered Files Logic
  const getDisplayFiles = () => {
    const activeFiles = files.filter(f => f.visibility !== 'trash')
    const trashedFiles = files.filter(f => f.visibility === 'trash')

    switch (currentTab) {
      case 'home':
      case 'recent':
        return [...activeFiles].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
      case 'my-files':
        return activeFiles
      case 'shared':
        return [
          { id: 's1', name: 'Project Requirements', owner: 'Alex M.', modified: '2 days ago', size: '1.2 MB', starred: false, type: 'DOC' },
          { id: 's2', name: 'Weekly Report', owner: 'Sarah J.', modified: '5 hours ago', size: '0.8 MB', starred: true, type: 'PDF' }
        ]
      case 'starred':
        return activeFiles.filter(f => f.starred)
      case 'trash':
        return trashedFiles
      default:
        return activeFiles
    }
  }

  const allFilteredFiles = getDisplayFiles()
  // Limit to 5 for Home/Recent view, show all for others
  const displayedFiles = (currentTab === 'home' || currentTab === 'recent')
    ? allFilteredFiles.slice(0, 5)
    : allFilteredFiles

  const suggestedFiles = files
    .filter(f => f.visibility !== 'trash')
    .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
    .slice(0, 4)
    .map(f => ({
      title: f.name,
      type: 'PDF',
      date: f.modified,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      id: f.id, // Explicitly pass ID for dropdown
      visibility: f.visibility, // Pass visibility if needed
      starred: f.starred // Pass starred status
    }))

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">

      {/* 1. Professional Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3 w-64 pl-2">
          <div className="bg-blue-600 rounded-lg p-1.5 shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-800">LitSense</span>
        </div>

        {/* Central Search Bar - Google Style */}
        <div className="flex-1 max-w-2xl px-4">
          <div className="relative group transition-all">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white shadow-sm transition-all"
              placeholder="Search in Drive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600"><Filter className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 w-64 justify-end">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 rounded-full"><HelpCircleIcon className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 rounded-full"><Settings className="w-5 h-5" /></Button>
          <div className="pl-2">
            <div className="h-8 w-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm border border-blue-200 cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all select-none" onClick={handleLogout} title="Sign out">
              {user?.name?.[0] || 'U'}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* 2. Left Sidebar Navigation */}
        <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col pt-4 pb-4">
          <div className="px-4 mb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="w-full justify-start gap-3 h-12 rounded-2xl bg-white text-slate-700 border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 hover:text-blue-600 font-medium transition-all"
                >
                  <Plus className="w-6 h-6 text-blue-600" />
                  <span className="text-base">New</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 mt-2 bg-white z-50 shadow-xl border border-gray-100 rounded-xl p-2">
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-gray-100 rounded-lg py-2.5 px-3 focus:bg-gray-100"
                  onClick={() => {
                    const folderName = prompt('Enter folder name (Mock)')
                    if (folderName) toast.success(`Folder "${folderName}" created`)
                  }}>
                  <Folder className="mr-3 h-5 w-5 text-gray-500" />
                  <span className="font-medium text-gray-700">New folder</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-gray-100 rounded-lg py-2.5 px-3 focus:bg-gray-100"
                  onClick={() => setIsUploadOpen(true)}
                >
                  <FileText className="mr-3 h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-700">File upload</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'my-files', label: 'My Library', icon: Folder },
              { id: 'shared', label: 'Shared with me', icon: Users },
              { id: 'recent', label: 'Recent', icon: Clock },
              { id: 'starred', label: 'Starred', icon: Star },
              { id: 'trash', label: 'Trash', icon: Trash2 },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-l-full text-sm font-medium transition-colors
                        ${currentTab === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <item.icon className={`w-4 h-4 ${currentTab === item.id ? 'fill-current' : ''}`} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px-6 mt-4">
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
              <div className="bg-blue-600 h-1.5 rounded-full w-[45%]"></div>
            </div>
            <p className="text-xs text-gray-500">6.4 GB of 15 GB used</p>
          </div>
        </aside>

        {/* 3. Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* Suggested Section */}
          {suggestedFiles.length > 0 && (currentTab === 'home' || currentTab === 'recent') && (
            <section className="mb-8">
              <h2 className="text-sm font-medium text-gray-500 mb-3 px-1">Suggested</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {suggestedFiles.map((suggestion, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${suggestion.bg}`}>
                        <suggestion.icon className={`w-5 h-5 ${suggestion.color}`} />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 group-hover:text-gray-600 -mr-2"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600" onClick={(e) => handleMoveToTrash(e, suggestion.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm truncate mb-1">{suggestion.title}</h3>
                    <p className="text-xs text-gray-500">Opened {suggestion.date}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* File Browser */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              {selectedFiles.size > 0 ? (
                <div className="flex items-center gap-4 bg-blue-50 px-4 py-2 rounded-lg w-full justify-between animate-in fade-in slide-in-from-top-2">
                  <span className="text-sm font-medium text-blue-700">{selectedFiles.size} selected</span>
                  <div className="flex items-center gap-2">
                    {currentTab === 'trash' ? (
                      <>
                        <Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-100" onClick={handleBulkRestore}>
                          <RefreshCw className="w-4 h-4 mr-2" /> Restore
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-100" onClick={handleBulkDeleteForever}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Forever
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={handleBulkMoveToTrash}>
                        <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-gray-500 hover:bg-gray-200" onClick={() => setSelectedFiles(new Set())}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {currentTab === 'home' ? 'Home' :
                      currentTab === 'my-files' ? 'My Library' :
                        currentTab === 'shared' ? 'Shared with me' :
                          currentTab === 'recent' ? 'Recent' :
                            currentTab === 'starred' ? 'Starred' : 'Trash'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-500'}><List className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-500'}><Grid3X3 className="w-4 h-4" /></Button>
                  </div>
                </>
              )}
            </div>

            {/* List View */}
            {viewMode === 'list' ? (
              <div className="w-full">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider items-center">
                  <div className="col-span-1">
                    <Checkbox
                      checked={displayedFiles.length > 0 && selectedFiles.size === displayedFiles.length}
                      onCheckedChange={() => handleSelectAll(displayedFiles)}
                    />
                  </div>
                  <div className="col-span-11 sm:col-span-5">Name</div>
                  <div className="col-span-2 hidden sm:block">Owner</div>
                  <div className="col-span-3 hidden sm:block">Last Modified</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="divide-y divide-gray-50">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading files...</div>
                  ) : displayedFiles.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No files found.</div>
                  ) : (
                    <>
                      {displayedFiles.map((file) => (
                        <div key={file.id}
                          className={`grid grid-cols-12 gap-4 px-6 py-3.5 hover:bg-blue-50/50 transition-colors items-center group cursor-pointer ${selectedFiles.has(file.id) ? 'bg-blue-50' : ''}`}
                          onClick={() => router.push(`/document/${file.id}`)}
                        >
                          <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedFiles.has(file.id)}
                              onCheckedChange={() => handleSelectFile(file.id)}
                            />
                          </div>
                          <div className="col-span-11 sm:col-span-5 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{file.name}</span>
                            {file.starred && <Star className="w-3 h-3 text-amber-400 fill-current" />}
                          </div>
                          <div className="col-span-2 hidden sm:block text-sm text-gray-500">{file.owner}</div>
                          <div className="col-span-3 hidden sm:block text-sm text-gray-500">{file.modified}</div>
                          <div className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-200/50 rounded-full"><MoreHorizontal className="w-4 h-4 text-gray-500" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {file.visibility === 'trash' ? (
                                  <DropdownMenuItem onClick={(e) => handleRestore(e, file.id)}>
                                    <RefreshCw className="mr-2 h-4 w-4" /> Restore
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem className="text-red-600" onClick={(e) => handleMoveToTrash(e, file.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                      {/* View All Button for Home/Recent */}
                      {(currentTab === 'home' || currentTab === 'recent') && allFilteredFiles.length > 5 && (
                        <div className="p-4 flex justify-center border-t border-gray-50">
                          <Button
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2"
                            onClick={() => setCurrentTab('my-files')}
                          >
                            View all {allFilteredFiles.length} files
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayedFiles.map((file) => (
                    <div key={file.id} className="group border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer" onClick={() => router.push(`/document/${file.id}`)}>
                      <div className="flex justify-between items-start mb-4">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div className="flex items-center gap-1">
                          {file.starred && <Star className="w-4 h-4 text-amber-400 fill-current" />}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {file.visibility === 'trash' ? (
                                <DropdownMenuItem onClick={(e) => handleRestore(e, file.id)}>
                                  <RefreshCw className="mr-2 h-4 w-4" /> Restore
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="text-red-600" onClick={(e) => handleMoveToTrash(e, file.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm truncate mb-1">{file.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Users className="w-3 h-3" />
                        <span>{file.owner}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* View All Button for Home/Recent Grid View */}
                {(currentTab === 'home' || currentTab === 'recent') && allFilteredFiles.length > 5 && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-2 rounded-full px-6"
                      onClick={() => setCurrentTab('my-files')}
                    >
                      Show all files
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>

        {/* 4. Right Activity Sidebar */}
        <aside className="w-80 bg-white border-l border-gray-200 hidden xl:flex flex-col overflow-y-auto">
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Activity
            </h3>

            <ol className="relative border-l border-gray-200 ml-3 space-y-8">
              {[
                { title: 'New version uploaded', desc: 'You updated "Thesis Draft"', time: '10 min ago', color: 'bg-green-500' },
                { title: 'Comment added', desc: 'Sarah commented on "BERT Analysis"', time: '2 hours ago', color: 'bg-blue-500' },
                { title: 'File shared', desc: '"Lab Results" shared with Team', time: 'Yesterday', color: 'bg-purple-500' },
              ].map((item, i) => (
                <li key={i} className="ml-6">
                  <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-4 ring-white ${item.color}`}>
                    <Activity className="w-3 h-3 text-white" />
                  </span>
                  <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                  <time className="block mb-2 text-xs font-normal leading-none text-gray-400 mt-2">{item.time}</time>
                </li>
              ))}
            </ol>

            <div className="mt-10 p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-700">Daily Insight</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                You've reviewed 3 papers this week. Consider exploring "Transformer Architectures" next to deepen your expertise.
              </p>
              <Button variant="link" className="text-xs p-0 h-auto mt-2 text-blue-600">Explore Topic &rarr;</Button>
            </div>
          </div>
        </aside>

      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={() => {
          fetchDocs()
        }}
      />
    </div>
  )
}

function HelpCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}