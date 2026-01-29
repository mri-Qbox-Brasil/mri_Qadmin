import { useEffect, useState } from 'react'
import { useI18n } from '@/context/I18n'
import Spinner from '@/components/Spinner'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriInput, MriPageHeader } from '@mriqbox/ui-kit'
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso'
import PlayersSkeleton from '@/components/skeletons/PlayersSkeleton'

import { useAppState } from '@/context/AppState'
import ConfirmAction from '@/components/players/ConfirmAction'
import MoneyModal from '@/components/players/MoneyModal'
import GiveItemModal from '@/components/players/GiveItemModal'
import ChangeGroupModal from '@/components/players/ChangeGroupModal'
import BanModal from '@/components/players/BanModal'
import BucketModal from '@/components/players/BucketModal'
import {
    Search,
    User,
    Wallet,
    Ban,
    Trash2,
    Heart,
    Skull,
    Car,
    AlertTriangle,
    Eye,
    Crosshair,
    Download,
    Undo,
    Lock,
    LogOut,
    ExternalLink,
    Gift,
    LayoutGrid,
    List,
    ChevronLeft,
    Users,
    RefreshCw,
    Check,
    Navigation,
    RotateCcw,
    UserMinus,
    UserCog,
    Beef,
    GlassWater,
    Shield,
    Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_PLAYERS } from '@/utils/mockData'

/* Atomic Components */
import SectionHeader from '@/components/shared/SectionHeader'
import GridActionButton from '@/components/shared/GridActionButton'
import EconomyCard from '@/components/shared/EconomyCard'
import PlayerGridCard from '@/components/players/PlayerGridCard'
import PlayerListItem from '@/components/players/PlayerListItem'
import PlayerVehicleCard from '@/components/players/PlayerVehicleCard'

// Helper to format unix timestamp or date string (kept for header usage mostly)
const formatDate = (val: any, t: any) => {
  if (!val) return t('unknown')
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
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export default function Players() {
  const [loading, setLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('mri_qadmin_view_mode')
    return (saved === 'list' || saved === 'grid') ? saved : 'grid'
  })

  useEffect(() => {
    localStorage.setItem('mri_qadmin_view_mode', viewMode)
  }, [viewMode])
  /* Removed legacy local filtering state */

  const { sendNui } = useNui()
  const { players, setPlayers, selectedPlayer, setSelectedPlayer, pagination, setPagination, lastPlayersFetch, setLastPlayersFetch } = useAppState()
  const { t } = useI18n()

  /* Modals State */
  const [showBanModal, setShowBanModal] = useState(false)
  const [showKickModal, setShowKickModal] = useState(false)
  const [showWarnModal, setShowWarnModal] = useState(false)
  const [showMoneyModal, setShowMoneyModal] = useState(false)
  const [showBucketModal, setShowBucketModal] = useState(false)
  const [isGivingMoney, setIsGivingMoney] = useState(true)
  const [initialMoneyType, setInitialMoneyType] = useState<'cash'|'bank'|'crypto'>('cash')
  const [showGiveItemModal, setShowGiveItemModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupType, setGroupType] = useState<'job' | 'gang'>('job')
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  /* Confirmations State */
  const [showDeleteVehicleConfirm, setShowDeleteVehicleConfirm] = useState(false)
  const [pendingDeletePlate, setPendingDeletePlate] = useState<string | null>(null)
  const [showClearInventoryConfirm, setShowClearInventoryConfirm] = useState(false)
  const [showDismissConfirm, setShowDismissConfirm] = useState<'job' | 'gang' | null>(null)
  const [showVitalConfirm, setShowVitalConfirm] = useState<{ vital: string; label: string; value: number } | null>(null)

  interface Player {
    id: string | number
    cid?: string
    license?: string
    name: string
    job: { label: string; grade: { name: string; level: number } }
    gang: { label: string; grade: { name: string; level: number } }
    cash: number
    bank: number
    crypto: number
    vehicles?: any[] // Assuming vehicles is an array of any for now
    online: boolean
    ping?: number
    bucket?: number
    health?: number
    armor?: number
    last_loggedout?: number | string
    metadata?: {
      verified?: boolean
      hunger?: number
      thirst?: number
      stress?: number
      isdead?: boolean
    }
  }

  // Background Sync Logic
  const syncRemainingPages = async (startPage: number, totalPages: number, currentSearch: string) => {
      if (startPage > totalPages || currentSearch !== '') {
          setIsSyncing(false)
          return
      }

      setIsSyncing(true)

      // Fetch next chunk
      try {
          // Check if search changed during sync, if so abort
          // (We can't easily check 'search' state here without ref, so we pass currentSearch and rely on effect cleanup or check)
          // Ideally we use a Ref for search to check current value.

          // Simple Abort Check using Ref from closure scope if we had it, or just rely on currentSearch arg being passed down
          // But 'fetchPlayers' updates 'abortSyncRef', let's use that.
          if (abortSyncRef.current) {
               setIsSyncing(false)
               return
          }

          const limit = 300
          const payload = { page: startPage, limit: limit, search: currentSearch }
          const mock: any = { data: MOCK_PLAYERS.slice(0, limit), total: MOCK_PLAYERS.length, pages: Math.ceil(MOCK_PLAYERS.length / limit) }

          // Small delay to not freeze UI completely and allow render
          await new Promise(r => setTimeout(r, 200))
           if (abortSyncRef.current) { setIsSyncing(false); return; }

          const response = await sendNui('getPlayers', payload, mock)
          const data = Array.isArray(response) ? response : (response.data || [])

          if (data && data.length > 0) {
              setPlayers(prev => [...prev, ...data])
              // Continue sync
              syncRemainingPages(startPage + 1, totalPages, currentSearch)
          } else {
              setIsSyncing(false)
          }

      } catch (e) {
          console.error("Sync error", e)
          setIsSyncing(false)
      }
  }

  // Ref to track if we should continue syncing (to abort on search)
  const abortSyncRef = useState({ current: false })[0]

  const fetchPlayers = async (pageToFetch = 1, searchQuery = '', forceRefresh = false) => {
    // If searching, abort any running sync
    if (searchQuery !== '') {
        abortSyncRef.current = true
    } else {
        abortSyncRef.current = false
    }

    // Cache Check
    if (pageToFetch === 1 && searchQuery === '' && !forceRefresh) {
        const now = Date.now()
        // 60 seconds cache
        if (now - lastPlayersFetch < 60000 && players.length > 0) {
             // Cache hit, don't fetch
             // But ensure we start sync if we haven't finished?
             // Actually, if we have cache, assume we rely on what is in state.
             // If local state is big, we are good.
             return
        }
    }

    setLoading(true)
    try {
      const limit = 300
      const mock: any = { data: MOCK_PLAYERS.slice(0, limit), total: MOCK_PLAYERS.length, pages: Math.ceil(MOCK_PLAYERS.length / limit) }

      const payload = {
          page: pageToFetch,
          limit: limit,
          search: searchQuery
      }

      const response = await sendNui('getPlayers', payload, mock)
      const data = Array.isArray(response) ? response : (response.data || [])
      const total = Array.isArray(response) ? response.length : (response.total || 0)
      const pages = Array.isArray(response) ? 1 : (response.pages || 1)

      if (pageToFetch === 1) {
          setPlayers(data)
          // If clearing search or initial load, start background sync for rest
          if (searchQuery === '' && pages > 1) {
              // Start sync from Page 2
              setTimeout(() => syncRemainingPages(2, pages, ''), 1000)
          }
          if (searchQuery === '') {
             setLastPlayersFetch(Date.now())
          }
      } else {
        // Legacy manual page handling
        setPlayers(prev => [...prev, ...data])
      }

      setPagination(prev => ({ ...prev, page: pageToFetch, total, totalPages: pages, search: searchQuery }))

      if (selectedPlayer) {
          const found = data.find((x: any) => String(x.id) === String(selectedPlayer.id))
          if (found) setSelectedPlayer(found)
      }

    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchPlayers(1, search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Initial load handled by search effect (search='')
  // But we need to handle pagination changes not triggering this effect if we put fetch in search only?
  // We can separate them.

  const { on, off } = useNui()
  useEffect(() => {
    const handleVitals = (data: any) => {
        console.log('[DEBUG] Vitals received:', data)
        setPlayers(prev => prev.map(p => {
            if (String(p.id) === String(data.id)) {
                return { ...p, health: data.health, armor: data.armor, metadata: data.metadata }
            }
            return p
        }))

        setSelectedPlayer((prev: any) => {
            if (prev && String(prev.id) === String(data.id)) {
                console.log('[DEBUG] Updating selected player directly')
                return { ...prev, health: data.health, armor: data.armor, metadata: data.metadata }
            }
            return prev
        })
    }

    on('RefreshPlayers', refreshPlayers)
    on('UpdatePlayerVitals', handleVitals)
    return () => {
        off('RefreshPlayers', refreshPlayers)
        off('UpdatePlayerVitals', handleVitals)
    }
  }, [pagination.page, search])

  // Sync selected player when list updates
  useEffect(() => {
      if (selectedPlayer) {
          const found = players.find(p => String(p.id) === String(selectedPlayer.id))
          if (found) {
              // Only update if something changed to avoid infinity loops
              if (found.health !== selectedPlayer.health ||
                  found.armor !== selectedPlayer.armor ||
                  JSON.stringify(found.metadata) !== JSON.stringify(selectedPlayer.metadata)) {
                  setSelectedPlayer(found)
              }
          }
      }
  }, [players, selectedPlayer, setSelectedPlayer])

  const handlePageChange = (newPage: number) => {
      fetchPlayers(newPage, search)
  }

  const refreshPlayers = () => fetchPlayers(pagination.page, search, true)

  async function sendAction(action: string, selectedData: Record<string, any> = {}, targetPlayer: any = null) {
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

    if (!payload.Player && !payload.cid && !payload.Plate && !payload.VehiclePlate) {
      payload.Player = { value: p.id }
    } else if (!payload.Player && p.id) {
         payload.Player = { value: p.id }
    }

    if (action === 'verifyPlayer') {
        const newMeta = { ...(p.metadata || {}) }
        newMeta.verified = !newMeta.verified
        if (newMeta.verified) newMeta.verified_by = t('you')
        else delete newMeta.verified_by
        const updated = { ...p, metadata: newMeta }

        if (selectedPlayer && selectedPlayer.id === p.id) setSelectedPlayer(updated)
        // Update local list optimistic
        setPlayers(prev => prev.map(x => x.id === updated.id ? updated : x))
    }

    try {
      await sendNui('clickButton', { data: action, selectedData: payload })
      if (action === 'verifyPlayer') await refreshPlayers()
    } catch (e) {
      console.error('sendAction error', e)
    } finally {
      setIsProcessingAction(false)
    }
  }

  const getPlayerKey = (p: any) => {
      if (!p) return t('unknown')
      if (p.license) return p.license
      if (p.citizenid) return p.citizenid
      return String(p.id)
  }

    const SyncFooter = () => {
       if (!loading && !isSyncing) return null
       return (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">
                {loading && <div className="bg-background p-2 rounded-full shadow-lg border border-border"><Spinner /></div>}
                {isSyncing && !loading && (
                    <div className="flex items-center gap-2 text-xs bg-card px-4 py-2 rounded-full shadow-lg border border-primary/20 text-primary animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin"/>
                        {t('loading_more')} ({players.length}/{pagination.total})
                    </div>
                )}
            </div>
       )
    }

  const isSelected = (p: any) => {
      if (!selectedPlayer) return false
      return getPlayerKey(selectedPlayer) === getPlayerKey(p)
  }

  if (loading && players.length === 0) return <PlayersSkeleton />

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
        <MriPageHeader title={t('player_management')} icon={Users} count={pagination.total} countLabel={t('total_players')}>
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

             <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <MriInput
                    placeholder={t('search_by_name_id_or_license')}
                    className="pl-9 bg-card border-border focus:border-primary/50 h-10 w-full"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
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
                     <div className="flex-1 min-h-0 p-4">
                         <VirtuosoGrid
                            style={{ height: '100%' }}
                            data={players}
                            listClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
                            itemContent={(index, p) => (
                                <div className="pb-2">
                                    <PlayerGridCard key={getPlayerKey(p)} player={p} onClick={setSelectedPlayer} onAction={sendAction} />
                                </div>
                            )}
                         />
                     </div>
                     <SyncFooter />
                 </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="h-full flex">
                    <div className="w-96 flex flex-col border-r border-border bg-card/10 h-full relative">
                     <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('all_players')} ({pagination.total})</div>
                     <div className="flex-1 min-h-0 pt-1">
                             <Virtuoso
                                style={{ height: '100%' }}
                                data={players}
                                itemContent={(index, player) => (
                                    <PlayerListItem
                                        key={getPlayerKey(player)}
                                        player={player}
                                        isSelected={isSelected(player)}
                                        onClick={setSelectedPlayer}
                                        onAction={sendAction}
                                    />
                                )}
                             />
                         </div>
                         <SyncFooter />
                    </div>
                </div>
            )}


            {/* DETAILS OVERLAY */}
            {selectedPlayer && (
                 <div className={cn(
                     "bg-background flex flex-col overflow-hidden transition-all duration-300",
                     viewMode === 'list' ? "absolute inset-0 left-96 z-10" : "absolute inset-0 z-20"
                 )}>
                     {viewMode === 'grid' && (
                         <div className="p-4 border-b border-border flex items-center">
                             <MriButton variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => setSelectedPlayer(null)}>
                                 <ChevronLeft className="w-5 h-5" /> {t('back_to_grid')}
                             </MriButton>
                         </div>
                     )}

                    <div className="p-6 border-b border-border flex items-start gap-6 bg-card/5">
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
                                <div className="flex items-center gap-2 pt-1">
                                    {/* Alive/Dead Status */}
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap",
                                        selectedPlayer.health <= 101 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
                                    )}>
                                        {(selectedPlayer.health <= 101 || selectedPlayer.metadata?.isdead) ? t('vitals_status_dead') : t('vitals_status_alive')}
                                    </span>

                                    {/* Verified/Suspect Status */}
                                    {selectedPlayer.metadata?.verified ? (
                                        <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded border border-border font-bold uppercase tracking-wider whitespace-nowrap">
                                            {t('status_verified')}
                                        </span>
                                    ) : (
                                        <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-wider whitespace-nowrap">
                                            {t('status_suspect')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-4 text-muted-foreground text-sm mb-4 flex-col">
                                <div className="flex gap-2">
                                    {selectedPlayer.id && <span className="bg-muted/50 border border-border px-2 py-0.5 rounded font-mono text-xs text-foreground">{t('id')}: {selectedPlayer.id}</span>}
                                    {selectedPlayer.online && <span className="bg-muted/50 border border-border px-2 py-0.5 rounded font-mono text-xs text-muted-foreground">{t('ping')}: {selectedPlayer.ping || 0}ms</span>}
                                    {selectedPlayer.online && <span className="bg-muted/50 border border-border px-2 py-0.5 rounded font-mono text-xs text-muted-foreground">{t('bucket')}: {selectedPlayer.bucket}</span>}
                                </div>
                                {selectedPlayer.online && (
                                    <div className="flex gap-3">
                                        <div className="flex items-center gap-1 text-xs" title={t('vitals_health')}>
                                            <Heart className="w-3.5 h-3.5 text-red-500" />
                                            <span>{Math.round((selectedPlayer.health / 200) * 100)}%</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs" title={t('vitals_armor')}>
                                            <Shield className="w-3.5 h-3.5 text-blue-500" />
                                            <span>{Math.round(selectedPlayer.armor)}%</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs" title={t('vitals_hunger')}>
                                            <Beef className="w-3.5 h-3.5 text-orange-500" />
                                            <span>{Math.round(selectedPlayer.metadata?.hunger || 0)}%</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs" title={t('vitals_thirst')}>
                                            <GlassWater className="w-3.5 h-3.5 text-cyan-500" />
                                            <span>{Math.round(selectedPlayer.metadata?.thirst || 0)}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <MriButton onClick={() => refreshPlayers()} disabled={loading} variant="outline" className={cn("border-border bg-transparent hover:bg-muted text-foreground gap-2", loading && "opacity-70 pointer-events-none")}>
                                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> {t('refresh')}
                             </MriButton>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {selectedPlayer.online && (
                            <section>
                                <SectionHeader icon={Heart} title={t('vitals_section_title')} />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {/* Health */}
                                    <div
                                        className="space-y-2 lg:col-span-1 p-3 rounded-xl bg-card border border-border/50 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] transition-all cursor-pointer select-none group/vital"
                                        onClick={() => setShowVitalConfirm({ vital: 'health', label: t('vitals_health'), value: 200 })}
                                    >
                                        <div className="flex justify-between items-center text-xs font-medium">
                                            <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-red-500" /> {t('vitals_health')}</span>
                                            <div className="flex items-center gap-2">
                                                <span>{Math.round((selectedPlayer.health / 200) * 100)}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                            <div
                                                className="h-full bg-red-500 transition-all duration-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                                                style={{ width: `${Math.min(100, (selectedPlayer.health / 200) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Armor */}
                                    <div
                                        className="space-y-2 lg:col-span-1 p-3 rounded-xl bg-card border border-border/50 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all cursor-pointer select-none group/vital"
                                        onClick={() => setShowVitalConfirm({ vital: 'armor', label: t('vitals_armor'), value: 0 })}
                                    >
                                        <div className="flex justify-between items-center text-xs font-medium">
                                            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-500" /> {t('vitals_armor')}</span>
                                            <div className="flex items-center gap-2">
                                                <span>{Math.round(selectedPlayer.armor)}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                                                style={{ width: `${Math.min(100, selectedPlayer.armor)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Hunger */}
                                    <div
                                        className="space-y-2 lg:col-span-1 p-3 rounded-xl bg-card border border-border/50 hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all cursor-pointer select-none group/vital"
                                        onClick={() => setShowVitalConfirm({ vital: 'hunger', label: t('vitals_hunger'), value: 100 })}
                                    >
                                        <div className="flex justify-between items-center text-xs font-medium">
                                            <span className="flex items-center gap-1.5"><Beef className="w-3.5 h-3.5 text-orange-500" /> {t('vitals_hunger')}</span>
                                            <div className="flex items-center gap-2">
                                                <span>{Math.round(selectedPlayer.metadata?.hunger || 0)}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                            <div
                                                className="h-full bg-orange-500 transition-all duration-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                                                style={{ width: `${Math.min(100, selectedPlayer.metadata?.hunger || 0)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Thirst */}
                                    <div
                                        className="space-y-2 lg:col-span-1 p-3 rounded-xl bg-card border border-border/50 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all cursor-pointer select-none group/vital"
                                        onClick={() => setShowVitalConfirm({ vital: 'thirst', label: t('vitals_thirst'), value: 100 })}
                                    >
                                        <div className="flex justify-between items-center text-xs font-medium">
                                            <span className="flex items-center gap-1.5"><GlassWater className="w-3.5 h-3.5 text-cyan-500" /> {t('vitals_thirst')}</span>
                                            <div className="flex items-center gap-2">
                                                <span>{Math.round(selectedPlayer.metadata?.thirst || 0)}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                            <div
                                                className="h-full bg-cyan-500 transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                                                style={{ width: `${Math.min(100, selectedPlayer.metadata?.thirst || 0)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stress */}
                                    <div
                                        className="space-y-2 lg:col-span-1 p-3 rounded-xl bg-card border border-border/50 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all cursor-pointer select-none group/vital"
                                        onClick={() => setShowVitalConfirm({ vital: 'stress', label: t('vitals_stress'), value: 0 })}
                                    >
                                        <div className="flex justify-between items-center text-xs font-medium">
                                            <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-purple-500" /> {t('vitals_stress')}</span>
                                            <div className="flex items-center gap-2">
                                                <span>{Math.round(selectedPlayer.metadata?.stress || 0)}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                            <div
                                                className="h-full bg-purple-500 transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                                                style={{ width: `${Math.min(100, selectedPlayer.metadata?.stress || 0)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <section>
                            <SectionHeader icon={Ban} title={t('actions_quick')} />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                <GridActionButton icon={Check} label={`${t('verify')}`} onClick={() => sendAction('verifyPlayer')} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={Heart} label={`${t('revive')}`} onClick={() => sendAction('revivePlayer')} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={Skull} label={`${t('kill')}`} onClick={() => sendAction('kill_player')} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={User} label={`${t('clothing')}`} onClick={() => sendAction('clothingMenu')} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={Lock} label={`${t('toggle_cuffs')}`} onClick={() => sendAction('toggle_cuffs')} disabled={!selectedPlayer.online} />
                            </div>
                        </section>

                        <section>
                            <SectionHeader icon={Eye} title={t('moderation_section')} />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                <GridActionButton icon={Eye} label={`${t('spectate')}`} onClick={() => sendAction('spectate_player')} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={Lock} label={`${t('toggle_freeze')}`} onClick={() => sendAction('freeze_player')} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={AlertTriangle} label={`${t('warn')}`} variant="warning" onClick={() => setShowWarnModal(true)} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={LogOut} label={`${t('kick')}`} onClick={() => setShowKickModal(true)} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={Ban} label={`${t('ban')}`} variant="destructive" onClick={() => setShowBanModal(true)} />
                            </div>
                        </section>

                         <section>
                            <SectionHeader icon={Crosshair} title={t('teleportation_section')} />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                <GridActionButton icon={Crosshair} label={`${t('go_to')}`} onClick={() => sendAction('teleportToPlayer')} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={Download} label={`${t('bring')}`} onClick={() => sendAction('bringPlayer')} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={Undo} label={`${t('send_back')}`} onClick={() => sendAction('sendPlayerBack')} disabled={!selectedPlayer.online} />
                                <GridActionButton icon={Navigation} label={`${t('set_bucket')}`} onClick={() => setShowBucketModal(true)} disabled={!selectedPlayer.online} />
                            </div>
                        </section>

                        <section>
                             <SectionHeader icon={Wallet} title={t('economy_groups')} />
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                 <EconomyCard
                                    label={t('option_cash')}
                                    amount={`$${(selectedPlayer.cash || 0).toLocaleString()}`}
                                    amountColorClass="text-green-500"
                                    onAdd={() => { setIsGivingMoney(true); setInitialMoneyType('cash'); setShowMoneyModal(true); }}
                                    onRemove={() => { setIsGivingMoney(false); setInitialMoneyType('cash'); setShowMoneyModal(true); }}
                                 />
                                 <EconomyCard
                                    label={t('option_bank')}
                                    amount={`$${(selectedPlayer.bank || 0).toLocaleString()}`}
                                    amountColorClass="text-blue-500"
                                    onAdd={() => { setIsGivingMoney(true); setInitialMoneyType('bank'); setShowMoneyModal(true); }}
                                    onRemove={() => { setIsGivingMoney(false); setInitialMoneyType('bank'); setShowMoneyModal(true); }}
                                 />
                                 <EconomyCard
                                    label={t('option_crypto')}
                                    amount={(selectedPlayer.crypto || 0).toLocaleString()}
                                    amountColorClass="text-yellow-500"
                                    onAdd={() => { setIsGivingMoney(true); setInitialMoneyType('crypto'); setShowMoneyModal(true); }}
                                    onRemove={() => { setIsGivingMoney(false); setInitialMoneyType('crypto'); setShowMoneyModal(true); }}
                                 />
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-sm font-medium">{t('job_label')}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-primary font-bold">{selectedPlayer.job.label}</span>
                                            <span className="text-xs text-muted-foreground">{selectedPlayer.job.grade.name} ({selectedPlayer.job.grade.level})</span>
                                            <div className="flex items-center bg-background/50 border border-border rounded-md overflow-hidden ml-2">
                                                <MriButton variant="ghost" size="icon" className="h-7 w-7 border-r border-border rounded-none hover:bg-primary/10" onClick={() => { setGroupType('job'); setShowGroupModal(true); }}>
                                                    <UserCog className="w-3.5 h-3.5 text-primary" />
                                                </MriButton>
                                                <MriButton variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-none" onClick={() => setShowDismissConfirm('job')}>
                                                    <UserMinus className="w-3.5 h-3.5" />
                                                </MriButton>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-sm font-medium">{t('gang_label')}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-primary font-bold">{selectedPlayer.gang.label}</span>
                                            <span className="text-xs text-muted-foreground">{selectedPlayer.gang.grade.name} ({selectedPlayer.gang.grade.level})</span>
                                            <div className="flex items-center bg-background/50 border border-border rounded-md overflow-hidden ml-2">
                                                <MriButton variant="ghost" size="icon" className="h-7 w-7 border-r border-border rounded-none hover:bg-primary/10" onClick={() => { setGroupType('gang'); setShowGroupModal(true); }}>
                                                    <UserCog className="w-3.5 h-3.5 text-primary" />
                                                </MriButton>
                                                <MriButton variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-none" onClick={() => setShowDismissConfirm('gang')}>
                                                    <UserMinus className="w-3.5 h-3.5" />
                                                </MriButton>
                                            </div>
                                        </div>
                                    </div>
                             </div>
                        </section>

                         <section>
                            <SectionHeader icon={Car} title={t('player_vehicles')} />
                            {selectedPlayer.vehicles && selectedPlayer.vehicles.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    {selectedPlayer.vehicles.map((v: any, i:number) => (
                                        <PlayerVehicleCard
                                            key={i}
                                            vehicle={v}
                                            onSpawn={(plate) => sendAction('spawnPersonalVehicle', { VehiclePlate: { value: plate } })}
                                            onOpenTrunk={(plate) => sendAction('open_trunk', { Plate: { value: plate } })}
                                            onDelete={(plate) => { setPendingDeletePlate(plate); setShowDeleteVehicleConfirm(true); }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground italic bg-card/50 p-4 rounded-lg border border-dashed border-border">
                                    {t('no_personal_vehicles_found')}
                                </div>
                            )}
                        </section>

                         <section>
                            <SectionHeader icon={ExternalLink} title={t('inventory_management')} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <MriButton onClick={() => sendAction('open_inventory')} disabled={!selectedPlayer.online} className={cn("h-12 bg-card border border-border hover:bg-muted justify-start gap-4 text-foreground/80", !selectedPlayer.online && "opacity-50 pointer-events-none grayscale cursor-not-allowed")}>
                                    <div className="p-1.5 rounded bg-muted text-primary"><ExternalLink className="w-4 h-4" /></div>
                                    {t('open_inventory')}
                                </MriButton>
                                <MriButton onClick={() => setShowGiveItemModal(true)} disabled={!selectedPlayer.online} className={cn("h-12 bg-card border border-border hover:bg-muted justify-start gap-4 text-foreground/80", !selectedPlayer.online && "opacity-50 pointer-events-none grayscale cursor-not-allowed")}>
                                    <div className="p-1.5 rounded bg-muted text-primary"><Gift className="w-4 h-4" /></div>
                                    {t('give_item_player')}
                                </MriButton>
                                <MriButton onClick={() => setShowClearInventoryConfirm(true)} disabled={!selectedPlayer.online} className={cn("h-12 bg-card border border-border hover:bg-red-900/10 border-red-900/30 hover:border-red-500/50 justify-start gap-4 text-red-400", !selectedPlayer.online && "opacity-50 pointer-events-none grayscale cursor-not-allowed")}>
                                    <div className="p-1.5 rounded bg-red-900/30 text-red-500"><Trash2 className="w-4 h-4" /></div>
                                    {t('clear_inventory')}
                                </MriButton>
                            </div>
                        </section>

                        {!selectedPlayer.online && (
                             <section>
                                <SectionHeader icon={Skull} title={t('offline_actions')} />
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                     <GridActionButton icon={Trash2} label={`${t('delete_character')}`} variant="destructive" onClick={() => sendAction('delete_cid', { cid: { value: selectedPlayer.cid } })} />
                                     <GridActionButton icon={Ban} label={`${t('unban')}`} onClick={() => sendAction('unban_cid', { cid: { value: selectedPlayer.cid } })} />
                                </div>
                            </section>
                        )}

                        <div className="p-4 border-t border-border bg-card/20 text-xs text-mono text-muted-foreground mt-auto">
                            <div className="flex items-center justify-between mb-2">
                                 <span className="text-muted-foreground font-bold tracking-wider">{t('connection_info')}</span>
                                 <span className="font-mono">{t('last_logout')}: {formatDate(selectedPlayer.last_loggedout, t)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                <div className="flex justify-between border-b border-border/50 pb-1">
                                    <span>{t('steam_id')}</span>
                                    <span className="text-muted-foreground">{selectedPlayer.steam || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-border/50 pb-1">
                                    <span>{t('ip_address')}</span>
                                    <span className="text-muted-foreground">{selectedPlayer.ip || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-border/50 pb-1">
                                    <span>{t('fivem_license')}</span>
                                    <span className="text-muted-foreground truncate max-w-[200px]">{selectedPlayer.fivem || 'N/A'}</span>
                                </div>
                                 <div className="flex justify-between border-b border-border/50 pb-1">
                                    <span>{t('discord_id')}</span>
                                    <span className="text-muted-foreground">{selectedPlayer.discord || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-border/50 pb-1">
                                    <span>{t('license')}</span>
                                    <span className="text-muted-foreground">{selectedPlayer.license || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-border/50 pb-1">
                                    <span>{t('license2')}</span>
                                    <span className="text-muted-foreground">{selectedPlayer.license2 || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                 </div>
            )}
        </div>

        {/* Modals */}
        {showMoneyModal && selectedPlayer && (
          <MoneyModal isGiving={isGivingMoney} defaultType={initialMoneyType} playerId={selectedPlayer.id} onClose={() => setShowMoneyModal(false)} onSubmit={(type, amount) => {
            sendAction(isGivingMoney ? 'give_money' : 'remove_money', { Type: { value: type }, Amount: { value: amount } })
            setShowMoneyModal(false)
          }} />
        )}

        {showGiveItemModal && selectedPlayer && (
          <GiveItemModal
            initialPlayerId={String(selectedPlayer.id)}
            disablePlayerSelect={true}
            onClose={() => setShowGiveItemModal(false)}
            onSubmit={(targetId, item, amount) => {
                sendAction('give_item_player', {
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
            sendAction('warn_player', { Reason: { value: 'Staff warning' } })
            setShowWarnModal(false)
          }} />
        )}

        {showKickModal && selectedPlayer && (
          <ConfirmAction text={t('confirm_kick').replace('%s', selectedPlayer.name)} onCancel={() => setShowKickModal(false)} onConfirm={() => {
            sendAction('kickPlayer', { Reason: { value: 'Staff kick' } })
            setShowKickModal(false)
          }} />
        )}

        {showBanModal && selectedPlayer && (
          <BanModal onClose={() => setShowBanModal(false)} onSubmit={(duration, reason) => {
            sendAction('banPlayer', { Duration: { value: duration }, Reason: { value: reason } })
            setShowBanModal(false)
          }} />
        )}

        {showBucketModal && selectedPlayer && (
          <BucketModal onClose={() => setShowBucketModal(false)} onSubmit={(bucket) => {
            sendAction('set_bucket', { Bucket: { value: bucket } })
            setShowBucketModal(false)
          }} />
        )}

        {showGroupModal && selectedPlayer && (
          <ChangeGroupModal
            type={groupType}
            playerId={selectedPlayer.id}
            defaultGroup={groupType === 'job' ? selectedPlayer.job?.name : selectedPlayer.gang?.name}
            defaultGrade={groupType === 'job'
                ? (typeof selectedPlayer.job?.grade === 'object' ? selectedPlayer.job.grade.level : selectedPlayer.job?.grade || 0)
                : (typeof selectedPlayer.gang?.grade === 'object' ? selectedPlayer.gang.grade.level : selectedPlayer.gang?.grade || 0)
            }
            onClose={() => setShowGroupModal(false)}
            onSubmit={(group, grade) => {
              const dataName = groupType === 'job' ? 'set_job' : 'set_gang'
              const fieldName = groupType === 'job' ? 'Job' : 'Gang'
              sendAction(dataName, { [fieldName]: { value: group }, Grade: { value: grade } })
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

            await sendAction('deletePersonalVehicle', { Plate: { value: pendingDeletePlate } })
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
                    sendAction('clear_inventory');
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
                        sendAction('fireJob', { Job: { value: 'unemployed' }, Grade: { value: 0 } })
                    } else {
                        sendAction('fireGang', { Gang: { value: 'none' }, Grade: { value: 0 } })
                    }
                    setShowDismissConfirm(null)
                    setTimeout(() => refreshPlayers(), 500)
                }}
            />
        )}

        {showVitalConfirm && (
            <ConfirmAction
                text={t('confirm_vital_action', [showVitalConfirm.label])}
                onConfirm={() => {
                    sendNui('mri_Qadmin:server:SetVital', { targetId: selectedPlayer?.id, vital: showVitalConfirm.vital, value: showVitalConfirm.value })
                    setShowVitalConfirm(null)
                }}
                onCancel={() => setShowVitalConfirm(null)}
            />
        )}
    </div>
  )
}
