import { Crown, Car, Wallet, Package, Clock, Trash2, Settings } from 'lucide-react'
import { MriButton } from '@mriqbox/ui-kit'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'
import { VipPlayer, VipRank } from '@/types'

function formatExpiration(ts: number, t: any): { label: string; color: string } {
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

export default function VipPlayerCard({ player, rank, selected, onClick, onRemove, onEdit }: Props) {
    const { t } = useI18n()
    const exp = formatExpiration(player.expiration, t)
    const isExpired = player.expiration !== 0 && player.expiration < Math.floor(Date.now() / 1000)
    const accentColor = rank?.color ?? '#fbbf24'

    return (
        <div
            onClick={onClick}
            className={cn(
                'bg-card border rounded-xl flex flex-col cursor-pointer hover:border-primary/50 hover:bg-muted transition-all group overflow-hidden relative',
                selected ? 'border-primary ring-1 ring-primary/30' : 'border-border',
                isExpired && 'opacity-60'
            )}
        >
            {/* Rank color bar */}
            <div className="h-1 w-full" style={{ background: isExpired ? 'transparent' : accentColor }} />

            {/* Header */}
            <div className="relative p-4 pb-3 border-b border-border/50">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg shrink-0" style={{ background: accentColor + '22' }}>
                            <Crown className="w-4 h-4" style={{ color: isExpired ? undefined : accentColor }} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{player.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">{player.citizenid}</p>
                        </div>
                    </div>
                    {player.online && (
                        <span className="shrink-0 h-2 w-2 rounded-full bg-green-500 mt-1.5" title={t('vip.online')} />
                    )}
                </div>

                {rank && (
                    <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1 inline-block"
                        style={{ color: accentColor, borderColor: accentColor + '44', background: accentColor + '11' }}
                    >
                        {rank.label}
                    </span>
                )}
                <div className={cn('flex items-center gap-1 mt-2 text-[11px] font-medium', exp.color)}>
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{exp.label}</span>
                </div>
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Wallet className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold text-foreground">{player.salary.toLocaleString()}</span>
                        <span className="uppercase text-[10px]">{player.salaryType}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Package className="w-3.5 h-3.5 shrink-0" />
                        <span>{player.inventoryLimit}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Car className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('vip.vehicle.count', [player.vehicles?.length ?? 0])}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="p-2 pt-0 flex gap-1.5">
                <MriButton
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-[11px] border-input text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted"
                    onClick={e => { e.stopPropagation(); onEdit() }}
                >
                    <Settings className="w-3 h-3 mr-1" />
                    {t('common.btn_edit')}
                </MriButton>
                <MriButton
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 rounded-md bg-muted border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/50"
                    onClick={e => { e.stopPropagation(); onRemove() }}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </MriButton>
            </div>
        </div>
    )
}
