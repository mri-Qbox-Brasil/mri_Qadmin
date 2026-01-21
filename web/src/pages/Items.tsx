import React, { useEffect, useState } from 'react'
import { useI18n } from '@/context/I18n'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { MriButton, MriPageHeader } from '@mriqbox/ui-kit'

import Spinner from '@/components/Spinner'
import { Package, Box, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

import GiveItemModal from '@/components/players/GiveItemModal'
import SearchInput from '@/components/shared/SearchInput'
import ItemGridCard from '@/components/items/ItemGridCard'

export default function Items() {
  const { sendNui } = useNui()
  const { gameData, setGameData, players } = useAppState()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [displayLimit, setDisplayLimit] = useState(50)

  const handleRefresh = async () => {
    setLoading(true)
    try {
        const data = await sendNui('getData')
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

  // Reset limit on search
  useEffect(() => {
    setDisplayLimit(50)
  }, [search])

  const visibleItems = filtered.slice(0, displayLimit)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      if (displayLimit < filtered.length) {
        setDisplayLimit(prev => prev + 50)
      }
    }
  }

  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  function openModal(item: any) {
    setSelectedItem(item)
  }

  function closeModal() {
    setSelectedItem(null)
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <MriPageHeader title={t('title_items') || "Items"} icon={Package} countLabel={t('records')} count={filtered.length}>
          <SearchInput
             placeholder={t('search_placeholder_items') || "Search items..."}
             value={search}
             onChange={setSearch}
          />
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

      <div className="flex-1 overflow-auto p-8 no-scrollbar" onScroll={handleScroll}>
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
               <Box className="w-12 h-12 opacity-20" />
               <p>{t('items_none_found')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleItems.map(item => (
                <ItemGridCard key={item.item} item={item} onSpawn={openModal} />
            ))}
          </div>
        )}
         {displayLimit < filtered.length && (
            <div className="py-8 flex justify-center">
                <Spinner size="sm" />
            </div>
         )}
      </div>

      {selectedItem && (
        <GiveItemModal
            initialItem={selectedItem.item}
            initialItemLabel={selectedItem.name}
            disableItemSelect={true}
            initialPlayerId={players?.[0]?.id}
            onClose={closeModal}
            onSubmit={async (playerId, item, amount) => {
                try {
                  await sendNui('clickButton', { data: 'give_item', selectedData: { Player: { value: playerId }, Item: { value: item }, Amount: { value: amount } } })
                } catch (e) {
                  console.error('give item', e)
                }
            }}
        />
      )}
    </div>
  )
}
