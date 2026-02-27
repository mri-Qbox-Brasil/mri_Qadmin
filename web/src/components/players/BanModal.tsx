import { useState } from 'react'
import { MriActionModal, MriInput, MriSelectSearch } from '@mriqbox/ui-kit'
import { useI18n } from '@/hooks/useI18n'
import { Gavel } from 'lucide-react'

type Props = {
  onClose: () => void
  onSubmit: (duration: string, reason: string) => void
}

export default function BanModal({ onClose, onSubmit }: Props) {
  const { t } = useI18n()

  const banData = [
    { label: t('ban_duration_permanent'), value: '2147483647' },
    { label: t('ban_duration_10m'), value: '600' },
    { label: t('ban_duration_30m'), value: '1800' },
    { label: t('ban_duration_1h'), value: '3600' },
    { label: t('ban_duration_6h'), value: '21600' },
    { label: t('ban_duration_12h'), value: '43200' },
    { label: t('ban_duration_1d'), value: '86400' },
    { label: t('ban_duration_3d'), value: '259200' },
    { label: t('ban_duration_1w'), value: '604800' },
    { label: t('ban_duration_3w'), value: '1814400' },
  ]

  const [duration, setDuration] = useState(banData[0].value)
  const [reason, setReason] = useState(t('ban_reason_placeholder'))

  return (
    <MriActionModal
      title={t('ban_title')}
      icon={Gavel}
      variant="destructive"
      onClose={onClose}
      onConfirm={() => onSubmit(duration, reason)}
      maxWidth="max-w-lg"
    >
        <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('label_duration')}</label>
            <MriSelectSearch
            options={banData}
            value={duration}
            onChange={(val) => setDuration(val)}
            placeholder={t('select_placeholder')}
            />
        </div>

        <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('label_reason')}</label>
            <MriInput
            placeholder={t('ban_reason_placeholder')}
            value={reason}
            onChange={(e) => setReason((e.target as HTMLInputElement).value)}
            className="bg-background border-border h-10"
            />
        </div>
    </MriActionModal>
  )
}
