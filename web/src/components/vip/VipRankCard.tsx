import { Pencil, Trash2, Wallet, Package } from 'lucide-react'
import { MriButton } from '@mriqbox/ui-kit'
import { useI18n } from '@/hooks/useI18n'
import { VipRank } from '@/types'

interface Props {
    rank: VipRank
    onEdit: () => void
    onDelete: () => void
}

export default function VipRankCard({ rank, onEdit, onDelete }: Props) {
    const { t } = useI18n()

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-all group">
            {/* Color bar */}
            <div className="h-1.5 w-full" style={{ background: rank.color }} />

            <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-black"
                        style={{ background: rank.color + '22', color: rank.color, border: `1px solid ${rank.color}44` }}
                    >
                        {rank.label.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-sm">{rank.label}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{rank.id}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/60 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                            <Wallet className="w-3 h-3" />
                            <span className="text-[10px] font-medium uppercase">{t('vip.salary')}</span>
                        </div>
                        <p className="text-sm font-bold">{rank.salary.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{rank.salaryType}</p>
                    </div>
                    <div className="bg-muted/60 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                            <Package className="w-3 h-3" />
                            <span className="text-[10px] font-medium uppercase">{t('vip.inventory_limit')}</span>
                        </div>
                        <p className="text-sm font-bold">{rank.inventoryLimit}</p>
                    </div>
                </div>
            </div>

            <div className="p-2 pt-0 flex gap-1.5">
                <MriButton
                    size="sm" variant="outline"
                    className="flex-1 h-7 text-[11px] border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={onEdit}
                >
                    <Pencil className="w-3 h-3 mr-1" />
                    {t('common.btn_edit')}
                </MriButton>
                <MriButton
                    size="icon" variant="ghost"
                    className="h-7 w-7 shrink-0 rounded-md bg-muted border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/50"
                    onClick={onDelete}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </MriButton>
            </div>
        </div>
    )
}
