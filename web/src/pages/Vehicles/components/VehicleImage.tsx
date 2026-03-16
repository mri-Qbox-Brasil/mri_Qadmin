import { useState } from 'react'
import { useAppState } from '@/context/AppState'

interface VehicleImageProps {
    model: string
    name: string
    className?: string
}

type ImageStatus = 'local-lowercase' | 'local-uppercase' | 'custom' | 'ox' | 'docs' | 'failed'

export default function VehicleImage({ model, name, className }: VehicleImageProps) {
    const { gameData, settings } = useAppState()
    const [status, setStatus] = useState<ImageStatus>('local-lowercase')

    const getSrc = (currentStatus: ImageStatus): string => {
        switch (currentStatus) {
            case 'local-lowercase':
                return `vehicles/${model}.png`
            case 'local-uppercase':
                return `vehicles/${model}.PNG`
            case 'custom':
                return settings?.VehicleImages || gameData.vehicleImages ? `${settings?.VehicleImages || gameData.vehicleImages}${model}.png` : ''
            case 'ox':
                return `https://cfx-nui-ox_inventory/web/images/${model}.png`
            case 'docs':
                return `https://docs.fivem.net/vehicles/${model}.webp`
            default:
                return ''
        }
    }

    const src = getSrc(status)

    const handleError = () => {
        const hasCustomUrl = Boolean(settings?.VehicleImages || gameData.vehicleImages)
        const nextStatus: Record<ImageStatus, ImageStatus> = {
            'local-lowercase': 'local-uppercase',
            'local-uppercase': hasCustomUrl ? 'custom' : 'ox',
            'custom': 'ox',
            'ox': 'docs',
            'docs': 'failed',
            'failed': 'failed'
        }
        setStatus(nextStatus[status])
    }

    if (status === 'failed' || (!src && status !== 'local-lowercase' && status !== 'local-uppercase')) {
        return (
            <div className={`flex items-center justify-center bg-zinc-800 rounded border border-[#444] shadow-inner text-3xl shrink-0 ${className}`}>
                🚗
            </div>
        )
    }

    return (
        <div className={`flex items-center justify-center bg-zinc-800 rounded border border-[#444] shadow-inner shrink-0 overflow-hidden ${className}`}>
            <img
                src={src}
                alt={name}
                className="w-full h-full object-cover"
                onError={handleError}
                loading="lazy"
            />
        </div>
    )
}
