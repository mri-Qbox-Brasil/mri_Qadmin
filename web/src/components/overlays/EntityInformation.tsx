import { useAppState } from '@/context/AppState'
import { MriCard, MriCardContent, MriCardHeader, MriCardTitle } from '@mriqbox/ui-kit'
import { Info } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

export default function EntityInformation() {
    const { entityInfo } = useAppState()
    const { t } = useI18n()

    if (!entityInfo?.show) return null

    return (
        <MriCard className="w-64 ml-4 pointer-events-auto bg-primary text-primary-foreground border-none shadow-lg">
                <MriCardHeader className="p-4 pb-2">
                    <MriCardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Info className="h-4 w-4" />
                        {t('devmode_entity_info')}
                    </MriCardTitle>
                </MriCardHeader>
                <MriCardContent className="p-4 pt-2 text-xs space-y-1">
                    <p><span className="font-semibold">{t('devmode_type')}:</span> {entityInfo.type}</p>
                    <p><span className="font-semibold">{t('devmode_model')}:</span> {entityInfo.name}</p>
                    <p><span className="font-semibold">{t('devmode_hash')}:</span> {entityInfo.hash}</p>
                    <p><span className="font-semibold">{t('devmode_handle')}:</span> {entityInfo.id}</p>
                    {entityInfo.netId && <p><span className="font-semibold">{t('devmode_netid')}:</span> {entityInfo.netId}</p>}
                    <p><span className="font-semibold">{t('devmode_distance')}:</span> {entityInfo.distance}m</p>
                    <div className="mt-4 pt-2 border-t border-primary-foreground/20 italic opacity-80">
                        <p>{t('devmode_copy_info')}</p>
                        <p>{t('devmode_delete_ent')}</p>
                        <p>{t('devmode_exit_info')}</p>
                    </div>
                </MriCardContent>
            </MriCard>
    )
}

