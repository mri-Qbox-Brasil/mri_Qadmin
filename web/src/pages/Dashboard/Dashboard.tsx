import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Player, SummaryData } from '@/types'

import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { MriPageHeader, MriExpandableSearch } from '@mriqbox/ui-kit'
import { useAppState } from '@/context/AppState'
import DevLocaleSwitcher from '@/components/DevLocaleSwitcher'
import {
    Wallet,
    Landmark,
    Coins,
    Users,
    Car,
    Gavel,
    User,
    LayoutDashboard,
    Megaphone,
    Send,
    Heart,
    MapPin,
    Ghost,
    Shield,
    EyeOff,
    ZapOff,
    Fuel,
    Terminal,
    Command,
    Copy,
    RefreshCw,
    MessageSquare
} from 'lucide-react'
import { TableVirtuoso } from 'react-virtuoso'
import { cn } from '@/lib/utils'
import { MOCK_PLAYERS } from '@/utils/mockData'
import { hasPermission } from '@/utils/permissions'
import { MriButton, MriActionCard, MriSkeleton } from '@mriqbox/ui-kit'
import { MriSegmentedTabs as MriTabs, type MriSegmentedTabsItem as MriTabItem } from '@mriqbox/ui-kit'
import { VirtuosoGrid } from 'react-virtuoso'
import CommandsSkeleton from '@/components/skeletons/CommandsSkeleton'
import { MOCK_GAME_DATA } from '@/utils/mockData'

const mockSummary = {
    totalCash: 15000,
    totalBank: 200000,
    totalCrypto: 1000,
    uniquePlayers: 42,
    vehicleCount: 140,
    bansCount: 5,
    characterCount: 70,
    onlinePlayers: 1
}

const StatSkeleton = () => (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <MriSkeleton className="w-12 h-12 rounded-lg shrink-0" />
        <div className="space-y-2">
            <MriSkeleton className="h-4 w-20" />
            <MriSkeleton className="h-6 w-12" />
        </div>
    </div>
)

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, iconColor = "text-primary", bgIcon = "bg-primary/20" }) => (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/40 transition-all hover:bg-muted/5 group">
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110", bgIcon)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
        <div>
            <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
            <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
        </div>
    </div>
)

export default function Dashboard() {
    const [loadingSummary, setLoadingSummary] = useState(true)
    const [loadingCommands, setLoadingCommands] = useState(false)
    const [, setLoadingPlayers] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [summary, setSummary] = useState<SummaryData | null>(null)
    const { sendNui, debugMode } = useNui()
    const { t } = useI18n()
    const { setPlayers, players, setSelectedPlayer, pagination, setPagination, lastPlayersFetch, setLastPlayersFetch, myPermissions, gameData, setGameData } = useAppState()

    const canSeeDashboard = useMemo(() => hasPermission(myPermissions, 'qadmin.page.dashboard'), [myPermissions])
    const canSeeCommands = useMemo(() => hasPermission(myPermissions, 'qadmin.page.commands'), [myPermissions])

    const [activeView, setActiveView] = useState<'dashboard' | 'commands'>(canSeeDashboard ? 'dashboard' : 'commands')
    const [playersSearch, setPlayersSearch] = useState<string>('')
    const [commandsSearch, setCommandsSearch] = useState<string>('')

    const [sortBy, setSortBy] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    // Initial view selection based on permissions
    useEffect(() => {
        if (!canSeeDashboard && canSeeCommands && activeView === 'dashboard') {
            setActiveView('commands')
        } else if (!canSeeCommands && canSeeDashboard && activeView === 'commands') {
            setActiveView('dashboard')
        }
    }, [canSeeDashboard, canSeeCommands, activeView])

    const canDo = (perm: string) => hasPermission(myPermissions, perm)
    const [announcement, setAnnouncement] = useState('')
    const [sendingAnnounce, setSendingAnnounce] = useState(false)

    const handleSendAnnounce = async () => {
        if (!announcement.trim()) return
        setSendingAnnounce(true)
        try {
            await sendNui('mri_Qadmin:server:Announce', announcement)
            setAnnouncement('')
        } catch (e) {
            console.error(e)
        } finally {
            setSendingAnnounce(false)
        }
    }


    // Defer the players update so sorting doesn't block the UI thread during high-frequency sync updates
    const deferredPlayers = React.useDeferredValue(players)

    const abortSyncRef = useRef(false)

    // Background Sync Logic (Identical to Players.tsx)
    const syncRemainingPages = useCallback(async (startPage: number, totalPages: number, currentSearch: string) => {
        if (startPage > totalPages || currentSearch !== '') {
            return
        }


        try {
            if (abortSyncRef.current) {
                return
            }

            const filteredMocks = currentSearch === ''
                ? MOCK_PLAYERS
                : MOCK_PLAYERS.filter((p: any) =>
                    String(p.name || '').toLowerCase().includes(currentSearch.toLowerCase()) ||
                    String(p.license || '').toLowerCase().includes(currentSearch.toLowerCase()) ||
                    String(p.citizenid || '').toLowerCase().includes(currentSearch.toLowerCase()) ||
                    String(p.id).includes(currentSearch)
                )

            const limit = 300
            const mock: { data: Player[], total: number, pages: number } = { data: filteredMocks.slice((startPage - 1) * limit, startPage * limit), total: filteredMocks.length, pages: Math.ceil(filteredMocks.length / limit) }

            await new Promise(r => setTimeout(r, 100))
            if (abortSyncRef.current) return;

            const payload = { page: startPage, limit: limit, search: currentSearch }
            const response = await sendNui('getPlayers', payload, mock)
            const data: Player[] = (Array.isArray(response) ? response : (response.data || [])) as Player[]

            if (data && data.length > 0) {
                setPlayers(prev => [...prev, ...data])
                syncRemainingPages(startPage + 1, totalPages, currentSearch)
            }

        } catch (_e) {
            console.error("Sync error", _e)
        }
    }, [sendNui, setPlayers])


    // Client-side filtering and sorting of the FULL LIST
    const displayedPlayers = useMemo(() => {
        if (!deferredPlayers) return []

        let list = [...deferredPlayers]

        // Filtering
        if (playersSearch) {
            const searchLower = playersSearch.toLowerCase()
            list = list.filter(p =>
                String(p.name || '').toLowerCase().includes(searchLower) ||
                String(p.license || '').toLowerCase().includes(searchLower) ||
                String(p.citizenid || '').toLowerCase().includes(searchLower) ||
                String(p.id).includes(playersSearch)
            )
        }

        // Sorting
        if (!sortBy) return list

        list.sort((a: Player, b: Player) => {
            if (sortBy === 'name') {
                return sortDir === 'asc'
                    ? String(a.name || '').localeCompare(String(b.name || ''))
                    : String(b.name || '').localeCompare(String(a.name || ''))
            }
            const av = Number((a as any)[sortBy] ?? 0)
            const bv = Number((b as any)[sortBy] ?? 0)
            return sortDir === 'asc' ? av - bv : bv - av
        })

        return list
    }, [deferredPlayers, playersSearch, sortBy, sortDir])

    const commands = useMemo(() => {
        return (gameData.commands || []).map((cmd: any) => ({
            ...cmd,
            name: (cmd.name || '').trim()
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))
    }, [gameData.commands])

    const filteredCommands = commands.filter((cmd: any) =>
        cmd.name.toLowerCase().includes(commandsSearch.toLowerCase()) ||
        (cmd.description || '').toLowerCase().includes(commandsSearch.toLowerCase())
    )

    const handleRefreshCommands = async () => {
        setLoadingCommands(true)
        try {
            const data = await sendNui('getData', {}, MOCK_GAME_DATA)
            if (data) setGameData((prev: any) => ({ ...prev, ...data }))
        } catch (e) {
            console.error(e)
        } finally {
            setLoadingCommands(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const dashboardTabs: MriTabItem[] = useMemo(() => {
        const tabs: MriTabItem[] = []
        if (canSeeDashboard) tabs.push({ id: 'dashboard', label: t('qadmin.page.dashboard'), icon: LayoutDashboard })
        if (canSeeCommands) tabs.push({ id: 'commands', label: t('qadmin.page.commands'), icon: Terminal })
        return tabs
    }, [t, canSeeDashboard, canSeeCommands])

    function toggleSort(field: string) {
        if (sortBy === field) {
            setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortBy(field)
            setSortDir('desc')
        }
    }

    useEffect(() => {
        async function load() {
            setLoadingSummary(true)
            try {
                const serverInfo: SummaryData = await sendNui('getServerInfo', {}, mockSummary)
                setSummary(serverInfo || mockSummary)
            } catch (e: any) {
                setError(e?.message ?? t('error_loading_data'))
            } finally {
                setLoadingSummary(false)
            }
        }
        load()
    }, [sendNui, t])

    // Fetch Players (Progressive)
    useEffect(() => {
        let mounted = true

        const fetchPlayers = async () => {
            if (playersSearch !== '') {
                abortSyncRef.current = true
            } else {
                abortSyncRef.current = false
            }

            const isSearchUpdate = playersSearch !== (pagination.search || '')
            if (playersSearch === '' && !isSearchUpdate) {
                const now = Date.now()
                // Only skip if we already have players and it hasn't been a minute
                if (now - lastPlayersFetch < 60000 && players.length > 0) {
                    setLoadingPlayers(false)
                    return
                }
            }

            setLoadingPlayers(true)
            try {
                const filteredMocks = playersSearch === ''
                    ? MOCK_PLAYERS
                    : MOCK_PLAYERS.filter((p: any) =>
                        String(p.name || '').toLowerCase().includes(playersSearch.toLowerCase()) ||
                        String(p.license || '').toLowerCase().includes(playersSearch.toLowerCase()) ||
                        String(p.citizenid || '').toLowerCase().includes(playersSearch.toLowerCase()) ||
                        String(p.id).includes(playersSearch)
                    )

                const limit = 300
                const mock: { data: Player[], total: number, pages: number } = { data: filteredMocks.slice(0, limit), total: filteredMocks.length, pages: Math.ceil(filteredMocks.length / limit) }
                const payload = { page: 1, limit: limit, search: playersSearch }

                const response = await sendNui('getPlayers', payload, mock)

                if (!mounted) return

                const data: Player[] = Array.isArray(response) ? response : (response.data || [])
                const total: number = Array.isArray(response) ? response.length : (response.total || 0)
                const pages: number = Array.isArray(response) ? 1 : (response.pages || 1)

                setPlayers(data)
                setPagination(prev => ({ ...prev, page: 1, total, totalPages: pages, search: playersSearch }))

                // Start Sync if needed
                if (playersSearch === '' && pages > 1) {
                    syncRemainingPages(2, pages, playersSearch)
                }

                if (playersSearch === '') {
                    setLastPlayersFetch(Date.now())
                }

            } catch {
                // ignore
            } finally {
                if (mounted) setLoadingPlayers(false)
            }
        }

        if (playersSearch) {
            const timer = setTimeout(() => {
                fetchPlayers()
            }, 500)
            return () => {
                mounted = false
                clearTimeout(timer)
            }
        } else {
            fetchPlayers()
            return () => { mounted = false }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sendNui, playersSearch, lastPlayersFetch, setPlayers, setPagination, setLastPlayersFetch, syncRemainingPages])




    if (!summary) {
        return (
            <div className="h-full w-full flex flex-col p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <StatSkeleton key={i} />)}
                </div>
                <MriSkeleton className="flex-1 rounded-xl" />
            </div>
        )
    }

    if (error) return <div className="p-6 text-red-400">{error}</div>

    return (
        <div className="h-full w-full flex flex-col rounded-r-xl overflow-hidden">
            <MriPageHeader title={activeView === 'dashboard' ? t('qadmin.page.dashboard') : t('qadmin.page.commands')} icon={activeView === 'dashboard' ? LayoutDashboard : Terminal}>
                <div className="flex items-center gap-2">
                    {dashboardTabs.length > 1 && (
                        <MriTabs
                            items={dashboardTabs}
                            value={activeView}
                            onChange={setActiveView as any}
                            variant="premium"
                        />
                    )}
                    <MriExpandableSearch
                        placeholder={activeView === 'dashboard' ? t('search_placeholder_players') : t('commands_search_placeholder')}
                        value={activeView === 'dashboard' ? playersSearch : commandsSearch}
                        onChange={activeView === 'dashboard' ? setPlayersSearch : setCommandsSearch}
                    />
                    {activeView === 'commands' && (
                        <MriButton
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={handleRefreshCommands}
                            disabled={loadingCommands}
                        >
                            <RefreshCw className={cn("w-4 h-4", loadingCommands && "animate-spin")} />
                        </MriButton>
                    )}
                </div>
                {debugMode && <DevLocaleSwitcher className="w-40" />}
            </MriPageHeader>

            <div className="flex-1 flex flex-col py-4 px-2 no-scrollbar overflow-y-auto">
                {loadingSummary && !summary ? (
                    <div className="h-full w-full flex flex-col space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => <StatSkeleton key={i} />)}
                        </div>
                        <MriSkeleton className="flex-1 rounded-xl" />
                    </div>
                ) : activeView === 'dashboard' && canSeeDashboard ? (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {hasPermission(myPermissions, 'qadmin.action.info_admin') && (
                                <>
                                    <StatCard
                                        icon={Wallet}
                                        label={t('dashboard.stats.cash')}
                                        value={`${t('common.currency_symbol')} ${summary.totalCash?.toLocaleString()}`}
                                        bgIcon="bg-green-500/10"
                                        iconColor="text-green-500"
                                    />
                                    <StatCard
                                        icon={Landmark}
                                        label={t('dashboard.stats.bank')}
                                        value={`${t('common.currency_symbol')} ${summary.totalBank?.toLocaleString()}`}
                                        bgIcon="bg-cyan-500/10"
                                        iconColor="text-cyan-500"
                                    />
                                    <StatCard
                                        icon={Coins}
                                        label={t('dashboard.stats.crypto')}
                                        value={`${t('common.currency_symbol')} ${summary.totalCrypto?.toLocaleString()}`}
                                        bgIcon="bg-yellow-500/10"
                                        iconColor="text-yellow-500"
                                    />
                                </>
                            )}

                            <StatCard
                                icon={Users}
                                label={t('dashboard.stats.unique')}
                                value={summary.uniquePlayers}
                                bgIcon="bg-purple-500/10"
                                iconColor="text-purple-500"
                            />

                            {/* Row 2 */}
                            <StatCard
                                icon={Car}
                                label={t('dashboard.stats.vehicles')}
                                value={summary.vehicleCount ?? 0}
                                bgIcon="bg-blue-500/10"
                                iconColor="text-blue-500"
                            />
                            <StatCard
                                icon={Gavel}
                                label={t('dashboard.stats.bans')}
                                value={summary.bansCount ?? 0}
                                bgIcon="bg-red-500/10"
                                iconColor="text-red-500"
                            />
                            <StatCard
                                icon={User}
                                label={t('dashboard.stats.chars')}
                                value={summary.characterCount ?? 0}
                                bgIcon="bg-orange-500/10"
                                iconColor="text-orange-500"
                            />
                            {/* Online Players Custom Card */}
                            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-muted-foreground/20 transition-all">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-green-500/10 relative">
                                    <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_var(--primary)] animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.online')}</h3>
                                    <p className="text-xl font-bold text-foreground tracking-tight">{summary.onlinePlayers ?? 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {canDo('qadmin.action.revive_self') && (
                                <MriActionCard
                                    label={t('qadmin.dashboard.quick.revive.title')}
                                    icon={Heart}
                                    onClick={() => sendNui('mri_Qadmin:server:ReviveSelf')}
                                />
                            )}
                            {canDo('qadmin.action.clear_chat') && (
                                <MriActionCard
                                    label={t('qadmin.dashboard.quick.chat.title')}
                                    icon={MessageSquare}
                                    onClick={() => sendNui('mri_Qadmin:server:ClearChat')}
                                />
                            )}
                            {canDo('qadmin.action.goto_waypoint') && (
                                <MriActionCard
                                    label={t('qadmin.dashboard.quick.waypoint.title')}
                                    icon={MapPin}
                                    onClick={() => sendNui('mri_Qadmin:server:GoToWaypoint')}
                                />
                            )}
                            {canDo('qadmin.action.fix_vehicle') && (
                                <MriActionCard
                                    label={t('qadmin.dashboard.quick.fix.title')}
                                    icon={Shield}
                                    onClick={() => sendNui('mri_Qadmin:server:FixVehicle')}
                                />
                            )}
                        </div>

                        {/* Self Tools */}
                        {(canDo('qadmin.action.noclip') || canDo('qadmin.action.god_mode') || canDo('qadmin.action.invisibility') || canDo('qadmin.action.blackout') || canDo('qadmin.action.refuel_vehicle')) && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {canDo('qadmin.action.noclip') && (
                                    <MriActionCard
                                        label={t('qadmin.dashboard.quick.noclip.title')}
                                        icon={Ghost}
                                        onClick={() => sendNui('clickButton', { data: { event: 'mri_Qadmin:client:ToggleNoClip', type: 'client' } })}
                                    />
                                )}
                                {canDo('qadmin.action.god_mode') && (
                                    <MriActionCard
                                        label={t('qadmin.dashboard.quick.god.title')}
                                        icon={Shield}
                                        onClick={() => sendNui('clickButton', { data: { event: 'mri_Qadmin:client:ToggleGodmode', type: 'client' } })}
                                    />
                                )}
                                {canDo('qadmin.action.invisible') && (
                                    <MriActionCard
                                        label={t('qadmin.dashboard.quick.invisible.title')}
                                        icon={EyeOff}
                                        onClick={() => sendNui('clickButton', { data: { event: 'mri_Qadmin:client:ToggleInvisible', type: 'client' } })}
                                    />
                                )}
                                {canDo('qadmin.action.blackout') && (
                                    <MriActionCard
                                        label={t('qadmin.dashboard.quick.blackout.title')}
                                        icon={ZapOff}
                                        onClick={() => sendNui('clickButton', { data: { event: 'mri_Qadmin:server:ToggleBlackout', type: 'server' } })}
                                    />
                                )}
                                {canDo('qadmin.action.refuel_vehicle') && (
                                    <MriActionCard
                                        label={t('qadmin.dashboard.quick.refuel.title')}
                                        icon={Fuel}
                                        onClick={() => sendNui('clickButton', { data: { event: 'mri_Qadmin:client:RefuelVehicle', type: 'client' } })}
                                    />
                                )}
                            </div>
                        )}

                        {/* Announcement Section */}
                        {hasPermission(myPermissions, 'qadmin.action.announcements') && (
                            <div className="mb-8 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
                                <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />

                                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                        <Megaphone className="w-6 h-6 text-primary" />
                                    </div>

                                    <div className="flex-1 w-full space-y-1">
                                        <h4 className="text-sm font-semibold mb-2">{t('qadmin.dashboard.announcement.title')}</h4>
                                        <div className="flex gap-2">
                                            <textarea
                                                value={announcement}
                                                onChange={(e) => setAnnouncement(e.target.value)}
                                                placeholder={t('qadmin.dashboard.announcement.placeholder')}
                                                className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendAnnounce()}
                                            />
                                            <MriButton
                                                onClick={handleSendAnnounce}
                                                isLoading={sendingAnnounce}
                                                disabled={sendingAnnounce || !announcement.trim()}
                                                className="gap-2"
                                            >
                                                {!sendingAnnounce && <Send className="w-4 h-4" />}
                                                {t('common.send')}
                                            </MriButton>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Players Table Section */}
                        {hasPermission(myPermissions, 'qadmin.page.statistics') && (
                            <div className="flex-1 min-h-[400px] flex flex-col relative">
                                <div className="flex items-center gap-2 mb-4 shrink-0">
                                    <Users className="w-6 h-6 text-primary" />
                                    <h2 className="text-lg font-bold text-foreground">{t('qadmin.dashboard.section.stats')}</h2>
                                </div>

                                <div className="border border-border rounded-xl bg-card flex-1 min-h-[300px] relative overflow-hidden">
                                    <TableVirtuoso
                                        data={displayedPlayers}
                                        components={{
                                            Table: (props: any) => <table {...props} className="w-full text-left" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }} />,
                                        }}
                                        fixedHeaderContent={() => (
                                            <tr className="bg-muted border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
                                                <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors w-[30%]" onClick={() => toggleSort('common.name')}>
                                                    {t('player.labels.name')} {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                                </th>
                                                <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors w-[15%]" onClick={() => toggleSort('citizenid')}>
                                                    {t('player.labels.citizenid')} {sortBy === 'citizenid' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                                </th>
                                                <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors w-[20%]" onClick={() => toggleSort('common.cash')}>
                                                    {t('dashboard.stats.cash')} {sortBy === 'cash' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                                </th>
                                                <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors w-[20%]" onClick={() => toggleSort('common.bank')}>
                                                    {t('dashboard.stats.bank')} {sortBy === 'bank' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                                </th>
                                                <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors w-[15%]" onClick={() => toggleSort('common.crypto')}>
                                                    {t('dashboard.stats.crypto')} {sortBy === 'crypto' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                                </th>
                                            </tr>
                                        )}
                                        itemContent={(_: any, p: any) => (
                                            <>
                                                <td className="px-6 py-4 font-medium text-foreground w-[30%] truncate">{p.name || p.cid || p.id}</td>
                                                <td className="px-6 py-4 text-muted-foreground font-mono text-xs w-[15%] truncate">{p.cid ?? '-'}</td>
                                                <td className="px-6 py-4 text-foreground/80 w-[20%] truncate">
                                                    {Array.isArray(p.money)
                                                        ? (p.money.find((m: any) => m.name === 'cash')?.amount ?? 0)
                                                        : (p.cash ?? p.money ?? '-')}
                                                </td>
                                                <td className="px-6 py-4 text-foreground/80 w-[20%] truncate" onClick={() => setSelectedPlayer(p)}>
                                                    {Array.isArray(p.money)
                                                        ? (p.money.find((m: any) => m.name === 'bank')?.amount ?? 0)
                                                        : (p.bank ?? '-')}
                                                </td>
                                                <td className="px-6 py-4 text-foreground/80 w-[15%] truncate">
                                                    {Array.isArray(p.money)
                                                        ? (p.money.find((m: any) => m.name === 'crypto' || m.name === 'bitcoin')?.amount ?? 0)
                                                        : (p.crypto ?? '-')}
                                                </td>
                                            </>
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                ) : activeView === 'commands' && canSeeCommands ? (
                    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {loadingCommands && commands.length === 0 ? (
                            <CommandsSkeleton />
                        ) : filteredCommands.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                <Command className="w-10 h-10 opacity-20" />
                                <p>{t('qadmin.commands.none_found')}</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-hidden pt-4 p-2">
                                <VirtuosoGrid
                                    style={{ height: '100%' }}
                                    data={filteredCommands}
                                    listClassName="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-4"
                                    itemContent={(index: number, cmd: any) => (
                                        <div key={cmd.name} className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 hover:bg-muted/50 transition-all group relative overflow-hidden">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MriButton size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(cmd.name)}>
                                                    <Copy className="w-3 h-3" />
                                                </MriButton>
                                            </div>

                                            <div className="w-12 h-12 bg-muted/30 rounded-lg flex items-center justify-center border border-border shrink-0">
                                                <Terminal className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h3 className="font-bold text-foreground truncate pr-6 font-mono text-sm">{cmd.name}</h3>
                                                <p className="text-xs text-muted-foreground truncate" title={cmd.description}>{cmd.description || t('common.no_description')}</p>
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    )
}
