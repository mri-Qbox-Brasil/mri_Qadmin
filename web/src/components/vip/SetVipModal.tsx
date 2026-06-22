import { useState, useEffect } from 'react'
import { MriActionModal, MriSelect, MriDatePicker } from '@mriqbox/ui-kit'
import { Crown } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { VipRank } from '@/types'
import { MOCK_VIP_RANKS } from '@/utils/mockData'
import { nowSeconds } from '@/utils/time'

const DURATION_OPTIONS = [
    { label: '7 dias',  value: '604800'  },
    { label: '15 dias', value: '1296000' },
    { label: '30 dias', value: '2592000' },
    { label: '60 dias', value: '5184000' },
    { label: '90 dias', value: '7776000' },
    { label: '1 ano',   value: '31536000'},
    { label: 'Permanente', value: '0'    },
    { label: 'Data personalizada', value: 'custom' },
]

type Props = {
    playerName: string
    citizenid: string
    source?: string | number
    onClose: () => void
    onSubmit: (data: { rankId: string; expiration: number; salary: number; salaryType: string; inventoryLimit: number }) => void
}

export default function SetVipModal({ playerName, citizenid, onClose, onSubmit }: Props) {
    const { t } = useI18n()
    const { sendNui } = useNui()

    const [ranks, setRanks] = useState<VipRank[]>(MOCK_VIP_RANKS)
    const [rankId, setRankId] = useState('')
    const [duration, setDuration] = useState('2592000')
    const [customDate, setCustomDate] = useState<Date | undefined>(undefined)

    useEffect(() => {
        sendNui<VipRank[]>('getVipRanks', {}, MOCK_VIP_RANKS).then(data => {
            if (Array.isArray(data) && data.length) {
                setRanks(data)
                setRankId(data[0].id)
            }
        }).catch(() => {})
    }, [sendNui])

    useEffect(() => {
        // Seleciona o primeiro rank por padrao quando a lista carrega.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (ranks.length && !rankId) setRankId(ranks[0].id)
    }, [ranks, rankId])

    const selectedRank = ranks.find(r => r.id === rankId)

    const handleConfirm = () => {
        if (!rankId) return
        let expiration = 0
        if (duration === 'custom') {
            if (!customDate) return
            expiration = Math.floor(customDate.getTime() / 1000)
        } else {
            const secs = Number(duration)
            expiration = secs === 0 ? 0 : nowSeconds() + secs
        }
        onSubmit({
            rankId,
            expiration,
            salary: selectedRank?.salary ?? 0,
            salaryType: selectedRank?.salaryType ?? 'cash',
            inventoryLimit: selectedRank?.inventoryLimit ?? 0,
        })
    }

    const rankOptions = ranks.map(r => ({ label: r.label, value: r.id }))

    return (
        <MriActionModal
            title={t('vip.set_vip_title')}
            icon={Crown}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmLabel={t('vip.add_confirm')}
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg border border-border text-sm">
                    <span className="text-muted-foreground">{t('vip.editing_player')}: </span>
                    <span className="font-semibold">{playerName}</span>
                    <span className="text-muted-foreground ml-2 font-mono text-xs">{citizenid}</span>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.rank.label_select')}</label>
                    <MriSelect options={rankOptions} value={rankId} onChange={setRankId} />
                </div>

                {selectedRank && (
                    <div
                        className="rounded-xl border px-3 py-2 flex items-center gap-2 text-sm"
                        style={{ borderColor: selectedRank.color + '44', background: selectedRank.color + '11' }}
                    >
                        <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-black"
                            style={{ background: selectedRank.color + '33', color: selectedRank.color }}>
                            {selectedRank.label.charAt(0)}
                        </div>
                        <span className="font-semibold">{selectedRank.label}</span>
                        <span className="text-muted-foreground ml-auto text-xs">
                            {selectedRank.salary.toLocaleString()} {selectedRank.salaryType} · {selectedRank.inventoryLimit} inv
                        </span>
                    </div>
                )}

                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.expiration')}</label>
                    <MriSelect options={DURATION_OPTIONS} value={duration} onChange={setDuration} />
                </div>

                {duration === 'custom' && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('player.actions.ban.expire')}</label>
                        <MriDatePicker value={customDate} onChange={setCustomDate} fromDate={new Date()} />
                    </div>
                )}
            </div>
        </MriActionModal>
    )
}
