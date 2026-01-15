import { Button, Dialog } from '@mriqbox/ui-kit'
import { useI18n } from '@/context/I18n'

export default function ConfirmAction({ text, onConfirm, onCancel }: { text: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useI18n()
  return (
    <Dialog title={t('confirm_title')} onClose={onCancel}>
      <p className="mb-4">{text}</p>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>{t('cancel_label')}</Button>
        <Button onClick={onConfirm}>{t('confirm_label')}</Button>
      </div>
    </Dialog>
  )
}
