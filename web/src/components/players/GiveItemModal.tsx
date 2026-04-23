import { useState, useEffect } from 'react'
import { MriActionModal, MriInput, MriSelect } from '@mriqbox/ui-kit'
import { Gift } from 'lucide-react'

import { useI18n } from '@/hooks/useI18n'
import { useAppState } from '@/context/AppState'

export default function GiveItemModal({
    initialPlayerId = '',
    initialItem = '',
    initialItemLabel = '',
    disablePlayerSelect = false,
    disableItemSelect = false,
    onClose,
    onSubmit
}: {
    initialPlayerId?: string;
    initialItem?: string;
    initialItemLabel?: string;
    disablePlayerSelect?: boolean;
    disableItemSelect?: boolean;
    onClose: () => void;
    onSubmit: (playerId: string, item: string, amount: number) => void
}) {
    const [playerId, setPlayerId] = useState(initialPlayerId)
    const [item, setItem] = useState(initialItem)
    const [amount, setAmount] = useState<number>(1)
    const { t } = useI18n()
    const { gameData, players } = useAppState()

    useEffect(() => {
        setPlayerId(initialPlayerId)
    }, [initialPlayerId])

    useEffect(() => {
        setItem(initialItem)
    }, [initialItem])


    const itemOptions = (gameData.items || []).map((i: any) => ({
        label: i.label || i.name,
        value: i.item || i.value || i.name,
    })).sort((a, b) => a.label.localeCompare(b.label))

    const playerOptions = (players || []).map(p => {
        const pId = p.id ?? p.cid;
        return {
            label: `${p.name || 'Unknown'} (${pId})`,
            value: pId
        };
    })

    return (
        <MriActionModal
            title={t('item.give.title').replace('%s', '')}
            icon={Gift}
            onClose={onClose}
            onConfirm={() => onSubmit(playerId, item, amount)}
            isConfirmDisabled={!playerId || !item}
        >

            {!disablePlayerSelect ? (
                <div className="mb-4">
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('common.search_player')}</label>
                    <MriSelect
                        options={playerOptions}
                        value={String(playerId)}
                        onChange={setPlayerId}
                        placeholder={t('common.search_player')}
                        searchPlaceholder={t('common.search_player')}
                        emptyMessage={t('common.no_results')}
                    />
                </div>
            ) : null}

            <div className="mb-4">
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('item.labels.name')}</label>
                {disableItemSelect ? (
                    <MriInput
                        value={initialItemLabel || itemOptions.find(o => String(o.value).toLowerCase() === String(item).toLowerCase())?.label || item || ''}
                        disabled
                        className="opacity-70 bg-background border-border h-10"
                    />
                ) : (
                    <MriSelect
                        options={itemOptions}
                        value={item}
                        onChange={setItem}
                        placeholder={t('common.search')}
                        searchPlaceholder={t('common.search')}
                    />
                )}
            </div>

            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('item.labels.quantity')}</label>
            <MriInput type="number" value={amount} onChange={e => setAmount(Number((e.target as HTMLInputElement).value))} className="mb-6 bg-background border-border h-10" />
        </MriActionModal>
    )
}
