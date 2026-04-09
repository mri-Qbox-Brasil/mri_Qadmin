import React, { useState, useMemo, useEffect } from 'react';
import { 
    Wand2, Users, Shield, Key, CheckCircle2, 
    ChevronRight, ChevronLeft, Zap, Info, 
    Plus, Trash2, Settings2, HelpCircle
} from 'lucide-react';
import { 
    MriModal, MriButton, MriInput, 
    MriCreatableCombobox, MriSelectSearch 
} from '@mriqbox/ui-kit';
import { useI18n } from '@/hooks/useI18n';
import { useAppState } from '@/context/AppState';
import { useNui } from '@/context/NuiContext';
import { cn } from '@/lib/utils';

interface ActionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onFinish: () => void;
    initialData?: any;
    editId?: string;
    category?: 'Actions' | 'PlayerActions' | 'OtherActions';
}

export default function ActionWizard({ isOpen, onClose, onFinish, initialData, editId, category = 'Actions' }: ActionWizardProps) {
    const { t } = useI18n();
    const { sendNui } = useNui();
    const { gameData } = useAppState();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const STEPS = useMemo(() => [
        { id: 1, title: t('action_wizard_step_info'), icon: Info },
        { id: 2, title: t('action_wizard_step_execution'), icon: Zap },
        { id: 3, title: t('action_wizard_step_permissions'), icon: Shield },
        { id: 4, title: t('action_wizard_step_fields'), icon: Settings2 },
        { id: 5, title: t('action_wizard_step_review'), icon: CheckCircle2 },
    ], [t]);

    // Form State
    const [id, setId] = useState(editId || '');
    const [label, setLabel] = useState('');
    const [icon, setIcon] = useState('');
    const [actionType, setActionType] = useState('server');
    const [event, setEvent] = useState('');
    const [perms, setPerms] = useState('qadmin.page.actions');
    const [dropdownFields, setDropdownFields] = useState<any[]>([]);

    // Initialize if Edit mode
    useEffect(() => {
        if (initialData && isOpen) {
            setLabel(initialData.label || '');
            setIcon(initialData.icon || '');
            setActionType(initialData.type || 'server');
            setEvent(initialData.event || '');
            setPerms(initialData.perms || 'qadmin.page.actions');
            setDropdownFields(initialData.dropdown || []);
            if (editId) setId(editId);
        } else if (isOpen && !editId) {
            // Reset for new creation
            setLabel('');
            setId('');
            setIcon('');
            setActionType('server');
            setEvent('');
            setPerms('qadmin.page.actions');
            setDropdownFields([]);
            setCurrentStep(1);
        }
    }, [initialData, editId, isOpen]);

    const handleNext = () => {
        if (currentStep < 5) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleAddField = () => {
        setDropdownFields([...dropdownFields, { 
            label: 'New Field', 
            option: 'text' 
        }]);
    };

    const updateField = (index: number, updates: any) => {
        const newFields = [...dropdownFields];
        newFields[index] = { ...newFields[index], ...updates };
        
        // Handle dropdown specific source resets
        if (updates.option === 'dropdown' && !newFields[index].data) {
            newFields[index].data = 'players';
            newFields[index].valueField = 'id';
            newFields[index].labelField = 'name';
        }
        
        setDropdownFields(newFields);
    };

    const removeField = (index: number) => {
        setDropdownFields(dropdownFields.filter((_, i) => i !== index));
    };

    const generatedJson = useMemo(() => {
        return {
            label,
            icon,
            type: actionType,
            event,
            perms,
            dropdown: dropdownFields
        };
    }, [label, icon, actionType, event, perms, dropdownFields]);

    const handleFinish = async () => {
        setLoading(true);
        try {
            await sendNui('mri_Qadmin:server:SaveAction', { 
                id, 
                category, 
                data: generatedJson 
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

    return (
        <MriModal onClose={onClose} className="max-w-4xl w-full">
            <div className="p-6 flex flex-col min-h-[500px] max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                    <Wand2 className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">{editId ? `Edit Action: ${editId}` : t('action_wizard_title')}</h2>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold">{t('action_wizard_id')}</h3>
                                    <MriInput
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        placeholder="ex: kick_player"
                                        disabled={!!editId}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">{t('action_wizard_id_desc')}</p>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold">{t('action_wizard_label')}</h3>
                                    <MriInput
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        placeholder="ex: Kick Player"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">{t('action_wizard_label_desc')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold">{t('action_wizard_icon')}</h3>
                                    <MriInput
                                        value={icon}
                                        onChange={(e) => setIcon(e.target.value)}
                                        placeholder="ex: user-x"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold">{t('action_wizard_category')}</h3>
                                    <MriSelectSearch
                                        value={category}
                                        options={[
                                            { label: t('action_category_general'), value: 'Actions' },
                                            { label: t('action_category_player'), value: 'PlayerActions' },
                                            { label: t('action_category_other'), value: 'OtherActions' },
                                        ]}
                                        onChange={() => {}} // Disabled but needed by component
                                        disabled={true} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold mb-2">{t('action_wizard_event_type')}</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['server', 'client', 'command'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setActionType(type)}
                                                className={cn(
                                                    "p-4 rounded-lg border flex flex-col items-center gap-2 transition-all",
                                                    actionType === type ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                                                )}
                                            >
                                                <Zap className="w-5 h-5" />
                                                <span className="text-xs font-bold uppercase">{type}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold">{t('action_wizard_event_name')}</h3>
                                    <MriInput
                                        value={event}
                                        onChange={(e) => setEvent(e.target.value)}
                                        placeholder="ex: mri_Qadmin:server:KickPlayer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold">{t('action_wizard_perm_label')}</h3>
                                <MriCreatableCombobox
                                    options={[
                                        { label: 'qadmin.page.actions', value: 'qadmin.page.actions' },
                                        { label: 'qadmin.action.kick', value: 'qadmin.action.kick' },
                                        { label: 'qadmin.action.ban', value: 'qadmin.action.ban' },
                                    ]}
                                    value={perms}
                                    onChange={setPerms}
                                    placeholder="Nó de permissão ACE"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    {t('action_wizard_perm_desc')}
                                </p>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-bold">{t('action_wizard_fields_q')}</h3>
                                    <p className="text-xs text-muted-foreground">{t('action_wizard_fields_desc')}</p>
                                </div>
                                <MriButton size="sm" onClick={handleAddField} className="gap-2">
                                    <Plus className="w-4 h-4" /> {t('action_wizard_add_field')}
                                </MriButton>
                            </div>

                            <div className="space-y-4">
                                {dropdownFields.map((field, index) => (
                                    <div key={index} className="p-4 bg-muted/20 border border-border rounded-lg space-y-4 relative group">
                                        <button 
                                            onClick={() => removeField(index)}
                                            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">{t('action_wizard_field_label')}</label>
                                                <MriInput
                                                    value={field.label}
                                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                                    placeholder={t('action_wizard_field_label_placeholder')}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">{t('action_wizard_field_type')}</label>
                                                <MriSelectSearch
                                                    value={field.option}
                                                    onChange={(val: string) => updateField(index, { option: val })}
                                                    options={[
                                                        { label: t('action_field_type_text'), value: 'text' },
                                                        { label: t('action_field_type_number'), value: 'number' },
                                                        { label: t('action_field_type_dropdown'), value: 'dropdown' },
                                                        { label: t('action_field_type_button'), value: 'button' },
                                                        { label: t('action_field_type_checkbox'), value: 'checkbox' },
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        {field.option === 'dropdown' && (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">{t('action_wizard_field_source')}</label>
                                                    <MriSelectSearch
                                                        value={field.data}
                                                        onChange={(val: string) => updateField(index, { data: val })}
                                                        options={[
                                                            { label: t('action_source_players'), value: 'players' },
                                                            { label: t('action_source_jobs'), value: 'jobs' },
                                                            { label: t('action_source_gangs'), value: 'gangs' },
                                                            { label: t('action_source_items'), value: 'items' },
                                                            { label: t('action_source_custom'), value: 'custom' },
                                                        ]}
                                                    />
                                                </div>
                                                <div className="flex items-end text-[10px] italic text-muted-foreground pb-2">
                                                    {t('action_wizard_field_source_help')}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {field.option === 'button' && (
                                            <div className="p-3 bg-primary/5 rounded border border-primary/10 flex items-center gap-3">
                                                <HelpCircle className="w-4 h-4 text-primary" />
                                                <p className="text-[10px] text-primary/80">Este campo serve como o gatilho final para executar a ação no menu.</p>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {dropdownFields.length === 0 && (
                                    <div className="p-12 border border-dashed border-border rounded-xl text-center">
                                        <p className="text-sm text-muted-foreground italic">Nenhum campo configurado ainda.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" /> {t('action_wizard_confirm_title')}
                                </h3>
                                <pre className="text-[11px] font-mono bg-black/20 p-4 rounded-md overflow-x-auto max-h-[350px]">
                                    {JSON.stringify(generatedJson, null, 2)}
                                </pre>
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
                                disabled={!id || !label}
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
                                {t('action_wizard_save_success')} <Wand2 className="w-4 h-4" />
                            </MriButton>
                        )}
                    </div>
                </div>
            </div>
        </MriModal>
    );
}
