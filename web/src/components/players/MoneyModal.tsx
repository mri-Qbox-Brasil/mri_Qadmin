import { useState } from 'react'
import { MriInput, MriActionModal, MriSelect } from '@mriqbox/ui-kit'
import { Wallet } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

export default function MoneyModal({ isGiving, onClose, onSubmit, defaultType = 'cash', availableTypes = [] }: { isGiving: boolean; onClose: () => void; onSubmit: (type: string, amount: number) => void; defaultType?: string, availableTypes?: { label: string, value: string }[] }) {
    const [moneyType, setMoneyType] = useState<string>(defaultType)
    const [amount, setAmount] = useState<number>(0)
    const { t } = useI18n()

    const typeOptions = availableTypes.length > 0 ? availableTypes : [
        { label: t('player.actions.money.types.cash'), value: 'cash' },
        { label: t('player.actions.money.types.bank'), value: 'bank' },
        { label: t('player.actions.money.types.crypto'), value: 'crypto' },
    ]

    return (
        <MriActionModal
            title={isGiving ? t('player.actions.money.give') : t('player.actions.money.remove')}
            icon={Wallet}
            onClose={onClose}
            onConfirm={() => onSubmit(moneyType, amount)}
            confirmLabel={isGiving ? t('player.actions.money.give') : t('player.actions.money.remove')}
        >
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('player.actions.money.type')}</label>
                    <MriSelect
                        options={typeOptions}
                        value={moneyType}
                        onChange={(val) => setMoneyType(val as any)}
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('player.actions.money.amount')}</label>
                    <MriInput type="number" value={amount} onChange={(e) => setAmount(Number((e.target as HTMLInputElement).value))} className="bg-background border-border h-10" />
                </div>
            </div>
        </MriActionModal>
    )
}
