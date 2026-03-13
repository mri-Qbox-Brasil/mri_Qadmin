import React, { useState } from 'react'
import { VirtuosoGrid } from 'react-virtuoso'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { MriPageHeader, MriButton, MriCompactSearch } from '@mriqbox/ui-kit'
import GridSkeleton from '@/components/skeletons/GridSkeleton'

import { Package, Box, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

import GiveItemModal from '@/components/players/GiveItemModal'
import ItemGridCard from '@/components/items/ItemGridCard'
import { MOCK_GAME_DATA } from '@/utils/mockData'

export default function Items() {
    const { sendNui } = useNui()
    const { gameData, setGameData, players } = useAppState()
    const { t } = useI18n()
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')

    const handleRefresh = async () => {
        setLoading(true)
        try {
            const data = await sendNui('getData', {}, MOCK_GAME_DATA)
            if (data) setGameData(prev => ({ ...prev, ...data }))
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const items = React.useMemo(() => {
        return (gameData.items || []).map(i => {
            const name = (i.label || i.name || '').trim()
            return {
                item: i.value || i.item,
                name: name,
                description: i.description || ''
            }
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }, [gameData.items])

    const filtered = React.useMemo(() => {
        const s = search.toLowerCase()
        return items.filter(i =>
            (i.name || '').toLowerCase().includes(s) ||
            (i.description || '').toLowerCase().includes(s) ||
            (i.item || '').toLowerCase().includes(s)
        )
    }, [items, search])

    const itemOptions = React.useMemo(() => {
        return items.map(i => ({
            value: i.name || i.item,
            label: `${i.name}`
        }))
    }, [items])

    const [selectedItem, setSelectedItem] = useState<any | null>(null)

    function openModal(item: any) {
        setSelectedItem(item)
    }

    function closeModal() {
        setSelectedItem(null)
    }

    if (loading) return <GridSkeleton />

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('title_items') || "Items"} icon={Package} countLabel={t('records')} count={filtered.length}>
                <div className="flex items-center gap-2">
                    <MriCompactSearch
                        placeholder={t('search_placeholder_items')}
                        value={search}
                        onChange={setSearch}
                        options={itemOptions}
                        searchPlaceholder={t('search_placeholder_items')}
                        className="w-8 h-8 border-border bg-card/60"
                    />
                    {search && (
                        <MriButton
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => setSearch('')}
                            title={t('common_clear')}
                        >
                            <X size={16} />
                        </MriButton>
                    )}
                </div>
                <MriButton
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </MriButton>
            </MriPageHeader>

            <div className="flex-1 overflow-hidden py-4 px-2 ">
                {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Box className="w-12 h-12 opacity-20" />
                        <p>{t('items_none_found')}</p>
                    </div>
                ) : (
                    <VirtuosoGrid
                        style={{ height: '100%' }}
                        data={filtered}
                        listClassName="grid grid-cols-4 gap-4 pb-4"
                        itemContent={(index, item) => (
                            <ItemGridCard key={item.item} item={item} onSpawn={openModal} />
                        )}
                    />
                )}
            </div>

            {selectedItem && (
                <GiveItemModal
                    initialItem={selectedItem.item}
                    initialItemLabel={selectedItem.name}
                    disableItemSelect={true}
                    initialPlayerId={players?.[0]?.id ? String(players[0].id) : undefined}
                    onClose={closeModal}
                    onSubmit={async (playerId, item, amount) => {
                        try {
                            await sendNui('clickButton', { data: { event: 'mri_Qadmin:server:GiveItem', type: 'server', perms: 'qadmin.action.give_item' }, selectedData: { Player: { value: playerId }, Item: { value: item }, Amount: { value: amount } } })
                            closeModal()
                        } catch (e) {
                            console.error('give item', e)
                        }
                    }}
                />
            )}
        </div>
    )
}
