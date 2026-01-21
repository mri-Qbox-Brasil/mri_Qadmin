import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/context/I18n'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { MriButton, MriPageHeader } from '@mriqbox/ui-kit'

import { Car, RefreshCw } from 'lucide-react'
import Spinner from '@/components/Spinner'

import SearchInput from '@/components/shared/SearchInput'
import VehicleGridCard from '@/components/vehicles/VehicleGridCard'
import StockModal from '@/components/vehicles/StockModal'


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

  const handleUpdateStock = async (vehicle: any, newStock: number) => {
    if (!vehicle) return
    try {
      const resp = await sendNui('update_vehicle_stock', {
        selectedData: {
          model: { value: vehicle.model },
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

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <MriPageHeader title={t('title_vehicles') || "Vehicles"} icon={Car} count={filteredVehicles.length}>
          <SearchInput
            placeholder={t('search_placeholder_vehicles') || "Search vehicles..."}
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

      <div className="flex-1 overflow-auto px-8 pb-8 no-scrollbar" onScroll={handleScroll}>
        {filteredVehicles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Car className="w-12 h-12 opacity-20" />
            <p>{t('vehicles_none_found')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-8">
            {visibleVehicles.map(v => (
                <VehicleGridCard
                    key={v.model}
                    vehicle={v}
                    onSpawn={(model) => sendNui('clickButton', { data: 'spawn_vehicle', selectedData: { Vehicle: { value: model } } })}
                    onUpdateStock={(veh) => setStockModal({ show: true, vehicle: veh })}
                />
            ))}
          </div>
        )}
        {displayLimit < filteredVehicles.length && (
            <div className="py-8 flex justify-center">
                <Spinner size="sm" />
            </div>
        )}
      </div>

      <StockModal
        vehicle={stockModal.vehicle}
        isOpen={stockModal.show}
        onClose={() => setStockModal({show: false, vehicle: null})}
        onConfirm={handleUpdateStock}
      />
    </div>
  )
}
