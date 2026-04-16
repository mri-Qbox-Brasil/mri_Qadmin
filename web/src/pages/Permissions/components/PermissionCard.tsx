import React from 'react'
import { LucideIcon, Lock, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PermissionCardProps {
    title: string
    description?: string
    icon: LucideIcon
    active: boolean
    onToggle: () => void
    disabled?: boolean
    className?: string
}

export default function PermissionCard({
    title,
    description,
    icon: Icon,
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
            {/* Background Glow Effect */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                active && "opacity-100"
            )} />

            <div className="relative flex items-center gap-4 flex-1 min-w-0">
                <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                    active 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" 
                        : "bg-muted/30 text-muted-foreground group-hover:bg-muted/50"
                )}>
                    <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex flex-col min-w-0">
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
            </div>

            <div className="relative ml-4 shrink-0">
                {/* Custom Toggle Switch */}
                <div className={cn(
                    "w-11 h-6 rounded-full p-1 transition-all duration-300 ease-in-out",
                    active ? "bg-primary" : "bg-muted/50"
                )}>
                    <div className={cn(
                        "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out",
                        active ? "translate-x-5" : "translate-x-0"
                    )} />
                </div>
            </div>
        </div>
    )
}
