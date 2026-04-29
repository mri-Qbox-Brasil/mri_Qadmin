import { useState } from 'react'
import { MriButton, MriInput } from '@mriqbox/ui-kit'
import { Trash2, Tag, Check, X } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface Vehicle {
    label?: string
    model: string
    plate: string
}

interface PlayerVehicleCardProps {
    vehicle: Vehicle
    onSpawn?: (plate: string) => void
    onOpenTrunk?: (plate: string) => void
    onOpenGlovebox?: (plate: string) => void
    onDelete?: (plate: string) => void
    onChangePlate?: (oldPlate: string, newPlate: string) => void
}

export default function PlayerVehicleCard({ vehicle, onSpawn, onOpenTrunk, onOpenGlovebox, onDelete, onChangePlate }: PlayerVehicleCardProps) {
    const { t } = useI18n()
    const [editingPlate, setEditingPlate] = useState(false)
    const [plateInput, setPlateInput] = useState(vehicle.plate)

    const confirmPlateChange = () => {
        const trimmed = plateInput.trim().toUpperCase()
        if (trimmed && trimmed !== vehicle.plate) {
            onChangePlate?.(vehicle.plate, trimmed)
        }
        setEditingPlate(false)
    }

    return (
        <div className="group relative flex flex-col bg-card border border-border rounded-xl p-3 hover:bg-muted/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0 mr-2">
                    <span className="font-bold text-sm text-foreground truncate" title={vehicle.label || vehicle.model}>
                        {vehicle.label || vehicle.model}
                    </span>
                    {editingPlate ? (
                        <div className="flex items-center gap-1 mt-0.5">
                            <MriInput
                                value={plateInput}
                                onChange={(e) => setPlateInput((e.target as HTMLInputElement).value.toUpperCase())}
                                className="h-6 text-[10px] font-mono px-1.5 py-0 bg-background border-border"
                                maxLength={8}
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') confirmPlateChange(); if (e.key === 'Escape') setEditingPlate(false) }}
                            />
                            <button onClick={confirmPlateChange} className="text-green-500 hover:text-green-400 shrink-0"><Check className="w-3 h-3" /></button>
                            <button onClick={() => setEditingPlate(false)} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-3 h-3" /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-muted-foreground opacity-70">{vehicle.plate}</span>
                            {onChangePlate && (
                                <button
                                    onClick={() => { setPlateInput(vehicle.plate); setEditingPlate(true) }}
                                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground transition-opacity"
                                    title={t('change_plate') || 'Alterar Placa'}
                                >
                                    <Tag className="w-2.5 h-2.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
                {onDelete && (
                    <MriButton
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors -mt-1 -mr-1 shrink-0"
                        onClick={() => onDelete(vehicle.plate)}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </MriButton>
                )}
            </div>

            <div className="grid grid-cols-1 gap-1.5 mt-auto">
                {onSpawn && (
                    <MriButton
                        size="sm"
                        variant="secondary"
                        className="w-full h-8 text-xs bg-muted/50 hover:bg-primary/20 hover:text-primary border border-border/50 transition-all"
                        onClick={() => onSpawn(vehicle.plate)}
                    >
                        {t('btn_spawn')}
                    </MriButton>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                    {onOpenTrunk && (
                        <MriButton
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] bg-muted/30 hover:bg-muted/80 border border-border/30"
                            onClick={() => onOpenTrunk(vehicle.plate)}
                        >
                            {t('btn_trunk')}
                        </MriButton>
                    )}
                    {onOpenGlovebox && (
                        <MriButton
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] bg-muted/30 hover:bg-muted/80 border border-border/30"
                            onClick={() => onOpenGlovebox(vehicle.plate)}
                        >
                            {t('btn_glovebox')}
                        </MriButton>
                    )}
                </div>
            </div>
        </div>
    )
}
