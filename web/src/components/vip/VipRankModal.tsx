import { useState } from 'react'
import { MriActionModal, MriInput, MriSelect, MriColorPicker } from '@mriqbox/ui-kit'
import { Crown } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { VipRank } from '@/types'

type Props = {
    rank?: VipRank
    onClose: () => void
    onSubmit: (data: Omit<VipRank, 'createdAt'>) => void
}

export default function VipRankModal({ rank, onClose, onSubmit }: Props) {
    const { t } = useI18n()
    const isEdit = !!rank

    const [id, setId] = useState(rank?.id ?? '')
    const [label, setLabel] = useState(rank?.label ?? '')
    const [color, setColor] = useState(rank?.color ?? '#ffd700')
    const [salary, setSalary] = useState(rank?.salary ?? 0)
    const [salaryType, setSalaryType] = useState(rank?.salaryType ?? 'cash')
    const [inventoryLimit, setInventoryLimit] = useState(rank?.inventoryLimit ?? 0)

    const moneyTypes = [
        { label: t('player.actions.money.types.cash'), value: 'cash' },
        { label: t('player.actions.money.types.bank'), value: 'bank' },
        { label: t('player.actions.money.types.crypto'), value: 'crypto' },
    ]

    const handleConfirm = () => {
        if (!id.trim() || !label.trim()) return
        onSubmit({ id: id.trim(), label: label.trim(), color, salary, salaryType, inventoryLimit })
    }

    return (
        <MriActionModal
            title={isEdit ? t('vip.rank.edit_title') : t('vip.rank.create_title')}
            icon={Crown}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmLabel={isEdit ? t('common.confirm_label') : t('vip.rank.create_confirm')}
            maxWidth="max-w-lg"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.rank.id')}</label>
                        <MriInput
                            placeholder="gold"
                            value={id}
                            disabled={isEdit}
                            onChange={e => setId((e.target as HTMLInputElement).value.toLowerCase().replace(/\s+/g, '_'))}
                            className="bg-background border-border h-10 font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.rank.label')}</label>
                        <MriInput
                            placeholder="Gold"
                            value={label}
                            onChange={e => setLabel((e.target as HTMLInputElement).value)}
                            className="bg-background border-border h-10"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.rank.color')}</label>
                    <MriColorPicker
                        color={color}
                        onChange={setColor}
                        active={true}
                        format="hex"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.salary')}</label>
                        <MriInput
                            type="number"
                            value={salary}
                            onChange={e => setSalary(Number((e.target as HTMLInputElement).value))}
                            className="bg-background border-border h-10"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.salary_type')}</label>
                        <MriSelect options={moneyTypes} value={salaryType} onChange={setSalaryType} />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.inventory_limit')}</label>
                    <MriInput
                        type="number"
                        value={inventoryLimit}
                        onChange={e => setInventoryLimit(Number((e.target as HTMLInputElement).value))}
                        className="bg-background border-border h-10"
                    />
                </div>

                {/* Preview */}
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: color + '44' }}>
                    <div className="h-1" style={{ background: color }} />
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: color + '11' }}>
                        <div
                            className="w-6 h-6 rounded flex items-center justify-center text-xs font-black"
                            style={{ background: color + '33', color }}
                        >
                            {(label || 'R').charAt(0)}
                        </div>
                        <span className="text-sm font-semibold">{label || t('vip.rank.preview')}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{salary.toLocaleString()} {salaryType} · {inventoryLimit} inv</span>
                    </div>
                </div>
            </div>
        </MriActionModal>
    )
}
