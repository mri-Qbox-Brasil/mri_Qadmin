import { useI18n } from '@/context/I18n'
import { MriButton } from '@mriqbox/ui-kit'
import { Eye, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Player {
  id: number | string
  name: string
  license?: string
  citizenid?: string
  online: boolean
  ping?: number
  bucket?: number
  last_loggedout?: number | string
  metadata?: {
    verified?: boolean
  }
}

interface PlayerListItemProps {
  player: Player
  isSelected: boolean
  onClick: (player: Player) => void
  onAction: (action: string, data?: any, player?: Player) => void
}

// Helper duplicated for now, but should ideally reside in utils
const formatDate = (val: any, t: any) => {
  if (!val) return t('unknown')
  let date: Date
  if (!isNaN(val) && !isNaN(parseFloat(val))) {
     const num = Number(val)
     if (num < 100000000000) {
         date = new Date(num * 1000)
     } else {
         date = new Date(num)
     }
  } else {
      date = new Date(val)
  }
  if (isNaN(date.getTime())) return String(val)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export default function PlayerListItem({ player, isSelected, onClick, onAction }: PlayerListItemProps) {
  const { t } = useI18n()

  return (
    <div
        onClick={() => onClick(player)}
        className={cn(
            "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border border-transparent hover:bg-muted/50",
            isSelected ? "bg-muted/80 border-primary/30 shadow-[0_0_15px_-5px_var(--primary)]" : "bg-card"
        )}
    >
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-primary font-bold border border-border text-sm shrink-0">
            {player.name.substring(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <div className={cn("font-medium truncate text-sm", isSelected ? "text-primary" : "text-foreground")}>
                    {player.name}
                </div>
                {player.metadata?.verified ? (
                    <div className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded border border-border font-bold tracking-wider">{t('status_verified')}</div>
                ) : (
                    <div className="bg-red-500/20 text-red-500 text-[9px] px-1.5 py-0.5 rounded border border-red-500/10 font-bold tracking-wider">{t('status_suspect')}</div>
                )}
            </div>

            <div className="flex items-center justify-between">
                <div className="text-[10px] text-muted-foreground flex items-center gap-2 font-mono">
                    <div className="flex items-center gap-1.5">
                         <div className={cn("w-2 h-2 rounded-full relative", player.online ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-red-500")}>
                            {player.online && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            )}
                        </div>
                         {t('id')}: {player.id}
                    </div>
                    {player.online ? (
                        <>
                            <span>•</span>
                            <span>{`${t('ping')}: ${player.ping || 0}ms`}</span>
                            <span>•</span>
                            <span>{`${t('bucket')}: ${player.bucket}`}</span>
                        </>
                    ) : (
                        <>
                            <span>•</span>
                            <span>{t('offline')} • {formatDate(player.last_loggedout, t)}</span>
                        </>
                    )}
                </div>

                {player.online && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MriButton
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 top-0.5 relative"
                            onClick={(e: any) => { e.stopPropagation(); onAction('spectate_player', {}, player); }}
                            title={t('spectate')}
                        >
                            <Eye className="w-3 h-3" />
                        </MriButton>
                        <MriButton
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 top-0.5 relative"
                            onClick={(e: any) => { e.stopPropagation(); onAction('teleportToPlayer', {}, player); }}
                            title={t('teleport_to')}
                        >
                            <Crosshair className="w-3 h-3" />
                        </MriButton>
                    </div>
                )}
            </div>
        </div>
    </div>
  )
}
