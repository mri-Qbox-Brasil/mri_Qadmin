import { useState } from 'react'
import { MriActionModal, MriInput, MriSelect, MriDatePicker } from '@mriqbox/ui-kit'
import { Crown } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useAppState } from '@/context/AppState'
import { VipPlayer, VipRank } from '@/types'

const DURATION_OPTIONS = [
    { label: '7 dias', value: '604800' },
    { label: '15 dias', value: '1296000' },
    { label: '30 dias', value: '2592000' },
    { label: '60 dias', value: '5184000' },
    { label: '90 dias', value: '7776000' },
    { label: '1 ano', value: '31536000' },
    { label: 'Permanente', value: '0' },
    { label: 'Data personalizada', value: 'custom' },
]

type Props = {
    player: VipPlayer
    ranks?: VipRank[]
    onClose: () => void
    onSubmit: (data: {
        citizenid: string
        rankId?: string
        expiration: number
        salary: number
        salaryType: string
        inventoryLimit: number
    }) => void
}

export default function EditVipModal({ player, ranks = [], onClose, onSubmit }: Props) {
    const { t } = useI18n()
    const { gameData } = useAppState()

    const [rankId, setRankId] = useState(player.rankId ?? '')
    const [duration, setDuration] = useState('custom')
    const [customDate, setCustomDate] = useState<Date | undefined>(
        player.expiration > 0 ? new Date(player.expiration * 1000) : undefined
    )
    const [salary, setSalary] = useState(player.salary)
    const [salaryType, setSalaryType] = useState(player.salaryType)
    const [inventoryLimit, setInventoryLimit] = useState(player.inventoryLimit)

    const moneyTypes = gameData?.settingOptions?.moneyTypes || [
        { label: t('player.actions.money.types.cash'), value: 'cash' },
        { label: t('player.actions.money.types.bank'), value: 'bank' },
        { label: t('player.actions.money.types.crypto'), value: 'crypto' },
    ]

    const handleConfirm = () => {
        let expiration = player.expiration

        if (duration !== 'custom') {
            const secs = Number(duration)
            expiration = secs === 0 ? 0 : Math.floor(Date.now() / 1000) + secs
        } else if (customDate) {
            expiration = Math.floor(customDate.getTime() / 1000)
        }

        onSubmit({ citizenid: player.citizenid, rankId: rankId || undefined, expiration, salary, salaryType, inventoryLimit })
    }

    return (
        <MriActionModal
            title={t('vip.edit_title')}
            icon={Crown}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmLabel={t('common.confirm_label')}
            maxWidth="max-w-lg"
        >
            <div className="space-y-4">
                {ranks.length > 0 && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.rank.label_select')}</label>
                        <MriSelect
                            options={[{ label: '— ' + t('vip.rank.no_rank'), value: '' }, ...ranks.map(r => ({ label: r.label, value: r.id }))]}
                            value={rankId}
                            onChange={id => {
                                setRankId(id)
                                const r = ranks.find(r => r.id === id)
                                if (r) { setSalary(r.salary); setSalaryType(r.salaryType); setInventoryLimit(r.inventoryLimit) }
                            }}
                        />
                    </div>
                )}
                <div className="p-3 bg-muted rounded-lg border border-border text-sm">
                    <span className="text-muted-foreground">{t('vip.editing_player')}: </span>
                    <span className="font-semibold">{player.name}</span>
                    <span className="text-muted-foreground ml-2 font-mono text-xs">{player.citizenid}</span>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.expiration')}</label>
                    <MriSelect
                        options={DURATION_OPTIONS}
                        value={duration}
                        onChange={setDuration}
                    />
                </div>

                {duration === 'custom' && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('player.actions.ban.expire')}</label>
                        <MriDatePicker
                            value={customDate}
                            onChange={setCustomDate}
                            fromDate={new Date()}
                        />
                    </div>
                )}

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
                        <MriSelect
                            options={moneyTypes}
                            value={salaryType}
                            onChange={setSalaryType}
                        />
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
            </div>
        </MriActionModal>
    )
}
