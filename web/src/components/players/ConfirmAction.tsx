import { MriButton, MriModal } from '@mriqbox/ui-kit'
import { useI18n } from '@/context/I18n'

export default function ConfirmAction({ text, onConfirm, onCancel }: { text: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useI18n()
  return (
    <MriModal className="max-w-sm w-full" onClose={onCancel}>
      <h3 className="font-bold text-lg mb-2">{t('confirm_title')}</h3>
      <p className="mb-6 text-muted-foreground">{text}</p>
      <div className="flex gap-2 justify-end">
        <MriButton variant="ghost" onClick={onCancel}>{t('cancel_label')}</MriButton>
        <MriButton onClick={onConfirm} variant="destructive">{t('confirm_label')}</MriButton>
      </div>
    </MriModal>
  )
}
