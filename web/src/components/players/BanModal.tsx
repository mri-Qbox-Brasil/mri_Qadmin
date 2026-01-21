import { useState } from 'react'
import { MriButton, MriInput, MriModal, MriSelectSearch } from '@mriqbox/ui-kit'
import { useI18n } from '@/context/I18n'
import { Gavel, X } from 'lucide-react'

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
    <MriModal onClose={onClose} className="max-w-lg w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-destructive/10 rounded-lg">
                <Gavel className="w-5 h-5 text-destructive" />
            </div>
            <p className="font-bold text-lg text-foreground">{t('ban_title')}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
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
      </div>

      <div className="mt-6 flex gap-3">
        <MriButton onClick={onClose} variant="ghost" className="flex-1">{t('cancel_label')}</MriButton>
        <MriButton
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={() => { onSubmit(duration, reason); onClose(); }}
        >
            {t('confirm_label')}
        </MriButton>
      </div>
    </MriModal>
  )
}
