import { useState } from 'react'
import { Button, Input, Dialog, SelectSearch } from '@mriqbox/ui-kit'
import { useI18n } from '@/context/I18n'

export default function MoneyModal({ isGiving, playerId, onClose, onSubmit, defaultType = 'cash' }: { isGiving: boolean; playerId: string; onClose: () => void; onSubmit: (type: string, amount: number) => void; defaultType?: 'cash'|'bank'|'crypto' }) {
  const [moneyType, setMoneyType] = useState<'cash'|'bank'|'crypto'>(defaultType)
  const [amount, setAmount] = useState<number>(0)
  const { t } = useI18n()

  return (
    <Dialog title={isGiving ? t('money_modal_give') : t('money_modal_remove')} onClose={onClose}>
      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('label_type')}</label>
      <div className="mb-4">
        <SelectSearch
            options={[
                { label: t('option_cash'), value: 'cash' },
                { label: t('option_bank'), value: 'bank' },
                { label: t('option_crypto'), value: 'crypto' },
            ]}
            value={moneyType}
            onChange={(val) => setMoneyType(val as any)}
            placeholder={t('select_placeholder')}
        />
      </div>

      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('label_amount')}</label>
      <Input type="number" value={amount} onChange={(e) => setAmount(Number((e.target as HTMLInputElement).value))} className="mb-6" />

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>{t('cancel_label')}</Button>
        <Button onClick={() => { onSubmit(moneyType, amount); onClose(); }}>{isGiving ? t('send') : t('remove')}</Button>
      </div>
    </Dialog>
  )
}
