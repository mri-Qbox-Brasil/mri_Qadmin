import React, { useState, useMemo } from 'react';
import {
    Car, Users, Palette, Warehouse, CheckCircle2,
    ChevronRight, ChevronLeft, Search, Gift,
    Monitor, Gauge, Hash, Info
} from 'lucide-react';
import {
    MriModal, MriButton, MriInput,
    MriSelectSearch, MriCompactSearch, MriColorPicker
} from '@mriqbox/ui-kit';
import { useI18n } from '@/hooks/useI18n';
import { useAppState } from '@/context/AppState';
import { useNui } from '@/context/NuiContext';
import { cn } from '@/lib/utils';

interface VehicleWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onFinish: () => void;
}

export default function VehicleWizard({ isOpen, onClose, onFinish }: VehicleWizardProps) {
    const { t } = useI18n();
    const { sendNui } = useNui();
    const { players, gameData } = useAppState();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [selectedVehicle, setSelectedVehicle] = useState<string>('');
    const [plate, setPlate] = useState(() => Math.random().toString(36).substring(2, 10).toUpperCase());
    const [color, setColor] = useState('#ffffff');
    const [maxTuned, setMaxTuned] = useState(false);
    const [garage, setGarage] = useState('Pillbox Garage Parking');

    const STEPS = useMemo(() => [
        { id: 1, title: t('vehicle_wizard_step_receiver'), icon: Users },
        { id: 2, title: t('vehicle_wizard_step_vehicle'), icon: Car },
        { id: 3, title: t('vehicle_wizard_step_custom'), icon: Palette },
        { id: 4, title: t('vehicle_wizard_step_storage'), icon: Warehouse },
        { id: 5, title: t('vehicle_wizard_step_summary'), icon: CheckCircle2 },
    ], [t]);

    const playerOptions = useMemo(() => {
        return players.map(p => ({
            label: `${p.name} (${p.id})`,
            value: String(p.id),
            description: p.license
        }));
    }, [players]);

    const vehicleOptions = useMemo(() => {
        return (gameData.vehicles || []).map(v => ({
            label: `${v.name || v.label} (${v.model || v.value})`,
            value: v.model || v.value,
            brand: v.brand
        }));
    }, [gameData.vehicles]);

    const handleNext = () => {
        if (currentStep < 5) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            await sendNui('mri_Qadmin:server:GiveVehicle', {
                playerId: selectedPlayer,
                model: selectedVehicle,
                props: {
                    plate,
                    color1: color,
                    maxTuned
                },
                garage: garage
            });
            onFinish();
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedPlayerObj = players.find(p => String(p.id) === selectedPlayer);
    const selectedVehicleObj = gameData.vehicles?.find(v => (v.model || v.value) === selectedVehicle);

    return (
        <MriModal onClose={onClose} className="max-w-4xl w-full">
            <div className="p-6 flex flex-col min-h-[500px] max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                    <Gift className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">{t('vehicle_wizard_title')}</h2>
                </div>

                {/* Stepper Header */}
                <div className="flex items-center justify-between mb-8 px-2 relative">
                    {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center z-10">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                        isActive ? "border-primary bg-primary/10 text-primary scale-110 shadow-lg" :
                                            isCompleted ? "border-primary bg-primary text-white" : "border-muted text-muted-foreground bg-background"
                                    )}>
                                        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] mt-2 font-bold uppercase tracking-wider whitespace-nowrap",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )}>{step.title}</span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className="flex-1 h-[2px] mx-2 -mt-6 bg-muted relative overflow-hidden self-center">
                                        <div className={cn(
                                            "absolute inset-0 bg-primary transition-all duration-500",
                                            isCompleted ? "translate-x-0" : "-translate-x-full"
                                        )} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto px-2">
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" /> {t('vehicle_wizard_receiver_q')}
                            </h3>
                            <div className="p-4 bg-muted/20 border border-border rounded-xl">
                                <div data-scroll-lock-ignore>
                                    <MriSelectSearch
                                        options={playerOptions}
                                        value={selectedPlayer}
                                        onChange={(val: string) => setSelectedPlayer(val)}
                                        placeholder={t('search_player_placeholder')}
                                    />
                                </div>
                                {selectedPlayerObj && (
                                    <div className="mt-4 p-3 bg-card border border-border rounded-lg flex items-center gap-3 animate-in zoom-in-95 duration-200">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {selectedPlayerObj.id}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{selectedPlayerObj.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">{selectedPlayerObj.license}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Car className="w-4 h-4 text-primary" /> {t('vehicle_wizard_vehicle_q')}
                            </h3>
                            <div className="p-4 bg-muted/20 border border-border rounded-xl">
                                <MriSelectSearch
                                    options={vehicleOptions}
                                    value={selectedVehicle}
                                    onChange={(val: string) => setSelectedVehicle(val)}
                                    placeholder="Search by model or brand..."
                                />
                                {selectedVehicleObj && (
                                    <div className="mt-4 p-4 bg-card border border-border rounded-lg space-y-2 animate-in zoom-in-95 duration-200">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{selectedVehicleObj.brand || 'Personal'}</p>
                                                <p className="text-lg font-bold">{selectedVehicleObj.name || selectedVehicleObj.label}</p>
                                            </div>
                                            <div className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono">
                                                {selectedVehicleObj.model || selectedVehicleObj.value}
                                            </div>
                                        </div>
                                        {selectedVehicleObj.category && (
                                            <p className="text-[10px] text-muted-foreground mt-1">Category: <span className="text-foreground">{selectedVehicleObj.category}</span></p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Palette className="w-4 h-4 text-primary" /> {t('vehicle_wizard_custom_q')}
                            </h3>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> {t('vehicle_wizard_plate')}
                                    </label>
                                    <MriInput
                                        value={plate}
                                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                                        maxLength={8}
                                        className="font-mono text-center tracking-[0.2em] text-lg uppercase"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                        <Palette className="w-3 h-3" /> {t('vehicle_wizard_color')}
                                    </label>
                                    <div className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border">
                                        <MriColorPicker
                                            color={color}
                                            onChange={setColor}
                                            active={true}
                                            format="hex"
                                        />
                                        <span className="text-xs font-mono text-muted-foreground flex-1">{color}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold flex items-center gap-2">
                                            <Gauge className="w-4 h-4 text-primary" /> {t('vehicle_wizard_max_tuned')}
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground">Sets all performance mods to the highest level.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={maxTuned}
                                            onChange={(e) => setMaxTuned(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Warehouse className="w-4 h-4 text-primary" /> {t('vehicle_wizard_storage_q')}
                            </h3>
                            <p className="text-xs text-muted-foreground">{t('vehicle_wizard_storage_desc')}</p>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'Pillbox Garage Parking', name: 'Pillbox Garage', type: 'Public' },
                                    { id: 'Legion Square Parking', name: 'Legion Square', type: 'Public' },
                                    { id: 'Burton Garage', name: 'Burton Station', type: 'Private' },
                                    { id: 'Police Impound', name: 'Police Impound', type: 'Special' },
                                ].map((loc) => (
                                    <button
                                        key={loc.id}
                                        onClick={() => setGarage(loc.id)}
                                        className={cn(
                                            "p-4 rounded-xl border flex flex-col items-start gap-1 transition-all text-left",
                                            garage === loc.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:bg-muted"
                                        )}
                                    >
                                        <span className="text-xs font-bold">{loc.name}</span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
                                            loc.type === 'Public' ? "bg-green-500/10 text-green-500" :
                                                loc.type === 'Private' ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
                                        )}>{loc.type}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-start gap-3">
                                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-500/80 leading-relaxed italic">{t('vehicle_wizard_storage_help')}</p>
                            </div>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-4">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <Monitor className="w-4 h-4 text-primary" /> {t('vehicle_wizard_step_summary')}
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                                        <span className="text-muted-foreground">{t('vehicle_wizard_receiver_label')}</span>
                                        <span className="font-bold">{selectedPlayerObj?.name} <span className="text-[10px] text-muted-foreground">({selectedPlayer})</span></span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                                        <span className="text-muted-foreground">{t('vehicle_wizard_vehicle_label')}</span>
                                        <span className="font-bold">{selectedVehicleObj?.name || selectedVehicle}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                                        <span className="text-muted-foreground">{t('vehicle_wizard_plate_label')}</span>
                                        <span className="font-bold font-mono uppercase bg-muted px-2 py-0.5 rounded">{plate}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                                        <span className="text-muted-foreground">{t('vehicle_wizard_color_label')}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: color }} />
                                            <span className="font-bold font-mono">{color}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                                        <span className="text-muted-foreground">{t('vehicle_wizard_garage_label')}</span>
                                        <span className="font-bold">{garage}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">{t('vehicle_wizard_performance_label')}</span>
                                        <span className={cn("font-bold text-[10px] px-2 py-0.5 rounded uppercase", maxTuned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                            {maxTuned ? t('vehicle_wizard_tuned_label') : t('vehicle_wizard_stock_label')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border bg-card">
                    <MriButton
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 1 || loading}
                        className="gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" /> {t('permission_wizard_back')}
                    </MriButton>

                    <div className="flex gap-2">
                        <MriButton variant="outline" onClick={onClose} disabled={loading}>
                            {t('cancel_label')}
                        </MriButton>
                        {currentStep < 5 ? (
                            <MriButton
                                onClick={handleNext}
                                disabled={
                                    (currentStep === 1 && !selectedPlayer) ||
                                    (currentStep === 2 && !selectedVehicle) ||
                                    (currentStep === 3 && !plate)
                                }
                                className="gap-2 min-w-[100px]"
                            >
                                {t('permission_wizard_next')} <ChevronRight className="w-4 h-4" />
                            </MriButton>
                        ) : (
                            <MriButton
                                onClick={handleFinish}
                                loading={loading}
                                className="gap-2 bg-primary text-primary-foreground min-w-[120px]"
                            >
                                {t('vehicle_wizard_send_success')} <Gift className="w-4 h-4" />
                            </MriButton>
                        )}
                    </div>
                </div>
            </div>
        </MriModal>
    );
}
