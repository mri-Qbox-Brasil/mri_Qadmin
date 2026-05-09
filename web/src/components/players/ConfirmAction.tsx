import { MriActionModal } from '@mriqbox/ui-kit'
import { AlertTriangle } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

export default function ConfirmAction({
    text,
    onConfirm,
    onCancel,
    hideBlur,
    hideOverlay,
}: {
    text: string
    onConfirm: () => void
    onCancel: () => void
    hideBlur?: boolean
    hideOverlay?: boolean
}) {
    const { t } = useI18n()
    return (
        <MriActionModal
            title={t('confirm.title')}
            icon={AlertTriangle}
            variant="destructive"
            onClose={onCancel}
            onConfirm={onConfirm}
            hideBlur={hideBlur}
            hideOverlay={hideOverlay}
        >
            <p className="mb-6 text-muted-foreground break-all">{text}</p>
        </MriActionModal>
    )
}
