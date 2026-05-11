import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { MriButton, MriPageHeader, MriSkeleton, MriExpandableSearch } from '@mriqbox/ui-kit'
import {
    MriTable,
    MriTableHeader,
    MriTableBody,
    MriTableHead,
    MriTableRow,
    MriTableCell
} from '@/components/ui/MriTable'
import { VirtuosoGrid, TableVirtuoso } from 'react-virtuoso'

import { Car, RefreshCw, Gift, LayoutGrid, Table as TableIcon } from 'lucide-react'

import VehicleGridCard from '@/components/vehicles/VehicleGridCard'
import StockModal from '@/components/vehicles/StockModal'
import VehicleWizard from './Vehicles/components/VehicleWizard'
import { MOCK_GAME_DATA } from '@/utils/mockData'
import { hasPermission } from '@/utils/permissions'


export default function Vehicles() {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const { gameData, setGameData, myPermissions } = useAppState()
    const canDo = (perm: string) => hasPermission(myPermissions, perm)

    const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
        const saved = localStorage.getItem('mri_qadmin_vehicles_view_mode')
        return (saved === 'grid' || saved === 'table') ? saved : 'grid'
    })

    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [showVehicleWizard, setShowVehicleWizard] = useState(false)

    React.useEffect(() => {
        localStorage.setItem('mri_qadmin_vehicles_view_mode', viewMode)
    }, [viewMode])

    const vehicles = React.useMemo(() => {
        return (gameData.vehicles || []).map(v => {
            const name = (v.name || v.label || '').trim()
            const model = v.model || v.value || 'unknown'
            return {
                model: model,
                name: name || model,
                brand: v.brand || '',
                price: Number(v.price) || 0,
                stock: Number(v.stock) || 0,
                category: v.category || ''
            }
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }, [gameData.vehicles])


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


    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('vehicle.title') || "Vehicles"} icon={Car} countLabel={t('common.records')} count={filteredVehicles.length}>
                <div className="flex items-center bg-card border border-border rounded-lg p-1 gap-1">
                    <MriButton
                        size="icon"
                        variant="ghost"
                        className={cn("h-8 w-8 rounded", viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </MriButton>
                    <MriButton
                        size="icon"
                        variant="ghost"
                        className={cn("h-8 w-8 rounded", viewMode === 'table' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => setViewMode('table')}
                    >
                        <TableIcon className="w-4 h-4" />
                    </MriButton>
                </div>

                <div className="flex items-center gap-2">
                    <MriExpandableSearch
                        placeholder={t('common.search')}
                        value={search}
                        onChange={setSearch}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {canDo('qadmin.action.manage_vehicles') && (
                        <MriButton
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => setShowVehicleWizard(true)}
                        >
                            <Gift className="w-4 h-4" />
                        </MriButton>
                    )}
                    <MriButton
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={handleRefresh}
                        isLoading={loading}
                        disabled={loading}
                    >
                        {!loading && <RefreshCw className="w-4 h-4" />}
                    </MriButton>
                </div>
            </MriPageHeader>

            <div className="flex-1 overflow-hidden pt-4 p-2">
                {loading ? (
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-4">
                                <MriSkeleton className="h-40 w-full rounded-lg" />
                                <div className="space-y-2">
                                    <MriSkeleton className="h-4 w-3/4" />
                                    <MriSkeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredVehicles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Car className="w-12 h-12 opacity-20" />
                        <p>{t('vehicle.none_found')}</p>
                    </div>
                ) : viewMode === 'table' ? (
                    <MriTable className="h-full">
                        <TableVirtuoso
                            style={{ height: '100%' }}
                            data={filteredVehicles}
                            components={{
                                Table: (props: any) => <table {...props} className="w-full text-left" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }} />,
                                TableHeader: MriTableHeader,
                                TableBody: MriTableBody,
                                TableRow: MriTableRow,
                            }}
                            fixedHeaderContent={() => (
                                <tr className="bg-muted border-b border-border shadow-sm">
                                    <MriTableHead className="w-[30%]">{t('vehicle.labels.name')}</MriTableHead>
                                    <MriTableHead className="w-[20%]">{t('vehicle.labels.model')}</MriTableHead>
                                    <MriTableHead className="w-[15%]">{t('vehicle.labels.brand')}</MriTableHead>
                                    <MriTableHead className="w-[15%]">{t('vehicle.labels.category')}</MriTableHead>
                                    <MriTableHead className="w-[10%] text-right">{t('vehicle.labels.stock')}</MriTableHead>
                                    <MriTableHead className="w-[10%] text-right pr-6">{t('common.actions')}</MriTableHead>
                                </tr>
                            )}
                            itemContent={(_: any, v: any) => (
                                <>
                                    <MriTableCell className="font-bold">{v.name}</MriTableCell>
                                    <MriTableCell className="font-mono text-xs">{v.model}</MriTableCell>
                                    <MriTableCell>{v.brand}</MriTableCell>
                                    <MriTableCell>
                                        <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-medium uppercase border border-border">
                                            {v.category}
                                        </span>
                                    </MriTableCell>
                                    <MriTableCell className="text-right">
                                        <span className={cn(
                                            "font-mono font-bold",
                                            v.stock <= 0 ? "text-red-500" : "text-foreground"
                                        )}>
                                            {v.stock}
                                        </span>
                                    </MriTableCell>
                                    <MriTableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1">
                                            {canDo('qadmin.action.spawn_vehicle') && (
                                                <MriButton
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 rounded bg-muted border border-border text-muted-foreground hover:text-foreground"
                                                    onClick={() => sendNui('clickButton', { data: { event: 'mri_Qadmin:client:SpawnVehicle', type: 'client', perms: 'qadmin.action.spawn_vehicle' }, selectedData: { Vehicle: { value: v.model } } })}
                                                >
                                                    <Car className="w-3.5 h-3.5" />
                                                </MriButton>
                                            )}
                                        </div>
                                    </MriTableCell>
                                </>
                            )}
                        />
                    </MriTable>
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

            <VehicleWizard
                isOpen={showVehicleWizard}
                onClose={() => setShowVehicleWizard(false)}
                onFinish={handleRefresh}
            />
        </div>
    )
}
