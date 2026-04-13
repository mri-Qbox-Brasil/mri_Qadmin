import { MriButton, MriModal } from '@mriqbox/ui-kit'
import LiveMap from '@/components/map/LiveMap'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useNui } from '@/context/NuiContext'
import { Maximize, Minimize, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'

interface MapModalProps {
    isOpen: boolean
    onClose: () => void
    trackedPlayerId: string | number
    initialName?: string
}

export default function MapModal({ isOpen, onClose, trackedPlayerId, initialName }: MapModalProps) {
    const { sendNui } = useNui()
    const { t } = useI18n()
    const [markers, setMarkers] = useState<any[]>([])
    const [isExpanded, setIsExpanded] = useState(false)
    const intervalRef = useRef<any>(null)
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen)
        if (!isOpen) setMarkers([])
    }

    const fetchCoords = useCallback(async () => {
        try {
            // We can send array of IDs if we want to track multiple in future
            const coords = await sendNui('GetPlayerCoords', { targetIds: [trackedPlayerId] }, [{ id: trackedPlayerId, x: 0, y: 0, w: 0, name: initialName }])

            // Expected response: array of objects { id, x, y, heading, name }
            // Or single object depending on Lua implementation? Let's assume array to be safe for future.
            const data = Array.isArray(coords) ? coords : (coords ? [coords] : [])
            setMarkers(data)
        } catch (e) {
            console.error('[MapModal] Failed to fetch coords', e)
        }
    }, [sendNui, trackedPlayerId, initialName])

    useEffect(() => {
        if (!isOpen) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            return
        }

        // Initial fetch
        const timeout = setTimeout(() => {
            fetchCoords()
        }, 0)

        // Start polling interval (1s)
        intervalRef.current = setInterval(fetchCoords, 1000)

        return () => {
            clearTimeout(timeout)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [isOpen, trackedPlayerId, fetchCoords])

    if (!isOpen) return null;

    return (
        <MriModal onClose={onClose} className={cn(
            "flex flex-col p-0 gap-0 border-border bg-background shadow-2xl transition-all duration-300 overflow-hidden",
            isExpanded ? "w-[95vw] h-[90vh] max-w-none" : "w-[800px] h-[600px] max-w-2xl"
        )}>
            {/* Accessibility elements for Radix UI Dialog */}
            <div style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: '0',
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                borderWidth: '0'
            }}>
                <h2>{t('live_map_tracking') || 'Live Map Tracking'}</h2>
                <p>{t('live_map_description') || 'Tracking player position on the map'}</p>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                <div className="flex items-center gap-2 font-bold text-lg">
                    {t('live_map_tracking') || 'Live Map Tracking'}
                    <span className="text-muted-foreground text-sm font-normal">
                        - {markers[0]?.name || initialName || `ID: ${trackedPlayerId}`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <MriButton size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </MriButton>
                    <MriButton size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </MriButton>
                </div>
            </div>

            <div className="flex-1 relative bg-[#0fa8d2] overflow-hidden">
                {/* #0fa8d2 is GTA Sea Color approximately */}
                <LiveMap markers={markers} centerOnMarkerId={trackedPlayerId} />
            </div>
        </MriModal>
    )
}
