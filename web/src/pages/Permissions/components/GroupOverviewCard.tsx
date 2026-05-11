import React from 'react'
import { Shield, Check, X, Settings, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GroupOverviewCardProps {
    name: string
    color?: string
    grantedCount: number
    totalCount: number
    permissions: { label: string, granted: boolean }[]
    onEdit: () => void
    onDelete: () => void
}

export default function GroupOverviewCard({
    name,
    color = '#3b82f6',
    grantedCount,
    totalCount,
    permissions,
    onEdit,
    onDelete
}: GroupOverviewCardProps) {
    const displayedPerms = permissions.slice(0, 5)

    return (
        <div className="group relative flex flex-col p-5 rounded-2xl border border-border bg-card/40 transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div 
                        className="flex items-center justify-center w-12 h-12 rounded-xl shadow-inner"
                        style={{ backgroundColor: `${color}15`, color: color }}
                    >
                        <Shield className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold tracking-tight text-foreground">{name}</h3>
                        <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.15em]">
                            Permissions Granted: <span className="text-foreground/80">{grantedCount}/{totalCount}</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 z-30 relative">
                    <button 
                        onMouseDown={(e) => { e.stopPropagation(); onEdit(); }}
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer pointer-events-auto"
                        title="Edit Permissions"
                    >
                        <Settings className="w-4 h-4 text-primary" />
                    </button>
                    <button 
                        onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer pointer-events-auto"
                        title="Delete Group"
                    >
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                </div>
            </div>

            {/* Permissions Summary Grid */}
            <div className="flex flex-col gap-y-2 flex-1 pt-2 border-t border-border/50">
                {displayedPerms.map((perm, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] font-medium">
                        <span className={cn(
                            "truncate pr-2",
                            perm.granted ? "text-foreground" : "text-muted-foreground/40"
                        )}>
                            {perm.label}
                        </span>
                        {perm.granted ? (
                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        ) : (
                            <X className="w-3.5 h-3.5 text-red-500/30 shrink-0" />
                        )}
                    </div>
                ))}
            </div>

            {permissions.length > 5 && (
                <div className="mt-4 pt-3 border-t border-border/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground/50">
                        + {permissions.length - 5} permissões não exibidas
                    </span>
                </div>
            )}
        </div>
    )
}
