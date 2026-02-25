import { useState, useEffect } from 'react'
import { MriModal, MriButton, MriInput } from '@mriqbox/ui-kit'
import { Car } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface StockModalProps {
  vehicle: any
  isOpen: boolean
  onClose: () => void
  onConfirm: (vehicle: any, newStock: number) => void
}

export default function StockModal({ vehicle, isOpen, onClose, onConfirm }: StockModalProps) {
  const { t } = useI18n()
  const [stock, setStock] = useState(0)

  // Reset stock when modal opens with a new vehicle
  useEffect(() => {
    if (vehicle && isOpen) {
      setStock(vehicle.stock)
    }
  }, [vehicle, isOpen])

  if (!isOpen || !vehicle) return null

  return (
    <MriModal onClose={onClose} className="max-w-lg w-full">
      <div className="p-6">
         <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            {t('update_stock_title', [vehicle.name])}
        </h2>

        <div className="space-y-4">
            <div>
                 <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('stock_quantity_label')}</label>
                 <MriInput
                    type="number"
                    value={stock}
                    onChange={e => setStock(Number(e.target.value))}
                    className="bg-input border-input h-10"
                />
            </div>

            <div className="flex gap-3 pt-2">
                <MriButton onClick={onClose} variant="ghost" className="flex-1">{t('cancel_label')}</MriButton>
                <MriButton onClick={() => onConfirm(vehicle, stock)} className="flex-1">{t('confirm_label')}</MriButton>
            </div>
        </div>
      </div>
    </MriModal>
  )
}
