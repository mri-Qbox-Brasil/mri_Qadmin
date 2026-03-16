import React, { useState, useMemo } from 'react'
import { MriButton, MriPageHeader, MriCard, MriActionModal, MriCompactSearch, MriSearchInput } from '@mriqbox/ui-kit'
import { Settings as SettingsIcon, Plus, Trash2, Save, Code, Edit, Zap, X, RefreshCw } from 'lucide-react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'
import ConfirmAction from '@/components/players/ConfirmAction'
import { cn } from '@/lib/utils'

export default function ActionManager() {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const { gameData } = useAppState()
    const [selectedCategory, setSelectedCategory] = useState<'Actions' | 'PlayerActions' | 'OtherActions'>('Actions')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editPayload, setEditPayload] = useState<string>('')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newActionId, setNewActionId] = useState('')
    const [actionToDelete, setActionToDelete] = useState<string | null>(null)

    // Aggregate actions based on category
    const actionsSource = selectedCategory === 'Actions'
        ? gameData.actions
        : selectedCategory === 'PlayerActions'
            ? gameData.playerActions
            : gameData.otherActions

    const actionsList = useMemo(() => {
        if (!actionsSource) return []
        const list = Array.isArray(actionsSource)
            ? actionsSource.map((v, i) => ({ ...v, id: v.id || i.toString() }))
            : Object.entries(actionsSource).map(([k, v]) => ({ ...(v as any), id: k }))

        return list.filter(a => {
            const matchesId = String(a.id).toLowerCase().includes(search.toLowerCase())
            const matchesLabel = a.label && String(a.label).toLowerCase().includes(search.toLowerCase())
            return matchesId || matchesLabel
        }).sort((a, b) => a.id.localeCompare(b.id))
    }, [actionsSource, search])

    const actionOptions = useMemo(() => {
        const list = Array.isArray(actionsSource)
            ? actionsSource.map((v, i) => ({ ...v, id: v.id || i.toString() }))
            : Object.entries(actionsSource).map(([k, v]) => ({ ...(v as any), id: k }))
        return list.map(a => ({
            value: a.id,
            label: a.label || a.id
        }))
    }, [actionsSource])

    const handleRefresh = async () => {
        setLoading(true)
        try {
            // Trigger a data fetch from the app state context
            // In many of these pages, just sending 'getData' or similar works
            await sendNui('getData', {}, {})
            // The AppState usually handles the response via NUI message,
            // but we call it to manually trigger an update.
        } catch (e) {
            console.error(e)
        } finally {
            // Artificial delay to show animation
            setTimeout(() => setLoading(false), 500)
        }
    }

    const handleSave = async (id: string, payloadStr: string) => {
        try {
            const parsed = JSON.parse(payloadStr)
            await sendNui('mri_Qadmin:server:SaveAction', { id, category: selectedCategory, data: parsed })
            setEditingId(null)
        } catch (e) {
            console.error('Invalid JSON payload!', e)
        }
    }

    const confirmDelete = async () => {
        if (actionToDelete) {
            await sendNui('mri_Qadmin:server:DeleteAction', { id: actionToDelete, category: selectedCategory })
            setActionToDelete(null)
        }
    }

    const startEdit = (action: any) => {
        setEditingId(action.id)
        // Clone and remove ID from the payload since ID is the key
        const payloadObj = { ...action }
        delete payloadObj.id
        setEditPayload(JSON.stringify(payloadObj, null, 2))
    }

    const handleCreate = () => {
        if (!newActionId.trim()) return

        const cleanId = newActionId.trim().toLowerCase().replace(/\s+/g, '_')
        setEditingId(cleanId)
        setEditPayload(JSON.stringify({
            label: t('action_manager_new_action') || "Nova Ação",
            perms: "qadmin.page.actions",
            dropdown: [
                { label: "Player", option: "dropdown", data: "players", valueField: "id", labelField: "name" },
                { label: "Reason", option: "text" },
                {
                    label: "Option",
                    option: "dropdown",
                    data: [
                        { label: "Example 1", value: "1" },
                        { label: "Example 2", value: "2" }
                    ]
                },
                { label: "Confirm", option: "button", type: "server", event: "mri_Qadmin:server:ExampleEvent" }
            ]
        }, null, 2))

        setShowCreateModal(false)
        setNewActionId('')
    }

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader
                title={t('nav_action_manager')}
                countLabel={t('records')}
                count={actionsList.length}
                icon={SettingsIcon}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <MriCompactSearch
                            placeholder={t('search_placeholder_items')}
                            value={search}
                            onChange={setSearch}
                            options={actionOptions}
                            searchPlaceholder={t('search_placeholder_items')}
                            className="w-8 h-8 border-border bg-card/60"
                        />
                        {search && (
                            <MriButton
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                                onClick={() => setSearch('')}
                                title={t('common_clear')}
                            >
                                <X size={16} />
                            </MriButton>
                        )}
                    </div>
                    <MriButton
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={handleRefresh}
                        disabled={loading}
                        title={t('refresh')}
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </MriButton>
                    <MriButton
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCreateModal(true)}
                        title={t('action_manager_create')}
                    >
                        <Plus className={cn("w-4 h-4", loading && "animate-spin")} />
                    </MriButton>
                </div>
            </MriPageHeader>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Categories */}
                <div className="w-64 border-r border-border p-2 space-y-2 flex flex-col bg-card/30">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('action_manager_categories')}</h3>
                    {(['Actions', 'PlayerActions', 'OtherActions'] as const).map(cat => (
                        <MriButton
                            key={cat}
                            variant={selectedCategory === cat ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {t(`category_${cat.toLowerCase()}`) || cat}
                        </MriButton>
                    ))}
                </div>

                {/* Main Content View */}
                <div className="flex-1 p-4 overflow-y-auto">
                    {editingId ? (
                        <MriCard className="p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div>
                                    <h2 className="text-xl font-bold">{t('action_manager_editing')} <span className="text-primary">{editingId}</span></h2>
                                    <p className="text-muted-foreground text-sm">{t('action_manager_edit_help')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <MriButton variant="ghost" onClick={() => setEditingId(null)}>{t('action_manager_cancel')}</MriButton>
                                    <MriButton variant="brand" onClick={() => handleSave(editingId, editPayload)}>
                                        <Save className="w-4 h-4 mr-2" /> {t('action_manager_save')}
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
                                        <p className="text-xs text-muted-foreground mt-1 mb-4 font-mono truncate">{action.id}</p>

                                        <div className="space-y-1.5 text-sm">
                                            <div className="flex justify-between items-center bg-secondary/30 px-2 py-1 rounded">
                                                <span className="text-muted-foreground text-xs">{t('action_manager_type')}</span>
                                                <span className="font-mono text-xs text-foreground">{action.type || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-secondary/30 px-2 py-1 rounded">
                                                <span className="text-muted-foreground text-xs">{t('action_manager_perms')}</span>
                                                <span className="font-mono text-xs text-primary">{action.perms || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-secondary/30 px-2 py-1 rounded truncate">
                                                <span className="text-muted-foreground text-xs mr-2">{t('action_manager_event')}</span>
                                                <span className="font-mono text-xs text-green-400 truncate">{action.event || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
                                        <MriButton variant="outline" size="sm" onClick={() => startEdit(action)}>
                                            <Edit className="w-4 h-4 mr-2" /> {t('action_manager_editor')}
                                        </MriButton>
                                        <MriButton variant="destructive" size="icon" className="w-9 h-9" onClick={() => setActionToDelete(action.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </MriButton>
                                    </div>
                                </MriCard>
                            ))}
                            {actionsList.length === 0 && (
                                <div className="col-span-full py-20 text-center text-muted-foreground flex flex-col items-center">
                                    <Code className="w-10 h-10 opacity-20 mb-2" />
                                    <p>{t('action_manager_empty')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <MriActionModal
                    title={t('action_manager_new_action')}
                    icon={Zap}
                    onClose={() => setShowCreateModal(false)}
                    onConfirm={handleCreate}
                    isConfirmDisabled={!newActionId.trim()}
                >
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
                            {t('action_manager_create_prompt') || 'Digite o ID (Key) da nova Action:'}
                        </label>
                        <MriSearchInput
                            placeholder="ex: kick_player"
                            width="w-full"
                            value={newActionId}
                            onChange={setNewActionId}
                        />
                    </div>
                </MriActionModal>
            )}

            {/* Delete Modal */}
            {actionToDelete && (
                <ConfirmAction
                    text={t('action_manager_delete_confirm')?.replace('%s', actionToDelete) || `Tem certeza que deseja deletar a ação ${actionToDelete}?`}
                    onConfirm={confirmDelete}
                    onCancel={() => setActionToDelete(null)}
                />
            )}
        </div>
    )
}
