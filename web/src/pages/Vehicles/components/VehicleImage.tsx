import { useState, useEffect } from 'react'
import { useAppState } from '@/context/AppState'

interface VehicleImageProps {
  model: string
  name: string
  className?: string
}

type ImageStatus = 'local-lowercase' | 'local-uppercase' | 'custom' | 'ox' | 'docs' | 'failed'

export default function VehicleImage({ model, name, className }: VehicleImageProps) {
  const { gameData } = useAppState()
  const [status, setStatus] = useState<ImageStatus>('local-lowercase')
  const [src, setSrc] = useState<string>('')

  const getSrc = (currentStatus: ImageStatus): string => {
    switch (currentStatus) {
      case 'local-lowercase':
        return `vehicles/${model}.png`
      case 'local-uppercase':
        return `vehicles/${model}.PNG`
      case 'custom':
        return gameData.vehicleImages ? `${gameData.vehicleImages}${model}.png` : ''
      case 'ox':
        return `https://cfx-nui-ox_inventory/web/images/${model}.png`
      case 'docs':
        return `https://docs.fivem.net/vehicles/${model}.webp`
      default:
        return ''
    }
  }

  useEffect(() => {
    setSrc(getSrc(status))
  }, [status, model, gameData.vehicleImages])

  const handleError = () => {
    const nextStatus: Record<ImageStatus, ImageStatus> = {
      'local-lowercase': 'local-uppercase',
      'local-uppercase': gameData.vehicleImages ? 'custom' : 'ox',
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
