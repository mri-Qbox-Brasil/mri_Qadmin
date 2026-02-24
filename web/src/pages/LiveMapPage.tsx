import React, { useEffect, useState } from 'react'
import LiveMap from '@/components/map/LiveMap'
import { useNui } from '@/context/NuiContext'
import { MriPageHeader, MriButton } from '@mriqbox/ui-kit'
import { Map as MapIcon } from 'lucide-react'
import { useI18n } from '@/context/I18n'
import ScreenModal from '@/components/players/ScreenModal'

export default function LiveMapPage() {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const [markers, setMarkers] = useState<any[]>([])
    const [viewingPlayer, setViewingPlayer] = useState<{ id: number, name: string } | null>(null)
    const [wallColors, setWallColors] = useState<Record<string, string>>({})

    // Fetch wall colors
    useEffect(() => {
        sendNui('mri_Qadmin:callback:GetWallSettings', {}, { colors: {} }).then((data: any) => {
            if (data && data.colors) {
                setWallColors(data.colors)
            }
        }).catch(console.error)
    }, [sendNui])

    // Poll for coords
    useEffect(() => {
        let mounted = true
        const fetch = async () => {
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
        }

        fetch()
        const interval = setInterval(fetch, 2000) // 2s update
        return () => {
            mounted = false
            clearInterval(interval)
        }
    }, [sendNui])

    return (
        <div className="h-full flex flex-col bg-background">
             <MriPageHeader title={t('nav_livemap') || "Live Map"} icon={MapIcon} />
             <div className="flex-1 p-4 overflow-hidden relative">
                 <div className="w-full h-full rounded-xl border border-border overflow-hidden relative shadow-sm bg-card">
                     <LiveMap
                        markers={markers.map(m => {
                            // Apply wall color if staff
                            if (m.isStaff && m.group && wallColors[m.group]) {
                                return { ...m, staffColor: wallColors[m.group] }
                            }
                            return m
                        })}
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

             <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 99999 }}>
                <div className="pointer-events-auto contents">
                    <ScreenModal
                        playerId={viewingPlayer?.id || null}
                        playerName={viewingPlayer?.name}
                        onClose={() => setViewingPlayer(null)}
                    />
                </div>
             </div>
        </div>
    )
}
