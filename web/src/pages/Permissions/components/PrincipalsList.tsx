import React, { useEffect, useState, useCallback, useMemo } from "react";
import { MriButton } from "@mriqbox/ui-kit";
import {
    Plus,
    Shield,
    Users,
    UserCircle,
    Briefcase,
    Skull,
} from "lucide-react";
import { useNui } from "@/context/NuiContext";
import { isEnvBrowser, rgbToHex, hexToRgb } from "@/utils/misc";
import { MOCK_PRINCIPALS, MOCK_ACES } from "@/utils/mockData";
import ConfirmAction from "@/components/players/ConfirmAction";
import { MriCreatableCombobox } from "@mriqbox/ui-kit";
import { useAppState } from "@/context/AppState";
import { useI18n } from "@/hooks/useI18n";
import PermissionsSkeleton from "@/components/skeletons/PermissionsSkeleton";
import { cn } from "@/lib/utils";
import GroupOverviewCard from "./GroupOverviewCard";
import PlayerOverviewCard from "./PlayerOverviewCard";
import { CATEGORIES } from "../utils/categorization";

interface Principal {
    id: number;
    child: string;
    parent: string;
    description?: string;
}

interface Ace {
    id: number;
    principal: string;
    object: string;
    allow: number;
}

export default function PrincipalsList({
    searchQuery = "",
    refreshTrigger = 0,
    onCountChange,
    onRequestEdit,
}: {
    searchQuery?: string;
    refreshTrigger?: number;
    onCountChange?: (n: number) => void;
    onRequestEdit?: (principal: string) => void;
}) {
    const { sendNui } = useNui();
    const { t } = useI18n();
    const { players, gameData } = useAppState();
    const [principals, setPrincipals] = useState<Principal[]>([]);
    const [aces, setAces] = useState<Ace[]>([]);
    const [loading, setLoading] = useState(false);
    const [targetType, setTargetType] = useState<'group' | 'player' | 'char' | 'job' | 'gang'>('group');
    const [newPrincipal, setNewPrincipal] = useState({ child: "", parent: "", description: "" });
    const [principalColors, setPrincipalColors] = useState<Record<string, string>>({});
    const [confirm, setConfirm] = useState<{ type: "add" | "remove"; principal?: Principal; groupName?: string } | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            if (isEnvBrowser()) {
                setPrincipals(MOCK_PRINCIPALS);
                setAces(MOCK_ACES as any);
                setLoading(false);
                return;
            }

            const [pData, aData, wallData] = await Promise.all([
                sendNui("mri_Qadmin:callback:GetPrincipals"),
                sendNui("mri_Qadmin:callback:GetAces"),
                sendNui("mri_Qadmin:callback:GetWallSettings", {}, { colors: {} })
            ]);

            setPrincipals(Array.isArray(pData) ? pData : []);
            setAces(Array.isArray(aData) ? aData : []);

            if (wallData && wallData.colors) {
                const colorsHex: Record<string, string> = {};
                Object.entries(wallData.colors).forEach(([k, v]) => {
                    colorsHex[k] = rgbToHex(v as string);
                });
                setPrincipalColors(colorsHex);
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (!isEnvBrowser()) setLoading(false);
        }
    }, [sendNui]);

    useEffect(() => {
        fetchAll();
    }, [refreshTrigger, fetchAll]);

    useEffect(() => {
        const unique = new Set(principals.map(p => p.child)).size;
        onCountChange?.(unique);
    }, [principals, onCountChange]);

    const executeAction = async () => {
        if (!confirm) return;
        if (confirm.type === "add") {
            const newItem = { id: Date.now(), ...newPrincipal };
            setPrincipals(prev => [...prev, newItem]);
            if (!isEnvBrowser()) await sendNui("add_principal", {
                child: newPrincipal.child,
                parent: newPrincipal.parent
            });
            setNewPrincipal({ child: "", parent: "", description: "" });
        } else if (confirm.type === "remove") {
            if (confirm.principal) {
                setPrincipals(prev => prev.filter(p => p.id !== confirm.principal?.id));
                if (!isEnvBrowser()) await sendNui("remove_principal", { id: confirm.principal.id });
            } else if (confirm.groupName) {
                // If we remove a whole group, we might want to remove all principals matching it
                setPrincipals(prev => prev.filter(p => p.child !== confirm.groupName));
                if (!isEnvBrowser()) await sendNui("remove_principal_group", { name: confirm.groupName });
            }
        }
        setConfirm(null);
    };

    const groupData = useMemo(() => {
        const uniquePrincipals = Array.from(new Set([
            ...principals.map(p => p.child),
            ...aces.map(a => a.principal)
        ])).filter(p => p.startsWith('group.'));

        const totalPermissions = new Set(aces.map(a => a.object)).size || 71;

        return uniquePrincipals
            .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(groupName => {
                const groupAces = aces.filter(a => a.principal === groupName);
                const grantedCount = groupAces.filter(a => a.allow === 1).length;
                
                const permsSummary = Object.values(CATEGORIES).map(cat => ({
                    label: cat.label,
                    granted: groupAces.some(a => a.allow === 1 && a.object.includes(cat.id)) || (groupName === 'group.admin')
                }));

                return {
                    name: groupName.replace('group.', ''),
                    fullName: groupName,
                    color: principalColors[groupName],
                    grantedCount,
                    totalCount: totalPermissions,
                    permissions: permsSummary
                };
            });
    }, [principals, aces, principalColors, searchQuery]);

    const playerData = useMemo(() => {
        const playerPrincipals = principals.filter(p => !p.child.startsWith('group.'));
        const playerMap: Record<string, { identifier: string; name?: string; avatar?: string; groups: string[] }> = {};

        playerPrincipals.forEach(p => {
            if (!playerMap[p.child]) {
                const playerInfo = players.find(player => player.license === p.child || player.citizenid === p.child.replace('char:', ''));
                playerMap[p.child] = {
                    identifier: p.child,
                    name: playerInfo?.name,
                    avatar: playerInfo?.avatar,
                    groups: []
                };
            }
            if (p.parent.startsWith('group.')) {
                playerMap[p.child].groups.push(p.parent);
            }
        });

        return Object.values(playerMap).filter(p => 
            p.identifier.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [principals, players, searchQuery]);

    const targetOptions = useMemo(() => {
        if (targetType === 'player') return players.map(p => ({ label: `${p.name} (${p.license})`, value: p.license }));
        if (targetType === 'char') return players.map(p => ({ label: `${p.name} (${p.citizenid || p.cid})`, value: `char:${p.citizenid || p.cid}` }));
        return groupData.map(g => ({ label: g.fullName, value: g.fullName }));
    }, [targetType, players, groupData]);

    if (loading && principals.length === 0) return <PermissionsSkeleton />;

    const isGroupView = targetType === 'group';
    const activeData = isGroupView ? groupData : playerData;

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col gap-3 bg-card/30 p-6 rounded-2xl border border-border/50 shadow-sm backdrop-blur-sm">
                <div className="grid grid-cols-5 gap-2">
                    {[
                        { id: 'group', label: t('category_group'), icon: Shield },
                        { id: 'player', label: t('category_player'), icon: Users },
                        { id: 'char', label: t('category_char'), icon: UserCircle },
                        { id: 'job', label: t('category_job'), icon: Briefcase },
                        { id: 'gang', label: t('category_gang'), icon: Skull },
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => { setTargetType(cat.id as any); setNewPrincipal(p => ({ ...p, child: "" })); }}
                            className={cn(
                                "flex items-center justify-center p-2 rounded-xl border-2 text-[10px] font-bold uppercase tracking-tight gap-2 transition-all",
                                targetType === cat.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                            )}
                        >
                            <cat.icon className="w-3.5 h-3.5" /> {cat.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-4 items-end mt-2">
                    <div className="flex-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest px-1">{t("permissions_child_label")}</label>
                        <MriCreatableCombobox options={targetOptions} value={newPrincipal.child} onChange={(val) => setNewPrincipal(p => ({ ...p, child: val }))} placeholder={t("select_player_label")} />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest px-1">{t("permissions_parent_label")}</label>
                        <MriCreatableCombobox options={groupData.map(g => ({ label: g.fullName, value: g.fullName }))} value={newPrincipal.parent} onChange={(val) => setNewPrincipal(p => ({ ...p, parent: val }))} placeholder={t("select_placeholder")} />
                    </div>
                    <MriButton size="sm" className="h-10 px-6" onClick={() => setConfirm({ type: "add" })} disabled={!newPrincipal.child || !newPrincipal.parent}>
                        <Plus className="w-4 h-4 mr-2" /> {t("permissions_add_btn")}
                    </MriButton>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                    {isGroupView ? (
                        groupData.map((group) => (
                            <GroupOverviewCard
                                key={group.fullName}
                                name={group.name}
                                color={group.color}
                                grantedCount={group.grantedCount}
                                totalCount={group.totalCount}
                                permissions={group.permissions}
                                onEdit={() => onRequestEdit?.(group.fullName)}
                                onDelete={() => setConfirm({ type: "remove", groupName: group.fullName })}
                            />
                        ))
                    ) : (
                        playerData.map((player) => (
                            <PlayerOverviewCard
                                key={player.identifier}
                                identifier={player.identifier}
                                name={player.name}
                                avatar={player.avatar}
                                groups={player.groups}
                                onRemoveFromGroup={(group) => {
                                    const p = principals.find(pr => pr.child === player.identifier && pr.parent === group);
                                    if (p) setConfirm({ type: "remove", principal: p });
                                }}
                                onDeleteAll={() => {
                                    setConfirm({ type: "remove", groupName: player.identifier });
                                }}
                            />
                        ))
                    )}
                </div>

                {activeData.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Users className="w-12 h-12 opacity-15 mb-4" />
                        <p className="text-sm italic">{t("permissions_no_inheritance")}</p>
                    </div>
                )}
            </div>

            {confirm && (
                <ConfirmAction
                    text={confirm.type === "add" 
                        ? t("permissions_confirm_add_principal").replace("%s", newPrincipal.child).replace("%s", newPrincipal.parent)
                        : t("permissions_confirm_remove_principal").replace("%s", confirm.groupName || confirm.principal?.child || "").replace("%s", confirm.principal?.parent || "all")}
                    onConfirm={executeAction}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
}
