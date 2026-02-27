import React, { useEffect, useState } from 'react'

import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { MriPageHeader, MriInput, MriSpinner } from '@mriqbox/ui-kit'
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
    Search,
    LayoutDashboard,
    RefreshCw
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

const StatCard = ({ icon: Icon, label, value, iconColor = "text-primary", bgIcon = "bg-primary/20" }: any) => (
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
  const [summary, setSummary] = useState<any>(null)
  const [playersSearch, setPlayersSearch] = useState<string>('')
  const [isSyncing, setIsSyncing] = useState(false)

  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { sendNui, debugMode } = useNui()
  const { t } = useI18n()
  const { players, setPlayers, pagination, setPagination, lastPlayersFetch, setLastPlayersFetch } = useAppState()

  // Defer the players update so sorting doesn't block the UI thread during high-frequency sync updates
  const deferredPlayers = React.useDeferredValue(players)

  // Background Sync Logic (Identical to Players.tsx)
    const syncRemainingPages = async (startPage: number, totalPages: number, currentSearch: string) => {
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

            const limit = 300
            const payload = { page: startPage, limit: limit, search: currentSearch }
            const mock: any = { data: MOCK_PLAYERS.slice(0, limit), total: MOCK_PLAYERS.length, pages: Math.ceil(MOCK_PLAYERS.length / limit) }

            await new Promise(r => setTimeout(r, 100))
             if (abortSyncRef.current) { setIsSyncing(false); return; }

            const response = await sendNui('getPlayers', payload, mock)
            const data = Array.isArray(response) ? response : (response.data || [])

            if (data && data.length > 0) {
                setPlayers(prev => [...prev, ...data])
                syncRemainingPages(startPage + 1, totalPages, currentSearch)
            } else {
                setIsSyncing(false)
            }

        } catch (e) {
            console.error("Sync error", e)
            setIsSyncing(false)
        }
    }

    const abortSyncRef = React.useRef(false)

  // Client-side sorting of the FULL LIST (since we load everything eventually)
  const displayedPlayers = React.useMemo(() => {
    if (!deferredPlayers) return []
    let list = [...deferredPlayers]

    if (!sortBy) return list

    list.sort((a: any, b: any) => {
      if (sortBy === 'name') {
        return sortDir === 'asc'
          ? String(a.name || '').localeCompare(String(b.name || ''))
          : String(b.name || '').localeCompare(String(a.name || ''))
      }
      const av = Number(a[sortBy] ?? 0)
      const bv = Number(b[sortBy] ?? 0)
      return sortDir === 'asc' ? av - bv : bv - av
    })

    return list
  }, [deferredPlayers, sortBy, sortDir])

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
        const serverInfo = await sendNui('getServerInfo', {}, mockSummary)
        setSummary(serverInfo || mockSummary)
      } catch (e: any) {
        setError(e?.message ?? t('error_loading_data'))
      }
    }
    load()
  }, [sendNui])

  // Fetch Players (Progressive)
  useEffect(() => {
    let mounted = true

    const fetchPlayers = async () => {
        if (playersSearch !== '') {
             abortSyncRef.current = true
        } else {
             abortSyncRef.current = false
        }

         // Cache Check
         if (playersSearch === '') {
              const now = Date.now()
              if (now - lastPlayersFetch < 60000 && players.length > 0) {
                  setLoading(false)
                  return
              }
         }

        setLoading(true)
        try {
            const limit = 300
            const mock: any = { data: MOCK_PLAYERS.slice(0, limit), total: MOCK_PLAYERS.length, pages: Math.ceil(MOCK_PLAYERS.length / limit) }
            const payload = { page: 1, limit: limit, search: playersSearch }

            const response = await sendNui('getPlayers', payload, mock)

            if (!mounted) return

            const data = Array.isArray(response) ? response : (response.data || [])
            const total = Array.isArray(response) ? response.length : (response.total || 0)
            const pages = Array.isArray(response) ? 1 : (response.pages || 1)

            setPlayers(data)
            setPagination(prev => ({ ...prev, page: 1, total, totalPages: pages }))

            // Start Sync if needed
            if (playersSearch === '' && pages > 1) {
                setTimeout(() => syncRemainingPages(2, pages, ''), 1000)
            } else {
                setIsSyncing(false)
            }

            if (playersSearch === '') {
                setLastPlayersFetch(Date.now())
            }

        } catch (e: any) {
             // ignore
        } finally {
            if(mounted) setLoading(false)
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
  }, [sendNui, playersSearch]) // Removed 'page' dependency as we don't paginate manually anymore

    const SyncFooter = () => {
       if (!loading && !isSyncing) return null
       return (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">
                {loading && <div className="bg-background p-2 rounded-full shadow-lg border border-border"><MriSpinner size="lg" /></div>}
                {isSyncing && !loading && (
                    <div className="flex items-center gap-2 text-xs bg-card px-4 py-2 rounded-full shadow-lg border border-primary/20 text-primary animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin"/>
                        {t('loading_more')} ({players.length}/{pagination.total})
                    </div>
                )}
            </div>
       )
    }



  if (loading || !summary) return <DashboardSkeleton />
  if (error) return <div className="p-6 text-red-400">{error}</div>

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <MriPageHeader title={t('nav_dashboard')} icon={LayoutDashboard}>
         {debugMode && <DevLocaleSwitcher className="w-40" />}
      </MriPageHeader>

      <div className="flex-1 flex flex-col p-8 no-scrollbar overflow-hidden">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-lg font-bold text-foreground">{t('players')}</h2>
              <div className="relative w-80">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <MriInput
                    placeholder={t('search_placeholder_players') || 'Search players...'}
                    value={playersSearch}
                    onChange={e => setPlayersSearch((e.target as HTMLInputElement).value)}
                    className="bg-card border-border focus:border-ring pl-9"
                 />
              </div>
            </div>

            <div className="border border-border rounded-xl bg-card flex-1 min-h-0 relative overflow-hidden">
                <TableVirtuoso
                    style={{ height: '100%', width: '100%' }}
                    data={displayedPlayers}
                    components={{
                         Table: (props) => <table {...props} className="w-full text-left" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }} />,
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
                    itemContent={(index, p) => (
                        <>
                            <td className="px-6 py-4 font-medium text-foreground w-[30%] truncate">{p.name || p.cid || p.id}</td>
                            <td className="px-6 py-4 text-muted-foreground font-mono text-xs w-[15%] truncate">{p.cid ?? '-'}</td>
                            <td className="px-6 py-4 text-foreground/80 w-[20%] truncate">
                                {Array.isArray(p.money)
                                    ? (p.money.find((m: any) => m.name === 'cash')?.amount ?? 0)
                                    : (p.cash ?? p.money ?? '-')}
                            </td>
                            <td className="px-6 py-4 text-foreground/80 w-[20%] truncate">
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
                <SyncFooter />
            </div>
          </div>
      </div>
    </div>
  )
}
