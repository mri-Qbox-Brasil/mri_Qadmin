import React, { useState, useMemo } from 'react'
import { ChevronLeft, Save, ShieldCheck } from 'lucide-react'
import { MriButton } from '@mriqbox/ui-kit'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { useI18n } from '@/hooks/useI18n'
import { GroupData } from './GroupManager'
import { CATEGORIES, getPermIcon, getFriendlyPermissionName } from '../utils/categorization'
import { cn } from '@/lib/utils'

export default function GroupEditor({ group, onBack }: { group: GroupData, onBack: () => void }) {
    const { sendNui } = useNui()
    const { t } = useI18n()
    const { gameData, permissionDefinitions } = useAppState()
    const [permissions, setPermissions] = useState<Set<string>>(new Set(group.permissions))
    const [saving, setSaving] = useState(false)

    const { categoriesWithPerms, dynamicPermInfo } = useMemo(() => {
        const result: Record<string, { pageNode?: string, actions: string[] }> = {}
        Object.keys(CATEGORIES).forEach(c => result[c] = { actions: [] })

        permissionDefinitions.forEach(def => {
            const cat = def.category
            if (!result[cat]) result[cat] = { actions: [] }
            if (def.id.startsWith('qadmin.page.')) {
                const pageName = def.id.replace('qadmin.page.', '')
                if (pageName === cat) {
                    result[cat].pageNode = def.id
                } else {
                    result[cat].actions.push(def.id)
                }
            } else if (def.id !== 'qadmin.open' && def.id !== 'qadmin.master') {
                result[cat].actions.push(def.id)
            }
        })

        // Inject dynamic perms from gameData action lists not already in defs
        const extra: Record<string, { label: string, desc: string }> = {}
        const knownPerms = new Set(permissionDefinitions.map(d => d.id))

        const toArray = (src: any) =>
            Array.isArray(src) ? src : Object.entries(src || {}).map(([k, v]: any) => ({ ...v, id: k }))

        const allActions = [
            ...toArray(gameData.actions),
            ...toArray(gameData.playerActions),
            ...toArray(gameData.otherActions),
        ]

        allActions.forEach((action: any) => {
            const perm = action.perms
            if (!perm || knownPerms.has(perm)) return
            knownPerms.add(perm)
            if (!result['actions']) result['actions'] = { actions: [] }
            result['actions'].actions.push(perm)
            extra[perm] = {
                label: action.label || perm,
                desc: action.id ? `action: ${action.id}` : perm,
            }
        })

        return { categoriesWithPerms: result, dynamicPermInfo: extra }
    }, [gameData, permissionDefinitions])

    const togglePermission = (perm: string) => {
        const next = new Set(permissions)
        if (next.has(perm)) {
            next.delete(perm)
        } else {
            next.add(perm)
        }
        setPermissions(next)
    }

    const toggleCategory = (catId: string) => {
        const cat = categoriesWithPerms[catId]
        const allAssociated = [cat.pageNode, ...cat.actions].filter(Boolean) as string[]
        const hasAll = allAssociated.every(p => permissions.has(p))

        const next = new Set(permissions)
        if (hasAll) {
            allAssociated.forEach(p => next.delete(p))
        } else {
            allAssociated.forEach(p => next.add(p))
        }
        setPermissions(next)
    }

    const handleSave = async () => {
        setSaving(true)
        const response: any = await sendNui('mri_Qadmin:server:UpdateGroupPermissions', { id: group.id, permissions: Array.from(permissions) })
        setSaving(false)
        if (response?.status === 'ok') {
            onBack()
        }
    }

    return (
        <div className="flex flex-col h-full bg-card/10 rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border/50 bg-card/40 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <MriButton variant="outline" size="icon" onClick={onBack} className="h-10 w-10">
                        <ChevronLeft className="w-5 h-5" />
                    </MriButton>
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            Editando: <span className="text-primary">{group.label}</span>
                        </h2>
                        <p className="text-xs text-muted-foreground/80 font-mono tracking-widest uppercase mt-1">{group.id}</p>
                    </div>
                </div>
                <MriButton onClick={handleSave} disabled={saving} className="shadow-lg shadow-primary/20">
                    <Save className="w-4 h-4 mr-2" /> Salvar Permissões
                </MriButton>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {Object.entries(CATEGORIES).map(([catId, cat]) => {
                    const data = categoriesWithPerms[catId]
                    if (!data.pageNode && data.actions.length === 0) return null

                    const allAssociated = [data.pageNode, ...data.actions].filter(Boolean) as string[]
                    const hasAll = allAssociated.every(p => permissions.has(p))
                    const hasSome = allAssociated.some(p => permissions.has(p))
                    const pageEnabled = data.pageNode ? permissions.has(data.pageNode) : true

                    return (
                        <div key={catId} className="bg-background/40 border border-border/50 rounded-xl overflow-hidden">
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/5 transition-colors border-b border-border/50"
                                onClick={() => toggleCategory(catId)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <cat.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{cat.label}</h3>
                                        <p className="text-xs text-muted-foreground">Clique para marcar/desmarcar todos as permissões desta categoria</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors",
                                    hasAll ? "bg-primary border-primary text-primary-foreground" :
                                        hasSome ? "bg-primary/20 border-primary" : "border-muted-foreground/30"
                                )}>
                                    {hasAll && <div className="w-2.5 h-2.5 bg-current rounded-sm" />}
                                    {hasSome && !hasAll && <div className="w-2.5 h-0.5 bg-primary rounded-sm" />}
                                </div>
                            </div>

                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.pageNode && (
                                    <div
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                            permissions.has(data.pageNode) ? "bg-primary/10 border-primary shadow-sm" : "bg-card/30 border-border hover:border-primary/50"
                                        )}
                                        onClick={() => togglePermission(data.pageNode!)}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center",
                                            permissions.has(data.pageNode) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                                        )}>
                                            {permissions.has(data.pageNode) && <ShieldCheck className="w-3 h-3" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">Liberar Aba/Menu</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{data.pageNode}</span>
                                        </div>
                                    </div>
                                )}
                                {data.actions.map(actionPerm => {
                                    const def = permissionDefinitions.find(d => d.id === actionPerm)
                                    const dyn = dynamicPermInfo[actionPerm]
                                    const has = permissions.has(actionPerm)
                                    const label = getFriendlyPermissionName(actionPerm, permissionDefinitions, t) || dyn?.label || actionPerm
                                    const desc = t(`perm_descs.${actionPerm}`) !== `perm_descs.${actionPerm}` ? t(`perm_descs.${actionPerm}`) : (dyn?.desc ?? actionPerm)
                                    const Icon = getPermIcon(actionPerm, def?.category)
                                    return (
                                        <div
                                            key={actionPerm}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                !pageEnabled && "opacity-50 grayscale",
                                                has ? "bg-primary/10 border-primary" : "bg-card/30 border-border hover:border-primary/50"
                                            )}
                                            onClick={() => pageEnabled && togglePermission(actionPerm)}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                                                has ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                                            )}>
                                                {has ? <ShieldCheck className="w-3 h-3" /> : <Icon className="w-3 h-3 text-muted-foreground" />}
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-sm font-semibold truncate">{label}</span>
                                                <span className="text-[10px] text-muted-foreground truncate" title={desc}>{desc}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
