import React, { useState, useCallback } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { MriButton, MriPageHeader, MriActionModal, MriSkeleton, MriExpandableSearch } from '@mriqbox/ui-kit'
import { VirtuosoGrid } from 'react-virtuoso'
import { Crown, RefreshCw, Plus, Trash2, Users } from 'lucide-react'
import { hasPermission } from '@/utils/permissions'
import { VipRank } from '@/types'
import { MOCK_VIP_RANKS, MOCK_VIP } from '@/utils/mockData'
import VipRankCard from '@/components/vip/VipRankCard'
import VipRankModal from '@/components/vip/VipRankModal'

export default function Vip() {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const { myPermissions } = useAppState()
    const canDo = (perm: string) => hasPermission(myPermissions, perm)

    const [ranks, setRanks] = useState<VipRank[]>(MOCK_VIP_RANKS as VipRank[])
    const [vipPlayers, setVipPlayers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [rankModal, setRankModal] = useState<{ open: boolean; rank?: VipRank }>({ open: false })
    const [pendingDelete, setPendingDelete] = useState<{ rank: VipRank; playerCount: number } | null>(null)

    const fetchRanks = useCallback(async () => {
        setLoading(true)
        try {
            const data = await sendNui<VipRank[]>('getVipRanks', {}, MOCK_VIP_RANKS)
            if (Array.isArray(data)) setRanks(data)
        } finally {
            setLoading(false)
        }
    }, [sendNui])

    const fetchVipPlayers = useCallback(async () => {
        try {
            const data = await sendNui<any[]>('getVipPlayers', {}, MOCK_VIP)
            if (Array.isArray(data)) setVipPlayers(data)
        } catch { /* silently ignore */ }
    }, [sendNui])

    React.useEffect(() => {
        fetchRanks()
        fetchVipPlayers()
    }, [fetchRanks, fetchVipPlayers])

    const filtered = React.useMemo(() => {
        const s = search.toLowerCase()
        return s ? ranks.filter(r => r.label.toLowerCase().includes(s) || r.id.includes(s)) : ranks
    }, [ranks, search])

    const handleSave = async (data: Omit<VipRank, 'createdAt'>) => {
        const event = rankModal.rank ? 'updateVipRank' : 'createVipRank'
        setRankModal({ open: false })
        await sendNui(event, data)
        fetchRanks()
    }

    const handleDeleteClick = (rank: VipRank) => {
        const playerCount = vipPlayers.filter(p => p.rankId === rank.id).length
        setPendingDelete({ rank, playerCount })
    }

    const handleDeleteConfirm = async () => {
        if (!pendingDelete) return
        await sendNui('deleteVipRank', { id: pendingDelete.rank.id })
        setPendingDelete(null)
        fetchRanks()
        fetchVipPlayers()
    }

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('vip.title')} icon={Crown} countLabel={t('common.records')} count={filtered.length}>
                <MriExpandableSearch placeholder={t('common.search')} value={search} onChange={setSearch} />
                <div className="flex items-center gap-2">
                    {canDo('qadmin.action.manage_vip') && (
                        <MriButton
                            size="icon" variant="outline"
                            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => setRankModal({ open: true })}
                        >
                            <Plus className="w-4 h-4" />
                        </MriButton>
                    )}
                    <MriButton
                        size="icon" variant="outline"
                        className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={fetchRanks}
                        isLoading={loading}
                        disabled={loading}
                    >
                        {!loading && <RefreshCw className="w-4 h-4" />}
                    </MriButton>
                </div>
            </MriPageHeader>

            <div className="flex-1 overflow-hidden pt-4 p-2">
                {loading ? (
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                                <MriSkeleton className="h-1.5 w-full" />
                                <div className="p-4 space-y-3">
                                    <MriSkeleton className="h-8 w-8 rounded-lg" />
                                    <MriSkeleton className="h-4 w-2/3" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <MriSkeleton className="h-14 rounded-lg" />
                                        <MriSkeleton className="h-14 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Crown className="w-12 h-12 opacity-20" />
                        <p>{t('vip.rank.none_found')}</p>
                        {canDo('qadmin.action.manage_vip') && (
                            <MriButton size="sm" variant="outline" onClick={() => setRankModal({ open: true })}>
                                <Plus className="w-4 h-4 mr-2" />
                                {t('vip.rank.create_first')}
                            </MriButton>
                        )}
                    </div>
                ) : (
                    <VirtuosoGrid
                        style={{ height: '100%' }}
                        data={filtered}
                        listClassName="grid grid-cols-4 gap-4"
                        itemContent={(_: number, rank: VipRank) => (
                            <VipRankCard
                                key={rank.id}
                                rank={rank}
                                onEdit={() => setRankModal({ open: true, rank })}
                                onDelete={() => handleDeleteClick(rank)}
                            />
                        )}
                    />
                )}
            </div>

            {pendingDelete && (
                <MriActionModal
                    title={t('vip.rank.delete_title')}
                    icon={Trash2}
                    variant="destructive"
                    confirmLabel={t('vip.rank.delete_btn')}
                    cancelLabel={t('cancel.label')}
                    onClose={() => setPendingDelete(null)}
                    onConfirm={handleDeleteConfirm}
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: pendingDelete.rank.color + '55', background: pendingDelete.rank.color + '12' }}>
                            <div
                                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black shrink-0"
                                style={{ background: pendingDelete.rank.color + '22', color: pendingDelete.rank.color, border: `1px solid ${pendingDelete.rank.color}44` }}
                            >
                                {pendingDelete.rank.label.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-sm" style={{ color: pendingDelete.rank.color }}>{pendingDelete.rank.label}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{pendingDelete.rank.id}</p>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            {t('vip.rank.delete_confirm').replace('%s', pendingDelete.rank.label)}
                        </p>

                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${pendingDelete.playerCount > 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-muted/60 border-border text-muted-foreground'}`}>
                            <Users className="w-4 h-4 shrink-0" />
                            {pendingDelete.playerCount > 0
                                ? t('vip.rank.delete_players_assigned').replace('%s', String(pendingDelete.playerCount))
                                : t('vip.rank.delete_no_players')
                            }
                        </div>
                    </div>
                </MriActionModal>
            )}

            {rankModal.open && (
                <VipRankModal
                    rank={rankModal.rank}
                    onClose={() => setRankModal({ open: false })}
                    onSubmit={handleSave}
                />
            )}
        </div>
    )
}
