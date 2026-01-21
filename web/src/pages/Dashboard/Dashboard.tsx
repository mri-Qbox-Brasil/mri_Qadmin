import React, { useEffect, useState } from 'react'

import { useI18n } from '@/context/I18n'
import Spinner from '@/components/Spinner'
import { useNui } from '@/context/NuiContext'
import { MriPageHeader, MriInput } from '@mriqbox/ui-kit'
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
    Search,
    LayoutDashboard
} from 'lucide-react'
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
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { sendNui, debugMode } = useNui()
  const { t } = useI18n()
  const { players, setPlayers } = useAppState()

  const displayedPlayers = React.useMemo(() => {
    if (!players) return []
    const q = (playersSearch || '').toLowerCase().trim()
    let list = players.filter((p: any) => {
      if (!q) return true
      return (
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.cid || '').toLowerCase().includes(q) ||
        String(p.id || '').toLowerCase().includes(q)
      )
    })

    if (!sortBy) return list

    list = list.slice().sort((a: any, b: any) => {
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
  }, [players, playersSearch, sortBy, sortDir])

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
      setLoading(true)
      try {
        const serverInfo = await sendNui('getServerInfo', {}, mockSummary)
        setSummary(serverInfo || mockSummary)
      } catch (e: any) {
        setError(e?.message ?? t('error_loading_data'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sendNui])

  // ensure players are populated even if the Players page wasn't opened
  useEffect(() => {
    if (players && players.length > 0) return
    let mounted = true
    async function loadPlayers() {
      try {
        const mock: any[] = MOCK_PLAYERS
        const list = await sendNui('getPlayers', {}, mock)
        if (!mounted) return
        if (list && Array.isArray(list) && list.length > 0) {
          try { setPlayers(list) } catch (e) {}
        }
      } catch (e) {
        // ignore errors, players may be populated elsewhere
      }
    }
    loadPlayers()
    return () => { mounted = false }
  }, [players, sendNui, setPlayers])

  if (loading) return <div className="h-full w-full flex flex-col bg-background"><MriPageHeader title={t('nav_dashboard')} icon={LayoutDashboard} /><div className="flex-1 flex items-center justify-center"><Spinner /></div></div>
  if (error) return <div className="p-6 text-red-400">{error}</div>

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <MriPageHeader title={t('nav_dashboard')} icon={LayoutDashboard}>
         {debugMode && <DevLocaleSwitcher className="w-40" />}
      </MriPageHeader>

      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
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
          <div>
            <div className="flex items-center justify-between mb-4">
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

            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b border-border">
                    <tr className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('name')}>
                        {t('player_name')} {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-6 py-4">CID</th>
                      <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('cash')}>
                        {t('dashboard_cash_on_hand')} {sortBy === 'cash' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bank')}>
                        {t('dashboard_bank_balance')} {sortBy === 'bank' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('crypto')}>
                        {t('dashboard_crypto')} {sortBy === 'crypto' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedPlayers && displayedPlayers.length > 0 ? (
                    displayedPlayers.map((p: any) => (
                      <tr key={p.id || p.name} className="hover:bg-muted/40 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{p.name || p.cid || p.id}</td>
                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{p.cid ?? '-'}</td>
                        <td className="px-6 py-4 text-foreground/80">{p.cash ?? p.money ?? '-'} </td>
                        <td className="px-6 py-4 text-foreground/80">{p.bank ?? '-'} </td>
                        <td className="px-6 py-4 text-foreground/80">{p.crypto ?? '-'} </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">{t('no_player_available')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </div>
  )
}
