import React, { useState } from 'react'
import { MriModal, MriButton } from '@mriqbox/ui-kit'
import { Heart, Shield, Beef, GlassWater, Brain, Save, X } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface VitalAdjustModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (value: number) => void
    vital: 'health' | 'armor' | 'hunger' | 'thirst' | 'stress'
    currentValue: number
    playerName: string
}

const VITAL_CONFIG = {
    health: { icon: Heart, color: 'text-red-500', bgColor: 'bg-red-500', hex: '#ef4444', label: 'vitals_health', max: 100 },
    armor: { icon: Shield, color: 'text-blue-500', bgColor: 'bg-blue-500', hex: '#3b82f6', label: 'vitals_armor', max: 100 },
    hunger: { icon: Beef, color: 'text-orange-500', bgColor: 'bg-orange-500', hex: '#f59e0b', label: 'vitals_hunger', max: 100 },
    thirst: { icon: GlassWater, color: 'text-cyan-500', bgColor: 'bg-cyan-500', hex: '#06b6d4', label: 'vitals_thirst', max: 100 },
    stress: { icon: Brain, color: 'text-purple-500', bgColor: 'bg-purple-500', hex: '#a855f7', label: 'vitals_stress', max: 100 },
}

export default function VitalAdjustModal({ isOpen, onClose, onSubmit, vital, currentValue, playerName }: VitalAdjustModalProps) {
    if (!isOpen) return null

    const { t } = useI18n()
    const [value, setValue] = React.useState(currentValue)

    React.useEffect(() => {
        setValue(currentValue)
    }, [currentValue])
    const config = VITAL_CONFIG[vital]
    const Icon = config.icon

    return (
        <MriModal onClose={onClose} className="w-[400px] p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${config.bgColor}/20 ${config.color}`}>
                    <Icon size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground">{t(config.label)}</h2>
                    <p className="text-xs text-muted-foreground">{playerName}</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Novo Valor</span>
                        <span className={`text-xl font-mono font-bold ${config.color}`}>{Math.round(value)}%</span>
                    </div>

                    <div className="relative pt-2">
                        <input
                            type="range"
                            min="0"
                            max={config.max}
                            step="1"
                            value={value}
                            onChange={(e) => setValue(Number(e.target.value))}
                            className="vital-adjust-slider"
                            style={{
                                background: `linear-gradient(to right, ${config.hex} ${value}%, var(--muted) ${value}%)`,
                                // @ts-ignore
                                '--vital-color': config.hex,
                                '--vital-color-60': config.hex + '99'
                             } as any}
                        />
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <MriButton
                        variant="ghost"
                        className="flex-1 gap-2"
                        onClick={onClose}
                    >
                        <X size={16} /> {t('cancel')}
                    </MriButton>
                    <MriButton
                        variant="default"
                        className="flex-1 gap-2 bg-primary text-primary-foreground font-bold"
                        onClick={() => onSubmit(value)}
                    >
                        <Save size={16} /> {t('confirm')}
                    </MriButton>
                </div>
            </div>

            <style>{`
                .vital-adjust-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 8px;
                    border-radius: 6px;
                    outline: none;
                    border: 1px solid var(--vital-color-60);
                }
                .vital-adjust-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: var(--vital-color);
                    cursor: pointer;
                    border-radius: 50%;
                    border: 2px solid #09090b;
                    box-shadow: 0 0 10px var(--vital-color);
                    transition: all 0.2s ease;
                    opacity: 0.8;
                }
                .vital-adjust-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                    opacity: 1;
                    box-shadow: 0 0 15px var(--vital-color);
                }
                .vital-adjust-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: var(--vital-color);
                    cursor: pointer;
                    border-radius: 50%;
                    border: 2px solid #09090b;
                    box-shadow: 0 0 10px var(--vital-color);
                }
            `}</style>
        </MriModal>
    )
}
