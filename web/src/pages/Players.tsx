import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import {
    MriButton,
    MriPageHeader,
    MriSpinner,
    MriEconomyCard,
    MriGridActionButton,
    MriSectionHeader,
    MriPlayerVitals,
    MriVitalAdjustModal,
    MriActionModal,
    MriInput,
} from '@mriqbox/ui-kit'
import { MriExpandableSearch } from '@/components/ui/MriExpandableSearch'

import { Virtuoso, VirtuosoGrid } from 'react-virtuoso'
import { Player } from '@/types'
import PlayersSkeleton from '@/components/skeletons/PlayersSkeleton'

import { useAppState } from '@/context/AppState'
import { hasPermission } from '@/utils/permissions'
import ConfirmAction from '@/components/players/ConfirmAction'
import MoneyModal from '@/components/players/MoneyModal'
import GiveItemModal from '@/components/players/GiveItemModal'
import ChangeGroupModal from '@/components/players/ChangeGroupModal'
import BanModal from '@/components/players/BanModal'
import BucketModal from '@/components/players/BucketModal'
import MapModal from '@/components/players/MapModal'
import ScreenModal from '@/components/players/ScreenModal'
import {
    LayoutGrid, List, RefreshCw, User, Heart, ChevronLeft,
    ExternalLink, Gift, Trash2, Contact,
    Copy,
    Fingerprint,
    Skull,
    Ban, Eye, ShoppingBag,
    Wallet, Car, AlertTriangle, Crosshair, Download, Undo, Lock, LogOut,
    Users, Check, Navigation, UserMinus, UserCog, Map as MapIcon,
    VolumeX, Activity, Waves, Archive, Crown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_PLAYERS } from '@/utils/mockData'
import InventoryViewerModal from '@/components/players/InventoryViewerModal'
import { useClipboard } from '@/hooks/useClipboard'
import SetVipModal from '@/components/vip/SetVipModal'

/* Atomic Components */
import PlayerGridCard from '@/components/players/PlayerGridCard'
import PlayerListItem from '@/components/players/PlayerListItem'
import PlayerVehicleCard from '@/components/players/PlayerVehicleCard'

// Helper to format unix timestamp or date string (kept for header usage mostly)
const formatDate = (val: any, t: any) => {
    if (!val) return t('common.unknown')
    let date: Date
    if (!isNaN(val) && !isNaN(parseFloat(val))) {
        const num = Number(val)
        if (num < 100000000000) {
            date = new Date(num * 1000)
        } else {
            date = new Date(num)
        }
    } else {
        date = new Date(val)
    }
    if (isNaN(date.getTime())) return String(val)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day} / ${month} / ${year} ${hours}:${minutes} `
}


export default function Players() {
    const [loading, setLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [search, setSearch] = useState('')
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
        const saved = localStorage.getItem('mri_qadmin_view_mode')
        return saved === 'list' ? 'list' : 'grid'
    })

    useEffect(() => {
        localStorage.setItem('mri_qadmin_view_mode', viewMode)
    }, [viewMode])

    const { sendNui } = useNui()
    const { copy } = useClipboard()
    const { players, setPlayers, selectedPlayer, setSelectedPlayer, pagination, setPagination, lastPlayersFetch, setLastPlayersFetch, myPermissions, gameData } = useAppState()
    const qboxEnabled = !!gameData?.qboxEnabled
    const canDo = (perm: string) => hasPermission(myPermissions, perm)
    const { t } = useI18n()

    /* Modals State */
    const [showBanModal, setShowBanModal] = useState(false)
    const [showKickModal, setShowKickModal] = useState(false)
    const [showWarnModal, setShowWarnModal] = useState(false)
    const [showMoneyModal, setShowMoneyModal] = useState(false)
    const [showBucketModal, setShowBucketModal] = useState(false)
    const [showMapModal, setShowMapModal] = useState(false)
    const [viewingScreenPlayer, setViewingScreenPlayer] = useState<any>(null)
    const [isGivingMoney, setIsGivingMoney] = useState(true)
    const [initialMoneyType, setInitialMoneyType] = useState<'cash' | 'bank' | 'crypto'>('cash')
    const [showGiveItemModal, setShowGiveItemModal] = useState(false)
    const [showGroupModal, setShowGroupModal] = useState(false)
    const [groupType, setGroupType] = useState<'job' | 'gang'>('job')
    const [isProcessingAction, setIsProcessingAction] = useState(false)
    const [showInventoryViewer, setShowInventoryViewer] = useState<{ show: boolean; target: any } | null>(null)

    /* Confirmations State */
    const [showDeleteVehicleConfirm, setShowDeleteVehicleConfirm] = useState(false)
    const [pendingDeletePlate, setPendingDeletePlate] = useState<string | null>(null)
    const [showClearInventoryConfirm, setShowClearInventoryConfirm] = useState(false)
    const [showDismissConfirm, setShowDismissConfirm] = useState<'job' | 'gang' | null>(null)
    const [vitalAdjustModal, setVitalAdjustModal] = useState<{ vital: string; label: string; value: number } | null>(null)

    const [filterGroup, setFilterGroup] = useState<'all' | 'online' | 'offline' | 'banned' | 'vip'>('all')
    const [vipCitizenIds, setVipCitizenIds] = useState<Set<string>>(new Set())
    const [vipRankMap, setVipRankMap] = useState<Record<string, { label: string; color: string }>>({})
    const [showSetVipModal, setShowSetVipModal] = useState(false)
    const [showOpenStashModal, setShowOpenStashModal] = useState(false)
    const [stashInput, setStashInput] = useState('')

    const abortSyncRef = useRef(false)

    const getPlayerKey = useCallback((p: any) => {
        if (!p) return t('common.unknown')
        if (p.citizenid) return String(p.citizenid)
        if (p.cid) return String(p.cid)
        if (p.license) return String(p.license)
        return String(p.id)
    }, [t])

    const syncRemainingPages = useCallback(async (startPage: number, totalPages: number, currentSearch: string) => {
        if (startPage > totalPages || currentSearch !== '') {
            setIsSyncing(false)
            return
        }

        setIsSyncing(true)

        try {
            if (abortSyncRef.current) {
                setIsSyncing(false)
                return
            }

            const searchLower = String(currentSearch).toLowerCase()
            const filteredMocks = currentSearch === ''
                ? (MOCK_PLAYERS as any[])
                : (MOCK_PLAYERS as any[]).filter((p: any) =>
                    (String(p.name || '').toLowerCase().includes(searchLower)) ||
                    String(p.id).includes(currentSearch) ||
                    (String(p.cid || '').toLowerCase().includes(searchLower))
                )

            const limit = 300
            const payload = { page: startPage, limit: limit, search: currentSearch }
            const mock: any = { data: filteredMocks.slice((startPage - 1) * limit, startPage * limit), total: filteredMocks.length, pages: Math.ceil(filteredMocks.length / limit) }

            await new Promise(r => setTimeout(r, 200))
            if (abortSyncRef.current) { setIsSyncing(false); return; }

            const response = await sendNui('getPlayers', payload, mock)
            const data = Array.isArray(response) ? response : (response.data || [])

            if (data && data.length > 0) {
                setPlayers(prev => [...prev, ...data])
                syncRemainingPages(startPage + 1, totalPages, currentSearch)
            } else {
                setIsSyncing(false)
            }

        } catch (err: unknown) {
            console.error("Sync error", err)
            setIsSyncing(false)
        }
    }, [sendNui, setPlayers, setIsSyncing])

    const fetchPlayers = useCallback(async (pageToFetch = 1, searchQuery = '', forceRefresh = false) => {
        if (searchQuery !== '') {
            abortSyncRef.current = true
        } else {
            abortSyncRef.current = false
        }

        // Cache Check
        const isSearchUpdate = searchQuery !== pagination.search
        if (pageToFetch === 1 && searchQuery === '' && !forceRefresh && !isSearchUpdate) {
            const now = Date.now()
            if (now - lastPlayersFetch < 60000 && players.length > 0) {
                return
            }
        }

        setLoading(true)
        try {
            const searchLower = String(searchQuery).toLowerCase()
            const filteredMocks = searchQuery === ''
                ? (MOCK_PLAYERS as any[])
                : (MOCK_PLAYERS as any[]).filter((p: any) =>
                    String(p.name || '').toLowerCase().includes(searchLower) ||
                    String(p.license || '').toLowerCase().includes(searchLower) ||
                    String(p.citizenid || '').toLowerCase().includes(searchLower) ||
                    String(p.id).includes(searchQuery)
                )

            const limit = 300
            const mock: any = { data: filteredMocks.slice(0, limit), total: filteredMocks.length, pages: Math.ceil(filteredMocks.length / limit) }

            const payload = {
                page: pageToFetch,
                limit: limit,
                search: searchQuery
            }

            const response = await sendNui('getPlayers', payload, mock)
            const data = Array.isArray(response) ? response : (response.data || [])
            const totalCount = Array.isArray(response) ? response.length : (response.total || 0)
            const pagesCount = Array.isArray(response) ? 1 : (response.pages || 1)

            if (pageToFetch === 1) {
                setPlayers(data)
                if (searchQuery === '' && pagesCount > 1) {
                    setTimeout(() => syncRemainingPages(2, pagesCount, ''), 1000)
                }
                if (searchQuery === '') {
                    setLastPlayersFetch(Date.now())
                }
            } else {
                setPlayers(prev => [...prev, ...data])
            }

            setPagination(prev => ({ ...prev, page: pageToFetch, total: totalCount, totalPages: pagesCount, search: searchQuery }))

            if (selectedPlayer) {
                const found = data.find((x: any) => getPlayerKey(x) === getPlayerKey(selectedPlayer))
                if (found) setSelectedPlayer(found)
            }
        } catch {
            // ignore
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.search, lastPlayersFetch, sendNui, setPlayers, setLastPlayersFetch, setPagination, getPlayerKey, syncRemainingPages, setSelectedPlayer])


    const refreshPlayers = useCallback(() => fetchPlayers(pagination.page, search, true), [fetchPlayers, pagination.page, search])

    const { on, off } = useNui()

    useEffect(() => {
        const handleVitals = (data: any) => {
            setPlayers(prev => prev.map(p => {
                if (String(p.id) === String(data.id)) {
                    return { ...p, health: data.health, armor: data.armor, metadata: data.metadata }
                }
                return p
            }))

            setSelectedPlayer((prev: Player | null) => {
                if (prev && String(prev.id) === String(data.id)) {
                    return { ...prev, health: data.health, armor: data.armor, metadata: data.metadata }
                }
                return prev
            })
        }

        const handleMoneyUpdate = (data: any) => {
            setPlayers(prev => prev.map(p => {
                if (String(p.id) === String(data.id)) {
                    return { ...p, money: data.money }
                }
                return p
            }))

            setSelectedPlayer((prev: Player | null) => {
                if (prev && getPlayerKey(prev) === getPlayerKey(data)) {
                    return { ...prev, money: data.money }
                }
                return prev
            })
        }

        on('RefreshPlayers', refreshPlayers)
        on('UpdatePlayerVitals', handleVitals)
        on('UpdatePlayerMoney', handleMoneyUpdate)
        return () => {
            off('RefreshPlayers', refreshPlayers)
            off('UpdatePlayerVitals', handleVitals)
            off('UpdatePlayerMoney', handleMoneyUpdate)
        }
    }, [on, off, refreshPlayers, setPlayers, setSelectedPlayer, getPlayerKey])

    useEffect(() => {
        if (selectedPlayer) {
            const found = players.find(p => getPlayerKey(p) === getPlayerKey(selectedPlayer))
            if (found) {
                if (found.health !== selectedPlayer.health ||
                    found.armor !== selectedPlayer.armor ||
                    JSON.stringify(found.metadata) !== JSON.stringify(selectedPlayer.metadata) ||
                    JSON.stringify(found.money) !== JSON.stringify(selectedPlayer.money)) {
                    setSelectedPlayer(found)
                }
            }
        }
    }, [players, selectedPlayer, setSelectedPlayer, getPlayerKey])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPlayers(1, search)
        }, 500)
        return () => clearTimeout(timer)
    }, [search, fetchPlayers])


    const loadVipData = useCallback(async () => {
        try {
            const { MOCK_VIP, MOCK_VIP_RANKS } = await import('@/utils/mockData')
            const [vipData, rankData] = await Promise.all([
                sendNui<any[]>('getVipPlayers', {}, MOCK_VIP),
                sendNui<any[]>('getVipRanks', {}, MOCK_VIP_RANKS),
            ])
            if (Array.isArray(vipData)) {
                const rankLookup: Record<string, { label: string; color: string }> = {}
                if (Array.isArray(rankData)) {
                    rankData.forEach((r: any) => { rankLookup[r.id] = { label: r.label, color: r.color } })
                }
                const ids = new Set<string>()
                const map: Record<string, { label: string; color: string }> = {}
                vipData.forEach((p: any) => {
                    if (p.citizenid) {
                        ids.add(p.citizenid)
                        if (p.rankId && rankLookup[p.rankId]) {
                            map[p.citizenid] = rankLookup[p.rankId]
                        }
                    }
                })
                setVipCitizenIds(ids)
                setVipRankMap(map)
            }
        } catch { /* silently ignore */ }
    }, [sendNui])

    const handleFilterChange = useCallback(async (f: 'all' | 'online' | 'offline' | 'banned' | 'vip') => {
        setFilterGroup(f)
        if (f === 'vip' && vipCitizenIds.size === 0) {
            loadVipData()
        }
    }, [vipCitizenIds.size, loadVipData])

    useEffect(() => { loadVipData() }, [loadVipData])

    const filteredPlayers = useMemo(() => {
        return players.filter((p: Player) => {
            const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search)
            const matchesGroup = filterGroup === 'all'
                || (filterGroup === 'online' && p.online)
                || (filterGroup === 'offline' && !p.online)
                || (filterGroup === 'banned' && !!p.ban)
                || (filterGroup === 'vip' && vipCitizenIds.has(p.citizenid || ''))
            return matchesSearch && matchesGroup
        })
    }, [players, search, filterGroup, vipCitizenIds])

    useEffect(() => {
        if (viewMode === 'list' && !selectedPlayer && filteredPlayers.length > 0) {
            setSelectedPlayer(filteredPlayers[0])
        }
    }, [viewMode, filteredPlayers, selectedPlayer, setSelectedPlayer])


    const SyncFooter = () => {
        if (!loading && !isSyncing) return null
        return (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-2">
                {loading ? (
                    <div className="bg-background/80 p-3 rounded-full shadow-2xl border border-border/50 animate-in fade-in zoom-in duration-300 pointer-events-none">
                        <MriSpinner size="lg" />
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-xs bg-card/90 px-5 py-2.5 rounded-full shadow-2xl border border-primary/30 text-primary font-medium animate-pulse animate-in slide-in-from-bottom-4 duration-500">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('loading_more')}</span>
                        <span className="bg-primary/10 px-2 py-0.5 rounded text-[10px] font-bold">
                            {players.length} / {pagination.total}
                        </span>
                    </div>
                )}
            </div>
        )
    }

    async function sendAction(action: string | any, selectedData: Record<string, any> = {}, targetPlayer: any = null) {
        if (isProcessingAction) return
        const p = targetPlayer || selectedPlayer
        if (!p) return

        setIsProcessingAction(true)
        const payload = { ...selectedData }

        if (p) {
            if (!payload.cid && p.cid) payload.cid = { value: p.cid }
            if (!payload.license && p.license) payload.license = { value: p.license }
            if (!payload.discord && p.discord) payload.discord = { value: p.discord }
            if (!payload.name && p.name) payload.name = { value: p.name }
        }

        if (action === 'view_screen') {
            setViewingScreenPlayer(p)
            setIsProcessingAction(false)
            return
        }

        if (!payload.Player && !payload.cid && !payload.Plate && !payload.VehiclePlate) {
            payload.Player = { value: p.id }
        } else if (!payload.Player && p.id) {
            payload.Player = { value: p.id }
        }

        const isVerify = action === 'verifyPlayer' || (typeof action === 'object' && action.event === 'mri_Qadmin:server:verifyPlayer')

        if (isVerify) {
            const newMeta = { ...(p.metadata || {}) }
            newMeta.verified = !newMeta.verified
            if (newMeta.verified) newMeta.verified_by = t('common.you')
            else delete newMeta.verified_by
            const updated = { ...p, metadata: newMeta }

            if (selectedPlayer && String(selectedPlayer.id) === String(p.id)) setSelectedPlayer(updated)
            setPlayers(prev => prev.map(x => String(x.id) === String(updated.id) ? updated : x))
        }

        try {
            await sendNui('clickButton', { data: action, selectedData: payload })
            if (isVerify) await refreshPlayers()
        } catch (err: unknown) {
            console.error('sendAction error', err)
        } finally {
            setIsProcessingAction(false)
        }
    }

    const isSelected = (p: any) => {
        if (!selectedPlayer) return false
        return getPlayerKey(selectedPlayer) === getPlayerKey(p)
    }

    if (loading && players.length === 0) return <PlayersSkeleton />

    return (
        <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
            <MriPageHeader title={t('player.management')} icon={Users} count={pagination.total} countLabel={t('player.total')}>
                <div className="flex items-center bg-card border border-border rounded-lg p-1 gap-1">
                    <MriButton
                        size="icon"
                        variant="ghost"
                        className={cn("h-8 w-8 rounded", viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </MriButton>
                    <MriButton
                        size="icon"
                        variant="ghost"
                        className={cn("h-8 w-8 rounded", viewMode === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => setViewMode('list')}
                    >
                        <List className="w-4 h-4" />
                    </MriButton>
                </div>

                <div className="flex items-center bg-card border border-border rounded-lg p-1 gap-1 text-xs font-medium">
                    {(['all', 'online', 'offline', 'banned', 'vip'] as const).filter(f => f !== 'vip' || qboxEnabled).map(f => (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={cn(
                                "px-3 py-1.5 rounded transition-all capitalize",
                                filterGroup === f
                                    ? f === 'banned'
                                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                        : f === 'vip'
                                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                            : "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f === 'all' ? t('filter.all')
                                : f === 'online' ? t('filter.online')
                                    : f === 'offline' ? t('filter.offline')
                                        : f === 'vip' ? t('filter.vip')
                                            : t('filter.banned')}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <MriExpandableSearch
                        placeholder={t('filter.placeholder')}
                        value={search}
                        onChange={setSearch}
                    />
                </div>

                <MriButton
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => refreshPlayers()}
                    disabled={loading}
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </MriButton>

            </MriPageHeader>

            <div className="flex-1 overflow-hidden relative">
                {/* GRID VIEW */}
                {viewMode === 'grid' && !selectedPlayer && (
                    <div className="h-full flex flex-col relative">
                        <div className="flex-1 min-h-0 pt-4 p-2">
                            <VirtuosoGrid
                                style={{ height: '100%' }}
                                data={filteredPlayers}
                                listClassName="grid grid-cols-4 gap-4"
                                itemContent={(index: number, p: Player) => (
                                    <PlayerGridCard key={getPlayerKey(p)} player={p} vipRank={vipRankMap[p.citizenid || '']} onClick={setSelectedPlayer} onAction={sendAction} />
                                )}
                            />
                        </div>
                    </div>
                )}

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="h-full flex">
                        <div className="w-96 flex flex-col border-r border-border bg-card/10 h-full relative">
                            <div className="pt-4 p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('player.list_all')} ({pagination.total})</div>
                            <div className="flex-1 min-h-0 pt-1">
                                <Virtuoso
                                    style={{ height: '100%' }}
                                    data={filteredPlayers}
                                    itemContent={(index: number, p: Player) => (
                                        <PlayerListItem
                                            key={getPlayerKey(p)}
                                            player={p}
                                            vipRank={vipRankMap[p.citizenid || '']}
                                            isSelected={isSelected(p)}
                                            onClick={(p) => setSelectedPlayer(p)}
                                            onAction={sendAction}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                )}


                {/* PLAYER DETAILS PANEL */}
                {selectedPlayer && (
                    <div className={cn(
                        "absolute top-0 bottom-0 right-0 flex flex-col overflow-hidden bg-background z-10",
                        viewMode === 'list' ? "left-96" : "left-0"
                    )}>
                        <div className="p-2 border-b border-border flex items-start gap-6 bg-card/5">
                            {viewMode === 'grid' && (
                                <MriButton size="icon" variant="ghost" className="h-full" onClick={() => setSelectedPlayer(null)}>
                                    <ChevronLeft className="w-5 h-5" />
                                </MriButton>
                            )}
                            <div className="w-24 h-24 rounded-2xl bg-muted border border-border flex items-center justify-center relative shadow-xl">
                                <User className="w-10 h-10 text-primary" />
                                <div className={cn("absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background", selectedPlayer.online ? "bg-primary" : "bg-red-500")}>
                                    {selectedPlayer.online && (
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 pt-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-bold tracking-tight text-foreground">{selectedPlayer.name}</h2>
                                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                                        {/* Alive/Dead Status */}
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap",
                                            (selectedPlayer.health || 0) <= 101 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
                                        )}>
                                            {((selectedPlayer.health || 0) <= 101 || selectedPlayer.metadata?.isdead) ? t('vitals.status.dead') : t('vitals.status.alive')}
                                        </span>

                                        {/* Verified/Suspect Status */}
                                        {selectedPlayer.metadata?.verified ? (
                                            <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded border border-border font-bold uppercase tracking-wider whitespace-nowrap">
                                                {t('player.status.verified')}
                                            </span>
                                        ) : (
                                            <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-wider whitespace-nowrap">
                                                {t('player.status.suspect')}
                                            </span>
                                        )}

                                        {/* VIP Status */}
                                        {(() => {
                                            const vipRank = vipRankMap[selectedPlayer.citizenid || '']
                                            if (!vipRank) return null
                                            return (
                                                <span
                                                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider whitespace-nowrap"
                                                    style={{ color: vipRank.color, borderColor: vipRank.color + '55', background: vipRank.color + '18' }}
                                                >
                                                    <Crown className="w-3 h-3" />
                                                    {vipRank.label}
                                                </span>
                                            )
                                        })()}

                                        {/* Ban Status */}
                                        {selectedPlayer.ban && (
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap",
                                                selectedPlayer.ban.isPermanent
                                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                            )}>
                                                {selectedPlayer.ban.isPermanent ? t('status.ban.permanent') : t('status.ban.temporary')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 text-muted-foreground text-sm mb-2 flex-col">
                                    <div className="flex gap-2">
                                        {selectedPlayer.id && <span className="bg-muted/50 border border-border px-2 py-0.5 rounded font-mono text-xs text-foreground">{t('player.id')}: {selectedPlayer.id}</span>}
                                        {selectedPlayer.online && <span className="bg-muted/50 border border-border px-2 py-0.5 rounded font-mono text-xs text-muted-foreground">{t('player.ping')}: {selectedPlayer.ping || 0}ms</span>}
                                        {selectedPlayer.online && <span className="bg-muted/50 border border-border px-2 py-0.5 rounded font-mono text-xs text-muted-foreground">{t('player.bucket')}: {selectedPlayer.bucket}</span>}
                                    </div>
                                    {selectedPlayer.ban && (
                                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/5 border border-red-500/20 text-xs flex-wrap">
                                            <Ban className="w-3 h-3 text-red-500 shrink-0" />
                                            <span className="text-muted-foreground">{t('player.actions.ban.reason')}: <span className="text-foreground font-medium">{selectedPlayer.ban.reason}</span></span>
                                            <span className="text-border">•</span>
                                            <span className="text-muted-foreground">{t('player.actions.ban.expire')}: <span className="text-foreground font-medium">{selectedPlayer.ban.isPermanent ? t('player.actions.ban.permanent') : formatDate(selectedPlayer.ban.expire, t)}</span></span>
                                            <span className="text-border">•</span>
                                            <span className="text-muted-foreground">{t('player.actions.ban.banned_by')}: <span className="text-foreground font-medium">{selectedPlayer.ban.bannedby}</span></span>
                                            {canDo('qadmin.action.unban_player') && (
                                                <button
                                                    onClick={() => sendAction({ event: 'mri_Qadmin:server:unban_cid', type: 'server', perms: 'qadmin.action.unban_player' }, { cid: { value: selectedPlayer.cid } })}
                                                    className="ml-auto text-[10px] px-2 py-0.5 rounded border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 font-bold uppercase tracking-wider transition-colors"
                                                >
                                                    {t('player.actions.unban')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <MriButton onClick={() => refreshPlayers()} disabled={loading} variant="outline" className={cn("border-border bg-transparent hover:bg-muted text-foreground gap-2", loading && "opacity-70 pointer-events-none")}>
                                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> {t('common.refresh')}
                                </MriButton>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-8">
                            {selectedPlayer.online && (
                                <section>
                                    <MriSectionHeader icon={Heart} title={t('vitals.section_title')} />
                                    <MriPlayerVitals
                                        vitals={{
                                            health: selectedPlayer.health || 0,
                                            armor: selectedPlayer.armor || 0,
                                            ping: selectedPlayer.ping,
                                            metadata: selectedPlayer.metadata || {}
                                        }}
                                        size="full"
                                        onAction={(vital: any, label: string, val: number) => {
                                            if (canDo('qadmin.action.set_vital')) {
                                                setVitalAdjustModal({ vital, label, value: val })
                                            }
                                        }}
                                        onIconClick={(vital: string) => {
                                            if (selectedPlayer) {
                                                const permNode = vital === 'health' ? 'qadmin.action.revive' : 'qadmin.action.set_vital';
                                                if (!canDo(permNode)) return;

                                                let resetVal = 100;
                                                if (vital === 'health') resetVal = 200; // QBCore health standard
                                                sendNui('mri_Qadmin:server:SetVital', {
                                                    targetId: selectedPlayer.id,
                                                    vital: vital,
                                                    value: resetVal
                                                })

                                                // Optimistic update
                                                const newPlayer = { ...selectedPlayer };
                                                if (vital === 'health') newPlayer.health = resetVal;
                                                if (vital === 'armor') newPlayer.armor = resetVal;

                                                newPlayer.metadata = {
                                                    ...(newPlayer.metadata || {}),
                                                    [vital]: resetVal
                                                };

                                                newPlayer.vitals = {
                                                    ...(newPlayer.vitals || { health: 0, armor: 0, hunger: 0, thirst: 0, stress: 0 }),
                                                    [vital]: resetVal
                                                };

                                                setSelectedPlayer(newPlayer);
                                            }
                                        }}
                                        labels={{
                                            health: t('vitals.health'),
                                            armor: t('vitals.armor'),
                                            hunger: t('vitals.hunger'),
                                            thirst: t('vitals.thirst'),
                                            stress: t('vitals.stress')
                                        }}
                                    />
                                </section>
                            )}

                            <section className="space-y-4">
                                <MriSectionHeader icon={User} title={t('player.info.title')} />
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Identity Card */}
                                    <div className="bg-card border border-border p-4 rounded-xl space-y-3 shadow-sm">
                                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                            <div className="p-1.5 rounded bg-primary/10 text-primary">
                                                <Fingerprint className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('player.info.identity')}</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('player.info.name')}</span>
                                                <span className="font-medium">{selectedPlayer.charinfo?.firstname} {selectedPlayer.charinfo?.lastname}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('player.info.char_id')}</span>
                                                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 rounded">{selectedPlayer.charinfo?.cid || selectedPlayer.cid || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('player.info.citizen_id')}</span>
                                                <span className="font-mono text-xs bg-muted px-1.5 rounded">{selectedPlayer.citizenid || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('player.info.birthdate')}</span>
                                                <span>{selectedPlayer.charinfo?.birthdate || selectedPlayer.birthdate || (selectedPlayer as any).dob || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('player.info.gender')}</span>
                                                <span>{selectedPlayer.charinfo?.gender === 0 ? t('player.info.male') : t('player.info.female')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('player.info.nationality')}</span>
                                                <span>{selectedPlayer.charinfo?.nationality || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact & Misc Card */}
                                    <div className="bg-card border border-border p-4 rounded-xl space-y-3 shadow-sm">
                                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                            <div className="p-1.5 rounded bg-primary/10 text-primary">
                                                <Contact className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('player.info.contact')}</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('player.info.phone')}</span>
                                                <span className="font-mono">{selectedPlayer.charinfo?.phone || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('player.info.account')}</span>
                                                <span className="font-mono text-xs truncate max-w-[120px]">{selectedPlayer.charinfo?.account || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/30">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">{t('player.info.position')}</span>
                                                    <span className="font-mono text-[10px] text-primary/80">
                                                        {selectedPlayer.metadata?.position
                                                            ? `${selectedPlayer.metadata.position.x.toFixed(1)}, ${selectedPlayer.metadata.position.y.toFixed(1)}, ${selectedPlayer.metadata.position.z.toFixed(1)}`
                                                            : 'N/A'
                                                        }
                                                    </span>
                                                </div>
                                                <button
                                                    className="p-2 rounded-md hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                                                    disabled={!selectedPlayer.metadata?.position}
                                                    onClick={() => {
                                                        const p = selectedPlayer.metadata?.position;
                                                        if (p) {
                                                            const text = `vector4(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}, ${p.heading.toFixed(2)})`;
                                                            copy(text);
                                                        }
                                                    }}
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <MriSectionHeader icon={Ban} title={t('actions.quick_title')} />
                                <div className="grid grid-cols-6 gap-3">
                                    {canDo('qadmin.action.verify_player') && <MriGridActionButton icon={Check} label={`${t('player.actions.verify')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:verifyPlayer', type: 'server', perms: 'qadmin.action.verify_player' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.revive') && <MriGridActionButton icon={Heart} label={`${t('player.actions.revive')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:Revive', type: 'server', perms: 'qadmin.action.revive' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.kill_player') && <MriGridActionButton icon={Skull} label={`${t('player.actions.kill')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:KillPlayer', type: 'server', perms: 'qadmin.action.kill_player' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.clothing_menu') && <MriGridActionButton icon={User} label={`${t('player.actions.clothing')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:ClothingMenu', type: 'server', perms: 'qadmin.action.clothing_menu' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.toggle_cuffs') && <MriGridActionButton icon={Lock} label={`${t('player.actions.cuffs')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:CuffPlayer', type: 'server', perms: 'qadmin.action.toggle_cuffs' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.drunk_player') && <MriGridActionButton icon={Waves} label={t('actions.drunk_player')} onClick={() => sendAction({ event: 'mri_Qadmin:server:DrunkPlayer', type: 'server', perms: 'qadmin.action.drunk_player' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.remove_stress') && <MriGridActionButton icon={Activity} label={t('actions.remove_stress')} onClick={() => sendAction({ event: 'mri_Qadmin:server:RemoveStress', type: 'server', perms: 'qadmin.action.remove_stress' })} disabled={!selectedPlayer.online} />}
                                </div>
                            </section>

                            <section>
                                <MriSectionHeader icon={Eye} title={t('player.sections.moderation')} />
                                <div className="grid grid-cols-6 gap-3">
                                    {canDo('qadmin.action.spectate_player') && <MriGridActionButton icon={Eye} label={`${t('player.actions.spectate')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:SpectateTarget', type: 'server', perms: 'qadmin.action.spectate_player' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.freeze_player') && <MriGridActionButton icon={Lock} label={`${t('player.actions.freeze')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:FreezePlayer', type: 'server', perms: 'qadmin.action.freeze_player' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.mute_player') && <MriGridActionButton icon={VolumeX} label={t('player.actions.mute')} onClick={() => sendAction({ event: 'mri_Qadmin:client:MutePlayer', type: 'client', perms: 'qadmin.action.mute_player' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.warn_player') && <MriGridActionButton icon={AlertTriangle} label={`${t('player.actions.warn')} `} variant="warning" onClick={() => setShowWarnModal(true)} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.kick_player') && <MriGridActionButton icon={LogOut} label={`${t('player.actions.kick')} `} onClick={() => setShowKickModal(true)} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.ban_player') && <MriGridActionButton icon={Ban} label={`${t('player.actions.ban.title')} `} variant="destructive" onClick={() => setShowBanModal(true)} />}
                                </div>
                            </section>

                            <section>
                                <MriSectionHeader icon={Crosshair} title={t('player.sections.teleportation')} />
                                <div className="grid grid-cols-6 gap-3">
                                    {canDo('qadmin.action.teleport_to_player') && <MriGridActionButton icon={Crosshair} label={`${t('player.actions.goto')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:TeleportToPlayer', type: 'server', perms: 'qadmin.action.teleport_to_player' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.bring_player') && <MriGridActionButton icon={Download} label={`${t('player.actions.bring')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:BringPlayer', type: 'server', perms: 'qadmin.action.bring_player' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.teleport_back') && <MriGridActionButton icon={Undo} label={`${t('player.actions.send_back')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:SendPlayerBack', type: 'server', perms: 'qadmin.action.teleport_back' })} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.set_bucket') && <MriGridActionButton icon={Navigation} label={`${t('player.actions.bucket.title')} `} onClick={() => setShowBucketModal(true)} disabled={!selectedPlayer.online} />}
                                    {canDo('qadmin.action.track_player') && (
                                        <MriGridActionButton icon={MapIcon} label={t('actions.track_player')} onClick={() => setShowMapModal(true)} disabled={!selectedPlayer.online} />
                                    )}
                                </div>
                            </section>

                            <section>
                                <MriSectionHeader icon={Wallet} title={t('player.sections.economy')} />
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    {Array.isArray(selectedPlayer.money) ? (
                                        selectedPlayer.money
                                            .slice() // Create a copy to sort
                                            .sort((a: any, b: any) => {
                                                const order = ['cash', 'bank', 'crypto', 'bitcoin', 'black_money'];
                                                const indexA = order.indexOf(a.name);
                                                const indexB = order.indexOf(b.name);

                                                // Both are known types, sort by index
                                                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                                // Only A is known, it comes first
                                                if (indexA !== -1) return -1;
                                                // Only B is known, it comes first
                                                if (indexB !== -1) return 1;
                                                // Both unknown, sort alphabetically
                                                return String(a.name).localeCompare(String(b.name));
                                            })
                                            .map((m: any, idx: number) => {
                                                if (!m || typeof m !== 'object') return null;

                                                const mName = String(m.name || 'unknown');
                                                const mAmount = m.amount || 0;

                                                let color = "text-muted-foreground";
                                                if (mName === 'cash') color = "text-green-500";
                                                else if (mName === 'bank') color = "text-blue-500";
                                                else if (mName === 'crypto' || mName === 'bitcoin') color = "text-yellow-500";
                                                else if (mName === 'black_money') color = "text-red-500";

                                                const isCurrency = ['cash', 'bank', 'black_money'].includes(mName);
                                                const labelKey = `option_${mName} `;
                                                const translated = t(labelKey);
                                                const label = translated !== labelKey ? translated : mName;

                                                const displayAmount = isCurrency
                                                    ? `$${Number(mAmount).toLocaleString()} `
                                                    : Number(mAmount).toLocaleString();

                                                return (
                                                    <MriEconomyCard
                                                        key={`${mName} -${idx} `}
                                                        label={String(label).charAt(0).toUpperCase() + String(label).slice(1)}
                                                        amount={displayAmount}
                                                        amountColorClass={color}
                                                        defaultVisible={false}
                                                        disableAdd={!canDo('qadmin.action.give_money')}
                                                        disableRemove={!canDo('qadmin.action.remove_money')}
                                                        onAdd={() => { setIsGivingMoney(true); setInitialMoneyType(mName as any); setShowMoneyModal(true); }}
                                                        onRemove={() => { setIsGivingMoney(false); setInitialMoneyType(mName as any); setShowMoneyModal(true); }}
                                                    />
                                                )
                                            })
                                    ) : (
                                        // Fallback for transition period or errors
                                        <>
                                            <MriEconomyCard
                                                label={t('option_cash')}
                                                amount={`$${(selectedPlayer.cash || 0).toLocaleString()} `}
                                                amountColorClass="text-green-500"
                                                defaultVisible={false}
                                                disableAdd={!canDo('qadmin.action.give_money')}
                                                disableRemove={!canDo('qadmin.action.remove_money')}
                                                onAdd={() => { setIsGivingMoney(true); setInitialMoneyType('cash'); setShowMoneyModal(true); }}
                                                onRemove={() => { setIsGivingMoney(false); setInitialMoneyType('cash'); setShowMoneyModal(true); }}
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-sm font-medium">{t('labels.job_label')}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">{selectedPlayer.job.label}</span>
                                            <span className="text-foreground font-semibold">{selectedPlayer.job.grade.name}</span>
                                            <span className="text-xs text-muted-foreground">({selectedPlayer.job.grade.level})</span>
                                            <div className="flex items-center bg-background/50 border border-border rounded-md overflow-hidden ml-2">
                                                {canDo('qadmin.action.set_job') && (
                                                    <MriButton variant="ghost" size="icon" className="h-7 w-7 border-r border-border rounded-none hover:bg-primary/10" onClick={() => { setGroupType('job'); setShowGroupModal(true); }}>
                                                        <UserCog className="w-3.5 h-3.5 text-primary" />
                                                    </MriButton>
                                                )}
                                                {canDo('qadmin.action.set_job') && (
                                                    <MriButton variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-none" onClick={() => setShowDismissConfirm('job')}>
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                    </MriButton>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-sm font-medium">{t('labels.gang_label')}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">{selectedPlayer.gang.label}</span>
                                            <span className="text-foreground font-semibold">{selectedPlayer.gang.grade.name}</span>
                                            <span className="text-xs text-muted-foreground">({selectedPlayer.gang.grade.level})</span>
                                            <div className="flex items-center bg-background/50 border border-border rounded-md overflow-hidden ml-2">
                                                {canDo('qadmin.action.set_gang') && (
                                                    <MriButton variant="ghost" size="icon" className="h-7 w-7 border-r border-border rounded-none hover:bg-primary/10" onClick={() => { setGroupType('gang'); setShowGroupModal(true); }}>
                                                        <UserCog className="w-3.5 h-3.5 text-primary" />
                                                    </MriButton>
                                                )}
                                                {canDo('qadmin.action.set_gang') && (
                                                    <MriButton variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-none" onClick={() => setShowDismissConfirm('gang')}>
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                    </MriButton>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* VIP card */}
                                    {qboxEnabled && (() => {
                                        const vipRank = vipRankMap[selectedPlayer.citizenid || '']
                                        return (
                                            <div
                                                className="bg-card border border-border p-3 rounded-lg flex items-center justify-between"
                                                style={vipRank ? { borderColor: vipRank.color + '55' } : undefined}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Crown className="w-4 h-4" style={{ color: vipRank?.color ?? 'var(--muted-foreground)' }} />
                                                    <span className="text-sm font-medium">VIP</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {vipRank ? (
                                                        <span
                                                            className="text-[11px] font-bold px-2 py-0.5 rounded border"
                                                            style={{ color: vipRank.color, borderColor: vipRank.color + '55', background: vipRank.color + '18' }}
                                                        >
                                                            {vipRank.label}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">{t('vip.rank.no_rank')}</span>
                                                    )}
                                                    {canDo('qadmin.action.manage_vip') && (
                                                        <div className="flex items-center bg-background/50 border border-border rounded-md overflow-hidden ml-1">
                                                            <MriButton
                                                                variant="ghost" size="icon"
                                                                className="h-7 w-7 border-r border-border rounded-none hover:bg-primary/10"
                                                                onClick={() => setShowSetVipModal(true)}
                                                            >
                                                                <UserCog className="w-3.5 h-3.5 text-primary" />
                                                            </MriButton>
                                                            {vipRank && (
                                                                <MriButton
                                                                    variant="ghost" size="icon"
                                                                    className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-none"
                                                                    onClick={async () => {
                                                                        await sendNui('removeVipPlayer', { citizenid: selectedPlayer.citizenid })
                                                                        setVipRankMap(prev => { const n = { ...prev }; delete n[selectedPlayer.citizenid || '']; return n })
                                                                        setVipCitizenIds(prev => { const n = new Set(prev); n.delete(selectedPlayer.citizenid || ''); return n })
                                                                    }}
                                                                >
                                                                    <UserMinus className="w-3.5 h-3.5" />
                                                                </MriButton>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            </section>

                            <section>
                                <MriSectionHeader icon={Car} title={t('player.vehicles_label')} />
                                {selectedPlayer.vehicles && selectedPlayer.vehicles.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-3">
                                        {selectedPlayer.vehicles.map((v: any, i: number) => (
                                            <PlayerVehicleCard
                                                key={i}
                                                vehicle={v}
                                                onSpawn={canDo('qadmin.action.spawn_vehicle') ? (plate) => sendAction({ event: 'mri_Qadmin:client:SpawnPersonalVehicle', type: 'client', perms: 'qadmin.action.spawn_vehicle' }, { VehiclePlate: { value: plate } }) : undefined}
                                                onOpenTrunk={canDo('qadmin.action.open_inventory') ? (plate) => setShowInventoryViewer({ show: true, target: { id: plate, type: 'trunk' } }) : undefined}
                                                onOpenGlovebox={canDo('qadmin.action.open_inventory') ? (plate) => setShowInventoryViewer({ show: true, target: { id: plate, type: 'glovebox' } }) : undefined}
                                                onDelete={canDo('qadmin.action.delete_vehicle') ? (plate) => { setPendingDeletePlate(plate); setShowDeleteVehicleConfirm(true); } : undefined}
                                                onChangePlate={canDo('qadmin.action.change_plate') ? (_, newPlate) => sendAction({ event: 'mri_Qadmin:client:ChangePlate', type: 'client', perms: 'qadmin.action.change_plate' }, { Plate: { value: newPlate } }) : undefined}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground italic bg-card/50 p-4 rounded-lg border border-dashed border-border">
                                        {t('player.labels.no_personal_vehicles')}
                                    </div>
                                )}
                            </section>

                            <section>
                                <MriSectionHeader icon={ExternalLink} title={t('player.sections.inventory')} />
                                <div className="grid grid-cols-4 gap-3">
                                    {canDo('qadmin.action.open_inventory') && <MriButton onClick={() => sendAction({ event: 'mri_Qadmin:client:openInventory', type: 'client', perms: 'qadmin.action.open_inventory' })} disabled={!selectedPlayer.online} className={cn("h-12 bg-card border border-border hover:bg-muted justify-start gap-4 text-foreground/80", !selectedPlayer.online && "opacity-50 pointer-events-none grayscale cursor-not-allowed")}>
                                        <div className="p-1.5 rounded bg-muted text-primary"><ExternalLink className="w-4 h-4" /></div>
                                        {t('player.inventory.open')}
                                    </MriButton>}
                                    {canDo('qadmin.action.open_inventory') && <MriButton onClick={() => setShowInventoryViewer({ show: true, target: { id: selectedPlayer.id, name: selectedPlayer.name, type: 'player' } })} disabled={!selectedPlayer.online} className={cn("h-12 bg-card border border-border hover:bg-muted justify-start gap-4 text-foreground/80", !selectedPlayer.online && "opacity-50 pointer-events-none grayscale cursor-not-allowed")}>
                                        <div className="p-1.5 rounded bg-muted text-primary"><ShoppingBag className="w-4 h-4" /></div>
                                        {t('player.inventory.view')}
                                    </MriButton>}
                                    {canDo('qadmin.action.give_item') && <MriButton onClick={() => setShowGiveItemModal(true)} disabled={!selectedPlayer.online} className={cn("h-12 bg-card border border-border hover:bg-muted justify-start gap-4 text-foreground/80", !selectedPlayer.online && "opacity-50 pointer-events-none grayscale cursor-not-allowed")}>
                                        <div className="p-1.5 rounded bg-muted text-primary"><Gift className="w-4 h-4" /></div>
                                        {t('player.inventory.give_item')}
                                    </MriButton>}
                                    {canDo('qadmin.action.clear_inventory') && <MriButton onClick={() => setShowClearInventoryConfirm(true)} disabled={!selectedPlayer.online} className={cn("h-12 bg-card border border-border hover:bg-red-900/10 border-red-900/30 hover:border-red-500/50 justify-start gap-4 text-red-400", !selectedPlayer.online && "opacity-50 pointer-events-none grayscale cursor-not-allowed")}>
                                        <div className="p-1.5 rounded bg-red-900/30 text-red-500"><Trash2 className="w-4 h-4" /></div>
                                        {t('player.inventory.clear')}
                                    </MriButton>}
                                    {canDo('qadmin.action.open_stash') && <MriButton onClick={() => setShowOpenStashModal(true)} className="h-12 bg-card border border-border hover:bg-muted justify-start gap-4 text-foreground/80">
                                        <div className="p-1.5 rounded bg-muted text-primary"><Archive className="w-4 h-4" /></div>
                                        {t('player.inventory.open_stash')}
                                    </MriButton>}
                                </div>
                            </section>

                            {!selectedPlayer.online && (
                                <section>
                                    <MriSectionHeader icon={Skull} title={t('player.sections.offline_actions')} />
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        {canDo('qadmin.action.delete_character') && <MriGridActionButton icon={Trash2} label={`${t('player.actions.delete_character')} `} variant="destructive" onClick={() => sendAction({ event: 'mri_Qadmin:server:delete_cid', type: 'server', perms: 'qadmin.action.delete_character' }, { cid: { value: selectedPlayer.cid } })} />}
                                        {canDo('qadmin.action.unban_player') && <MriGridActionButton icon={Ban} label={`${t('player.actions.unban')} `} onClick={() => sendAction({ event: 'mri_Qadmin:server:unban_cid', type: 'server', perms: 'qadmin.action.unban_player' }, { cid: { value: selectedPlayer.cid } })} />}
                                    </div>
                                </section>
                            )}

                            {canDo('qadmin.action.view_player_identifiers') && (
                                <div className="p-4 border-t border-border bg-card/20 text-xs text-mono text-muted-foreground mt-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-muted-foreground font-bold tracking-wider uppercase text-[10px]">{t('player.labels.connection_info')}</span>
                                        <span className="font-mono">{t('player.labels.last_logout')}: {formatDate(selectedPlayer.last_loggedout, t)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                        <div className="flex justify-between border-b border-border/50 pb-1">
                                            <span>{t('player.labels.steam_id')}</span>
                                            <span className="text-muted-foreground">{selectedPlayer.steam || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/50 pb-1">
                                            <span>{t('player.labels.ip_address')}</span>
                                            <span className="text-muted-foreground">{selectedPlayer.ip || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/50 pb-1">
                                            <span>{t('player.labels.fivem_license')}</span>
                                            <span className="text-muted-foreground truncate max-w-[200px]">{selectedPlayer.fivem || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/50 pb-1">
                                            <span>{t('player.labels.discord_id')}</span>
                                            <span className="text-muted-foreground">{selectedPlayer.discord || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/50 pb-1">
                                            <span>{t('player.labels.license')}</span>
                                            <span className="text-muted-foreground">{selectedPlayer.license || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/50 pb-1">
                                            <span>{t('player.labels.license2')}</span>
                                            <span className="text-muted-foreground">{selectedPlayer.license2 || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Modals */}
                {showMoneyModal && selectedPlayer && (
                    <MoneyModal
                        isGiving={isGivingMoney}
                        defaultType={initialMoneyType}
                        availableTypes={
                            Array.isArray(selectedPlayer.money)
                                ? selectedPlayer.money.map((m: any) => {
                                    const labelRaw = t(`option_${m.name} `) !== `option_${m.name} ` ? t(`option_${m.name} `) : m.name;
                                    return {
                                        label: labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1),
                                        value: m.name
                                    };
                                })
                                : []
                        }
                        onClose={() => setShowMoneyModal(false)}
                        onSubmit={(type, amount) => {
                            sendAction({ event: isGivingMoney ? 'mri_Qadmin:server:GiveMoney' : 'mri_Qadmin:server:TakeMoney', type: 'server', perms: isGivingMoney ? 'qadmin.action.give_money' : 'qadmin.action.remove_money' }, {
                                Type: { value: type },
                                Amount: { value: amount }
                            })
                            setShowMoneyModal(false)
                        }}
                    />
                )}

                {showGiveItemModal && selectedPlayer && (
                    <GiveItemModal
                        initialPlayerId={String(selectedPlayer.id)}
                        disablePlayerSelect={true}
                        onClose={() => setShowGiveItemModal(false)}
                        onSubmit={(targetId, item, amount) => {
                            sendAction({ event: 'mri_Qadmin:server:GiveItem', type: 'server', perms: 'qadmin.action.give_item' }, {
                                Player: { value: targetId },
                                Item: { value: item },
                                Amount: { value: amount }
                            })
                            setShowGiveItemModal(false)
                        }}
                    />
                )}

                {showWarnModal && selectedPlayer && (
                    <ConfirmAction text={t('confirm_warn').replace('%s', selectedPlayer.name)} onCancel={() => setShowWarnModal(false)} onConfirm={() => {
                        sendAction({ event: 'mri_Qadmin:server:WarnPlayer', type: 'server', perms: 'qadmin.action.warn_player' }, { Reason: { value: 'Staff warning' } })
                        setShowWarnModal(false)
                    }} />
                )}

                {showKickModal && selectedPlayer && (
                    <ConfirmAction text={t('confirm_kick').replace('%s', selectedPlayer.name)} onCancel={() => setShowKickModal(false)} onConfirm={() => {
                        sendAction({ event: 'mri_Qadmin:server:KickPlayer', type: 'server', perms: 'qadmin.action.kick_player' }, { Reason: { value: 'Staff kick' } })
                        setShowKickModal(false)
                    }} />
                )}

                {showBanModal && selectedPlayer && (
                    <BanModal onClose={() => setShowBanModal(false)} onSubmit={(duration, reason) => {
                        sendAction({ event: 'mri_Qadmin:server:BanPlayer', type: 'server', perms: 'qadmin.action.ban_player' }, { Duration: { value: duration }, Reason: { value: reason } })
                        setShowBanModal(false)
                    }} />
                )}

                {showBucketModal && selectedPlayer && (
                    <BucketModal onClose={() => setShowBucketModal(false)} onSubmit={(bucket) => {
                        sendAction({ event: 'mri_Qadmin:server:SetBucket', type: 'server', perms: 'qadmin.action.set_bucket' }, { Bucket: { value: String(bucket) } })
                        setShowBucketModal(false)
                    }} />
                )}

                {showOpenStashModal && (
                    <MriActionModal
                        title={t('player.inventory.open_stash')}
                        icon={Archive}
                        onClose={() => { setShowOpenStashModal(false); setStashInput('') }}
                        onConfirm={() => {
                            if (!stashInput.trim()) return
                            sendAction({ event: 'mri_Qadmin:client:openStash', type: 'client', perms: 'qadmin.action.open_stash' }, { Stash: { value: stashInput.trim() } })
                            setShowOpenStashModal(false)
                            setStashInput('')
                        }}
                    >
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                {t('player.inventory.stash_id')}
                            </label>
                            <MriInput
                                value={stashInput}
                                onChange={(e) => setStashInput((e.target as HTMLInputElement).value)}
                                placeholder="ex: police_stash_1"
                                className="bg-background border-border h-10"
                                onKeyDown={(e) => { if (e.key === 'Enter' && stashInput.trim()) { sendAction({ event: 'mri_Qadmin:client:openStash', type: 'client' }, { Stash: { value: stashInput.trim() } }); setShowOpenStashModal(false); setStashInput('') } }}
                            />
                        </div>
                    </MriActionModal>
                )}

                {showMapModal && selectedPlayer && (
                    <MapModal
                        isOpen={showMapModal}
                        onClose={() => setShowMapModal(false)}
                        trackedPlayerId={String(selectedPlayer.id)}
                        initialName={selectedPlayer.name}
                    />
                )}

                {showGroupModal && selectedPlayer && (
                    <ChangeGroupModal
                        type={groupType}
                        defaultGroup={groupType === 'job' ? selectedPlayer.job?.name : selectedPlayer.gang?.name}
                        defaultGrade={groupType === 'job'
                            ? (typeof selectedPlayer.job?.grade === 'object' ? selectedPlayer.job.grade.level : Number(selectedPlayer.job?.grade || 0))
                            : (typeof selectedPlayer.gang?.grade === 'object' ? selectedPlayer.gang.grade.level : Number(selectedPlayer.gang?.grade || 0))
                        }
                        onClose={() => setShowGroupModal(false)}
                        onSubmit={(group, grade) => {
                            const eventName = groupType === 'job' ? 'mri_Qadmin:server:SetJob' : 'mri_Qadmin:server:SetGang'
                            const fieldName = groupType === 'job' ? 'Job' : 'Gang'
                            const permNode = groupType === 'job' ? 'qadmin.action.set_job' : 'qadmin.action.set_gang'
                            sendAction({ event: eventName, type: 'server', perms: permNode }, { [fieldName]: { value: group }, Grade: { value: grade } })
                            setShowGroupModal(false)
                        }} />
                )}

                {showDeleteVehicleConfirm && pendingDeletePlate && (
                    <ConfirmAction text={t('confirm_delete_vehicle').replace('%s', pendingDeletePlate)} onCancel={() => { setShowDeleteVehicleConfirm(false); setPendingDeletePlate(null); }} onConfirm={async () => {
                        if (selectedPlayer && selectedPlayer.vehicles) {
                            const updated = {
                                ...selectedPlayer,
                                vehicles: selectedPlayer.vehicles.filter((v: any) => v.plate !== pendingDeletePlate)
                            }
                            setSelectedPlayer(updated)
                            setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
                        }

                        await sendAction({ event: 'mri_Qadmin:server:DeleteVehicleByPlate', type: 'server', perms: 'qadmin.action.delete_vehicle' }, { Plate: { value: pendingDeletePlate } })
                        setShowDeleteVehicleConfirm(false)
                        setPendingDeletePlate(null)
                        setTimeout(() => refreshPlayers(), 500)
                    }} />
                )}

                {showClearInventoryConfirm && selectedPlayer && (
                    <ConfirmAction
                        text={t('confirm_clear_inventory').replace('%s', selectedPlayer.name)}
                        onCancel={() => setShowClearInventoryConfirm(false)}
                        onConfirm={() => {
                            sendAction({ event: 'mri_Qadmin:server:ClearInventory', type: 'server', perms: 'qadmin.action.clear_inventory' });
                            setShowClearInventoryConfirm(false);
                        }}
                    />
                )}

                {showDismissConfirm && selectedPlayer && (
                    <ConfirmAction
                        text={showDismissConfirm === 'job'
                            ? t('confirm_fire_job', [selectedPlayer.name, selectedPlayer.job.label])
                            : t('confirm_fire_gang', [selectedPlayer.name, selectedPlayer.gang.label])
                        }
                        onCancel={() => setShowDismissConfirm(null)}
                        onConfirm={() => {
                            if (showDismissConfirm === 'job') {
                                sendAction({ event: 'mri_Qadmin:server:SetJob', type: 'server', perms: 'qadmin.action.set_job' }, { Job: { value: 'unemployed' }, Grade: { value: 0 } })
                            } else {
                                sendAction({ event: 'mri_Qadmin:server:SetGang', type: 'server', perms: 'qadmin.action.set_gang' }, { Gang: { value: 'none' }, Grade: { value: 0 } })
                            }
                            setShowDismissConfirm(null)
                            setTimeout(() => refreshPlayers(), 500)
                        }}
                    />
                )}

                <MriVitalAdjustModal
                    {...{
                        isOpen: !!vitalAdjustModal,
                        hideBlur: true,
                        hideOverlay: true,
                        onClose: () => setVitalAdjustModal(null),
                        onSubmit: (val: number) => {
                            if (selectedPlayer && vitalAdjustModal) {
                                let serverVal = val;
                                if (vitalAdjustModal.vital === 'health') {
                                    serverVal = Math.round(val + 100);
                                }
                                sendNui('mri_Qadmin:server:SetVital', {
                                    targetId: selectedPlayer.id,
                                    vital: vitalAdjustModal.vital,
                                    value: serverVal
                                })
                                // Optimistic update
                                const vital = vitalAdjustModal.vital;
                                const newPlayer = { ...selectedPlayer };
                                if (vital === 'health') newPlayer.health = serverVal;
                                if (vital === 'armor') newPlayer.armor = serverVal;

                                newPlayer.metadata = {
                                    ...(newPlayer.metadata || {}),
                                    [vital]: serverVal
                                };

                                newPlayer.vitals = {
                                    ...(newPlayer.vitals || { health: 0, armor: 0, hunger: 0, thirst: 0, stress: 0 }),
                                    [vital]: serverVal
                                };

                                setSelectedPlayer(newPlayer);
                                setVitalAdjustModal(null)
                            }
                        },
                        vital: (vitalAdjustModal?.vital || 'health') as any,
                        currentValue: vitalAdjustModal?.value || 0,
                        playerName: selectedPlayer?.name || '',
                        labels: {
                            health: t('vitals.health'),
                            armor: t('vitals.armor'),
                            hunger: t('vitals.hunger'),
                            thirst: t('vitals.thirst'),
                            stress: t('vitals.stress'),
                            newValue: t('common.new_value'),
                            confirm: t('confirm'),
                            cancel: t('cancel')
                        }
                    } as any}
                />

                <ScreenModal
                    playerId={viewingScreenPlayer?.id}
                    playerName={viewingScreenPlayer?.name}
                    onClose={() => setViewingScreenPlayer(null)}
                />

                {showInventoryViewer?.show && (
                    <InventoryViewerModal
                        target={showInventoryViewer.target}
                        onClose={() => setShowInventoryViewer(null)}
                    />
                )}

                {showSetVipModal && selectedPlayer && (
                    <SetVipModal
                        playerName={selectedPlayer.name}
                        citizenid={selectedPlayer.citizenid || ''}
                        source={selectedPlayer.id}
                        onClose={() => setShowSetVipModal(false)}
                        onSubmit={async ({ rankId, expiration, salary, salaryType, inventoryLimit }) => {
                            setShowSetVipModal(false)
                            const alreadyVip = !!vipRankMap[selectedPlayer.citizenid || '']
                            const event = alreadyVip ? 'updateVipPlayer' : 'addVipPlayer'
                            await sendNui(event, {
                                method: 'citizenid',
                                citizenid: selectedPlayer.citizenid,
                                rankId,
                                expiration,
                                salary,
                                salaryType,
                                inventoryLimit,
                            })
                            loadVipData()
                        }}
                    />
                )}

                <SyncFooter />
            </div>
        </div >
    )
}
