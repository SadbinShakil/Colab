'use client'

import { useState } from 'react'
import { BookOpen, Users, Hash, X } from 'lucide-react'

export type SessionMode = 'solo' | 'collaborative'

interface SessionIntentModalProps {
  paperTitle: string
  onSelect: (mode: SessionMode, sessionCode?: string) => void
  onDismiss: () => void
}

export default function SessionIntentModal({ paperTitle, onSelect, onDismiss }: SessionIntentModalProps) {
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [sessionCode, setSessionCode] = useState('')
  const [codeError, setCodeError] = useState('')

  const handleJoin = () => {
    if (sessionCode.trim().length < 4) {
      setCodeError('Enter a valid code')
      return
    }
    onSelect('collaborative', sessionCode.trim().toUpperCase())
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-lg font-semibold text-slate-900">Reading session</h2>
            <button onClick={onDismiss} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors -mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-slate-500 truncate">{paperTitle || 'Research Paper'}</p>
        </div>

        {/* Choices */}
        <div className="px-4 pb-4 space-y-2">

          {/* Solo */}
          <button
            onClick={() => onSelect('solo')}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all group text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center shrink-0 transition-colors">
              <BookOpen className="w-4.5 h-4.5 text-violet-600" style={{width: 18, height: 18}} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Read alone</div>
              <div className="text-xs text-slate-400 mt-0.5">Full AI scaffolding, no collaboration features</div>
            </div>
          </button>

          {/* Collaborative */}
          {!showJoinInput ? (
            <button
              onClick={() => {
                // Create session immediately
                const code = Math.random().toString(36).substring(2, 8).toUpperCase()
                onSelect('collaborative', code)
              }}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center shrink-0 transition-colors">
                <Users className="w-4.5 h-4.5 text-indigo-600" style={{width: 18, height: 18}} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Read with team</div>
                <div className="text-xs text-slate-400 mt-0.5">Peer routing, shared annotations, group mode</div>
              </div>
            </button>
          ) : null}

          {/* Join with code link */}
          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <Hash className="w-3.5 h-3.5" />
              Join an existing session with a code
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={sessionCode}
                  onChange={e => { setSessionCode(e.target.value.toUpperCase()); setCodeError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="Session code"
                  maxLength={12}
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
                />
                <button
                  onClick={handleJoin}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Join
                </button>
              </div>
              {codeError && <p className="text-xs text-red-500 px-1">{codeError}</p>}
              <button onClick={() => { setShowJoinInput(false); setCodeError('') }} className="text-xs text-slate-400 hover:text-slate-600 px-1">
                ← back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
