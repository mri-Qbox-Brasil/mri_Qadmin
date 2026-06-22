import { Crown, Trash2, Settings, Clock, Car } from 'lucide-react'
import { MriButton, MriTableCell } from '@mriqbox/ui-kit'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'
import { nowSeconds } from '@/utils/time'
import { VipPlayer, VipRank } from '@/types'

function formatExpiration(ts: number, t: any) {
    if (ts === 0) return { label: t('vip.permanent'), color: 'text-blue-400' }
    const now = Math.floor(Date.now() / 1000)
    if (ts < now) return { label: t('vip.expired'), color: 'text-red-500' }
    const diff = ts - now
    const days = Math.floor(diff / 86400)
    if (days > 0) return { label: t('vip.expires_in_days', [days]), color: 'text-amber-400' }
    const hours = Math.floor(diff / 3600)
    return { label: t('vip.expires_in_hours', [hours]), color: 'text-orange-400' }
}

interface Props {
    player: VipPlayer
    rank?: VipRank
    selected?: boolean
    onClick: () => void
    onRemove: () => void
    onEdit: () => void
}

export default function VipPlayerRow({ player, rank, selected, onClick, onRemove, onEdit }: Props) {
    const { t } = useI18n()
    const exp = formatExpiration(player.expiration, t)
    const isExpired = player.expiration !== 0 && player.expiration < nowSeconds()

    return (
        <>
            <MriTableCell
                className={cn('cursor-pointer hover:text-primary', selected && 'text-primary', isExpired && 'opacity-60')}
                onClick={onClick}
            >
                <div className="flex items-center gap-2">
                    <Crown className={cn('w-3.5 h-3.5 shrink-0', isExpired ? 'text-muted-foreground' : 'text-amber-400')} />
                    <span className="font-semibold truncate">{player.name}</span>
                    {player.online && <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />}
                </div>
            </MriTableCell>
            <MriTableCell>
                {rank ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                        style={{ color: rank.color, borderColor: rank.color + '44', background: rank.color + '11' }}>
                        {rank.label}
                    </span>
                ) : <span className="text-muted-foreground text-xs">—</span>}
            </MriTableCell>
            <MriTableCell className="font-mono text-xs text-muted-foreground">{player.citizenid}</MriTableCell>
            <MriTableCell>
                <div className={cn('flex items-center gap-1 text-[11px] font-medium', exp.color)}>
                    <Clock className="w-3 h-3 shrink-0" />
                    {exp.label}
                </div>
            </MriTableCell>
            <MriTableCell>
                <span className="font-semibold">{player.salary.toLocaleString()}</span>
                <span className="text-muted-foreground text-[10px] ml-1 uppercase">{player.salaryType}</span>
            </MriTableCell>
            <MriTableCell className="text-center">{player.inventoryLimit}</MriTableCell>
            <MriTableCell>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Car className="w-3.5 h-3.5" />
                    {player.vehicles?.length ?? 0}
                </div>
            </MriTableCell>
            <MriTableCell className="pr-4">
                <div className="flex items-center justify-end gap-1">
                    <MriButton
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded bg-muted border border-border text-muted-foreground hover:text-foreground"
                        onClick={e => { e.stopPropagation(); onEdit() }}
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </MriButton>
                    <MriButton
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded bg-muted border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/50"
                        onClick={e => { e.stopPropagation(); onRemove() }}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </MriButton>
                </div>
            </MriTableCell>
        </>
    )
}
