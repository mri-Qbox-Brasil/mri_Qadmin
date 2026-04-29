import React, { useState, useMemo } from 'react'
import { MriButton, MriPageHeader, MriCard } from '@mriqbox/ui-kit'
import { Plus, Trash2, Save, Code, Wand2, RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'
import ConfirmAction from '@/components/players/ConfirmAction'
import { cn } from '@/lib/utils'
import ActionWizard from './components/ActionWizard'
import { hasPermission } from '@/utils/permissions'

interface ActionManagerProps {
    isEmbedded?: boolean;
    search?: string;
    selectedCategory?: 'All' | 'Actions' | 'PlayerActions' | 'OtherActions';
}

export interface ActionManagerRef {
    handleOpenCreate: () => void;
    handleRefresh: () => Promise<void>;
}

const ActionManager = React.forwardRef<ActionManagerRef, ActionManagerProps>(({ 
    isEmbedded = false, 
    search: externalSearch = '', 
    selectedCategory: externalCategory = 'Actions' 
}, ref) => {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const { gameData, myPermissions } = useAppState()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editPayload, setEditPayload] = useState<string>('')
    const [loading, setLoading] = useState(false)

    // Modals state
    const [showWizard, setShowWizard] = useState(false)
    const [wizardData, setWizardData] = useState<any>(null)
    const [wizardId, setWizardId] = useState<string | undefined>(undefined)
    
    const [actionToDelete, setActionToDelete] = useState<any | null>(null)

    // Aggregate actions based on category
    const actionsList = useMemo(() => {
        let list: any[] = []
        
        if (externalCategory === 'All') {
            const sources = [
                { data: gameData.actions, cat: 'Actions' },
                { data: gameData.playerActions, cat: 'PlayerActions' },
                { data: gameData.otherActions, cat: 'OtherActions' }
            ]
            sources.forEach(({ data, cat }) => {
                if (!data) return
                const items = Array.isArray(data)
                    ? data.map((v, i) => ({ ...v, id: v.id || i.toString(), category: cat }))
                    : Object.entries(data).map(([k, v]) => ({ ...(v as any), id: k, category: cat }))
                list = [...list, ...items]
            })
        } else {
            const source = externalCategory === 'Actions'
                ? gameData.actions
                : externalCategory === 'PlayerActions'
                    ? gameData.playerActions
                    : gameData.otherActions
            
            if (source) {
                list = Array.isArray(source)
                    ? source.map((v, i) => ({ ...v, id: v.id || i.toString(), category: externalCategory }))
                    : Object.entries(source).map(([k, v]) => ({ ...(v as any), id: k, category: externalCategory }))
            }
        }

        return list.filter(a => {
            const matchesId = String(a.id).toLowerCase().includes(externalSearch.toLowerCase())
            const matchesLabel = a.label && String(a.label).toLowerCase().includes(externalSearch.toLowerCase())
            const matchesCat = a.category && String(a.category).toLowerCase().includes(externalSearch.toLowerCase())
            return matchesId || matchesLabel || matchesCat
        }).sort((a, b) => a.id.localeCompare(b.id))
    }, [gameData, externalSearch, externalCategory])


    const handleRefresh = async () => {
        setLoading(true)
        try {
            await sendNui('getData', {}, {})
        } catch (e) {
            console.error(e)
        } finally {
            setTimeout(() => setLoading(false), 500)
        }
    }

    const handleOpenCreate = () => {
        setWizardData(null)
        setWizardId(undefined)
        setShowWizard(true)
    }

    React.useImperativeHandle(ref, () => ({
        handleOpenCreate,
        handleRefresh
    }))

    const handleSave = async (id: string, payloadStr: string, category: string) => {
        try {
            const parsed = JSON.parse(payloadStr)
            await sendNui('mri_Qadmin:server:SaveAction', { id, category, data: parsed })
            setEditingId(null)
        } catch (e) {
            console.error('Invalid JSON payload!', e)
        }
    }

    const confirmDelete = async () => {
        if (actionToDelete) {
            await sendNui('mri_Qadmin:server:DeleteAction', { id: actionToDelete.id, category: actionToDelete.category })
            setActionToDelete(null)
        }
    }

    const startEdit = (action: any) => {
        setWizardData(action)
        setWizardId(action.id)
        setShowWizard(true)
    }

    const startAdvancedEdit = (action: any) => {
        setEditingId(action.id)
        // Clone and remove ID from the payload since ID is the key
        const payloadObj = { ...action }
        delete payloadObj.id
        setEditPayload(JSON.stringify(payloadObj, null, 2))
    }

    return (
        <div className="h-full w-full flex flex-col bg-background">
            {!isEmbedded && (
                <MriPageHeader
                    count={actionsList.length}
                    icon={SettingsIcon}
                >
                    <div className="flex items-center gap-3">
                        <MriButton
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={handleRefresh}
                            disabled={loading}
                            title={t('common.refresh')}
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </MriButton>
                        <MriButton
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={handleOpenCreate}
                            title={t('action_manager.create')}
                        >
                            <Plus className={cn("w-4 h-4", loading && "animate-spin")} />
                        </MriButton>
                    </div>
                </MriPageHeader>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Categories */}
                {!isEmbedded && (
                    <div className="w-64 border-r border-border p-2 space-y-2 flex flex-col bg-card/30">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('action_manager.categories')}</h3>
                        {(['All', 'Actions', 'PlayerActions', 'OtherActions'] as const).map(cat => (
                            <MriButton
                                key={cat}
                                variant={externalCategory === cat ? 'default' : 'ghost'}
                                className="w-full justify-start"
                            >
                                {t(`category_${cat.toLowerCase()}`) || cat}
                            </MriButton>
                        ))}
                    </div>
                )}

                {/* Main Content View */}
                <div className="flex-1 p-4 overflow-y-auto">
                    {editingId ? (
                        <MriCard className="p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div>
                                    <h2 className="text-xl font-bold">{t('action_manager.editing')} <span className="text-primary">{editingId}</span></h2>
                                    <p className="text-muted-foreground text-sm">{t('action_manager.edit_help')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <MriButton variant="ghost" onClick={() => setEditingId(null)}>{t('action_manager.cancel')}</MriButton>
                                    <MriButton variant="brand" onClick={() => {
                                        const action = actionsList.find(a => a.id === editingId);
                                        if (action) handleSave(editingId, editPayload, action.category);
                                    }}>
                                        <Save className="w-4 h-4 mr-2" /> {t('action_manager.save')}
                                    </MriButton>
                                </div>
                            </div>

                            <textarea
                                className="w-full h-[500px] bg-secondary/50 text-foreground font-mono p-4 rounded-md border border-border focus:border-ring outline-none resize-y"
                                value={editPayload}
                                onChange={e => setEditPayload(e.target.value)}
                            />
                        </MriCard>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            {actionsList.map(action => (
                                <MriCard key={action.id} className="p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <h3 className="font-bold text-foreground truncate min-h-[1.5rem]" title={action.id}>
                                                {action.label || action.id}
                                            </h3>
                                            {action.icon && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground flex items-center">
                                                    {action.icon}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 mb-4">
                                            <p className="text-xs text-muted-foreground font-mono truncate">{action.id}</p>
                                            {externalCategory === 'All' && (
                                                <span className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
                                                    action.category === 'Actions' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                                                    action.category === 'PlayerActions' ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" :
                                                    "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                                                )}>
                                                    {t(`category_${action.category.toLowerCase()}`) || action.category}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 text-sm">
                                            <div className="flex justify-between items-center bg-secondary/30 px-2 py-1 rounded">
                                                <span className="text-muted-foreground text-xs">{t('action_manager.labels.type')}</span>
                                                <span className="font-mono text-xs text-foreground">{action.type || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-secondary/30 px-2 py-1 rounded">
                                                <span className="text-muted-foreground text-xs">{t('action_manager.labels.perms')}</span>
                                                <span className="font-mono text-xs text-primary">{action.perms || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-secondary/30 px-2 py-1 rounded truncate">
                                                <span className="text-muted-foreground text-xs mr-2">{t('action_manager.labels.event')}</span>
                                                <span className="font-mono text-xs text-green-400 truncate">{action.event || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
                                        <MriButton
                                            variant="ghost"
                                            size="icon"
                                            className="w-9 h-9"
                                            onClick={() => startAdvancedEdit(action)}
                                            title="Advanced Editor (JSON)"
                                            disabled={!hasPermission(myPermissions, 'qadmin.action.manage_actions')}
                                        >
                                            <Code className="w-4 h-4" />
                                        </MriButton>
                                        <MriButton
                                            variant="brand"
                                            size="sm"
                                            onClick={() => startEdit(action)}
                                            disabled={!hasPermission(myPermissions, 'qadmin.action.manage_actions')}
                                        >
                                            <Wand2 className="w-4 h-4 mr-2" /> Wizard
                                        </MriButton>
                                        <MriButton
                                            variant="destructive"
                                            size="icon"
                                            className="w-9 h-9"
                                            onClick={() => setActionToDelete(action)}
                                            disabled={!hasPermission(myPermissions, 'qadmin.action.manage_actions')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </MriButton>
                                    </div>
                                </MriCard>
                            ))}
                            {actionsList.length === 0 && (
                                <div className="col-span-full py-20 text-center text-muted-foreground flex flex-col items-center">
                                    <Code className="w-10 h-10 opacity-20 mb-2" />
                                    <p>{t('action_manager.empty')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Wizard */}
            <ActionWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                onFinish={handleRefresh}
                initialData={wizardData}
                editId={wizardId}
                category={wizardData?.category || externalCategory}
            />

            {/* Delete Modal */}
            {actionToDelete && (
                <ConfirmAction
                    text={t('action_manager.delete_confirm')?.replace('%s', actionToDelete.id) || `Tem certeza que deseja deletar a ação ${actionToDelete.id}?`}
                    onConfirm={confirmDelete}
                    onCancel={() => setActionToDelete(null)}
                />
            )}
        </div>
    )
})

export default ActionManager
