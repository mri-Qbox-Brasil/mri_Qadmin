import ActionModal from '@/components/ActionModal'
import { AlertTriangle } from 'lucide-react'
import { useI18n } from '@/context/I18n'

export default function ConfirmAction({ text, onConfirm, onCancel }: { text: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useI18n()
  return (
    <ActionModal
      title={t('confirm_title')}
      icon={AlertTriangle}
      variant="destructive"
      onClose={onCancel}
      onConfirm={onConfirm}
    >
      <p className="mb-6 text-muted-foreground">{text}</p>
    </ActionModal>
  )
}
