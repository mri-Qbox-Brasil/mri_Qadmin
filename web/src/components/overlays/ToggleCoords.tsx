import { useAppState } from '@/context/AppState'
import { MriCard, MriCardContent, MriCardHeader, MriCardTitle } from '@mriqbox/ui-kit'
import { MapPin } from 'lucide-react'

export default function ToggleCoords() {
  const { showCoords } = useAppState()

  if (!showCoords?.show) return null

  return (
    <div className="fixed inset-y-0 left-0 flex items-center z-50 pointer-events-none">
      <MriCard className="w-64 ml-4 pointer-events-auto bg-primary text-primary-foreground border-none shadow-lg">
        <MriCardHeader className="p-4 pb-2">
          <MriCardTitle className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            Coords Information
          </MriCardTitle>
        </MriCardHeader>
        <MriCardContent className="p-4 pt-2 text-xs space-y-1">
          <p><span className="font-semibold">X:</span> {showCoords.x}</p>
          <p><span className="font-semibold">Y:</span> {showCoords.y}</p>
          <p><span className="font-semibold">Z:</span> {showCoords.z}</p>
          <p><span className="font-semibold">Heading:</span> {showCoords.heading}</p>
        </MriCardContent>
      </MriCard>
    </div>
  )
}
