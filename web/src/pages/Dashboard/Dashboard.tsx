import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Player, SummaryData } from '@/types'

import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { MriPageHeader, MriCompactSearch, MriButton } from '@mriqbox/ui-kit'
import { useAppState } from '@/context/AppState'
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton'
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
    X
} from 'lucide-react'
import { TableVirtuoso } from 'react-virtuoso'
import { cn } from '@/lib/utils'
import { MOCK_PLAYERS } from '@/utils/mockData'

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

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    iconColor?: string;
    bgIcon?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, iconColor = "text-primary", bgIcon = "bg-primary/20" }) => (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-sidebar-foreground/20 transition-all">
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center shrink-0", bgIcon)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
        <div>
            <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
            <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
        </div>
    </div>
)

export default function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [summary, setSummary] = useState<SummaryData | null>(null)
    const [playersSearch, setPlayersSearch] = useState<string>('')

    const [sortBy, setSortBy] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    const { sendNui, debugMode } = useNui()
    const { t } = useI18n()
    const { setPlayers, players, setSelectedPlayer, setPagination, lastPlayersFetch, setLastPlayersFetch } = useAppState()

    const playerOptions = useMemo(() => {
        return players.map(p => ({
            value: p.name || p.cid || p.id,
            label: `${p.name || 'Unknown'} (#${p.id || p.cid})`
        }))
    }, [players])

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
                    ((p.name || '').toLowerCase().includes((currentSearch as string).toLowerCase())) ||
                    String(p.id).includes(currentSearch as string) ||
                    ((p.cid || '').toLowerCase().includes((currentSearch as string).toLowerCase()))
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
                (p.name || '').toLowerCase().includes(searchLower) ||
                String(p.id).includes(playersSearch) ||
                (p.cid || '').toLowerCase().includes(searchLower) ||
                (p.license || '').toLowerCase().includes(searchLower)
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
            // Load server info only once
            try {
                const serverInfo: SummaryData = await sendNui('getServerInfo', {}, mockSummary)
                setSummary(serverInfo || mockSummary)
            } catch (e: any) {
                setError(e?.message ?? t('error_loading_data'))
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

            if (playersSearch === '') {
                const now = Date.now()
                if (now - lastPlayersFetch < 60000 && players.length > 0) {
                    setLoading(false)
                    return
                }
            }

            setLoading(true)
            try {
                const filteredMocks = playersSearch === ''
                    ? MOCK_PLAYERS
                    : MOCK_PLAYERS.filter((p: any) =>
                        ((p.name || '').toLowerCase().includes(playersSearch.toLowerCase())) ||
                        String(p.id).includes(playersSearch) ||
                        ((p.cid || '').toLowerCase().includes(playersSearch.toLowerCase()))
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
                setPagination(prev => ({ ...prev, page: 1, total, totalPages: pages }))

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
                if (mounted) setLoading(false)
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
    }, [sendNui, playersSearch, lastPlayersFetch, players.length, setPlayers, setPagination, setLastPlayersFetch, syncRemainingPages])




    if (loading || !summary) return <DashboardSkeleton />
    if (error) return <div className="p-6 text-red-400">{error}</div>

    return (
        <div className="h-full w-full flex flex-col rounded-r-xl overflow-hidden">
            <MriPageHeader title={t('nav_dashboard')} icon={LayoutDashboard}>
                <div className="flex items-center gap-2">
                    <MriCompactSearch
                        placeholder={t('search_placeholder_players') || 'Search players...'}
                        value={playersSearch}
                        onChange={setPlayersSearch}
                        options={playerOptions}
                        searchPlaceholder={t('search_placeholder_players') || 'Search players...'}
                        className="w-8 h-8 border-border bg-card/60"
                    />
                    {playersSearch && (
                        <MriButton
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => setPlayersSearch('')}
                            title={t('common_clear')}
                        >
                            <X size={16} />
                        </MriButton>
                    )}
                </div>
                {debugMode && <DevLocaleSwitcher className="w-40" />}
            </MriPageHeader>

            <div className="flex-1 flex flex-col py-4 px-2 no-scrollbar overflow-hidden">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={Wallet}
                        label={t('dashboard_cash_on_hand')}
                        value={`${t('currency_symbol')} ${summary.totalCash?.toLocaleString()}`}
                        bgIcon="bg-green-500/10"
                        iconColor="text-green-500"
                    />
                    <StatCard
                        icon={Landmark}
                        label={t('dashboard_bank_balance')}
                        value={`${t('currency_symbol')} ${summary.totalBank?.toLocaleString()}`}
                        bgIcon="bg-cyan-500/10"
                        iconColor="text-cyan-500"
                    />
                    <StatCard
                        icon={Coins}
                        label={t('dashboard_crypto')}
                        value={`${t('currency_symbol')} ${summary.totalCrypto?.toLocaleString()}`}
                        bgIcon="bg-yellow-500/10"
                        iconColor="text-yellow-500"
                    />

                    <StatCard
                        icon={Users}
                        label={t('dashboard_unique_players')}
                        value={summary.uniquePlayers}
                        bgIcon="bg-purple-500/10"
                        iconColor="text-purple-500"
                    />

                    {/* Row 2 */}
                    <StatCard
                        icon={Car}
                        label={t('title_vehicles')}
                        value={summary.vehicleCount ?? 0}
                        bgIcon="bg-blue-500/10"
                        iconColor="text-blue-500"
                    />
                    <StatCard
                        icon={Gavel}
                        label={t('dashboard_bans') || 'Bans'}
                        value={summary.bansCount ?? 0}
                        bgIcon="bg-red-500/10"
                        iconColor="text-red-500"
                    />
                    <StatCard
                        icon={User}
                        label={t('dashboard_characters') || 'Characters'}
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
                            <h3 className="text-sm font-medium text-muted-foreground">{t('players_online')}</h3>
                            <p className="text-xl font-bold text-foreground tracking-tight">{summary.onlinePlayers ?? 0}</p>
                        </div>
                    </div>
                </div>

                {/* Players Table Section */}
                <div className="flex-1 min-h-0 flex flex-col relative">
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                        <Users className="w-6 h-6 text-primary" />
                        <h2 className="text-lg font-bold text-foreground">{t('players')}</h2>
                    </div>

                    <div className="border border-border rounded-xl bg-card flex-1 min-h-0 relative overflow-hidden">
                        <TableVirtuoso
                            data={displayedPlayers}
                            components={{
                                Table: (props: any) => <table {...props} className="w-full text-left" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }} />,
                            }}
                            fixedHeaderContent={() => (
                                <tr className="bg-muted border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
                                    <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors w-[30%]" onClick={() => toggleSort('name')}>
                                        {t('player_name')} {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th className="px-6 py-4 w-[15%]">CID</th>
                                    <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors w-[20%]" onClick={() => toggleSort('cash')}>
                                        {t('dashboard_cash_on_hand')} {sortBy === 'cash' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors w-[20%]" onClick={() => toggleSort('bank')}>
                                        {t('dashboard_bank_balance')} {sortBy === 'bank' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors w-[15%]" onClick={() => toggleSort('crypto')}>
                                        {t('dashboard_crypto')} {sortBy === 'crypto' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
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
            </div>
        </div>
    )
}
