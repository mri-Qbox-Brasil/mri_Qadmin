import { useEffect, useState } from 'react'
import { useI18n } from '@/context/I18n'
import Spinner from '@/components/Spinner'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriInput, MriPageHeader } from '@mriqbox/ui-kit'

import { useAppState } from '@/context/AppState'
import ConfirmAction from '@/components/players/ConfirmAction'
import MoneyModal from '@/components/players/MoneyModal'
import GiveItemModal from '@/components/players/GiveItemModal'
import ChangeGroupModal from '@/components/players/ChangeGroupModal'
import BanModal from '@/components/players/BanModal'
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
    Plus,
    Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_PLAYERS } from '@/utils/mockData'


// Helper to format unix timestamp or date string
const formatDate = (val: any) => {
  const { t } = useI18n()
  if (!val) return t('unknown')

  let date: Date
  // Check if it's a number (Unix timestamp)
  if (!isNaN(val) && !isNaN(parseFloat(val))) {
     const num = Number(val)
     // Heuristic: If num is small (e.g., < 100 billion), it's likely seconds.
     // Current timestamp in seconds is ~1.7 billion. In ms it's ~1.7 trillion.
     if (num < 100000000000) {
         date = new Date(num * 1000)
     } else {
         date = new Date(num)
     }
  } else {
      // Attempt to parse string date
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

// Sub-component for Grid Card
const PlayerGridCard = ({ player, onClick, onAction }: any) => {
  const { t } = useI18n()
  return (
  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4 cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden" onClick={(e) => { e.stopPropagation(); onClick(player); }}>
      <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-primary font-bold">
                  {player.name.substring(0,2).toUpperCase()}
              </div>
              <div>
                  <div className="font-bold text-base leading-none mb-1 text-foreground">{player.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {player.online ? `${t('id')}: ${player.id} • ${t('ping')}: ${player.ping || 0}ms` : `${t('offline')} • ${formatDate(player.last_loggedout)}`}
                  </div>
              </div>
          </div>
          <div className={cn("w-2 h-2 rounded-full relative", player.online ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-red-500")}>
            {player.online && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            )}
          </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-2">
           {player.metadata?.verified ? (
            <div className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded border border-border font-bold tracking-wider">{t('status_verified')}</div>

           ) : (
            <div className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded border border-red-500/10 font-bold tracking-wider">{t('status_suspect')}</div>
           )}

           <div className="flex items-center gap-1">
               <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20" onClick={(e) => { e.stopPropagation(); onAction('spectate_player', {}, player); }} disabled={!player.online}>
                  <Eye className="w-3.5 h-3.5" />
               </MriButton>
               <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20" onClick={(e) => { e.stopPropagation(); onAction('teleportToPlayer', {}, player); }} disabled={!player.online}>
                  <Crosshair className="w-3.5 h-3.5" />
               </MriButton>
           </div>
      </div>
  </div>
)
}

export default function Players() {
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('mri_qadmin_view_mode')
    return (saved === 'list' || saved === 'grid') ? saved : 'grid'
  })

  useEffect(() => {
    localStorage.setItem('mri_qadmin_view_mode', viewMode)
  }, [viewMode])
  const [playersOnline, setPlayersOnline] = useState<any[]>([])
  const [playersOffline, setPlayersOffline] = useState<any[]>([])

  const { sendNui } = useNui()
  const { players, setPlayers, selectedPlayer, setSelectedPlayer } = useAppState()
  const { t } = useI18n()

  const [showBanModal, setShowBanModal] = useState(false)
  const [showKickModal, setShowKickModal] = useState(false)
  const [showWarnModal, setShowWarnModal] = useState(false)
  const [showMoneyModal, setShowMoneyModal] = useState(false)
  const [isGivingMoney, setIsGivingMoney] = useState(true)
  const [initialMoneyType, setInitialMoneyType] = useState<'cash'|'bank'|'crypto'>('cash')
  const [showGiveItemModal, setShowGiveItemModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupType, setGroupType] = useState<'job' | 'gang'>('job')
  const [showDeleteVehicleConfirm, setShowDeleteVehicleConfirm] = useState(false)
  const [pendingDeletePlate, setPendingDeletePlate] = useState<string | null>(null)

  const fetchPlayers = async () => {
    setLoading(true)
    try {
      // Mock data for dev if needed, otherwise use empty array default
      const mock: any[] = MOCK_PLAYERS
      const players = await sendNui('getPlayers', {}, mock)
      const list = Array.isArray(players) ? players : mock
      setPlayersOnline(list.filter((p: any) => p.online))
      setPlayersOffline(list.filter((p: any) => !p.online))
      try { setPlayers(list) } catch {}

      // Fix: Update selected player with fresh data
      if (selectedPlayer) {
          const found = list.find((x: any) => String(x.id) === String(selectedPlayer.id))
          if (found) setSelectedPlayer(found)
      }

      const pending = (window as any).__ps_pendingPlayerId
      if (pending) {
        const found = list.find((x: any) => String(x.id) === String(pending))
        if (found) setSelectedPlayer(found)
        delete (window as any).__ps_pendingPlayerId
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [sendNui])

  const refreshPlayers = fetchPlayers

  async function sendAction(action: string, selectedData: Record<string, any> = {}, targetPlayer: any = null) {
    const p = targetPlayer || selectedPlayer
    if (!p) return
    const payload = { ...selectedData }
    // Auto-populate player identifiers if available
    if (p) {
        if (!payload.cid && p.cid) payload.cid = { value: p.cid }
        if (!payload.license && p.license) payload.license = { value: p.license }
        if (!payload.discord && p.discord) payload.discord = { value: p.discord }
        if (!payload.name && p.name) payload.name = { value: p.name }
    }

    // For legacy support or if specific ID action is needed
    if (!payload.Player && !payload.cid && !payload.Plate && !payload.VehiclePlate) {
      payload.Player = { value: p.id }
    } else if (!payload.Player && p.id) {
         payload.Player = { value: p.id }
    }

    // Optimistic verify
    if (action === 'verifyPlayer') {
        const newMeta = { ...(p.metadata || {}) }
        newMeta.verified = !newMeta.verified
        if (newMeta.verified) newMeta.verified_by = t('you')
        else delete newMeta.verified_by
        const updated = { ...p, metadata: newMeta }

        if (selectedPlayer && selectedPlayer.id === p.id) setSelectedPlayer(updated)

        setPlayersOnline(prev => prev.map(x => x.id === updated.id ? updated : x))
        setPlayersOffline(prev => prev.map(x => x.id === updated.id ? updated : x))
    }

    try {
      await sendNui('clickButton', { data: action, selectedData: payload })
      if (action === 'verifyPlayer') await refreshPlayers()
    } catch (e) {
      console.error('sendAction error', e)
    }
  }

  const filteredOnline = playersOnline.filter(p => matchesSearch(p, search))
  const filteredOffline = playersOffline.filter(p => matchesSearch(p, search))

  function matchesSearch(p: any, s: string) {
      const lower = s.toLowerCase()
      return (p.name || '').toLowerCase().includes(lower) ||
             String(p.id).includes(lower) ||
             (p.license || '').toLowerCase().includes(lower)
  }

  // Helper for Action Grid Items
  const ActionButton = ({ icon: Icon, label, onClick, variant = 'default', disabled = false }: any) => (
      <MriButton
        variant="secondary"
        className={cn("h-12 flex items-center justify-start gap-3 px-4 bg-card hover:bg-muted border border-border text-foreground hover:text-foreground transition-all min-w-0 w-full",
            variant === 'destructive' && "text-red-400 hover:text-red-300 hover:bg-red-900/20 hover:border-red-900/50",
            variant === 'warning' && "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 hover:border-yellow-900/50"
        )}
        onClick={onClick}
        disabled={disabled}
      >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="font-medium text-sm truncate w-full text-left" title={label}>{label}</span>
      </MriButton>
  )

  // Helper for unique identification (fallback to license or citizenid if ID is missing/reused)
  const getPlayerKey = (p: any) => {
      if (!p) return t('unknown')
      if (p.license) return p.license
      if (p.citizenid) return p.citizenid
      return String(p.id)
  }

  const isSelected = (p: any) => {
      if (!selectedPlayer) return false
      return getPlayerKey(selectedPlayer) === getPlayerKey(p)
  }

  // Render Content
  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
        {/* Top Header */}
        {/* Top Header */}
        <MriPageHeader title={t('player_management')} icon={Users} count={playersOnline.length} countLabel={t('online')}>
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

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            {/* GRID VIEW */}
            {viewMode === 'grid' && !selectedPlayer && (
                 <div className="h-full overflow-y-auto p-6">
                     {loading && <div className="flex justify-center mb-8"><Spinner /></div>}

                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                         {filteredOnline.map(p => (
                             <PlayerGridCard key={getPlayerKey(p)} player={p} onClick={setSelectedPlayer} onAction={sendAction} />
                         ))}
                     </div>

                     {filteredOffline.length > 0 && (
                        <>
                        <div className="my-6 border-b border-border" />
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{t('recently_offline')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 opacity-75">
                             {filteredOffline.map(p => (
                                 <PlayerGridCard key={getPlayerKey(p)} player={p} onClick={setSelectedPlayer} onAction={sendAction} />
                             ))}
                         </div>
                        </>
                     )}
                 </div>
            )}

            {/* LIST VIEW (Split Logic) */}
            {viewMode === 'list' && (
                <div className="h-full flex">
                    {/* List Sidebar */}
                    <div className="w-96 flex flex-col border-r border-border bg-card/10"> {/* Expanded width to 96 to fit info */}
                         <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {/* Online Players */}
                            {filteredOnline.length > 0 && (
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('online')} ({filteredOnline.length})</div>
                            )}
                            {filteredOnline.map(player => (
                                <div
                                    key={getPlayerKey(player)}
                                    onClick={() => setSelectedPlayer(player)}
                                    className={cn(
                                        "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border border-transparent hover:bg-muted/50",
                                        isSelected(player) ? "bg-muted/80 border-primary/30 shadow-[0_0_15px_-5px_var(--primary)]" : "bg-card"
                                    )}
                                >
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-primary font-bold border border-border text-sm shrink-0">
                                        {player.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <div className={cn("font-medium truncate text-sm", isSelected(player) ? "text-primary" : "text-foreground")}>
                                                {player.name}
                                            </div>
                                            {player.metadata?.verified ? (
                                                <div className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded border border-border font-bold tracking-wider">{t('status_verified')}</div>
                                            ) : (
                                                <div className="bg-red-500/20 text-red-500 text-[9px] px-1.5 py-0.5 rounded border border-red-500/10 font-bold tracking-wider">{t('status_suspect')}</div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 font-mono">
                                                <div className="flex items-center gap-1.5">
                                                     <div className={cn("w-2 h-2 rounded-full relative", player.online ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-red-500")}>
                                                        {player.online && (
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                        )}
                                                    </div>
                                                     {t('id')}: {player.id}
                                                </div>
                                                <span>•</span>
                                                <span>{player.ping || 0}ms</span>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <MriButton
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 rounded bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 top-0.5 relative" /* Added slight top offset for alignment */
                                                    onClick={(e) => { e.stopPropagation(); sendAction('spectate_player', {}, player); }}
                                                    disabled={!player.online}
                                                    title={t('spectate')}
                                                 >
                                                    <Eye className="w-3 h-3" />
                                                 </MriButton>
                                                 <MriButton
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 rounded bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 top-0.5 relative"
                                                    onClick={(e) => { e.stopPropagation(); sendAction('teleportToPlayer', {}, player); }}
                                                    disabled={!player.online}
                                                    title={t('teleport_to')}
                                                 >
                                                    <Crosshair className="w-3 h-3" />
                                                 </MriButton>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Offline Players */}
                            {filteredOffline.length > 0 && (
                                <>
                                <div className="mt-4 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('recently_offline')}</div>
                                {filteredOffline.map(player => (
                                    <div
                                        key={getPlayerKey(player)}
                                        onClick={() => setSelectedPlayer(player)}
                                        className={cn(
                                            "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border border-transparent hover:bg-muted/50",
                                            isSelected(player) ? "bg-muted/80 border-border" : "bg-card"
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground font-bold border border-border text-sm shrink-0">
                                            {player.name.substring(0,2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium truncate text-sm text-muted-foreground">
                                                    {player.name}
                                                </div>
                                                {player.metadata?.verified ? (
                                                    <div className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded border border-border font-bold tracking-wider">{t('status_verified')}</div>
                                                ) : (
                                                    <div className="bg-red-500/20 text-red-500 text-[9px] px-1.5 py-0.5 rounded border border-red-500/10 font-bold tracking-wider">{t('status_suspect')}</div>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                                                <div className={cn("w-2 h-2 rounded-full relative", player.online ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-red-500")}>
                                                    {player.online && (
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                    )}
                                                </div>
                                                <span>{t('offline')} • {formatDate(player.last_loggedout)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </>
                            )}
                         </div>
                    </div>
                </div>
            )}


            {/* DETAILS OVERLAY (Absolute for Grid, Relative for List) */}
            {selectedPlayer && (
                 <div className={cn(
                     "bg-background flex flex-col overflow-hidden transition-all duration-300",
                     viewMode === 'list' ? "absolute inset-0 left-96 z-10" : "absolute inset-0 z-20"
                 )}>
                     {/* Detail Header / Back Button for Grid */}
                     {viewMode === 'grid' && (
                         <div className="p-4 border-b border-border flex items-center">
                             <MriButton variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => setSelectedPlayer(null)}>
                                 <ChevronLeft className="w-5 h-5" /> {t('back_to_grid')}
                             </MriButton>
                         </div>
                     )}

                     {/* Profile Header */}
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
                            </div>
                            <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
                                {selectedPlayer.id && <span className="bg-muted/50 border border-border px-2 py-0.5 rounded font-mono text-xs">ID: {selectedPlayer.id}</span>}
                                {selectedPlayer.online && <span className="bg-muted/50 border border-border px-2 py-0.5 rounded font-mono text-xs text-muted-foreground">PING: {selectedPlayer.ping || 0}ms</span>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <MriButton onClick={() => refreshPlayers()} disabled={loading} variant="outline" className="border-border bg-transparent hover:bg-muted text-foreground gap-2">
                                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> {t('refresh')}
                             </MriButton>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Action Grids */}

                        {/* Quick Actions */}
                        <section>
                            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Ban className="w-3.5 h-3.5" /> {t('actions_quick')}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                <ActionButton icon={Check} label={`${t('verify')}`} onClick={() => sendAction('verifyPlayer')} disabled={!selectedPlayer.online} />
                                <ActionButton icon={Heart} label={`${t('revive')}`} onClick={() => sendAction('revivePlayer')} disabled={!selectedPlayer.online} />
                                <ActionButton icon={Skull} label={`${t('kill')}`} onClick={() => sendAction('kill_player')} disabled={!selectedPlayer.online} />
                                <ActionButton icon={User} label={`${t('clothing')}`} onClick={() => sendAction('clothing_menu')} disabled={!selectedPlayer.online} />
                                <ActionButton icon={Lock} label={`${t('toggle_cuffs')}`} onClick={() => sendAction('toggle_cuffs')} disabled={!selectedPlayer.online} />
                            </div>
                        </section>
                        {/* Moderation */}
                        <section>
                            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5" /> {t('moderation_section')}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                <ActionButton icon={Eye} label={`${t('spectate')}`} onClick={() => sendAction('spectate_player')} disabled={!selectedPlayer.online} />
                                <ActionButton icon={Lock} label={`${t('toggle_freeze')}`} onClick={() => sendAction('freeze_player')} disabled={!selectedPlayer.online} />
                                <ActionButton icon={AlertTriangle} label={`${t('warn')}`} variant="warning" onClick={() => setShowWarnModal(true)} disabled={!selectedPlayer.online} />
                                <ActionButton icon={LogOut} label={`${t('kick')}`} onClick={() => setShowKickModal(true)} disabled={!selectedPlayer.online} />
                                <ActionButton icon={Ban} label={`${t('ban')}`} variant="destructive" onClick={() => setShowBanModal(true)} />
                            </div>
                        </section>

                        {/* Teleportation */}
                         <section>
                            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Crosshair className="w-3.5 h-3.5" /> {t('teleportation_section')}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                <ActionButton icon={Crosshair} label={`${t('go_to')}`} onClick={() => sendAction('teleportToPlayer')} disabled={!selectedPlayer.online} />
                                <ActionButton icon={Download} label={`${t('bring')}`} onClick={() => sendAction('bringPlayer')} disabled={!selectedPlayer.online} />
                                <ActionButton icon={Undo} label={`${t('send_back')}`} onClick={() => sendAction('sendPlayerBack')} disabled={!selectedPlayer.online} />
                            </div>
                        </section>

                         {/* Economy & Groups Section */}
                        <section>
                             <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <Wallet className="w-3.5 h-3.5" /> {t('economy_groups')}
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                 {/* Cash */}
                                 <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
                                     <div>
                                         <div className="text-xs text-muted-foreground font-bold uppercase">{t('option_cash')}</div>
                                         <div className="text-xl font-bold text-green-500 font-mono">${(selectedPlayer.cash || 0).toLocaleString()}</div>
                                     </div>
                                     <div className="flex gap-1">
                                         <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded bg-muted hover:bg-muted/80" onClick={() => { setIsGivingMoney(true); setInitialMoneyType('cash'); setShowMoneyModal(true); }}><Plus className="w-3.5 h-3.5" /></MriButton>
                                         <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded bg-muted hover:bg-muted/80" onClick={() => { setIsGivingMoney(false); setInitialMoneyType('cash'); setShowMoneyModal(true); }}><Minus className="w-3.5 h-3.5" /></MriButton>
                                     </div>
                                 </div>
                                 {/* Bank */}
                                 <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
                                     <div>
                                         <div className="text-xs text-muted-foreground font-bold uppercase">{t('option_bank')}</div>
                                         <div className="text-xl font-bold text-blue-500 font-mono">${(selectedPlayer.bank || 0).toLocaleString()}</div>
                                     </div>
                                     <div className="flex gap-1">
                                         <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded bg-muted hover:bg-muted/80" onClick={() => { setIsGivingMoney(true); setInitialMoneyType('bank'); setShowMoneyModal(true); }}><Plus className="w-3.5 h-3.5" /></MriButton>
                                         <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded bg-muted hover:bg-muted/80" onClick={() => { setIsGivingMoney(false); setInitialMoneyType('bank'); setShowMoneyModal(true); }}><Minus className="w-3.5 h-3.5" /></MriButton>
                                     </div>
                                 </div>
                                 {/* Crypto */}
                                 <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
                                     <div>
                                         <div className="text-xs text-muted-foreground font-bold uppercase">{t('option_crypto')}</div>
                                         <div className="text-xl font-bold text-yellow-500 font-mono">{(selectedPlayer.crypto || 0).toLocaleString()}</div>
                                     </div>
                                     <div className="flex gap-1">
                                         <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded bg-muted hover:bg-muted/80" onClick={() => { setIsGivingMoney(true); setInitialMoneyType('crypto'); setShowMoneyModal(true); }}><Plus className="w-3.5 h-3.5" /></MriButton>
                                         <MriButton size="icon" variant="ghost" className="h-7 w-7 rounded bg-muted hover:bg-muted/80" onClick={() => { setIsGivingMoney(false); setInitialMoneyType('crypto'); setShowMoneyModal(true); }}><Minus className="w-3.5 h-3.5" /></MriButton>
                                     </div>
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-sm font-medium">{t('job_label')}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-primary font-bold">{selectedPlayer.job.label}</span>
                                            <span className="text-xs text-muted-foreground">{selectedPlayer.job.grade.name} ({selectedPlayer.job.grade.level})</span>
                                            <MriButton variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setGroupType('job'); setShowGroupModal(true); }}>{t('btn_edit')}</MriButton>
                                        </div>
                                    </div>
                                    <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-sm font-medium">{t('gang_label')}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">{selectedPlayer.gang.label}</span>
                                            <span className="text-xs text-muted-foreground">{selectedPlayer.gang.grade.name} ({selectedPlayer.gang.grade.level})</span>
                                            <MriButton variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setGroupType('gang'); setShowGroupModal(true); }}>{t('btn_edit')}</MriButton>
                                        </div>
                                    </div>
                             </div>
                        </section>

                        {/* Player Vehicles */}
                         <section>
                            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Car className="w-3.5 h-3.5" /> {t('player_vehicles')}
                            </h3>
                            {selectedPlayer.vehicles && selectedPlayer.vehicles.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    {selectedPlayer.vehicles.map((v: any, i:number) => (
                                        <div key={i} className="flex flex-col bg-card border border-border rounded-lg p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-foreground">{v.label || v.model}</span>
                                                <span className="font-mono text-xs bg-muted px-1.5 rounded">{v.plate}</span>
                                            </div>
                                            <div className="flex gap-2 mt-auto">
                                                 <MriButton size="sm" variant="secondary" className="flex-1 h-7 text-xs bg-muted hover:bg-muted/80" onClick={() => sendAction('spawnPersonalVehicle', { VehiclePlate: { value: v.plate } })}>{t('btn_spawn')}</MriButton>
                                                 <MriButton size="sm" variant="secondary" className="flex-1 h-7 text-xs bg-muted hover:bg-muted/80" onClick={() => sendAction('open_trunk', { Plate: { value: v.plate } })}>{t('btn_trunk')}</MriButton>
                                                 <MriButton size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10" onClick={() => { setPendingDeletePlate(v.plate); setShowDeleteVehicleConfirm(true); }}><Trash2 className="w-4 h-4" /></MriButton>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground italic bg-card/50 p-4 rounded-lg border border-dashed border-border">
                                    {t('no_personal_vehicles_found')}
                                </div>
                            )}
                        </section>

                         {/* Inventory Section */}
                         <section>
                            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ExternalLink className="w-3.5 h-3.5" /> {t('inventory_management')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <MriButton onClick={() => sendAction('open_inventory')} disabled={!selectedPlayer.online} className="h-12 bg-card border border-border hover:bg-muted justify-start gap-4 text-foreground/80">
                                    <div className="p-1.5 rounded bg-muted text-primary"><ExternalLink className="w-4 h-4" /></div>
                                    {t('open_inventory')}
                                </MriButton>
                                <MriButton onClick={() => setShowGiveItemModal(true)} disabled={!selectedPlayer.online} className="h-12 bg-card border border-border hover:bg-muted justify-start gap-4 text-foreground/80">
                                    <div className="p-1.5 rounded bg-muted text-primary"><Gift className="w-4 h-4" /></div>
                                    {t('give_item_player')}
                                </MriButton>
                                <MriButton onClick={() => sendAction('clear_inventory')} disabled={!selectedPlayer.online} className="h-12 bg-card border border-border hover:bg-red-900/10 border-red-900/30 hover:border-red-500/50 justify-start gap-4 text-red-400">
                                    <div className="p-1.5 rounded bg-red-900/30 text-red-500"><Trash2 className="w-4 h-4" /></div>
                                    {t('clear_inventory')}
                                </MriButton>
                            </div>
                        </section>

                         {/* Offline Actions */}
                        {!selectedPlayer.online && (
                             <section>
                                <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Skull className="w-3.5 h-3.5" /> {t('offline_actions')}
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                     <ActionButton icon={Trash2} label={`${t('delete_character')}`} variant="destructive" onClick={() => sendAction('delete_cid', { cid: { value: selectedPlayer.cid } })} />
                                     <ActionButton icon={Ban} label={`${t('unban')}`} onClick={() => sendAction('unban_cid', { cid: { value: selectedPlayer.cid } })} />
                                </div>
                            </section>
                        )}

                         {/* Footer Info */}
                        <div className="p-4 border-t border-border bg-card/20 text-xs text-mono text-muted-foreground mt-auto">
                            <div className="flex items-center justify-between mb-2">
                                 <span className="text-muted-foreground font-bold tracking-wider">{t('connection_info')}</span>
                                 <span className="font-mono">{t('last_logout')}: {formatDate(selectedPlayer.last_loggedout)}</span>
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
          }} />
        )}

        {showGiveItemModal && selectedPlayer && (
          <GiveItemModal
            initialPlayerId={selectedPlayer.id}
            disablePlayerSelect={true}
            onClose={() => setShowGiveItemModal(false)}
            onSubmit={(targetId, item, amount) => {
                sendAction('give_item_player', { Item: { value: item }, Amount: { value: amount } })
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
          }} />
        )}

        {showDeleteVehicleConfirm && pendingDeletePlate && (
          <ConfirmAction text={t('confirm_delete_vehicle').replace('%s', pendingDeletePlate)} onCancel={() => { setShowDeleteVehicleConfirm(false); setPendingDeletePlate(null); }} onConfirm={async () => {
            // Optimistic update
            if (selectedPlayer && selectedPlayer.vehicles) {
                 const updated = {
                     ...selectedPlayer,
                     vehicles: selectedPlayer.vehicles.filter((v: any) => v.plate !== pendingDeletePlate)
                 }
                 setSelectedPlayer(updated)
                 setPlayersOnline(prev => prev.map(p => p.id === updated.id ? updated : p))
                 setPlayersOffline(prev => prev.map(p => p.id === updated.id ? updated : p))
             }

            await sendAction('deletePersonalVehicle', { Plate: { value: pendingDeletePlate } })
            setShowDeleteVehicleConfirm(false)
            setPendingDeletePlate(null)
            setTimeout(() => refreshPlayers(), 500)
          }} />
        )}
    </div>
  )
}
