import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { PRIORITY_CONFIG, priorityColors } from "./PriorityBadge"

interface PrioritySelectorProps {
    currentPriority: number
    onChange: (newPriority: number) => void
    disabled?: boolean
}

export function PrioritySelector({ currentPriority, onChange, disabled }: PrioritySelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const currentConfig = PRIORITY_CONFIG.find((p) => p.id === currentPriority) || PRIORITY_CONFIG[0]
    const currentColors = priorityColors[currentConfig.color]

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSelect = (priority: number) => {
        if (priority !== currentPriority) {
            onChange(priority)
        }
        setIsOpen(false)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors border border-transparent",
                    currentColors,
                    disabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 cursor-pointer"
                )}
            >
                <svg className="w-3 h-3 fill-current" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                </svg>
                {currentConfig.label}
                {!disabled && (
                    <svg className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </button>

            {isOpen && !disabled && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                    {PRIORITY_CONFIG.map((priority) => {
                        const itemColors = priorityColors[priority.color]
                        const isSelected = priority.id === currentPriority

                        return (
                            <button
                                key={priority.id}
                                onClick={() => handleSelect(priority.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                                    isSelected ? "bg-muted" : "hover:bg-muted/50",
                                    itemColors.split(" ")[1] // Just text color
                                )}
                            >
                                <svg className="w-3 h-3 fill-current" viewBox="0 0 8 8">
                                    <circle cx="4" cy="4" r="3" />
                                </svg>
                                {priority.label}
                                {isSelected && (
                                    <svg className="w-3 h-3 ml-auto opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
