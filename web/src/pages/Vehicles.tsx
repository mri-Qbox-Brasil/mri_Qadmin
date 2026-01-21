import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/context/I18n'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { MriButton, MriInput, MriModal, MriPageHeader } from '@mriqbox/ui-kit'

import { Copy, Car, Search, Tag, DollarSign, RefreshCw } from 'lucide-react'
import VehicleImage from './Vehicles/components/VehicleImage'
import Spinner from '@/components/Spinner'


export default function Vehicles() {
  const { t } = useI18n()
  const { sendNui } = useNui()
  const { gameData, setGameData } = useAppState()
  const [search, setSearch] = useState('')
  const [displayLimit, setDisplayLimit] = useState(50)
  const [loading, setLoading] = useState(false)

  const vehicles = React.useMemo(() => {
    return (gameData.vehicles || []).map(v => {
      const name = (v.name || v.label || '').trim()
      return {
        model: v.model || v.value,
        name: name,
        brand: v.brand || '',
        price: v.price || 0,
        stock: v.stock || 0,
        category: v.category || ''
      }
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [gameData.vehicles])

  const [stockModal, setStockModal] = useState<{show: boolean, vehicle: any}>({show: false, vehicle: null})
  const [newStock, setNewStock] = useState(0)

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

  const filteredVehicles = React.useMemo(() => {
    const s = search.toLowerCase()
    return vehicles.filter(v =>
      (v.name && v.name.toLowerCase().includes(s)) ||
      (v.model && v.model.toLowerCase().includes(s)) ||
      (v.brand && v.brand.toLowerCase().includes(s)) ||
      (v.category && v.category.toLowerCase().includes(s)) ||
      String(v.price).includes(s) ||
      String(v.stock).includes(s)
    )
  }, [vehicles, search])

  // Reset limit on search
  React.useEffect(() => {
    setDisplayLimit(50)
  }, [search])

  const visibleVehicles = filteredVehicles.slice(0, displayLimit)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      if (displayLimit < filteredVehicles.length) {
        setDisplayLimit(prev => prev + 50)
      }
    }
  }

  const handleUpdateStock = async () => {
    if (!stockModal.vehicle) return
    try {
      const resp = await sendNui('update_vehicle_stock', {
        selectedData: {
          model: { value: stockModal.vehicle.model },
          stock: { value: newStock }
        }
      })

      if (resp && resp.status === 'ok') {
        const newData = await sendNui('getData')
        if (newData) {
          setGameData((prev: any) => ({
             ...prev,
             ...newData
          }))
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setStockModal({show: false, vehicle: null})
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <MriPageHeader title={t('title_vehicles') || "Vehicles"} icon={Car} count={filteredVehicles.length}>
          <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <MriInput
                placeholder={t('search_placeholder_vehicles') || "Search vehicles..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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

      <div className="flex-1 overflow-auto px-8 pb-8 no-scrollbar" onScroll={handleScroll}>
        {filteredVehicles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Car className="w-12 h-12 opacity-20" />
            <p>{t('vehicles_none_found')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-8">
            {visibleVehicles.map(v => (
                <div key={v.model} className="bg-card border border-border rounded-xl flex flex-col hover:border-primary/50 hover:bg-muted transition-all group overflow-hidden relative">
                    {/* Image & Header Section */}
                    <div className="relative w-full h-40 bg-muted/30 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center p-2">
                             <VehicleImage model={v.model} name={v.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                        </div>

                        {/* Text Overlay */}
                        <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start z-10">
                            <div>
                                <h3 className="font-bold text-white text-sm truncate max-w-[140px] drop-shadow-md">{v.name}</h3>
                                <p className="text-[10px] text-zinc-400 font-mono drop-shadow-md">{v.brand}</p>
                            </div>
                            <span className="text-[10px] font-mono bg-black/40 text-zinc-300 px-1.5 py-0.5 rounded border border-white/5">
                                {v.category}
                            </span>
                        </div>

                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <MriButton size="sm" variant="ghost" className="h-6 w-6 p-0 text-zinc-400 hover:text-white bg-black/50 hover:bg-black/80" onClick={() => copyToClipboard(v.model)}>
                                <Copy className="w-3 h-3" />
                            </MriButton>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-3 flex flex-col gap-3 border-t border-border/50 bg-card">
                         {/* Model Display */}
                         <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                            <span className="text-muted-foreground/80">ID:</span>
                            <span className="text-foreground select-all">{v.model}</span>
                         </div>

                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-1 text-green-500 font-bold">
                                <DollarSign size={14} className="stroke-[2.5]" />
                                <span className="text-lg">{v.price.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-medium bg-muted px-2 py-1 rounded border border-border">
                                <Tag size={10} />
                                {t('stock_label', [v.stock])}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <MriButton
                                variant="outline"
                                size="sm"
                                className="flex-1 h-8 text-xs border-input text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted"
                                onClick={() => {
                                    setStockModal({show: true, vehicle: v})
                                    setNewStock(v.stock)
                                }}
                            >
                                {t('btn_stock')}
                            </MriButton>
                            <MriButton
                                size="sm"
                                className="flex-1 h-8 text-xs bg-secondary hover:bg-secondary/80 hover:text-primary border border-border hover:border-primary/50 text-foreground"
                                onClick={() => sendNui('clickButton', { data: 'spawn_vehicle', selectedData: { Vehicle: { value: v.model } } })}
                            >
                                {t('btn_spawn')}
                            </MriButton>
                        </div>
                    </div>
              </div>
            ))}
          </div>
        )}
        {displayLimit < filteredVehicles.length && (
            <div className="py-8 flex justify-center">
                <Spinner size="sm" />
            </div>
        )}
      </div>

      {stockModal.show && (
        <MriModal onClose={() => setStockModal({show: false, vehicle: null})} className="max-w-lg w-full">
          <div className="p-6">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                {t('update_stock_title', [stockModal.vehicle.name])}
            </h2>

            <div className="space-y-4">
                <div>
                     <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('stock_quantity_label')}</label>
                     <MriInput
                        type="number"
                        value={newStock}
                        onChange={e => setNewStock(Number(e.target.value))}
                        className="bg-input border-input h-10"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <MriButton onClick={() => setStockModal({show: false, vehicle: null})} variant="ghost" className="flex-1">{t('cancel_label')}</MriButton>
                    <MriButton onClick={handleUpdateStock} className="flex-1">{t('confirm_label')}</MriButton>
                </div>
            </div>
          </div>
        </MriModal>
      )}
    </div>
  )
}
