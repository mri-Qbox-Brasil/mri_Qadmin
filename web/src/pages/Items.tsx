import React, { useEffect, useState } from 'react'
import { useI18n } from '@/context/I18n'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { MriButton, MriInput, MriPageHeader } from '@mriqbox/ui-kit'

import Spinner from '@/components/Spinner'
import { Copy, Package, Search, Box, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

import GiveItemModal from '@/components/players/GiveItemModal'

export default function Items() {
  const { sendNui } = useNui()
  const { gameData, setGameData, players } = useAppState()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [imageError, setImageError] = useState<Record<string, boolean>>({})
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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  function getImageUrl(itemId: string) {
    return `https://cfx-nui-ox_inventory/web/images/${itemId}.png`
  }

  function handleImgError(id: string) {
    setImageError(prev => ({ ...prev, [id]: true }))
  }

  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({})

  function handleImgLoad(id: string) {
      setImageLoaded(prev => ({ ...prev, [id]: true }))
  }

  function openModal(item: any) {
    setSelectedItem(item)
  }

  function closeModal() {
    setSelectedItem(null)
  }

  // ... (handleImgLoad)

  // Removed playerOptions definition as it's now in the modal

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* ... PageHeader ... */}
      <MriPageHeader title={t('title_items') || "Items"} icon={Package} count={filtered.length}>
          {/* ... */}
           {/* ... Search ... */}
           <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <MriInput
                placeholder={t('search_placeholder_items') || "Search items..."}
                value={search}
                onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                className="pl-9 bg-card border-border focus:border-ring h-10 transition-colors"
              />
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

      {/*List*/}
      <div className="flex-1 overflow-auto p-8 no-scrollbar" onScroll={handleScroll}>
        {/* ... (List rendering same as before) ... */}
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
               <Box className="w-12 h-12 opacity-20" />
               <p>{t('items_none_found')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleItems.map(item => (
              <div key={item.item} className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 hover:bg-muted/50 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <MriButton size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(item.item)}>
                        <Copy className="w-4 h-4" />
                   </MriButton>
                </div>

                <div className="w-20 h-20 bg-muted/30 rounded-lg flex items-center justify-center border border-border shrink-0 p-2">
                  {!imageError[item.item] ? (
                    <>
                      {!imageLoaded[item.item] && (
                        <div className="animate-pulse w-full h-full bg-muted rounded" />
                      )}
                      <img
                        src={getImageUrl(item.item)}
                        alt={item.name}
                        className={cn("object-contain w-full h-full transition-opacity duration-300", imageLoaded[item.item] ? 'opacity-100' : 'opacity-0')}
                        loading="lazy"
                        onLoad={() => handleImgLoad(item.item)}
                        onError={() => handleImgError(item.item)}
                      />
                    </>
                  ) : (
                    <Box className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h3 className="font-bold text-foreground truncate pr-8" title={item.name}>{item.name || t('no_name')}</h3>
                    <p className="text-xs text-muted-foreground font-mono truncate">{item.item}</p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                     <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={item.description}>{item.description}</p>
                     <MriButton
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs bg-secondary hover:bg-secondary/80 hover:text-primary border border-border hover:border-primary/50"
                        onClick={() => openModal(item)}
                     >
                        {t('btn_spawn')}
                     </MriButton>
                  </div>
                </div>
              </div>
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
