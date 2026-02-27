import React, { useEffect, useMemo, useState } from "react"
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'
import { isEnvBrowser } from '@/utils/misc'
import { MriButton } from '@mriqbox/ui-kit'
import { BarChart2, X } from 'lucide-react'

const COLORS = {
    accent: "#3b82f6",
    success: "#22c55e",
    warning: "#eab308",
    error: "#ef4444",
    purple: "#a855f7",
    cyan: "#06b6d4",
    orange: "#f97316",
    pink: "#ec4899"
}

const PRIORITY_COLORS = ["#6b7280", "#3b82f6", "#eab308", "#ef4444"]
const CATEGORY_COLORS = [COLORS.accent, COLORS.success, COLORS.warning, COLORS.purple, COLORS.cyan]

interface PieChartProps {
    data: { label: string; value: number; color: string }[]
    size?: number
}

function PieChart({ data, size = 120 }: PieChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0)

    const gradientParts = useMemo(() => {
        if (total === 0) return null

        let cumulative = 0
        return data.map((d) => {
            const percent = (d.value / total) * 100
            const start = cumulative
            cumulative += percent
            return `${d.color} ${start}% ${cumulative}%`
        }).join(", ")
    }, [data, total])

    if (total === 0) {
        return (
            <div
                className="rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs"
                style={{ width: size, height: size }}
            >
                No data
            </div>
        )
    }

    return (
        <div
            className="rounded-full"
            style={{
                width: size,
                height: size,
                background: `conic-gradient(${gradientParts})`
            }}
        />
    )
}

interface BarChartProps {
    data: { label: string; value: number; color?: string }[]
    maxValue?: number
}

function BarChart({ data, maxValue }: BarChartProps) {
    const max = maxValue || Math.max(...data.map(d => d.value), 1)

    return (
        <div className="space-y-2">
            {data.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 truncate" title={item.label}>
                        {item.label}
                    </span>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div
                            className="h-full rounded transition-all duration-500 flex items-center justify-end pr-2"
                            style={{
                                width: `${(item.value / max) * 100}%`,
                                backgroundColor: item.color || COLORS.accent,
                                minWidth: item.value > 0 ? "24px" : "0"
                            }}
                        >
                            <span className="text-xs font-medium text-white drop-shadow">
                                {item.value}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

interface StatCardProps {
    label: string
    value: number | string
    icon: React.ReactNode
    color?: string
    subtext?: string
}

function StatCard({ label, value, icon, color = COLORS.accent, subtext }: StatCardProps) {
    return (
        <div className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <div style={{ color }}>{icon}</div>
                </div>
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {subtext && <p className="text-[10px] text-muted-foreground/60">{subtext}</p>}
                </div>
            </div>
        </div>
    )
}

const formatDayLabel = (dateValue: string | number): string => {
    let date: Date

    if (typeof dateValue === "number") {
        date = new Date(dateValue * 1000)
    } else {
        date = new Date(dateValue + "T00:00:00")
    }

    if (isNaN(date.getTime())) return String(dateValue)
    return date.toLocaleDateString("de-DE", { weekday: "short" })
}

export function StatisticsPanel({ onClose }: { onClose?: () => void }) {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const [statistics, setStatistics] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        if (isEnvBrowser()) {
            setTimeout(() => {
                setStatistics({
                    totalReports: 15,
                    openReports: 5,
                    claimedReports: 3,
                    resolvedReports: 7,
                    avgResolutionTime: 45, // in minutes
                    reportsByCategory: [
                        { category: "player", count: 8 },
                        { category: "bug", count: 4 },
                        { category: "question", count: 3 }
                    ],
                    reportsByPriority: [
                        { priority: 0, count: 5 },
                        { priority: 1, count: 6 },
                        { priority: 2, count: 3 },
                        { priority: 3, count: 1 }
                    ],
                    adminLeaderboard: [
                        { adminName: "Dev Admin", resolved: 4 },
                        { adminName: "Admin User", resolved: 3 }
                    ],
                    recentActivity: [
                        { date: Date.now() - 86400000 * 6, count: 2 },
                        { date: Date.now() - 86400000 * 5, count: 5 },
                        { date: Date.now() - 86400000 * 4, count: 1 },
                        { date: Date.now() - 86400000 * 3, count: 3 },
                        { date: Date.now() - 86400000 * 2, count: 0 },
                        { date: Date.now() - 86400000 * 1, count: 4 },
                        { date: Date.now(), count: 0 }
                    ]
                })
                setLoading(false)
            }, 500)
            return
        }

        try {
            const data = await sendNui('mri_Qadmin:callback:GetReportStatistics')
            if (data) {
                setStatistics(data)
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    if (loading || !statistics) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('tickets_loading')}
            </div>
        )
    }

    const statusData = [
        { label: t('tickets_status_open'), value: statistics.openReports, color: COLORS.warning },
        { label: t('tickets_status_claimed'), value: statistics.claimedReports, color: COLORS.accent },
        { label: t('tickets_status_resolved'), value: statistics.resolvedReports, color: COLORS.success }
    ]

    const categoryData = statistics.reportsByCategory.map((cat: any, i: number) => ({
        label: t(`tickets_category_${cat.category}`),
        value: cat.count,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
    }))

    const priorityData = statistics.reportsByPriority.map((p: any) => ({
        label: [t('tickets_priority_low'), t('tickets_priority_normal'), t('tickets_priority_high'), t('tickets_priority_urgent')][p.priority] || `Priority ${p.priority}`,
        value: p.count,
        color: PRIORITY_COLORS[p.priority] || COLORS.accent
    }))

    const adminData = statistics.adminLeaderboard.map((admin: any, i: number) => ({
        label: admin.adminName,
        value: admin.resolved,
        color: [COLORS.accent, COLORS.success, COLORS.warning, COLORS.purple, COLORS.cyan][i % 5]
    }))

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)}m`
        const hours = Math.floor(minutes / 60)
        const mins = Math.round(minutes % 60)
        return `${hours}h ${mins}m`
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 pb-12 space-y-6 relative">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    {t('tickets_tab_statistics')}
                </h2>
                <MriButton
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    className="hover:bg-destructive/10 hover:text-destructive"
                >
                    <X className="w-4 h-4 mr-2" />
                    {t('tickets_btn_close')}
                </MriButton>
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    label={t('tickets_stats_total')}
                    value={statistics.totalReports}
                    color={COLORS.accent}
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />
                <StatCard
                    label={t('tickets_status_open')}
                    value={statistics.openReports}
                    color={COLORS.warning}
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label={t('tickets_status_claimed')}
                    value={statistics.claimedReports}
                    color={COLORS.accent}
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    }
                />
                <StatCard
                    label={t('tickets_status_resolved')}
                    value={statistics.resolvedReports}
                    color={COLORS.success}
                    subtext={statistics.avgResolutionTime > 0 ? `${t('tickets_stats_avg_time')}: ${formatTime(statistics.avgResolutionTime)}` : undefined}
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Reports by Status */}
                <div className="bg-card rounded-lg p-5 border border-border flex flex-col items-center">
                    <h3 className="text-sm font-semibold mb-6 self-start">{t('tickets_stats_by_status')}</h3>
                    <div className="flex items-center gap-8 w-full justify-center text-sm">
                        <PieChart data={statusData} size={150} />
                        <div className="space-y-3">
                            {statusData.map((item) => (
                                <div key={item.label} className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-muted-foreground w-24">{item.label}</span>
                                    <span className="font-medium text-right w-12">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reports by Category */}
                <div className="bg-card rounded-lg p-5 border border-border flex flex-col items-center">
                    <h3 className="text-sm font-semibold mb-6 self-start">{t('tickets_stats_by_category')}</h3>
                    <div className="flex items-center gap-8 w-full justify-center text-sm">
                        <PieChart data={categoryData} size={150} />
                        <div className="space-y-3">
                            {categoryData.map((item: any) => (
                                <div key={item.label} className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-muted-foreground w-24 truncate" title={item.label}>{item.label}</span>
                                    <span className="font-medium text-right w-12">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reports by Priority */}
                <div className="bg-card rounded-lg p-5 border border-border">
                    <h3 className="text-sm font-semibold mb-6">{t('tickets_stats_by_priority')}</h3>
                    <BarChart data={priorityData} />
                </div>

                {/* Admin Leaderboard */}
                <div className="bg-card rounded-lg p-5 border border-border">
                    <h3 className="text-sm font-semibold mb-6">{t('tickets_stats_leaderboard')}</h3>
                    {adminData.length > 0 ? (
                        <div className="space-y-4">
                            {adminData.slice(0, 5).map((admin: any, i: number) => (
                                <div key={admin.label} className="flex items-center gap-4">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                        style={{ backgroundColor: i === 0 ? COLORS.warning : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : COLORS.accent }}
                                    >
                                        #{i + 1}
                                    </div>
                                    <span className="font-medium flex-1 truncate text-sm">{admin.label}</span>
                                    <div className="text-right flex items-center gap-2">
                                        <span className="font-bold text-lg">{admin.value}</span>
                                        <span className="text-xs text-muted-foreground">{t('tickets_stats_resolved')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">{t('tickets_stats_no_data')}</p>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            {statistics.recentActivity && statistics.recentActivity.length > 0 && (
                <div className="bg-card rounded-lg p-6 border border-border">
                    <h3 className="text-sm font-semibold mb-6">{t('tickets_stats_recent')}</h3>
                    <div className="flex items-end gap-3 h-48">
                        {(() => {
                            const maxCount = Math.max(...statistics.recentActivity.map((d: any) => d.count), 1)
                            return statistics.recentActivity.map((day: any, i: number) => {
                                const heightPercent = (day.count / maxCount) * 100
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group mt-2">
                                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-6 bg-popover text-popover-foreground px-2 py-1 rounded shadow-sm z-10">{day.count} tickets</span>
                                        <div className="w-full relative flex items-end grow bg-muted/30 rounded-t-md overflow-hidden">
                                            <div
                                                className="w-full rounded-t-md transition-all duration-500 bg-primary hover:bg-primary/80"
                                                style={{
                                                    height: `${Math.max(heightPercent, 2)}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium mt-1">
                                            {formatDayLabel(day.date)}
                                        </span>
                                    </div>
                                )
                            })
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}
