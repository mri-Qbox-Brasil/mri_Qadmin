import React, { useEffect, useState } from 'react'
import LiveMap from '@/components/map/LiveMap'
import { useNui } from '@/context/NuiContext'
import { MriPageHeader, MriButton, MriCompactSearch } from '@mriqbox/ui-kit'
import { Map as MapIcon, ShieldCheck, User, Skull, RefreshCcw, Settings, Sun, Moon, Map as MapTypeIcon, Globe, X, Grid } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import ScreenModal from '@/components/players/ScreenModal'
import { cn } from '@/lib/utils'

export default function LiveMapPage() {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const [markers, setMarkers] = useState<any[]>([])
    const [viewingPlayer, setViewingPlayer] = useState<{ id: number, name: string } | null>(null)
    const [wallColors, setWallColors] = useState<Record<string, string>>({})

    // Map States
    const [search, setSearch] = useState('')
    const [filters, setFilters] = useState({ staff: true, players: true, dead: true })
    const [mapType, setMapType] = useState<'atlas' | 'grid' | 'satellite'>(() => {
        return (localStorage.getItem('mri_qadmin_map_style') as any) || 'atlas'
    })
    const [brightness, setBrightness] = useState(1.0)
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | number>('')
    const [resetTrigger, setResetTrigger] = useState(0)
    const [showSettings, setShowSettings] = useState(false)

    useEffect(() => {
        localStorage.setItem('mri_qadmin_map_style', mapType)
    }, [mapType])

    // Fetch wall colors
    useEffect(() => {
        sendNui('mri_Qadmin:callback:GetWallSettings', {}, { colors: {} }).then((data: any) => {
            if (data && data.colors) {
                setWallColors(data.colors)
            }
        }).catch(console.error)
    }, [sendNui])

    const fetchMarkers = React.useCallback(async (mounted = true) => {
        try {
            // Mock data for dev
            const mockMarkers = [
                { id: 1, x: -768.58, y: -2443.77, heading: 0, name: 'John Doe', vitals: { health: 100, armor: 50, hunger: 80, thirst: 90 }, isStaff: true, group: 'group.admin' },
                { id: 2, x: 200, y: 200, heading: 90, name: 'Jane Smith', vitals: { health: 80, armor: 0, hunger: 40, thirst: 30 }, inVehicle: true, vehicleType: 'car' },
                { id: 3, x: -500, y: 1500, heading: 180, name: 'Marcus Holloway', vitals: { health: 0, armor: 0, hunger: 0, thirst: 0, isDead: true } },
                { id: 4, x: 1200, y: -1000, heading: 45, name: 'Airplane Pilot', vitals: { health: 100, armor: 100, hunger: 95, thirst: 95 }, inVehicle: true, vehicleType: 'plane' },
                { id: 5, x: -1500, y: -500, heading: 270, name: 'Helicopter Guy', vitals: { health: 100, armor: 100, hunger: 100, thirst: 100 }, isStaff: true, inVehicle: true, vehicleType: 'heli', group: 'group.mod' },
                { id: 6, x: 500, y: -2000, heading: 135, name: 'Boat Captain', vitals: { health: 100, isDead: false }, inVehicle: true, vehicleType: 'boat' },
                { id: 7, x: -2000, y: 2000, heading: 315, name: 'Bike Rider', vitals: { health: 100, armor: 20, hunger: 50, thirst: 50 }, inVehicle: true, vehicleType: 'bike' },
                { id: 8, x: 0, y: 0, heading: 0, name: 'Ordinary Player', vitals: { health: 90, armor: 10, hunger: 70, thirst: 60 } }
            ]

            const data = await sendNui('GetAllPlayerCoords', {}, mockMarkers)
            if (mounted && Array.isArray(data)) {
                setMarkers(data)
            }
        } catch (e) {
            console.error(e)
        }
    }, [sendNui])

    // Poll for coords
    useEffect(() => {
        let mounted = true
        // Delay slightly to avoid synchronous setState in effect warning during mounting/mocking
        const timeout = setTimeout(() => fetchMarkers(mounted), 0)
        const interval = setInterval(() => fetchMarkers(mounted), 2000) // 2s update
        return () => {
            mounted = false
            clearTimeout(timeout)
            clearInterval(interval)
        }
    }, [fetchMarkers])


    const searchOptions = React.useMemo(() => markers.map(m => ({
        value: String(m.id),
        label: `${m.name} (#${m.id})`,
    })), [markers]);

    const handleResetMap = () => {
        setSearch('')
        setFilters({ staff: true, players: true, dead: true })
        setSelectedPlayerId('')
        setResetTrigger(prev => prev + 1)
        fetchMarkers() // Trigger immediate data refresh
    }

    return (
        <div className="h-full flex flex-col rounded-r-xl overflow-hidden">
            <MriPageHeader title={t('nav_livemap') || "Live Map"} icon={MapIcon}>
                <div className="flex items-center gap-3">
                    <div className="flex gap-2 bg-muted rounded-lg p-1 border border-border mt-[-1px]">
                        <button
                            onClick={() => setFilters(f => ({ ...f, staff: !f.staff }))}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                                filters.staff ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ShieldCheck className={cn("w-3.5 h-3.5 transition-colors", filters.staff ? "text-white" : "text-muted-foreground")} />
                            {t('livemap_filter_staff')}
                        </button>
                        <button
                            onClick={() => setFilters(f => ({ ...f, players: !f.players }))}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                                filters.players ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <User className={cn("w-3.5 h-3.5 transition-colors", filters.players ? "text-white" : "text-muted-foreground")} />
                            {t('livemap_filter_players')}
                        </button>
                        <button
                            onClick={() => setFilters(f => ({ ...f, dead: !f.dead }))}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                                filters.dead ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Skull className={cn("w-3.5 h-3.5 transition-colors", filters.dead ? "text-white" : "text-muted-foreground")} />
                            {t('livemap_filter_dead')}
                        </button>
                    </div>
                    <div className="relative">
                        {showSettings && (
                            <div className="absolute top-full mt-2 right-0 w-64 bg-card border border-border p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        <span className="flex items-center gap-2"><Sun size={12} /> {t('livemap_map_brightness')}</span>
                                        <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">{Math.round(brightness * 100)}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Moon size={14} className="text-muted-foreground" />
                                        <input type="range" min="20" max="100" step="1" value={brightness * 100} onChange={(e) => setBrightness(Number(e.target.value) / 100)} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                                        <Sun size={14} className="text-muted-foreground" />
                                    </div>
                                </div>
                                <div className="h-px bg-border" />
                                <div className="flex flex-col gap-3">
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <MapTypeIcon size={12} /> {t('livemap_style')}
                                    </div>
                                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                                        <MriButton
                                            variant={mapType === 'atlas' ? 'default' : 'ghost'}
                                            size="sm"
                                            className="flex-1 h-8 text-[10px] font-bold gap-1.5"
                                            onClick={() => setMapType('atlas')}
                                        >
                                            <MapTypeIcon size={12} /> {t('livemap_style_atlas')}
                                        </MriButton>
                                        <MriButton
                                            variant={mapType === 'grid' ? 'default' : 'ghost'}
                                            size="sm"
                                            className="flex-1 h-8 text-[10px] font-bold gap-1.5"
                                            onClick={() => setMapType('grid')}
                                        >
                                            <Grid size={12} /> {t('livemap_style_grid')}
                                        </MriButton>
                                        <MriButton
                                            variant={mapType === 'satellite' ? 'default' : 'ghost'}
                                            size="sm"
                                            className="flex-1 h-8 text-[10px] font-bold gap-1.5"
                                            onClick={() => setMapType('satellite')}
                                        >
                                            <Globe size={12} /> {t('livemap_style_satellite')}
                                        </MriButton>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <MriCompactSearch
                        placeholder={t('livemap_search_placeholder')}
                        value={selectedPlayerId}
                        onChange={(id) => {
                            setSelectedPlayerId(id)
                            if (id) setSearch('') // Clear free text search if selecting a player
                        }}
                        options={searchOptions}
                        searchPlaceholder={t('livemap_search_input_placeholder')}
                        className="w-8 h-8 border-border bg-card/60"
                    />
                    {selectedPlayerId && (
                        <MriButton
                            size="icon"
                            variant="outline"
                            className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10"
                            onClick={() => setSelectedPlayerId('')}
                        >
                            <X size={16} />
                        </MriButton>
                    )}
                    <MriButton
                        variant="outline"
                        size="icon"
                        className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10"
                        onClick={handleResetMap}
                        title={t('common_refresh')}
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </MriButton>
                    <MriButton
                        variant="outline"
                        size="icon"
                        className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        <Settings className={cn("w-4 h-4 transition-transform duration-500", showSettings && "rotate-90")} />
                    </MriButton>
                </div>
            </MriPageHeader>
            <div className="pt-4 p-2 w-full h-full">
                <div className="w-full h-full rounded-xl border border-border relative shadow-sm bg-card overflow-hidden">
                    <LiveMap
                        markers={markers.map(m => {
                            // Apply wall color if staff
                            if (m.isStaff && m.group && wallColors[m.group]) {
                                return { ...m, staffColor: wallColors[m.group] }
                            }
                            return m
                        })}
                        search={search}
                        setSearch={setSearch}
                        filters={filters}
                        setFilters={setFilters}
                        mapType={mapType}
                        setMapType={setMapType}
                        brightness={brightness}
                        setBrightness={setBrightness}
                        selectedPlayerId={selectedPlayerId}
                        setSelectedPlayerId={setSelectedPlayerId}
                        resetTrigger={resetTrigger}
                        onViewScreen={(id: any, name: any) => {
                            console.log('[LiveMapPage] onViewScreen RAW:', { id, name });
                            const numericId = parseInt(String(id), 10);
                            if (isNaN(numericId)) {
                                console.error('[LiveMapPage] FAILED to parse ID:', id);
                                return;
                            }
                            console.log('[LiveMapPage] Setting viewingPlayer:', { id: numericId, name: String(name) });
                            setViewingPlayer({ id: numericId, name: String(name) });
                        }}
                    />
                </div>
            </div>

            {viewingPlayer && (
                <ScreenModal
                    playerId={viewingPlayer?.id}
                    playerName={viewingPlayer?.name}
                    onClose={() => setViewingPlayer(null)}
                />
            )}
        </div>
    )
}
