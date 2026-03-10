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
    <div className="flex flex-col bg-card border border-border rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-foreground">{vehicle.label || vehicle.model}</span>
        <span className="font-mono text-xs bg-muted px-1.5 rounded">{vehicle.plate}</span>
      </div>
      <div className="flex gap-2 mt-auto">
        <MriButton
          size="sm"
          variant="secondary"
          className="flex-1 h-7 text-xs bg-muted hover:bg-muted/80"
          onClick={() => onSpawn(vehicle.plate)}
        >
          {t('btn_spawn')}
        </MriButton>
        <MriButton
          size="sm"
          variant="secondary"
          className="flex-1 h-7 text-[10px] bg-muted hover:bg-muted/80 px-1"
          onClick={() => onOpenTrunk(vehicle.plate)}
        >
          {t('btn_trunk')}
        </MriButton>
        <MriButton
          size="sm"
          variant="secondary"
          className="flex-1 h-7 text-[10px] bg-muted hover:bg-muted/80 px-1"
          onClick={() => onOpenGlovebox(vehicle.plate)}
        >
          {t('btn_glovebox')}
        </MriButton>
        <MriButton
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10"
          onClick={() => onDelete(vehicle.plate)}
        >
          <Trash2 className="w-4 h-4" />
        </MriButton>
      </div>
    </div>
  )
}
