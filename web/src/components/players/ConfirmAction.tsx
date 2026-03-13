import { MriActionModal } from '@mriqbox/ui-kit'
import { AlertTriangle } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

export default function ConfirmAction({ text, onConfirm, onCancel }: { text: string; onConfirm: () => void; onCancel: () => void }) {
    const { t } = useI18n()
    return (
        <MriActionModal
            title={t('confirm_title')}
            icon={AlertTriangle}
            variant="destructive"
            onClose={onCancel}
            onConfirm={onConfirm}
        >
            <p className="mb-6 text-muted-foreground break-all">{text}</p>
        </MriActionModal>
    )
}
