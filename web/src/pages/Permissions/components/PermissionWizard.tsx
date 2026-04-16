import React, { useState, useMemo } from 'react';
import {
    MriModal,
    MriButton,
    MriInput,
    MriCreatableCombobox,
} from '@mriqbox/ui-kit';
import {
    Shield,
    Users,
    Key,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Wand2,
    AlertCircle,
    UserCircle,
    Briefcase,
    Skull
} from 'lucide-react';
import { useAppState } from '@/context/AppState';
import { useI18n } from '@/hooks/useI18n';
import { useNui } from '@/context/NuiContext';
import { cn } from '@/lib/utils';

interface PermissionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onFinish: () => void;
}

// Removed global STEPS to avoid shadowing lint error

export default function PermissionWizard({ isOpen, onClose, onFinish }: PermissionWizardProps) {
    const { t } = useI18n();
    const { sendNui } = useNui();
    const { players, gameData } = useAppState();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const STEPS = useMemo(() => [
        { id: 1, title: t('permission_wizard_step_target'), icon: Users },
        { id: 2, title: t('permission_wizard_step_inheritance'), icon: Shield },
        { id: 3, title: t('permission_wizard_step_permissions'), icon: Key },
        { id: 4, title: t('permission_wizard_step_summary'), icon: CheckCircle2 },
    ], [t]);

    // Form State
    const [targetType, setTargetType] = useState<'group' | 'player' | 'char' | 'job' | 'gang'>('group');
    const [target, setTarget] = useState('');
    const [parent, setParent] = useState('');
    const [description, setDescription] = useState('');
    const [selectedAces, setSelectedAces] = useState<Record<string, 'allow' | 'deny' | 'none'>>({});

    // Derived Data
    const targetOptions = useMemo(() => {
        if (targetType === 'player') {
            return players.map(p => ({
                label: `${p.name} (${t('label_license')}: ${p.license})`,
                value: p.license
            }));
        }
        if (targetType === 'char') {
            return players.map(p => ({
                label: `${p.name} (${t('label_char')}: ${p.citizenid || p.cid})`,
                value: `char:${p.citizenid || p.cid}`
            }));
        }
        if (targetType === 'job') {
            return gameData.jobs.flatMap((j: any) => {
                const base = { label: `${j.label} (${t('label_job')}: ${j.name})`, value: `job.${j.name}` };
                const grades = (j.grades ? (Array.isArray(j.grades) ? j.grades : Object.values(j.grades)) : []).map((g: any) => ({
                    label: `${j.label} - ${g.label || g.name} (${t('label_grade')}: ${g.level !== undefined ? g.level : g.name})`,
                    value: `job.${j.name}.${g.level !== undefined ? g.level : g.name}`,
                }));
                return [base, ...grades];
            });
        }
        if (targetType === 'gang') {
            return gameData.gangs.flatMap((g: any) => {
                const base = { label: `${g.label} (${t('label_gang')}: ${g.name})`, value: `gang.${g.name}` };
                const grades = (g.grades ? (Array.isArray(g.grades) ? g.grades : Object.values(g.grades)) : []).map((gr: any) => ({
                    label: `${g.label} - ${gr.label || gr.name} (${t('label_grade')}: ${gr.level !== undefined ? gr.level : gr.name})`,
                    value: `gang.${g.name}.${gr.level !== undefined ? gr.level : gr.name}`,
                }));
                return [base, ...grades];
            });
        }
        // Default group options
        return [
            { label: 'group.admin', value: 'group.admin' },
            { label: 'group.mod', value: 'group.mod' },
            { label: 'group.support', value: 'group.support' },
            { label: 'group.user', value: 'group.user' },
        ];
    }, [targetType, players, gameData, t]);

    const groupOptions = useMemo(() => {
        return [
            { label: 'group.admin', value: 'group.admin' },
            { label: 'group.mod', value: 'group.mod' },
            { label: 'group.support', value: 'group.support' },
            { label: 'group.user', value: 'group.user' },
        ];
    }, []);

    // Grouping ACEs by category from gameData.actions
    const aceCategories = useMemo(() => {
        const categories: Record<string, { label: string, actions: string[] }> = {
            'player': { label: t('category_playeractions'), actions: [] },
            'vehicle': { label: t('nav_vehicles'), actions: [] },
            'server': { label: t('nav_resources'), actions: [] },
            'developer': { label: t('settings_developer'), actions: [] },
            'other': { label: t('category_otheractions'), actions: [] },
        };

        // If we have gameData.actions, use it to populate categories
        // Fallback to common nodes if empty
        const allActions = Object.keys(gameData.actions || {}).length > 0 
            ? Object.keys(gameData.actions) 
            : ['command.revive', 'command.car', 'command.tpm', 'command.nui_devtools', 'command.kick', 'command.ban'];

        allActions.forEach(action => {
            if (action.includes('player') || action.includes('kick') || action.includes('ban')) categories.player.actions.push(action);
            else if (action.includes('car') || action.includes('dv') || action.includes('vehicle')) categories.vehicle.actions.push(action);
            else if (action.includes('server') || action.includes('resource')) categories.server.actions.push(action);
            else if (action.includes('dev') || action.includes('tpm') || action.includes('coords')) categories.developer.actions.push(action);
            else categories.other.actions.push(action);
        });

        return Object.entries(categories).filter(([, data]) => data.actions.length > 0);
    }, [gameData, t]);

    const handleNext = () => {
        if (currentStep < 4) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            // Normalize strings (add group. prefix if it looks like a group)
            const normalize = (val: string) => {
                if (!val) return val;
                if (val.includes(':') || val.startsWith('job.') || val.startsWith('gang.') || val.startsWith('group.')) return val;
                return `group.${val.toLowerCase()}`;
            };

            const finalTarget = normalize(target);
            const finalParent = normalize(parent);

            // 1. Add Principal (Inheritance) if selected
            if (finalParent) {
                await sendNui('add_principal', {
                    child: finalTarget,
                    parent: finalParent
                });
            }

            // 2. Add ACEs
            for (const [action, value] of Object.entries(selectedAces)) {
                if (value === 'none') continue;
                await sendNui('add_ace', {
                    principal: finalTarget,
                    object: action,
                    allow: value === 'allow'
                });
            }

            onFinish();
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleAce = (action: string) => {
        setSelectedAces(prev => {
            const current = prev[action] || 'none';
            if (current === 'none') return { ...prev, [action]: 'allow' };
            if (current === 'allow') return { ...prev, [action]: 'deny' };
            return { ...prev, [action]: 'none' };
        });
    };

    if (!isOpen) return null;

    return (
        <MriModal onClose={onClose} className="max-w-4xl w-full">
            <div className="p-6 flex flex-col min-h-[500px] max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                    <Wand2 className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">{t('permission_wizard_title')}</h2>
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
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h3 className="text-sm font-bold mb-3">{t('permission_wizard_target_q')}</h3>
                                <div className="grid grid-cols-5 gap-2 mb-6">
                                    {[
                                        { id: 'group', label: t('category_group'), icon: Shield },
                                        { id: 'player', label: t('category_player'), icon: Users },
                                        { id: 'char', label: t('category_char'), icon: UserCircle },
                                        { id: 'job', label: t('category_job'), icon: Briefcase },
                                        { id: 'gang', label: t('category_gang'), icon: Skull },
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setTargetType(cat.id as any);
                                                setTarget('');
                                            }}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                                                targetType === cat.id 
                                                    ? "border-primary bg-primary/10 text-primary shadow-md" 
                                                    : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                                            )}
                                        >
                                            <cat.icon className="w-5 h-5" />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 px-1 tracking-widest">
                                            {t('search_target_placeholder')}
                                        </h4>
                                        <div data-scroll-lock-ignore>
                                            <MriCreatableCombobox
                                                options={targetOptions}
                                                value={target}
                                                onChange={setTarget}
                                                placeholder={t('search_target_placeholder')}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 px-1 tracking-widest">
                                            {t('permission_wizard_desc_label')}
                                        </h4>
                                        <MriInput
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder={t('permission_wizard_desc_placeholder')}
                                            className="h-10 border-border bg-card/50"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {!target && (
                                <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        <AlertCircle className="w-4 h-4 text-muted-foreground opacity-50" />
                                    </div>
                                    <p className="text-xs text-muted-foreground italic">
                                        {t('permission_wizard_target_required')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div>
                                <h3 className="text-sm font-bold mb-2">{t('permission_wizard_inheritance_q')}</h3>
                                <p className="text-xs text-muted-foreground mb-4">
                                    {t('permission_wizard_inheritance_desc')}
                                </p>
                                <div data-scroll-lock-ignore>
                                    <MriCreatableCombobox
                                        options={groupOptions}
                                        value={parent}
                                        onChange={setParent}
                                        placeholder={t('select_placeholder')}
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg border border-border">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-bold text-foreground">Pro-tip:</span> {t('permission_wizard_inheritance_help')}
                                </p>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div>
                                <h3 className="text-sm font-bold mb-2">{t('permission_wizard_aces_q')}</h3>
                                <p className="text-xs text-muted-foreground mb-4">{t('permission_wizard_aces_desc')}</p>
                            </div>

                            <div className="space-y-4">
                                {aceCategories.map(([id, cat]) => (
                                    <div key={id} className="space-y-2">
                                        <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">{cat.label}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {cat.actions.map(action => {
                                                const state = selectedAces[action] || 'none';
                                                return (
                                                    <button
                                                        key={action}
                                                        onClick={() => toggleAce(action)}
                                                        className={cn(
                                                            "flex items-center justify-between p-2 rounded-md border text-xs font-mono transition-all",
                                                            state === 'allow' ? "border-green-500/50 bg-green-500/10 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]" :
                                                            state === 'deny' ? "border-red-500/50 bg-red-500/10 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]" :
                                                            "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                                                        )}
                                                    >
                                                        <span className="truncate mr-2">{action.replace('command.', '')}</span>
                                                        {state === 'allow' ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : 
                                                         state === 'deny' ? <AlertCircle className="w-3 h-3 shrink-0" /> : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl space-y-4 text-center">
                                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
                                <h3 className="text-xl font-bold">{t('permission_wizard_summary_q')}</h3>
                                <p className="text-sm text-balance text-muted-foreground">
                                    {t('permission_wizard_summary_desc', [target])}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">{t('permissions_inheritance')}</span>
                                    <p className="text-sm font-mono truncate">{parent || 'None (Direct)'}</p>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">{t('permissions_desc_label')}</span>
                                    <p className="text-sm italic truncate">{description || 'No description'}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-muted/30 rounded-lg border border-border flex-1">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">{t('permission_wizard_summary_aces_count', [Object.values(selectedAces).filter(v => v !== 'none').length])}</span>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {Object.entries(selectedAces).map(([action, value]) => value !== 'none' && (
                                        <div key={action} className="flex items-center justify-between text-[11px] font-mono">
                                            <span>{action}</span>
                                            <span className={value === 'allow' ? "text-green-500" : "text-red-500"}>
                                                {value === 'allow' ? t('permissions_allow') : t('permissions_deny')}
                                            </span>
                                        </div>
                                    ))}
                                    {Object.values(selectedAces).filter(v => v !== 'none').length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">{t('permission_wizard_summary_no_aces')}</p>
                                    )}
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
                        {currentStep < 4 ? (
                            <MriButton
                                onClick={handleNext}
                                disabled={!target}
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
                                {t('permission_wizard_save')} <Wand2 className="w-4 h-4" />
                            </MriButton>
                        )}
                    </div>
                </div>
            </div>
        </MriModal>
    );
}
