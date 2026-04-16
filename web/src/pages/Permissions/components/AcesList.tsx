import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { MriButton, MriInput } from '@mriqbox/ui-kit'
import { Trash2, Plus, Shield, Search, Info, Settings, LayoutGrid } from 'lucide-react'
import { useNui } from '@/context/NuiContext'
import { isEnvBrowser } from '@/utils/misc'
import { MOCK_ACES } from '@/utils/mockData'
import ConfirmAction from '@/components/players/ConfirmAction'
import { MriCreatableCombobox } from '@mriqbox/ui-kit'
import { useAppState } from '@/context/AppState'
import { useI18n } from '@/hooks/useI18n'
import PermissionsSkeleton from '@/components/skeletons/PermissionsSkeleton'
import { cn } from '@/lib/utils'
import { getPermissionInfo, CATEGORIES } from '../utils/categorization'
import PermissionCard from './PermissionCard'

interface Ace {
    id: number
    principal: string
    object: string
    allow: number
    description?: string
}

export default function AcesList({ 
    searchQuery = '', 
    refreshTrigger = 0, 
    onCountChange,
    selectedPrincipal,
    setSelectedPrincipal
}: { 
    searchQuery?: string, 
    refreshTrigger?: number, 
    onCountChange?: (n: number) => void,
    selectedPrincipal: string,
    setSelectedPrincipal: (val: string) => void
}) {
    const { sendNui } = useNui()
    const { t } = useI18n()
    const { players } = useAppState()
    const [aces, setAces] = useState<Ace[]>([])
    const [loading, setLoading] = useState(false)
    const [newAce, setNewAce] = useState({ object: '', allow: 1, description: '' })

    const [confirm, setConfirm] = useState<{
        type: "add" | "remove" | "toggle";
        ace?: Ace;
    } | null>(null);

    const fetchAces = useCallback(async () => {
        setLoading(true);
        try {
            if (isEnvBrowser()) {
                setTimeout(() => {
                    setAces(prev => (prev.length === 0 ? MOCK_ACES : prev));
                    setLoading(false);
                }, 500);
                return;
            }
            const data = await sendNui("mri_Qadmin:callback:GetAces");
            const list = Array.isArray(data) ? data : [];
            setAces(list);
        } catch (e) {
            console.error(e);
        } finally {
            if (!isEnvBrowser()) setLoading(false);
        }
    }, [sendNui]);

    useEffect(() => {
        fetchAces();
    }, [refreshTrigger, fetchAces]);

    useEffect(() => {
        onCountChange?.(aces.length);
    }, [aces, onCountChange]);

    const handleAdd = async () => {
        if (!selectedPrincipal || !newAce.object) return;
        setConfirm({ type: "add" });
    };

    const handleToggle = async (ace: Ace) => {
        // Optimistic update
        const newAllow = ace.allow ? 0 : 1;
        setAces((prev) =>
            prev.map((a) => (a.id === ace.id ? { ...a, allow: newAllow } : a)),
        );

        if (isEnvBrowser()) return;
        await sendNui('toggle_ace', { id: ace.id })
    }

    const executeAction = async () => {
        if (!confirm) return;

        if (confirm.type === 'add') {
            const newItem = {
                id: Date.now(),
                principal: selectedPrincipal,
                object: newAce.object,
                allow: newAce.allow ? 1 : 0,
                description: newAce.description
            }

            setAces(prev => [...prev, newItem])
            setNewAce({ object: '', allow: 1, description: '' })

            if (!isEnvBrowser()) {
                await sendNui('add_ace', {
                    principal: selectedPrincipal,
                    object: newAce.object,
                    allow: newAce.allow === 1
                })
            }
        } else if (confirm.type === 'remove' && confirm.ace) {
            const removeId = confirm.ace.id
            setAces(prev => prev.filter(a => a.id !== removeId))
            if (!isEnvBrowser()) await sendNui("remove_ace", { id: removeId });
        }

        setConfirm(null)
    }

    // Filter and Group
    const filteredAces = useMemo(() => {
        let list = aces.filter(a => a.principal === selectedPrincipal);
        if (searchQuery) {
            const s = searchQuery.toLowerCase();
            list = list.filter(a => 
                a.object.toLowerCase().includes(s) || 
                (a.description && a.description.toLowerCase().includes(s))
            );
        }
        return list;
    }, [aces, selectedPrincipal, searchQuery]);

    const categorizedAces = useMemo(() => {
        const sections: Ace[] = [];
        const actions: Record<string, Ace[]> = {};

        filteredAces.forEach(ace => {
            const info = getPermissionInfo(ace.object);
            if (ace.object.startsWith('qadmin.page.')) {
                sections.push(ace);
            } else {
                if (!actions[info.category]) actions[info.category] = [];
                actions[info.category].push(ace);
            }
        });

        return { sections, actions };
    }, [filteredAces]);

    const principalOptions = useMemo(() => {
        const acePrincipals = Array.from(new Set(aces.map(a => a.principal)));
        const playerPrincipals = players.map(p => p.license);
        
        const combined = Array.from(new Set([
            'group.admin',
            'group.mod',
            ...acePrincipals,
            ...playerPrincipals
        ]));

        return combined.map(u => {
            const playerInfo = players.find(p => p.license === u);
            return { 
                label: playerInfo ? `${playerInfo.name} (${u})` : u, 
                value: u 
            };
        });
    }, [aces, players]);

    if (loading && aces.length === 0) return <PermissionsSkeleton />;

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header / Selector */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 bg-card/30 p-6 rounded-2xl border border-border/50 shadow-sm backdrop-blur-sm">
                <div className="flex-1 w-full max-w-sm">
                    <label className="text-[10px] font-black uppercase text-muted-foreground mb-2 block tracking-widest px-1">
                        {t('permissions_principal_label')}
                    </label>
                    <MriCreatableCombobox
                        options={principalOptions}
                        value={selectedPrincipal}
                        onChange={setSelectedPrincipal}
                        placeholder={t('select_placeholder')}
                    />
                </div>

                <div className="flex items-center gap-2 mb-1">
                    <MriButton 
                        variant="outline" 
                        size="sm" 
                        className="h-10 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                        onClick={() => {/* Open Add Modal or expand bar */}}
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> {t('permissions_add_btn')}
                    </MriButton>
                </div>
            </div>

            {/* Scrollable Grid Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-8 custom-scrollbar">
                {/* Section Permissions */}
                {categorizedAces.sections.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <LayoutGrid className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                                Section Permissions
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categorizedAces.sections.map(ace => {
                                const info = getPermissionInfo(ace.object);
                                return (
                                    <PermissionCard
                                        key={ace.id}
                                        title={ace.object.replace('qadmin.page.', '').replace('_', ' ')}
                                        description={ace.description || `Access to ${ace.object.split('.').pop()} section`}
                                        icon={info.icon}
                                        active={ace.allow === 1}
                                        onToggle={() => handleToggle(ace)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Action Permissions grouped by Category */}
                {Object.entries(categorizedAces.actions).map(([catId, items]) => {
                    const category = CATEGORIES[catId] || CATEGORIES.other;
                    return (
                        <div key={catId} className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <category.icon className="w-4 h-4 text-primary" />
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                                    {category.label}
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {items.map(ace => {
                                    const info = getPermissionInfo(ace.object);
                                    return (
                                        <PermissionCard
                                            key={ace.id}
                                            title={info.label || ace.object.replace('command.', '').replace('_', ' ')}
                                            description={ace.description || info.desc || `Control ${ace.object.split('.').pop()}`}
                                            icon={info.icon}
                                            active={ace.allow === 1}
                                            onToggle={() => handleToggle(ace)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {filteredAces.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                            <Shield className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-sm italic">
                            {searchQuery ? t('permissions_no_matches').replace('%s', searchQuery) : "No permissions found for this principal."}
                        </p>
                    </div>
                )}
            </div>

            {confirm && (
                <ConfirmAction
                    text={
                        confirm.type === "add"
                            ? t('permissions_confirm_add_ace')
                                .replace('%s', newAce.object)
                                .replace('%s', selectedPrincipal)
                            : t('permissions_confirm_remove_ace')
                                .replace('%s', confirm.ace?.object || "")
                                .replace('%s', confirm.ace?.principal || "")
                    }
                    onConfirm={executeAction}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
}
