import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface MriTabItem {
    id: string
    label: string | React.ReactNode
    icon?: LucideIcon | React.ElementType
    className?: string
}

interface MriTabsProps {
    items: MriTabItem[]
    value: string | string[]
    onChange: (id: any) => void
    type?: 'single' | 'multiple'
    className?: string
    itemClassName?: string
    variant?: 'default' | 'premium'
}

export const MriTabs: React.FC<MriTabsProps> = ({
    items,
    value,
    onChange,
    type = 'single',
    className,
    itemClassName,
    variant = 'default'
}) => {
    const isSelected = (id: string) => {
        if (type === 'multiple') {
            return Array.isArray(value) && value.includes(id)
        }
        return value === id
    }

    const handleClick = (id: string) => {
        if (type === 'multiple') {
            const current = Array.isArray(value) ? [...value] : []
            if (current.includes(id)) {
                onChange(current.filter(i => i !== id))
            } else {
                onChange([...current, id])
            }
        } else {
            onChange(id)
        }
    }

    return (
        <div className={cn(
            "flex gap-1 p-1 border border-border backdrop-blur-sm shadow-inner transition-all shrink-0",
            variant === 'premium' ? "bg-muted/50 rounded-xl" : "bg-muted rounded-lg",
            className
        )}>
            {items.map((item) => {
                const active = isSelected(item.id)
                const Icon = item.icon

                return (
                    <button
                        key={item.id}
                        onClick={() => handleClick(item.id)}
                        className={cn(
                            "px-2 py-1.5 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 flex-1 min-w-0",
                            variant === 'premium' ? "rounded-lg" : "rounded-md",
                            // Single Select Style (Tabs)
                            type === 'single' && (
                                active 
                                    ? "bg-background text-primary shadow-sm ring-1 ring-border/20" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            ),
                            // Multiple Select Style (Filters)
                            type === 'multiple' && (
                                active
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            ),
                            itemClassName,
                            item.className
                        )}
                    >
                        {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", active && type === 'multiple' ? "text-primary-foreground" : "")} />}
                        <span className="truncate pr-0.5">{item.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
