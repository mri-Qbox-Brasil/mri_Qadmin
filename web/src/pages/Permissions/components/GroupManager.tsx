import React, { useState } from 'react'
import { Plus, Users, Shield } from 'lucide-react'
import { MriButton, MriInput, MriActionModal } from '@mriqbox/ui-kit'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { useI18n } from '@/hooks/useI18n'
import GroupOverviewCard from './GroupOverviewCard'
import GroupEditor from './GroupEditor'
import { getFriendlyPermissionName } from '../utils/categorization'

export interface GroupData {
    id: string;
    label: string;
    description: string;
    permissions: string[];
}

export default function GroupManager({ searchQuery, onCountChange, groups }: { searchQuery: string, onCountChange?: (n: number) => void, groups: GroupData[] }) {
    const { sendNui } = useNui()
    const { t } = useI18n()
    const [editingGroup, setEditingGroup] = useState<GroupData | null>(null)
    const [creating, setCreating] = useState(false)
    const [newGroupId, setNewGroupId] = useState('')
    const [newGroupLabel, setNewGroupLabel] = useState('')
    const [newGroupDesc, setNewGroupDesc] = useState('')
    const [saving, setSaving] = useState(false)

    const { gameData, permissionDefinitions } = useAppState()
    const [groupToDelete, setGroupToDelete] = useState<string | null>(null)

    const dynamicActionsCount =
        Object.keys(gameData.actions || {}).length +
        Object.keys(gameData.playerActions || {}).length +
        Object.keys(gameData.otherActions || {}).length

    const totalAvailablePermissions = permissionDefinitions.length + dynamicActionsCount

    const handleCreate = async () => {
        if (!newGroupId || !newGroupLabel || /[^a-z0-9_.]/.test(newGroupId) || newGroupId.startsWith('.') || newGroupId.endsWith('.')) return
        setSaving(true)
        const response: any = await sendNui('mri_Qadmin:server:SaveGroup', { id: newGroupId, label: newGroupLabel, description: newGroupDesc })
        setSaving(false)
        if (response?.status === 'ok') {
            setCreating(false)
            setNewGroupId('')
            setNewGroupLabel('')
            setNewGroupDesc('')
            setTimeout(() => onCountChange?.(groups.length + 1), 500)
        }
    }

    const handleDelete = async () => {
        if (!groupToDelete) return
        setSaving(true)
        const response: any = await sendNui('mri_Qadmin:server:DeleteGroup', { id: groupToDelete })
        setSaving(false)
        if (response?.status === 'ok') {
            setGroupToDelete(null)
        }
    }

    if (editingGroup) {
        return <GroupEditor group={editingGroup} onBack={() => setEditingGroup(null)} />
    }

    const filtered = groups.filter(g =>
        g.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.id.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const hasInvalidIdChars = /[^a-z0-9_.]/.test(newGroupId)
    const startsWithDot = newGroupId.startsWith('.')
    const endsWithDot = newGroupId.endsWith('.')
    const hasFormattingErrors = hasInvalidIdChars || startsWithDot || endsWithDot
    const isReadyToCreate = newGroupId.length >= 3 && newGroupLabel.length >= 3 && !hasFormattingErrors && !saving

    return (
        <div className="flex flex-col h-full space-y-4 relative">
            <div className="flex justify-end relative z-10 mr-4">
                <MriButton onClick={() => setCreating(true)} className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                    <Plus className="w-4 h-4 mr-2" /> Novo Grupo
                </MriButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4 overflow-y-auto">
                {filtered.map(g => (
                    <div key={g.id} className="min-h-[220px]">
                        <GroupOverviewCard
                            name={g.label}
                            grantedCount={g.permissions.length}
                            totalCount={totalAvailablePermissions}
                            permissions={g.permissions.map(p => ({ label: getFriendlyPermissionName(p, permissionDefinitions, t), granted: true }))}
                            onEdit={() => setEditingGroup(g)}
                            onDelete={() => setGroupToDelete(g.id)}
                        />
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground/60 border-2 border-dashed border-border/50 rounded-2xl">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p className="font-medium text-lg">Nenhum grupo encontrado</p>
                        <p className="text-sm opacity-70">Ajuste os filtros ou crie um novo grupo</p>
                    </div>
                )}
            </div>

            {creating && (
                <MriActionModal
                    title="Criar Novo Grupo"
                    icon={Shield}
                    onClose={() => !saving && setCreating(false)}
                    onConfirm={handleCreate}
                    isConfirmDisabled={!isReadyToCreate}
                >
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">ID do Grupo</label>
                            <MriInput
                                placeholder="ex: suporte.tecnico"
                                value={newGroupId}
                                onChange={e => setNewGroupId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                disabled={saving}
                                className={hasFormattingErrors ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {hasFormattingErrors ? (
                                <p className="text-[10px] text-red-500 font-semibold">
                                    {hasInvalidIdChars ? 'Apenas números, letras, pontos e underlines são aceitos. ' : ''}
                                    {startsWithDot || endsWithDot ? 'O ID não pode começar nem terminar com um ponto.' : ''}
                                </p>
                            ) : (
                                <p className="text-[10px] text-muted-foreground">O identificador interno único (ex: adm_nivel.1). Letras minúsculas, números, pontos e _.</p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Nome (Label)</label>
                            <MriInput
                                placeholder="ex: Suporte Avançado"
                                value={newGroupLabel}
                                onChange={e => setNewGroupLabel(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Descrição (Opcional)</label>
                            <MriInput
                                placeholder="Descreva as responsabilidades..."
                                value={newGroupDesc}
                                onChange={e => setNewGroupDesc(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </div>
                </MriActionModal>
            )}

            {groupToDelete && (
                <MriActionModal
                    title="Excluir Grupo"
                    icon={Shield}
                    variant="destructive"
                    onClose={() => !saving && setGroupToDelete(null)}
                    onConfirm={handleDelete}
                    isConfirmDisabled={saving}
                    confirmText="Excluir Grupo"
                >
                    <div className="py-2">
                        <p className="text-sm text-foreground mb-2">
                            Tem certeza que deseja apagar o grupo <strong>{groupToDelete}</strong>?
                        </p>
                        <p className="text-xs text-red-500">
                            Atenção: Todos os jogadores com este grupo perderão imediatamente essas permissões.
                        </p>
                    </div>
                </MriActionModal>
            )}
        </div>
    )
}
