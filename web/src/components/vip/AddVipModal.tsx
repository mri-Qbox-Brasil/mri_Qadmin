import { useState } from 'react'
import { MriActionModal, MriInput, MriSelect, MriDatePicker } from '@mriqbox/ui-kit'
import { Crown } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useAppState } from '@/context/AppState'
import { cn } from '@/lib/utils'
import { VipRank } from '@/types'

type Method = 'citizenid' | 'source'

type Props = {
    ranks?: VipRank[]
    onClose: () => void
    onSubmit: (data: {
        method: Method
        citizenid?: string
        source?: string
        rankId?: string
        expiration: number
        salary: number
        salaryType: string
        inventoryLimit: number
    }) => void
}

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

export default function AddVipModal({ ranks = [], onClose, onSubmit }: Props) {
    const { t } = useI18n()
    const { gameData } = useAppState()

    const [method, setMethod] = useState<Method>('citizenid')
    const [citizenid, setCitizenid] = useState('')
    const [source, setSource] = useState('')
    const [rankId, setRankId] = useState(ranks[0]?.id ?? '')
    const [duration, setDuration] = useState('2592000')
    const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
    const [salary, setSalary] = useState(ranks[0]?.salary ?? 0)
    const [salaryType, setSalaryType] = useState(ranks[0]?.salaryType ?? 'cash')
    const [inventoryLimit, setInventoryLimit] = useState(ranks[0]?.inventoryLimit ?? 0)

    const moneyTypes = gameData?.settingOptions?.moneyTypes || [
        { label: t('player.actions.money.types.cash'), value: 'cash' },
        { label: t('player.actions.money.types.bank'), value: 'bank' },
        { label: t('player.actions.money.types.crypto'), value: 'crypto' },
    ]

    const rankOptions = ranks.map(r => ({ label: r.label, value: r.id }))

    const handleRankChange = (id: string) => {
        setRankId(id)
        const r = ranks.find(r => r.id === id)
        if (r) { setSalary(r.salary); setSalaryType(r.salaryType); setInventoryLimit(r.inventoryLimit) }
    }

    const handleConfirm = () => {
        let expiration = 0
        if (duration === 'custom') {
            if (!customDate) return
            expiration = Math.floor(customDate.getTime() / 1000)
        } else {
            const secs = Number(duration)
            expiration = secs === 0 ? 0 : Math.floor(Date.now() / 1000) + secs
        }
        onSubmit({
            method,
            citizenid: method === 'citizenid' ? citizenid : undefined,
            source: method === 'source' ? source : undefined,
            rankId: rankId || undefined,
            expiration, salary, salaryType, inventoryLimit,
        })
    }

    const methods: { id: Method; label: string }[] = [
        { id: 'citizenid', label: t('vip.method.citizenid') },
        { id: 'source', label: t('vip.method.source') },
    ]

    return (
        <MriActionModal
            title={t('vip.add_title')}
            icon={Crown}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmLabel={t('vip.add_confirm')}
            maxWidth="max-w-lg"
        >
            <div className="space-y-4">
                {rankOptions.length > 0 && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.rank.label_select')}</label>
                        <MriSelect options={rankOptions} value={rankId} onChange={handleRankChange} />
                    </div>
                )}
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.method.label')}</label>
                    <div className="flex gap-1 p-1 bg-muted border border-border rounded-lg">
                        {methods.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMethod(m.id)}
                                className={cn(
                                    'flex-1 py-1.5 text-xs font-semibold rounded-md transition-all',
                                    method === m.id
                                        ? 'bg-background text-primary shadow-sm ring-1 ring-border/20'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {method === 'citizenid' && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.method.citizenid')}</label>
                        <MriInput
                            placeholder="ABC12345"
                            value={citizenid}
                            onChange={e => setCitizenid((e.target as HTMLInputElement).value)}
                            className="bg-background border-border h-10"
                        />
                    </div>
                )}

                {method === 'source' && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.method.source')}</label>
                        <MriInput
                            type="number"
                            placeholder="1"
                            value={source}
                            onChange={e => setSource((e.target as HTMLInputElement).value)}
                            className="bg-background border-border h-10"
                        />
                    </div>
                )}

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
