import React, { useEffect, useState } from 'react'
import { MriSpinner } from '@mriqbox/ui-kit'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { useI18n } from '@/hooks/useI18n'
import {
    Wallet,
    Landmark,
    Coins,
    Users,
    Car,
    ShieldAlert,
    UserCircle,
    Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
    title: string
    value: string | number
    icon: React.ReactNode
    variant?: 'default' | 'warning' | 'info' | 'success' | 'purple' | 'indigo' | 'orange'
}

function StatCard({ title, value, icon, variant = 'default' }: StatCardProps) {
    const variants = {
        default: 'from-primary/10 to-primary/5 border-primary/20 text-primary',
        warning: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-500',
        info: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-500',
        success: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-500',
        purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-500',
        indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-500',
        orange: 'from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-500'
    }

    return (
        <div className={cn(
            "p-6 rounded-2xl border bg-gradient-to-br transition-all hover:scale-[1.02] duration-300 group",
            variants[variant] || variants.default
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-background/50 backdrop-blur-sm border border-current/10 group-hover:border-current/20 transition-colors">
                    {icon}
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                <h3 className="text-3xl font-black tracking-tight text-foreground tabular-nums">
                    {value}
                </h3>
            </div>
        </div>
    )
}

const mockSummary = {
    totalCash: 15000,
    totalBank: 200000,
    totalCrypto: 1000,
    uniquePlayers: 42,
    vehicleCount: 140,
    bansCount: 5,
    characterCount: 70
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

    if (loading) return (
        <div className="h-48 w-full flex items-center justify-center bg-card/50 rounded-2xl border border-dashed border-border">
            <MriSpinner />
        </div>
    )

    if (error) return (
        <div className="p-6 text-destructive bg-destructive/10 rounded-2xl border border-destructive/20 flex items-center gap-3">
            <Activity className="w-5 h-5" /> 
            <span className="font-medium">{error}</span>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Activity className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{t('qadmin.dashboard.title')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('dashboard.stats.online')}
                    value={players.length}
                    icon={<Users className="w-6 h-6" />}
                    variant="success"
                />
                <StatCard
                    title={t('dashboard.stats.cash')}
                    value={`$${(summary.totalCash || 0).toLocaleString()}`}
                    icon={<Wallet className="w-6 h-6" />}
                    variant="success"
                />
                <StatCard
                    title={t('dashboard.stats.bank')}
                    value={`$${(summary.totalBank || 0).toLocaleString()}`}
                    icon={<Landmark className="w-6 h-6" />}
                    variant="info"
                />
                <StatCard
                    title={t('dashboard.stats.crypto')}
                    value={`${(summary.totalCrypto || 0).toLocaleString()}`}
                    icon={<Coins className="w-6 h-6" />}
                    variant="warning"
                />
                <StatCard
                    title={t('dashboard.stats.unique')}
                    value={summary.uniquePlayers || 0}
                    icon={<Activity className="w-6 h-6" />}
                    variant="purple"
                />
                <StatCard
                    title={t('dashboard.stats.vehicles')}
                    value={summary.vehicleCount || 0}
                    icon={<Car className="w-6 h-6" />}
                    variant="indigo"
                />
                <StatCard
                    title={t('dashboard.stats.bans')}
                    value={summary.bansCount || 0}
                    icon={<ShieldAlert className="w-6 h-6" />}
                    variant="warning"
                />
                <StatCard
                    title={t('dashboard.stats.chars')}
                    value={summary.characterCount || 0}
                    icon={<UserCircle className="w-6 h-6" />}
                    variant="orange"
                />
            </div>
        </div>
    )
}
