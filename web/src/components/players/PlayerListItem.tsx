import { useI18n } from '@/hooks/useI18n'
import { MriButton } from '@mriqbox/ui-kit'
import { Eye, Crosshair, Monitor, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Player } from '@/types'
import { useAppState } from '@/context/AppState'
import { hasPermission } from '@/utils/permissions'

interface PlayerListItemProps {
    player: Player
    vipRank?: { label: string; color: string }
    isSelected: boolean
    onClick: (player: Player) => void
    onAction: (action: string, data?: any, player?: Player) => void
}

// Helper duplicated for now, but should ideally reside in utils
const formatDate = (val: any, t: any) => {
    if (!val) return t('common.unknown')
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

export default function PlayerListItem({ player, vipRank, isSelected, onClick, onAction }: PlayerListItemProps) {
    const { t } = useI18n()
    const { myPermissions } = useAppState()
    const canDo = (perm: string) => hasPermission(myPermissions, perm)

    return (
        <div
            onClick={() => onClick(player)}
            className={cn(
                "group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border mb-2 mr-2",
                isSelected
                    ? "bg-muted border-primary shadow-[0_0_15px_-5px_var(--primary)]"
                    : "bg-card border-border hover:border-primary/50 hover:bg-muted/30"
            )}
        >
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-primary font-bold border border-border text-sm shrink-0">
                {player.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <div className={cn("font-medium truncate text-sm", isSelected ? "text-primary" : "text-foreground")}>
                        {player.name}
                    </div>
                    <div className="flex items-center gap-1">
                        {player.online && player.health !== undefined && (
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded border font-bold tracking-wider",
                                (player.health <= 101 || player.metadata?.isdead) ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
                            )}>
                                {(player.health <= 101 || player.metadata?.isdead) ? t('vitals.status.dead') : t('vitals.status.alive')}
                            </span>
                        )}
                        {!player.online && player.ban && (
                            <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded border font-bold tracking-wider",
                                player.ban.isPermanent
                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            )}>
                                {player.ban.isPermanent ? t('status.ban.permanent') : t('status.ban.temporary')}
                            </span>
                        )}
                        {player.metadata?.verified ? (
                            <div className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded border border-border font-bold tracking-wider">{t('player.status.verified')}</div>
                        ) : (
                            <div className="bg-red-500/20 text-red-500 text-[9px] px-1.5 py-0.5 rounded border border-red-500/10 font-bold tracking-wider">{t('player.status.suspect')}</div>
                        )}
                        {vipRank && (
                            <div
                                className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border font-bold tracking-wider"
                                style={{ color: vipRank.color, borderColor: vipRank.color + '55', background: vipRank.color + '18' }}
                            >
                                <Crown className="w-2.5 h-2.5 shrink-0" />
                                {vipRank.label}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 font-mono">
                        <div className="flex items-center gap-1.5">
                            <div className={cn(
                                "w-2 h-2 rounded-full relative",
                                player.online ? "bg-primary shadow-[0_0_8px_var(--primary)]"
                                    : player.ban ? (player.ban.isPermanent ? "bg-red-500" : "bg-yellow-500")
                                    : "bg-muted-foreground"
                            )}>
                                {player.online && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                )}
                            </div>
                            {t('player.id')}: {player.online ? player.id : (player.citizenid || player.cid || t('player.status.offline'))}
                        </div>
                        {player.online ? (
                            <>
                                <span>•</span>
                                <span>{`${t('player.ping')}: ${player.ping || 0}ms`}</span>
                                <span>•</span>
                                <span>{`${t('player.bucket')}: ${player.bucket}`}</span>
                            </>
                        ) : (
                            <>
                                <span>•</span>
                                <span>{t('player.status.offline')} • {formatDate(player.last_loggedout, t)}</span>
                            </>
                        )}
                    </div>

                    {player.online && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canDo('qadmin.action.screen_capture') && (
                                <MriButton
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 rounded bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 top-0.5 relative"
                                    onClick={(e: any) => { e.stopPropagation(); onAction('view_screen', {}, player); }}
                                    disabled={!player.online}
                                    title={t('view_screen')}
                                >
                                    <Monitor className="w-3.5 h-3.5" />
                                </MriButton>
                            )}
                            {canDo('qadmin.action.spectate_player') && (
                                <MriButton
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 rounded bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 top-0.5 relative"
                                    onClick={(e: any) => { e.stopPropagation(); onAction('spectate_player', {}, player); }}
                                    disabled={!player.online}
                                    title={t('player.actions.spectate')}
                                >
                                    <Eye className="w-3 h-3" />
                                </MriButton>
                            )}
                            {canDo('qadmin.action.teleport_to_player') && (
                                <MriButton
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 rounded bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 top-0.5 relative"
                                    onClick={(e: any) => { e.stopPropagation(); onAction('teleportToPlayer', {}, player); }}
                                    disabled={!player.online}
                                    title={t('player.actions.goto')}
                                >
                                    <Crosshair className="w-3 h-3" />
                                </MriButton>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
