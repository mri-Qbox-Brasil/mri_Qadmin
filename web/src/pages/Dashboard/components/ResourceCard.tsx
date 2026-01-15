import React, { useState } from 'react'
import ButtonState from './ButtonState'
import { cn } from '@/lib/utils'
import { Box } from 'lucide-react'

interface ResourceCardProps {
  label: string
  version: string
  author: string
  description: string
  state: string
}

export default function ResourceCard({ label, version, author, description, state }: ResourceCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
        className={cn(
            "w-full flex flex-col rounded-xl border transition-all cursor-pointer overflow-hidden",
            "bg-[#09090b] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
        )}
        onClick={() => setExpanded(!expanded)}
    >
        <div className="flex justify-between items-center p-3">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn("p-2 rounded-lg border border-zinc-800", state === 'started' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-zinc-900 text-zinc-500")}>
                    <Box className="w-4 h-4" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <p className="text-sm font-bold text-zinc-200 truncate">{label}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {version && <span className="bg-zinc-900 px-1.5 rounded border border-zinc-800">{version}</span>}
                        {author && <span>by {author}</span>}
                    </div>
                </div>
             </div>

            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {state === 'started' ? (
                    <>
                        <ButtonState resource={label} state="stop" />
                        <ButtonState resource={label} state="restart" />
                    </>
                ) : (
                    <ButtonState resource={label} state="start" />
                )}
            </div>
        </div>

        {expanded && (
            <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1">
                <div className="p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50 text-xs text-zinc-400">
                    {description || 'No description provided.'}
                </div>
            </div>
        )}
    </div>
  )
}
