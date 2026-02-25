import React, { useEffect, useState } from 'react'
import Spinner from '@/components/Spinner'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { useI18n } from '@/hooks/useI18n'
import {
    Wallet,
    Landmark,
    Bitcoin,
    Users,
    Car,
    Gavel,
    UserCircle,
    Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mockSummary = {
  totalCash: 15000,
  totalBank: 200000,
  totalCrypto: 1000,
  uniquePlayers: 42,
  vehicleCount: 140,
  bansCount: 5,
  characterCount: 70
}

interface StatCardProps {
    title: string
    value: string | number
    icon: React.ReactNode
    color: string
}

function StatCard({ title, value, icon, color }: StatCardProps) {
    return (
        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors group">
            <div className={cn("p-3 rounded-lg bg-opacity-10 border border-opacity-20", color)}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-zinc-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{value}</p>
            </div>
        </div>
    )
}

export default function DashboardStats() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const { sendNui } = useNui()
  const { t } = useI18n()
  const { players } = useAppState()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const serverInfo = await sendNui('getServerInfo', {}, mockSummary)
        setSummary(serverInfo || mockSummary)
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sendNui])

  if (loading) return <div className="h-full w-full flex items-center justify-center"><Spinner /></div>
  if (error) return <div className="p-6 text-red-500 bg-red-500/10 rounded-lg border border-red-500/20 m-4 flex items-center gap-2"><Activity className="w-5 h-5" /> {error}</div>

  return (
    <div className="h-full w-full p-6 overflow-auto bg-zinc-900/10">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-white">{t('title_dashboard')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
            title={t('players_online')}
            value={players.length}
            icon={<Activity className="w-6 h-6 text-green-500" />}
            color="bg-green-500/10 border-green-500/20"
        />
        <StatCard
            title={t('dashboard_cash_on_hand')}
            value={`$${summary.totalCash?.toLocaleString()}`}
            icon={<Wallet className="w-6 h-6 text-emerald-500" />}
            color="bg-emerald-500/10 border-emerald-500/20"
        />
        <StatCard
            title={t('dashboard_bank_balance')}
            value={`$${summary.totalBank?.toLocaleString()}`}
            icon={<Landmark className="w-6 h-6 text-blue-500" />}
            color="bg-blue-500/10 border-blue-500/20"
        />
        <StatCard
            title={t('dashboard_crypto')}
            value={`$${summary.totalCrypto?.toLocaleString()}`}
            icon={<Bitcoin className="w-6 h-6 text-yellow-500" />}
            color="bg-yellow-500/10 border-yellow-500/20"
        />
        <StatCard
            title={t('dashboard_unique_players')}
            value={summary.uniquePlayers}
            icon={<Users className="w-6 h-6 text-purple-500" />}
            color="bg-purple-500/10 border-purple-500/20"
        />
        <StatCard
            title={t('title_vehicles')}
            value={summary.vehicleCount}
            icon={<Car className="w-6 h-6 text-indigo-500" />}
            color="bg-indigo-500/10 border-indigo-500/20"
        />
        <StatCard
            title={t('dashboard_bans') || 'Bans'}
            value={summary.bansCount}
            icon={<Gavel className="w-6 h-6 text-red-500" />}
            color="bg-red-500/10 border-red-500/20"
        />
        <StatCard
            title={t('dashboard_characters') || 'Characters'}
            value={summary.characterCount}
            icon={<UserCircle className="w-6 h-6 text-orange-500" />}
            color="bg-orange-500/10 border-orange-500/20"
        />
      </div>
    </div>
  )
}
