import React from 'react'
import { cn } from '@/lib/utils'

interface PermissionCardProps {
    title: string
    description?: string
    active: boolean
    onToggle: () => void
    disabled?: boolean
    className?: string
}

export default function PermissionCard({
    title,
    description,
    active,
    onToggle,
    disabled,
    className
}: PermissionCardProps) {
    return (
        <div
            onClick={() => !disabled && onToggle()}
            className={cn(
                "group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden",
                active
                    ? "bg-primary/5 border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
                    : "bg-card/40 border-border hover:border-primary/20",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                active && "opacity-100"
            )} />

            <div className="relative flex flex-col min-w-0 flex-1">
                <h3 className={cn(
                    "text-sm font-bold truncate transition-colors",
                    active ? "text-primary" : "text-foreground"
                )}>
                    {title}
                </h3>
                {description && (
                    <p className="text-[11px] text-muted-foreground truncate opacity-70 group-hover:opacity-100 transition-opacity">
                        {description}
                    </p>
                )}
            </div>

            <div className="relative ml-4 shrink-0">
                <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    active ? "bg-primary border-primary" : "border-muted-foreground/30"
                )}>
                    {active && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
            </div>
        </div>
    )
}
