import { useAppState } from '@/context/AppState'
import { MriCard, MriCardContent, MriCardHeader, MriCardTitle } from '@mriqbox/ui-kit'
import { Car } from 'lucide-react'

export default function VehicleDev() {
    const { vehicleDev } = useAppState()

    if (!vehicleDev?.show) return null

    return (
        <div className="fixed inset-y-0 left-0 flex items-center z-50 pointer-events-none">
            <MriCard className="w-64 ml-4 pointer-events-auto bg-primary text-primary-foreground border-none shadow-lg">
                <MriCardHeader className="p-4 pb-2">
                    <MriCardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Car className="h-4 w-4" />
                        Vehicle Information
                    </MriCardTitle>
                </MriCardHeader>
                <MriCardContent className="p-4 pt-2 text-xs space-y-1">
                    <p><span className="font-semibold">Model:</span> {vehicleDev.name}</p>
                    <p><span className="font-semibold">Hash:</span> {vehicleDev.model}</p>
                    <p><span className="font-semibold">NetID:</span> {vehicleDev.netID}</p>
                    <p><span className="font-semibold">Plate:</span> {vehicleDev.plate}</p>
                    <p><span className="font-semibold">Fuel:</span> {vehicleDev.fuel}</p>
                    <p><span className="font-semibold">Engine:</span> {vehicleDev.engine_health}</p>
                    <p><span className="font-semibold">Body:</span> {vehicleDev.body_health}</p>
                </MriCardContent>
            </MriCard>
        </div>
    )
}
