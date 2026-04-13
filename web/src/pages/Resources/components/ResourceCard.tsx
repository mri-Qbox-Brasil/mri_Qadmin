import { useState } from 'react'
import ButtonState from './ButtonState'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'

interface ResourceCardProps {
    label: string
    version: string
    author: string
    description: string
    state: string
}

export default function ResourceCard({ label, version, author, description, state }: ResourceCardProps) {
    const [expanded, setExpanded] = useState(false)
    const { t } = useI18n()

    const isStarted = state === 'started'

    return (
        <div
            className={cn(
                "w-full rounded-xl border transition-all duration-200 cursor-pointer group",
                expanded ? "bg-muted border-primary/50" : "bg-card border-border hover:border-sidebar-foreground/20 hover:bg-muted/50"
            )}
            onClick={() => setExpanded(!expanded)}
        >
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 overflow-hidden p-1">
                    <div className={cn("w-2 h-2 rounded-full relative", isStarted ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-red-500")}>
                        {isStarted && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <p className="text-sm font-bold text-foreground/80 truncate group-hover:text-foreground transition-colors">{label}</p>
                        {(version || author) && (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                                {version && <span>v{version}</span>}
                                {version && author && <span>•</span>}
                                {author && <span className="text-muted-foreground/80">by {author}</span>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isStarted ? (
                        <>
                            <ButtonState resource={label} state="restart" />
                            <ButtonState resource={label} state="stop" />
                        </>
                    ) : (
                        <ButtonState resource={label} state="start" />
                    )}
                </div>
            </div>

            {expanded && (
                <div className="px-3 pb-3 pt-0">
                    <div className="pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
                        {description || <span className="italic text-muted-foreground/60">{t('resources_no_description')}</span>}
                    </div>
                </div>
            )}
        </div>
    )
}
