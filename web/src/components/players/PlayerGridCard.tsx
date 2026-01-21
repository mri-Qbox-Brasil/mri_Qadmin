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

interface PlayerGridCardProps {
  player: Player
  onClick: (player: Player) => void
  onAction: (action: string, data?: any, player?: Player) => void
}

// Helper to format unix timestamp or date string - moved from Players.tsx
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

export default function PlayerGridCard({ player, onClick, onAction }: PlayerGridCardProps) {
  const { t } = useI18n()

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4 cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden"
      onClick={(e) => { e.stopPropagation(); onClick(player); }}
    >
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-primary font-bold">
                    {player.name.substring(0,2).toUpperCase()}
                </div>
                <div>
                    <div className="font-bold text-base leading-none mb-1 text-foreground">{player.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {player.online ? `${t('id')}: ${player.id} • ${t('ping')}: ${player.ping || 0}ms` : `${t('offline')} • ${formatDate(player.last_loggedout, t)}`}
                      <br/>{player.online && `${t('bucket')}: ${player.bucket}`}
                    </div>
                </div>
            </div>
            <div className={cn("w-2 h-2 rounded-full relative", player.online ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-red-500")}>
              {player.online && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              )}
            </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2">
             {player.metadata?.verified ? (
              <div className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded border border-border font-bold tracking-wider">{t('status_verified')}</div>

             ) : (
              <div className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded border border-red-500/10 font-bold tracking-wider">{t('status_suspect')}</div>
             )}

             <div className="flex items-center gap-1">
                 <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20" onClick={(e: any) => { e.stopPropagation(); onAction('spectate_player', {}, player); }} disabled={!player.online}>
                    <Eye className="w-3.5 h-3.5" />
                 </MriButton>
                 <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20" onClick={(e: any) => { e.stopPropagation(); onAction('teleportToPlayer', {}, player); }} disabled={!player.online}>
                    <Crosshair className="w-3.5 h-3.5" />
                 </MriButton>
             </div>
        </div>
    </div>
  )
}
