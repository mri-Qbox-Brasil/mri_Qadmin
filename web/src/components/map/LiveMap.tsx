import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import ReactDOMServer from 'react-dom/server'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState, useRef } from 'react'
import { MriButton, MriPlayerVitals, MriVitalAdjustModal } from '@mriqbox/ui-kit'
import { Eye, ShieldCheck, User, Car, Plane, Ship, Bike, Helicopter, Motorbike, Plus, Minus, Info, SquareTerminal } from 'lucide-react'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'

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
    search?: string
    setSearch?: (s: string) => void
    filters?: { staff: boolean, players: boolean, dead: boolean }
    setFilters?: (f: any) => void
    mapType?: 'atlas' | 'grid' | 'satellite'
    setMapType?: (t: 'atlas' | 'grid' | 'satellite') => void
    brightness?: number
    setBrightness?: (b: number) => void
    selectedPlayerId?: string | number
    setSelectedPlayerId?: (id: string | number) => void
    resetTrigger?: number
}

const PlayerIcon = ({ marker }: { marker: MapMarker }) => {
    const isStaff = marker.isStaff
    const inVehicle = marker.inVehicle
    const isDead = marker.vitals?.isDead
    const vType = marker.vehicleType || 'car'
    const color = marker.staffColor || (isStaff ? '#FACC15' : (isDead ? '#9ca3af' : 'bg-primary'))

    const isPrimary = color === 'bg-primary'
    const baseColor = isPrimary ? 'hsl(var(--primary))' : color
    const shadowColor = isPrimary ? 'hsl(var(--primary) / 0.27)' : `${color}44`
    const fillColor = isPrimary ? 'hsl(var(--primary) / 0.2)' : `${color}33`

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
            border: `2px solid ${baseColor}`,
            boxShadow: `0 0 10px ${shadowColor}`,
            transition: 'all 0.3s ease',
            filter: isDead ? 'grayscale(1)' : 'none'
        }}>
            <Icon size={18} color={baseColor} fill={isStaff ? fillColor : 'none'} />
            {!inVehicle && marker.heading !== undefined && (
                <div style={{
                    position: 'absolute',
                    top: '-5px',
                    width: '0',
                    height: '0',
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: `8px solid ${baseColor}`,
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
                <div className="w-3 h-3 rounded-full bg-primary" /> {t('vitals_status_alive')}
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

export default function LiveMap({
    markers,
    centerOnMarkerId,
    initialZoom = 3,
    onViewScreen,
    search = '',
    filters = { staff: true, players: true, dead: true },
    mapType = 'atlas',
    brightness = 1,
    selectedPlayerId = '',
    resetTrigger = 0
}: LiveMapProps) {
    const { t } = useI18n()
    const [uiVisible, setUiVisible] = useState(true)
    const [showVital, setShowVital] = useState<{ markerId: any, vital: any, label: string, value: number, playerName: string } | null>(null)
    const [centerMarker, setCenterMarker] = useState<string | number | null>(null)

    // Adjust state when props change (official "update state during render" pattern)
    const [prevSelectedPlayerId, setPrevSelectedPlayerId] = useState(selectedPlayerId)
    if (selectedPlayerId !== prevSelectedPlayerId) {
        setPrevSelectedPlayerId(selectedPlayerId)
        setCenterMarker(selectedPlayerId)
    }

    const [prevResetTrigger, setPrevResetTrigger] = useState(resetTrigger)
    if (resetTrigger !== prevResetTrigger) {
        setPrevResetTrigger(resetTrigger)
        setCenterMarker(null)
    }

    const { sendNui } = useNui()

    const markerRefs = useRef<Record<string, any>>({})

    // Simplified filtering logic using props
    const filteredMarkers = markers.filter((m: MapMarker) => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || String(m.id).includes(search)
        const isDead = m.vitals?.isDead
        if (m.isStaff && !filters.staff) return false
        if (!m.isStaff && !isDead && !filters.players) return false
        if (isDead && !filters.dead) return false
        return matchesSearch
    })

    // Effect to handle player selection from props
    useEffect(() => {
        if (selectedPlayerId) {
            setTimeout(() => {
                const marker = markerRefs.current[selectedPlayerId]
                if (marker) marker.openPopup()
            }, 300)
        } else {
            Object.values(markerRefs.current).forEach(marker => {
                if (marker && marker.closePopup) marker.closePopup()
            })
        }
    }, [selectedPlayerId])

    // Effect to handle reset from props
    useEffect(() => {
        if (resetTrigger > 0) {
            Object.values(markerRefs.current).forEach(marker => {
                if (marker && marker.closePopup) marker.closePopup()
            })
        }
    }, [resetTrigger])

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
                    url={`./map/tiles_${mapType}/{z}/{x}/{y}.webp`}
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
                        ref={(ref: any) => { if (ref) markerRefs.current[marker.id] = ref }}
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

                                <MriPlayerVitals
                                    vitals={marker.vitals as any}
                                    size="mini"
                                    onAction={(vital: any, label: any, val: any) => setShowVital({ markerId: marker.id, vital, label, value: val, playerName: marker.name })}
                                    labels={{
                                        health: t('vitals_health'),
                                        armor: t('vitals_armor'),
                                        hunger: t('vitals_hunger'),
                                        thirst: t('vitals_thirst'),
                                        stress: t('vitals_stress')
                                    }}
                                />

                                <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono opacity-50">
                                        <div>X: {marker.x.toFixed(1)}</div>
                                        <div>Y: {marker.y.toFixed(1)}</div>
                                    </div>
                                    {onViewScreen && (
                                        <MriButton
                                            size="sm"
                                            className="w-full h-10 text-xs gap-2 bg-primary hover:bg-primary/90 transition-all font-bold"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewScreen?.(marker.id, marker.name);
                                            }}
                                        >
                                            <SquareTerminal size={14} /> {t('livemap_view_screen')}
                                        </MriButton>
                                    )}
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

            {showVital && (
                <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100000 }}>
                    <div className="pointer-events-auto contents">
                        <MriVitalAdjustModal
                            isOpen={!!showVital}
                            playerName={showVital.playerName}
                            vital={showVital.vital}
                            currentValue={showVital.value}
                            onClose={() => setShowVital(null)}
                            onSubmit={(val: number) => {
                                let serverVal = val;
                                if (showVital.vital === 'health') serverVal = Math.round(val + 100);
                                sendNui('mri_Qadmin:server:SetVital', { targetId: showVital.markerId, vital: showVital.vital, value: serverVal })
                                setShowVital(null)
                            }}
                            labels={{
                                health: t('vitals_health'),
                                armor: t('vitals_armor'),
                                hunger: t('vitals_hunger'),
                                thirst: t('vitals_thirst'),
                                stress: t('vitals_stress'),
                                newValue: t('new_value'),
                                confirm: t('confirm'),
                                cancel: t('cancel')
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
