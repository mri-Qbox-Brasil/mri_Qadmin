import { MriButton } from '@mriqbox/ui-kit'
import { Trash2 } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface Vehicle {
    label?: string
    model: string
    plate: string
}

interface PlayerVehicleCardProps {
    vehicle: Vehicle
    onSpawn: (plate: string) => void
    onOpenTrunk: (plate: string) => void
    onOpenGlovebox: (plate: string) => void
    onDelete: (plate: string) => void
}

export default function PlayerVehicleCard({ vehicle, onSpawn, onOpenTrunk, onOpenGlovebox, onDelete }: PlayerVehicleCardProps) {
    const { t } = useI18n()

    return (
        <div className="group relative flex flex-col bg-card border border-border rounded-xl p-3 hover:bg-muted/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm text-foreground truncate max-w-[120px]" title={vehicle.label || vehicle.model}>
                        {vehicle.label || vehicle.model}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground opacity-70">
                        {vehicle.plate}
                    </span>
                </div>
                <MriButton
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors -mt-1 -mr-1"
                    onClick={() => onDelete(vehicle.plate)}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </MriButton>
            </div>
            
            <div className="grid grid-cols-1 gap-1.5 mt-auto">
                <MriButton
                    size="sm"
                    variant="secondary"
                    className="w-full h-8 text-xs bg-muted/50 hover:bg-primary/20 hover:text-primary border border-border/50 transition-all"
                    onClick={() => onSpawn(vehicle.plate)}
                >
                    {t('btn_spawn')}
                </MriButton>
                <div className="grid grid-cols-2 gap-1.5">
                    <MriButton
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] bg-muted/30 hover:bg-muted/80 border border-border/30"
                        onClick={() => onOpenTrunk(vehicle.plate)}
                    >
                        {t('btn_trunk')}
                    </MriButton>
                    <MriButton
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] bg-muted/30 hover:bg-muted/80 border border-border/30"
                        onClick={() => onOpenGlovebox(vehicle.plate)}
                    >
                        {t('btn_glovebox')}
                    </MriButton>
                </div>
            </div>
        </div>
    )
}
