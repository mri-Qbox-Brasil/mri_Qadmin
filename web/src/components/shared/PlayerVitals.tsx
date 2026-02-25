import { Heart, Shield, Beef, GlassWater, Brain } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

interface VitalsData {
    health: number;
    armor: number;
    metadata?: {
        hunger?: number;
        thirst?: number;
        stress?: number;
        isdead?: boolean;
        [key: string]: any;
    };
    [key: string]: any;
}

interface PlayerVitalsProps {
    vitals: VitalsData;
    size?: 'mini' | 'compact' | 'full';
    onAction?: (vital: string, label: string, value: number) => void;
    className?: string;
}

const VITAL_CONFIG = [
    { key: 'health', icon: Heart, color: 'bg-red-500', hex: '#ef4444', border: 'border-border/50', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.4)]', hoverBorder: 'hover:border-red-500/50', hoverShadow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]' },
    { key: 'armor', icon: Shield, color: 'bg-blue-500', hex: '#3b82f6', border: 'border-border/50', shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.4)]', hoverBorder: 'hover:border-blue-500/50', hoverShadow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]' },
    { key: 'hunger', icon: Beef, color: 'bg-orange-500', hex: '#f59e0b', border: 'border-border/50', shadow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]', hoverBorder: 'hover:border-orange-500/50', hoverShadow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]' },
    { key: 'thirst', icon: GlassWater, color: 'bg-cyan-500', hex: '#06b6d4', border: 'border-border/50', shadow: 'shadow-[0_0_10px_rgba(6,182,212,0.4)]', hoverBorder: 'hover:border-cyan-500/50', hoverShadow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]' },
    { key: 'stress', icon: Brain, color: 'bg-purple-500', hex: '#a855f7', border: 'border-border/50', shadow: 'shadow-[0_0_10px_rgba(168,85,247,0.4)]', hoverBorder: 'hover:border-purple-500/50', hoverShadow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]', inverted: true },
];

const VitalBar = ({ val, color, hex, icon: Icon, label, onClick }: { val: number, color: string, hex: string, icon: any, label?: string, onClick?: () => void }) => (
    <div
        className={cn(
            "flex items-center gap-2 w-full transition-all duration-200",
            onClick ? 'cursor-pointer hover:bg-white/5 p-1 -m-1 rounded group/vbar' : ''
        )}
        onClick={onClick}
        title={onClick ? `Adjust ${label}` : undefined}
    >
        <Icon size={12} className="shrink-0 transition-colors" style={{ color: hex }} />
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden shrink-0">
            <div
                className={cn("h-full transition-all duration-700 ease-out", color)}
                style={{ width: `${val}%` }}
            />
        </div>
        <span className="text-[10px] font-mono opacity-60 w-7 text-right group-hover/vbar:opacity-100 shrink-0">{Math.round(val)}%</span>
    </div>
)

export default function PlayerVitals({ vitals, size = 'compact', onAction, className }: PlayerVitalsProps) {
    const { t } = useI18n();

    const getVitalValue = (key: string) => {
        let val = vitals[key] !== undefined ? vitals[key] : vitals.metadata?.[key];

        if (key === 'health') {
            // FiveM Health: 100 = 0%, 200 = 100%
            return Math.max(0, Math.min(100, Math.round((val || 0) - 100)));
        }

        return Math.max(0, Math.min(100, Math.round(val || 0)));
    };

    if (size === 'mini') {
        return (
            <div className={cn("space-y-2", className)}>
                {VITAL_CONFIG.filter(v => v.key !== 'stress').map((v) => {
                    const val = getVitalValue(v.key);
                    const label = t(`vitals_${v.key}`) || v.key.charAt(0).toUpperCase() + v.key.slice(1);
                    return (
                        <VitalBar
                            key={v.key}
                            val={val}
                            color={v.color}
                            hex={v.hex}
                            icon={v.icon}
                            label={label}
                            onClick={onAction ? () => onAction(v.key, label, val) : undefined}
                        />
                    );
                })}
            </div>
        );
    }

    if (size === 'full') {
        return (
            <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4", className)}>
                {VITAL_CONFIG.map((v) => {
                    const val = getVitalValue(v.key);
                    const label = t(`vitals_${v.key}`) || v.key.charAt(0).toUpperCase() + v.key.slice(1);
                    return (
                        <div
                            key={v.key}
                            className={cn(
                                "space-y-2 lg:col-span-1 p-3 rounded-lg bg-card border transition-all cursor-pointer select-none group/vital",
                                v.border,
                                v.hoverBorder,
                                v.hoverShadow
                            )}
                            onClick={() => onAction?.(v.key, label, val)}
                        >
                            <div className="flex justify-between items-center text-xs font-medium">
                                <span className="flex items-center gap-1.5">
                                    <v.icon className="w-3.5 h-3.5" style={{ color: v.hex }} /> {label}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span>{val}%</span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                <div
                                    className={cn("h-full transition-all duration-500", v.color, v.shadow)}
                                    style={{ width: `${val}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Default: compact (ScreenModal sidebar style)
    return (
        <div className={cn("flex flex-col gap-2.5", className)}>
            {VITAL_CONFIG.map((v) => {
                const val = getVitalValue(v.key);
                const label = t(`vitals_${v.key}`) || v.key.charAt(0).toUpperCase() + v.key.slice(1);

                return (
                    <VitalBar
                        key={v.key}
                        val={val}
                        color={v.color}
                        hex={v.hex}
                        icon={v.icon}
                        label={label}
                        onClick={onAction ? () => onAction(v.key, label, val) : undefined}
                    />
                );
            })}
        </div>
    );
}
