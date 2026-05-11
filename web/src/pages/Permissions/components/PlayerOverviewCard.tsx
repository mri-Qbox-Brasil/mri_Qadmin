import React from 'react'
import { User, Shield, X, Trash2 } from 'lucide-react'


interface PlayerOverviewCardProps {
    identifier: string
    name?: string
    avatar?: string
    groups: string[]
    onRemoveFromGroup: (group: string) => void
    onDeleteAll?: () => void
}

export default function PlayerOverviewCard({
    identifier,
    name = 'Unknown Player',
    avatar,
    groups,
    onRemoveFromGroup,
    onDeleteAll
}: PlayerOverviewCardProps) {
    return (
        <div className="group relative flex flex-col p-5 rounded-2xl border border-border bg-card/40 transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 overflow-hidden">
                            {avatar ? (
                                <img src={avatar} alt={name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-6 h-6" />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                            <Shield className="w-3 h-3 text-primary" />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold tracking-tight text-foreground truncate max-w-[150px]">{name}</h3>
                        <span className="text-[10px] font-medium text-muted-foreground/60 tracking-wider font-mono">
                            {identifier}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onMouseDown={(e) => { e.stopPropagation(); onDeleteAll?.(); }}
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="Remove all memberships"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Memberships Section */}
            <div className="flex flex-col gap-y-2 flex-1 pt-4 border-t border-border/50">
                <span className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] mb-1">
                    Inherits From
                </span>
                <div className="flex flex-wrap gap-2">
                    {groups.map((group, idx) => (
                        <div 
                            key={idx} 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10"
                        >
                            <Shield className="w-3 h-3 text-primary" />
                            <span className="text-[11px] font-semibold text-primary/90">{group.replace('group.', '')}</span>
                            <button 
                                onClick={() => onRemoveFromGroup(group)}
                                className="ml-1 text-primary/40 hover:text-red-500 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {groups.length === 0 && (
                        <span className="text-[11px] italic text-muted-foreground/40">No group assignments</span>
                    )}
                </div>
            </div>
        </div>
    )
}
