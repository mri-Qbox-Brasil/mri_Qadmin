import { MriButton } from '@mriqbox/ui-kit'
import { DollarSign, Tag } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import CopyButton from '@/components/shared/CopyButton'
import StatusBadge from '@/components/shared/StatusBadge'
import VehicleImage from '@/pages/Vehicles/components/VehicleImage'

interface Vehicle {
  model: string
  name: string
  brand: string
  price: number
  stock: number
  category: string
}

interface VehicleGridCardProps {
  vehicle: Vehicle
  onSpawn: (model: string) => void
  onUpdateStock: (vehicle: Vehicle) => void
}

export default function VehicleGridCard({ vehicle, onSpawn, onUpdateStock }: VehicleGridCardProps) {
  const { t } = useI18n()

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col hover:border-primary/50 hover:bg-muted transition-all group overflow-hidden relative">
        {/* Image & Header Section */}
        <div className="relative w-full h-40 bg-muted/30 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center p-2">
                 <VehicleImage model={vehicle.model} name={vehicle.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
            </div>

            {/* Text Overlay */}
            <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start z-10">
                <div>
                    <h3 className="font-bold text-white text-sm truncate max-w-[140px] drop-shadow-md">{vehicle.name}</h3>
                    <p className="text-[10px] text-zinc-400 font-mono drop-shadow-md">{vehicle.brand}</p>
                </div>
                <StatusBadge label={vehicle.category} variant="ghost" />
            </div>

             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <CopyButton
                 text={vehicle.model}
                 variant="ghost"
                 iconSize={3}
                 className="h-6 w-6 text-zinc-400 hover:text-white bg-black/50 hover:bg-black/80"
                />
            </div>
        </div>

        {/* Content Section */}
        <div className="p-3 flex flex-col gap-3 border-t border-border/50 bg-card">
             {/* Model Display */}
             <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span className="text-muted-foreground/80">ID:</span>
                <span className="text-foreground select-all">{vehicle.model}</span>
             </div>

             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-1 text-green-500 font-bold">
                    <DollarSign size={14} className="stroke-[2.5]" />
                    <span className="text-lg">{vehicle.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-medium bg-muted px-2 py-1 rounded border border-border">
                    <Tag size={10} />
                    {t('stock_label', [vehicle.stock])}
                </div>
            </div>

            <div className="flex gap-2">
                <MriButton
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs border-input text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted"
                    onClick={() => onUpdateStock(vehicle)}
                >
                    {t('btn_stock')}
                </MriButton>
                <MriButton
                    size="sm"
                    className="flex-1 h-8 text-xs bg-secondary hover:bg-secondary/80 hover:text-primary border border-border hover:border-primary/50 text-foreground"
                    onClick={() => onSpawn(vehicle.model)}
                >
                    {t('btn_spawn')}
                </MriButton>
            </div>
        </div>
    </div>
  )
}
