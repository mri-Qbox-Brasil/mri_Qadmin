import { useState } from 'react'
import { MriActionModal, MriInput, MriSelect, MriDatePicker } from '@mriqbox/ui-kit'
import { Car } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useAppState } from '@/context/AppState'

type Props = {
    onClose: () => void
    onSubmit: (data: { model: string; plate: string; expiration: number }) => void
}

export default function VipVehicleModal({ onClose, onSubmit }: Props) {
    const { t } = useI18n()
    const { gameData } = useAppState()

    const [model, setModel] = useState('')
    const [plate, setPlate] = useState('')
    const [expDate, setExpDate] = useState<Date | undefined>(undefined)

    const vehicleOptions = (gameData.vehicles || []).map((v: any) => ({
        label: v.name || v.label || v.model,
        value: v.model || v.value,
    })).sort((a: any, b: any) => a.label.localeCompare(b.label))

    const handleConfirm = () => {
        if (!model) return
        const expiration = expDate ? Math.floor(expDate.getTime() / 1000) : 0
        onSubmit({ model, plate, expiration })
    }

    return (
        <MriActionModal
            title={t('vip.vehicle.add_title')}
            icon={Car}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmLabel={t('vip.vehicle.add_confirm')}
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.vehicle.model')}</label>
                    <MriSelect
                        options={vehicleOptions}
                        value={model}
                        onChange={setModel}
                        placeholder={t('common.search')}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.vehicle.plate')}</label>
                    <MriInput
                        placeholder={t('vip.vehicle.plate_hint')}
                        value={plate}
                        maxLength={8}
                        onChange={e => setPlate((e.target as HTMLInputElement).value.toUpperCase())}
                        className="bg-background border-border h-10 uppercase font-mono"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('vip.vehicle.expiration')}</label>
                    <MriDatePicker
                        value={expDate}
                        onChange={setExpDate}
                        fromDate={new Date()}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{t('vip.vehicle.expiration_hint')}</p>
                </div>
            </div>
        </MriActionModal>
    )
}
