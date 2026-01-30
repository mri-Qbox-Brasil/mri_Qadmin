import React, { useEffect, useState } from 'react'
import LiveMap from '@/components/map/LiveMap'
import { useNui } from '@/context/NuiContext'
import { MriPageHeader } from '@mriqbox/ui-kit'
import { Map as MapIcon, RefreshCw } from 'lucide-react'
import { useI18n } from '@/context/I18n'

export default function LiveMapPage() {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const [markers, setMarkers] = useState<any[]>([])

    // Poll for coords
    useEffect(() => {
        let mounted = true
        const fetch = async () => {
            try {
                // Mock data for dev
                const mockMarkers = [
                   { id: 1, x: -768.58, y: -2443.77, heading: 0, name: 'Dev Player' },
                   { id: 2, x: 200, y: 200, heading: 90, name: 'Other Player' }
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
             <MriPageHeader title="Live Map" icon={MapIcon} />
             <div className="flex-1 p-4 overflow-hidden relative">
                 <div className="w-full h-full rounded-xl border border-border overflow-hidden relative shadow-sm">
                     <LiveMap markers={markers} />

                     {/* Overlay Stats */}
                     <div className="absolute top-4 right-4 bg-card/90 backdrop-blur border border-border p-3 rounded-lg shadow-lg z-[400] pointer-events-none flex flex-col items-center min-w-[100px]">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Online Players</div>
                        <div className="text-2xl font-black text-primary flex items-center gap-2">
                            {markers.length}
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                        </div>
                     </div>
                 </div>
             </div>
        </div>
    )
}
