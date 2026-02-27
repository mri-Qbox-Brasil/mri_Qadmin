import { useState } from 'react'
import { MriInput, MriSelectSearch, MriActionModal } from '@mriqbox/ui-kit'
import { Wallet } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

export default function MoneyModal({ isGiving, playerId, onClose, onSubmit, defaultType = 'cash', availableTypes = [] }: { isGiving: boolean; playerId: string; onClose: () => void; onSubmit: (type: string, amount: number) => void; defaultType?: string, availableTypes?: { label: string, value: string }[] }) {
  const [moneyType, setMoneyType] = useState<string>(defaultType)
  const [amount, setAmount] = useState<number>(0)
  const { t } = useI18n()

  const typeOptions = availableTypes.length > 0 ? availableTypes : [
      { label: t('option_cash'), value: 'cash' },
      { label: t('option_bank'), value: 'bank' },
      { label: t('option_crypto'), value: 'crypto' },
  ]

  return (
    <MriActionModal
      title={isGiving ? t('money_modal_give') : t('money_modal_remove')}
      icon={Wallet}
      onClose={onClose}
      onConfirm={() => onSubmit(moneyType, amount)}
      confirmLabel={isGiving ? t('send') : t('remove')}
    >
      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('label_type')}</label>
      <div className="mb-4">
        <MriSelectSearch
            options={typeOptions}
            value={moneyType}
            onChange={(val) => setMoneyType(val as any)}
            placeholder={t('select_placeholder')}
        />
      </div>

      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('label_amount')}</label>
      <MriInput type="number" value={amount} onChange={(e) => setAmount(Number((e.target as HTMLInputElement).value))} className="mb-6 bg-background border-border h-10" />
    </MriActionModal>
  )
}
