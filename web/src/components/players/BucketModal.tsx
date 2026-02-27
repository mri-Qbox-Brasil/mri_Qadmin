import { useState } from 'react'
import { MriInput, MriActionModal } from '@mriqbox/ui-kit'
import { useI18n } from '@/hooks/useI18n'
import { Navigation } from 'lucide-react'

type Props = {
  onClose: () => void
  onSubmit: (bucket: number) => void
}

export default function BucketModal({ onClose, onSubmit }: Props) {
  const { t } = useI18n()
  const [bucket, setBucket] = useState('0')

  return (
    <MriActionModal
      title={t('set_bucket')}
      icon={Navigation}
      variant="default"
      onClose={onClose}
      onConfirm={() => onSubmit(parseInt(bucket) || 0)}
    >
        <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('bucket')}</label>
            <MriInput
            type="number"
            placeholder="0"
            value={bucket}
            onChange={(e) => setBucket((e.target as HTMLInputElement).value)}
            className="bg-background border-border h-10"
            min={0}
            />
        </div>
    </MriActionModal>
  )
}
