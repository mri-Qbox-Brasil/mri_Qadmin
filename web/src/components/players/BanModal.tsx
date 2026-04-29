import { useState } from 'react'
import { MriActionModal, MriInput, MriSelect, MriDatePicker } from '@mriqbox/ui-kit'
import { useI18n } from '@/hooks/useI18n'
import { Gavel } from 'lucide-react'

type Props = {
    onClose: () => void
    onSubmit: (duration: string, reason: string) => void
}

export default function BanModal({ onClose, onSubmit }: Props) {
    const { t } = useI18n()

    const banData = [
        { label: t('player.actions.ban.permanent'), value: '2147483647' },
        { label: t('player.actions.ban.durations.10m'), value: '600' },
        { label: t('player.actions.ban.durations.30m'), value: '1800' },
        { label: t('player.actions.ban.durations.1h'), value: '3600' },
        { label: t('player.actions.ban.durations.6h'), value: '21600' },
        { label: t('player.actions.ban.durations.12h'), value: '43200' },
        { label: t('player.actions.ban.durations.1d'), value: '86400' },
        { label: t('player.actions.ban.durations.3d'), value: '259200' },
        { label: t('player.actions.ban.durations.1w'), value: '604800' },
        { label: t('player.actions.ban.durations.3w'), value: '1814400' },
        { label: t('player.actions.ban.durations.custom'), value: 'custom' },
    ]

    const [duration, setDuration] = useState(banData[0].value)
    const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
    const [reason, setReason] = useState(t('player.actions.ban.placeholder'))

    const handleConfirm = () => {
        if (duration === 'custom') {
            if (!customDate) return
            const seconds = Math.floor((customDate.getTime() - Date.now()) / 1000)
            if (seconds <= 0) return
            onSubmit(String(seconds), reason)
        } else {
            onSubmit(duration, reason)
        }
    }

    return (
        <MriActionModal
            title={t('player.actions.ban.title')}
            icon={Gavel}
            variant="destructive"
            onClose={onClose}
            onConfirm={handleConfirm}
            maxWidth="max-w-lg"
        >
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('player.actions.ban.duration')}</label>
                    <MriSelect
                        options={banData}
                        value={duration}
                        onChange={(val) => setDuration(val)}
                    />
                </div>

                {duration === 'custom' && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                            {t('player.actions.ban.expire')}
                        </label>
                        <MriDatePicker
                            value={customDate}
                            onChange={setCustomDate}
                            fromDate={new Date()}
                        />
                    </div>
                )}

                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('player.actions.ban.reason')}</label>
                    <MriInput
                        placeholder={t('player.actions.ban.placeholder')}
                        value={reason}
                        onChange={(e) => setReason((e.target as HTMLInputElement).value)}
                        className="bg-background border-border h-10"
                    />
                </div>
            </div>
        </MriActionModal>
    )
}
