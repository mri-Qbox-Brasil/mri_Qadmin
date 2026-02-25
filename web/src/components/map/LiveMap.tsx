import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState, useRef } from 'react'
import { User, Car, ShieldCheck, Plus, Minus, Info, Monitor, Plane, Ship, Bike, Helicopter, Motorbike, X, RefreshCcw } from 'lucide-react'
import ReactDOMServer from 'react-dom/server'
import { MriButton, MriCompactSearch } from '@mriqbox/ui-kit'
import { Eye, EyeOff, Settings as SettingsIcon, Sun, Moon } from 'lucide-react'
import VitalAdjustModal from '@/components/shared/VitalAdjustModal'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'
import PlayerVitals from '@/components/shared/PlayerVitals'

interface MapMarker {
    id: string | number
    name: string
    x: number
    y: number
    heading?: number
    vitals?: {
        health: number
        armor: number
        hunger: number
        thirst: number
        isDead?: boolean
    }
    inVehicle?: boolean
    vehicleType?: 'car' | 'bike' | 'motorcycle' | 'plane' | 'boat' | 'heli'
    isStaff?: boolean
    group?: string
    staffColor?: string
}

interface LiveMapProps {
    markers: MapMarker[]
    centerOnMarkerId?: string | number | null
    initialZoom?: number
    onViewScreen?: (playerId: string | number, playerName: string) => void
}

const PlayerIcon = ({ marker }: { marker: MapMarker }) => {
    const isStaff = marker.isStaff
    const inVehicle = marker.inVehicle
    const isDead = marker.vitals?.isDead
    const vType = marker.vehicleType || 'car'
    const color = marker.staffColor || (isStaff ? '#FACC15' : (isDead ? '#9ca3af' : 'hsl(160, 100%, 45%)'))

    let Icon = (isStaff ? ShieldCheck : User)
    if (inVehicle) {
        if (vType === 'bike') Icon = Bike
        else if (vType === 'motorcycle') Icon = Motorbike
        else if (vType === 'plane') Icon = Plane
        else if (vType === 'boat') Icon = Ship
        else if (vType === 'heli') Icon = Helicopter
        else Icon = Car
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '32px',
            height: '32px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '50%',
            border: `2px solid ${color}`,
            boxShadow: `0 0 10px ${color}44`,
            transition: 'all 0.3s ease',
            filter: isDead ? 'grayscale(1)' : 'none'
        }}>
            <Icon size={18} color={color} fill={isStaff ? `${color}33` : 'none'} />
            {!inVehicle && marker.heading !== undefined && (
                <div style={{
                    position: 'absolute',
                    top: '-5px',
                    width: '0',
                    height: '0',
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: `8px solid ${color}`,
                    transform: `rotate(${marker.heading}deg)`,
                    transformOrigin: '50% 21px'
                }} />
            )}
        </div>
    )
}

const CustomZoomControls = () => {
    const map = useMap()
    return (
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
            <MriButton
                variant="outline"
                size="icon"
                className="bg-card/90 border-border hover:bg-muted h-10 w-10 flex items-center justify-center pointer-events-auto"
                onClick={() => map.zoomIn()}
            >
                <Plus size={20} />
            </MriButton>
            <MriButton
                variant="outline"
                size="icon"
                className="bg-card/90 border-border hover:bg-muted h-10 w-10 flex items-center justify-center pointer-events-auto"
                onClick={() => map.zoomOut()}
            >
                <Minus size={20} />
            </MriButton>
        </div>
    )
}

const Legend = () => {
    const { t } = useI18n()
    return (
        <div className="absolute bottom-6 left-6 z-[1000] bg-card/80 border border-border p-3 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[140px] pointer-events-auto">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
                <Info size={12} /> {t('livemap_legend')}
            </div>
            <div className="flex items-center gap-3 text-xs">
                <div
                    className="w-3 h-3 rounded-full"
                    style={{
                        backgroundColor: 'hsl(160, 100%, 45%)',
                        boxShadow: '0 0 8px hsl(160, 100%, 45% / 0.4)'
                    }}
                /> {t('vitals_status_alive')}
            </div>
            <div className="flex items-center gap-3 text-xs opacity-50">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" /> {t('vitals_status_dead')}
            </div>
        </div>
    )
}

function MapResetter({ resetTrigger, initialZoom }: { resetTrigger: number, initialZoom: number }) {
    const map = useMap()
    useEffect(() => {
        if (resetTrigger > 0) {
            map.flyTo([0, 0], initialZoom)
        }
    }, [resetTrigger, map, initialZoom])
    return null
}

function MapController({ centerOnMarkerId, markers }: { centerOnMarkerId?: string | number | null, markers: MapMarker[] }) {
    const map = useMap()
    useEffect(() => {
        if (centerOnMarkerId && markers.length > 0) {
            const target = markers.find(m => String(m.id) === String(centerOnMarkerId))
            if (target) {
                map.flyTo([target.y, target.x], 3)
            }
        }
    }, [centerOnMarkerId, markers, map])
    return null
}

export default function LiveMap({ markers, centerOnMarkerId, initialZoom = 3, onViewScreen }: LiveMapProps) {
    const { t } = useI18n()
    const [search, setSearch] = useState('')
    const [filters, setFilters] = useState({ staff: true, players: true, dead: true })
    const [brightness, setBrightness] = useState(1.0)
    const [uiVisible, setUiVisible] = useState(true)
    const [showSettings, setShowSettings] = useState(false)
    const [showVital, setShowVital] = useState<{ markerId: any, vital: any, label: string, value: number, playerName: string } | null>(null)
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | number>('')
    const [centerMarker, setCenterMarker] = useState<string | number | null>(null)
    const [resetTrigger, setResetTrigger] = useState(0)
    const { sendNui } = useNui()

    const markerRefs = useRef<Record<string, any>>({})

    const filteredMarkers = markers.filter((m: MapMarker) => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || String(m.id).includes(search)
        const isDead = m.vitals?.isDead
        if (m.isStaff && !filters.staff) return false
        if (!m.isStaff && !isDead && !filters.players) return false
        if (isDead && !filters.dead) return false
        return matchesSearch
    })

    const searchOptions = useMemo(() => markers.map(m => ({
        value: String(m.id),
        label: `${m.name} (#${m.id})`,
    })), [markers]);

    const handleResetMap = () => {
        setSearch('')
        setFilters({ staff: true, players: true, dead: true })
        setSelectedPlayerId('')
        setCenterMarker(null)
        setResetTrigger(prev => prev + 1)
        // Close all popups
        Object.values(markerRefs.current).forEach(marker => {
            if (marker && marker.closePopup) marker.closePopup()
        })
    }

    const handleSelectPlayer = (id: string | number) => {
        if (!id || id === selectedPlayerId) {
            setSelectedPlayerId('')
            setCenterMarker(null)
            // Close all popups
            Object.values(markerRefs.current).forEach(marker => {
                if (marker && marker.closePopup) marker.closePopup()
            })
            return
        }
        setSelectedPlayerId(id)
        setCenterMarker(id)
        setTimeout(() => {
            const marker = markerRefs.current[id]
            if (marker) marker.openPopup()
        }, 300)
    }

    const center_x = 117.3;
    const center_y = 172.8;
    const scale_x = 0.02072;
    const scale_y = 0.0205;

    const GtaVCrs = useMemo(() => L.Util.extend({}, L.CRS.Simple, {
        transformation: new L.Transformation(scale_x, center_x, -scale_y, center_y)
    }), []);

    const createCustomIcon = (marker: MapMarker) => {
        return L.divIcon({
            html: ReactDOMServer.renderToString(<PlayerIcon marker={marker} />),
            className: 'custom-player-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        })
    }

    return (
        <div className="w-full h-full relative group overflow-hidden">
            <style>{`
                .leaflet-container { background: #09090b !important; overflow: visible !important; }
                .leaflet-tile-pane { filter: brightness(${brightness}); transition: filter 0.3s ease; }
                .leaflet-popup-content-wrapper { background: rgba(15, 15, 20, 0.9) !important; color: white !important; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; }
                .leaflet-popup-tip { background: rgba(15, 15, 20, 0.9) !important; }
                .leaflet-popup-content { margin: 0 !important; width: auto !important; }
                .leaflet-tooltip { background: rgba(0,0,0,0.8) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: white !important; border-radius: 6px !important; font-weight: 600 !important; }
                .custom-player-marker { border: none !important; background: none !important; }
                .map-brightness-slider { -webkit-appearance: none; width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; outline: none; }
                .map-brightness-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; background: #00E396; cursor: pointer; border-radius: 50%; border: 2px solid #09090b; box-shadow: 0 0 10px rgba(0, 227, 150, 0.4); transition: all 0.2s ease; }
            `}</style>

            {!uiVisible && (
                <div className="absolute top-6 right-6 z-[1001] pointer-events-auto">
                    <MriButton
                        size="icon"
                        variant="secondary"
                        className="h-10 w-10 shadow-xl border border-border bg-card/80"
                        onClick={() => setUiVisible(true)}
                        title={t('livemap_show_interface')}
                    >
                        <Eye className="w-5 h-5" />
                    </MriButton>
                </div>
            )}

            <MapContainer
                center={[0, 0]}
                zoom={initialZoom}
                scrollWheelZoom={true}
                maxZoom={5}
                minZoom={0}
                crs={GtaVCrs}
                zoomControl={false}
                style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0, overflow: 'hidden' }}
            >
                <TileLayer
                    url="./map/tiles/{z}/{x}/{y}.webp"
                    noWrap={true}
                    tileSize={256}
                    minZoom={0}
                    maxZoom={5}
                />

                {filteredMarkers.map((marker: MapMarker) => (
                    <Marker
                        key={marker.id}
                        position={[marker.y, marker.x]}
                        icon={createCustomIcon(marker)}
                        ref={(ref) => { if (ref) markerRefs.current[marker.id] = ref }}
                    >
                        <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                            <div className="flex items-center gap-2">
                                {marker.isStaff && <ShieldCheck size={12} className="text-yellow-400" />}
                                <span>{marker.name}</span>
                                <span className="text-[10px] opacity-50">#{marker.id}</span>
                            </div>
                        </Tooltip>
                        <Popup>
                            <div className="min-w-[180px] p-4 bg-background/95 rounded-xl shadow-2xl">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="font-bold text-lg text-primary">{marker.name}</div>
                                    <div className="text-xs px-2 py-0.5 rounded bg-white/10 opacity-60">{t('id')}: {marker.id}</div>
                                </div>

                                <PlayerVitals
                                    vitals={marker.vitals as any}
                                    size="mini"
                                    onAction={(vital, label, val) => setShowVital({ markerId: marker.id, vital, label, value: val, playerName: marker.name })}
                                />

                                <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono opacity-50">
                                        <div>X: {marker.x.toFixed(1)}</div>
                                        <div>Y: {marker.y.toFixed(1)}</div>
                                    </div>
                                    <MriButton
                                        size="sm"
                                        className="w-full h-10 text-xs gap-2 bg-primary hover:bg-primary/90 transition-all font-bold"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewScreen?.(marker.id, marker.name);
                                        }}
                                    >
                                        <Monitor size={14} /> {t('livemap_view_screen')}
                                    </MriButton>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                <MapController centerOnMarkerId={centerMarker || centerOnMarkerId} markers={markers} />
                <MapResetter resetTrigger={resetTrigger} initialZoom={initialZoom} />
                {uiVisible && (
                    <>
                        <CustomZoomControls />
                        <Legend />
                    </>
                )}
            </MapContainer>

            {uiVisible && (
                <div className="absolute inset-0 pointer-events-none z-[9999]" style={{ overflow: 'visible' }}>
                    <div className="absolute top-6 left-6 right-6 flex justify-between gap-4">
                        <div className="flex gap-2 items-center bg-card/60 border border-border p-1 rounded-lg shadow-xl shrink-0 pointer-events-auto">
                                <MriCompactSearch
                                    placeholder={t('livemap_search_placeholder')}
                                    value={selectedPlayerId}
                                    onChange={handleSelectPlayer}
                                    options={searchOptions}
                                    searchPlaceholder={t('livemap_search_input_placeholder')}
                                    className="w-8 h-8 border-border bg-card/60"
                                />
                                {selectedPlayerId && (
                                    <MriButton
                                        size="icon"
                                        variant="secondary"
                                        className="h-8 w-8 border border-border bg-card/60 shadow-xl animate-in fade-in zoom-in"
                                        onClick={() => handleSelectPlayer('')}
                                        title={t('common_clear')}
                                    >
                                        <X size={16} />
                                    </MriButton>
                                )}
                                <div className="w-px h-4 bg-border mx-1" />
                                <MriButton
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-white"
                                    onClick={handleResetMap}
                                    title={t('common_refresh') || 'Reset Map'}
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </MriButton>
                                <div className="w-px h-4 bg-border mx-1" />
                                <div className="relative">
                                    <MriButton
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-white"
                                        onClick={() => setShowSettings(!showSettings)}
                                    >
                                        <SettingsIcon className={`w-4 h-4 transition-transform duration-500 ${showSettings ? 'rotate-90' : ''}`} />
                                    </MriButton>
                                    {showSettings && (
                                        <div className="absolute top-full mt-2 left-0 w-64 bg-card border border-border p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex flex-col gap-3">
                                                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    <span className="flex items-center gap-2"><Sun size={12} /> {t('livemap_map_brightness')}</span>
                                                    <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">{Math.round(brightness * 100)}%</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Moon size={14} className="text-muted-foreground" />
                                                    <input type="range" min="20" max="100" step="1" value={brightness * 100} onChange={(e) => setBrightness(Number(e.target.value) / 100)} className="map-brightness-slider flex-1" />
                                                    <Sun size={14} className="text-muted-foreground" />
                                                </div>
                                            </div>
                                            <div className="h-px bg-border" />
                                            <MriButton variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-xs" onClick={() => { setUiVisible(false); setShowSettings(false); }}>
                                                <EyeOff size={14} /> {t('livemap_hide_interface')}
                                            </MriButton>
                                        </div>
                                    )}
                                </div>
                            </div>

                        <div className="flex gap-2 pointer-events-auto shrink-0">
                            <div className="bg-card/60 border border-border p-1 rounded-lg flex gap-1 shadow-xl">
                                <MriButton variant={filters.staff ? "default" : "ghost"} size="sm" className="h-8 text-[10px] px-3 font-bold" onClick={() => setFilters(f => ({ ...f, staff: !f.staff }))}>{t('livemap_filter_staff')}</MriButton>
                                <MriButton variant={filters.players ? "default" : "ghost"} size="sm" className="h-8 text-[10px] px-3 font-bold" onClick={() => setFilters(f => ({ ...f, players: !f.players }))}>{t('livemap_filter_players')}</MriButton>
                                <MriButton variant={filters.dead ? "default" : "ghost"} size="sm" className="h-8 text-[10px] px-3 font-bold" onClick={() => setFilters(f => ({ ...f, dead: !f.dead }))}>{t('livemap_filter_dead')}</MriButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showVital && (
                <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100000 }}>
                    <div className="pointer-events-auto contents">
                        <VitalAdjustModal
                            isOpen={!!showVital}
                            playerName={showVital.playerName}
                            vital={showVital.vital}
                            currentValue={showVital.value}
                            onClose={() => setShowVital(null)}
                            onSubmit={(val) => {
                                let serverVal = val;
                                if (showVital.vital === 'health') serverVal = Math.round(val + 100);
                                sendNui('mri_Qadmin:server:SetVital', { targetId: showVital.markerId, vital: showVital.vital, value: serverVal })
                                setShowVital(null)
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
