// src/components/EpistemicTagPicker.tsx
'use client'

import React from 'react'

export type EpistemicTag = 'Claim' | 'Evidence' | 'Gap' | 'Assumption' | 'Contradiction'

const TAG_CONFIG: Record<EpistemicTag, { color: string; bg: string; border: string; description: string }> = {
  Claim:         { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300',   description: 'An assertion the authors make' },
  Evidence:      { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', description: 'Data or observation cited as support' },
  Gap:           { color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-300',  description: 'Something the paper doesn\'t address' },
  Assumption:    { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-300',    description: 'An unstated premise the argument depends on' },
  Contradiction: { color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-300',     description: 'Conflicts with another part of the paper or prior work' },
}

interface EpistemicTagPickerProps {
  value: EpistemicTag | null
  onChange: (tag: EpistemicTag | null) => void
  compact?: boolean   // if true, shows pills without descriptions
}

export default function EpistemicTagPicker({ value, onChange, compact = false }: EpistemicTagPickerProps) {
  const tags = Object.keys(TAG_CONFIG) as EpistemicTag[]

  return (
    <div className="flex flex-col gap-1.5">
      {!compact && (
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Epistemic tag</span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => {
          const cfg = TAG_CONFIG[tag]
          const isSelected = value === tag
          return (
            <button
              key={tag}
              onClick={() => onChange(isSelected ? null : tag)}
              title={cfg.description}
              className={[
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                isSelected
                  ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm ring-1 ring-offset-1 ring-current`
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
              ].join(' ')}
            >
              {tag}
            </button>
          )
        })}
      </div>
      {!compact && value && (
        <p className="text-xs text-slate-500 mt-0.5">{TAG_CONFIG[value].description}</p>
      )}
    </div>
  )
}
