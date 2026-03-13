import React, { useState } from 'react'
import { VirtuosoGrid } from 'react-virtuoso'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { MriButton, MriPageHeader, MriCompactSearch } from '@mriqbox/ui-kit'
import GridSkeleton from '@/components/skeletons/GridSkeleton'

import { Car, RefreshCw, X } from 'lucide-react'

import VehicleGridCard from '@/components/vehicles/VehicleGridCard'
import StockModal from '@/components/vehicles/StockModal'
import { MOCK_GAME_DATA } from '@/utils/mockData'


export default function Vehicles() {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const { gameData, setGameData } = useAppState()
    const [search, setSearch] = useState('')
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

    const vehicleOptions = React.useMemo(() => {
        return vehicles.map(v => ({
            value: v.name || v.model,
            label: `${v.name} (${v.model})`
        }))
    }, [vehicles])

    const [stockModal, setStockModal] = useState<{ show: boolean, vehicle: any }>({ show: false, vehicle: null })

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
            setStockModal({ show: false, vehicle: null })
        }
    }

    if (loading) return <GridSkeleton />

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('title_vehicles') || "Vehicles"} icon={Car} countLabel={t('records')} count={filteredVehicles.length}>
                <div className="flex items-center gap-2">
                    <MriCompactSearch
                        placeholder={t('search_placeholder_vehicles')}
                        value={search}
                        onChange={setSearch}
                        options={vehicleOptions}
                        searchPlaceholder={t('search_placeholder_vehicles')}
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

            <div className="flex-1 overflow-hidden pt-4 p-2">
                {filteredVehicles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Car className="w-12 h-12 opacity-20" />
                        <p>{t('vehicles_none_found')}</p>
                    </div>
                ) : (
                    <VirtuosoGrid
                        style={{ height: '100%' }}
                        data={filteredVehicles}
                        listClassName="grid grid-cols-4 gap-4"
                        itemContent={(index: number, v: any) => (
                            <VehicleGridCard
                                key={v.model}
                                vehicle={v}
                                onSpawn={(model) => sendNui('clickButton', { data: { event: 'mri_Qadmin:client:SpawnVehicle', type: 'client', perms: 'qadmin.action.spawn_vehicle' }, selectedData: { Vehicle: { value: model } } })}
                                onUpdateStock={(veh) => setStockModal({ show: true, vehicle: veh })}
                            />
                        )}
                    />
                )}
            </div>

            <StockModal
                vehicle={stockModal.vehicle}
                isOpen={stockModal.show}
                onClose={() => setStockModal({ show: false, vehicle: null })}
                onConfirm={handleUpdateStock}
            />
        </div>
    )
}
