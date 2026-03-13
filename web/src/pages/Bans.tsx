import React from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriPageHeader, MriCompactSearch } from '@mriqbox/ui-kit'
import { RefreshCw, Gavel, X } from 'lucide-react'
import { MOCK_GAME_DATA } from '@/utils/mockData'
import ConfirmAction from '@/components/players/ConfirmAction'
import { TableVirtuoso } from 'react-virtuoso'
import BansSkeleton from '@/components/skeletons/BansSkeleton'

import { cn } from '@/lib/utils'

import BanListRow from '@/components/bans/BanListRow'

interface Ban {
    id: string
    name: string
    reason: string
    expire: number
    bannedby: string
    license: string
    discord: string
    ip: string
}

export default function Bans() {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const [bans, setBans] = React.useState<Ban[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState('')
    const [confirmBan, setConfirmBan] = React.useState<Ban | null>(null)
    const syncAbortController = React.useRef<AbortController | null>(null)
    const isInitialLoad = React.useRef(true)

    const syncRemainingPages = React.useCallback(async (totalPages: number, signal: AbortSignal) => {
        for (let p = 2; p <= totalPages; p++) {
            if (signal.aborted) break
            try {
                const res = await sendNui('mri_Qadmin:callback:GetBans', { page: p, pageSize: 100 })
                if (signal.aborted) break
                if (res && res.data) {
                    setBans(prev => [...prev, ...res.data])
                }
            } catch {
                break
            }
        }
    }, [sendNui])

    const fetchBans = React.useCallback(async (sync = false) => {
        if (!sync) setLoading(true)

        // Stop any existing sync
        if (syncAbortController.current) syncAbortController.current.abort()
        syncAbortController.current = new AbortController()
        const signal = syncAbortController.current.signal

        try {
            const response = await sendNui('mri_Qadmin:callback:GetBans', { page: 1, pageSize: 100, search: search }, {
                data: MOCK_GAME_DATA.bans,
                total: MOCK_GAME_DATA.bans.length,
                pages: 1
            })
            const data = response?.data || []
            // const total = response?.total || 0
            const totalPages = response?.pages || 1

            setBans(data)

            // Start background sync if there's more and not searching
            if (totalPages > 1 && !search) {
                syncRemainingPages(totalPages, signal)
            }
        } catch (e) {
            if ((e as any).name !== 'AbortError') {
                console.error(e)
                setBans([])
            }
        } finally {
            if (!sync) setLoading(false)
            isInitialLoad.current = false
        }
    }, [sendNui, search, syncRemainingPages])

    React.useEffect(() => {
        if (isInitialLoad.current) {
            fetchBans()
        }
        return () => {
            if (syncAbortController.current) syncAbortController.current.abort()
        }
    }, [fetchBans])

    const handleUnban = async () => {
        if (!confirmBan) return
        try {
            await sendNui('clickButton', {
                data: { event: 'mri_Qadmin:server:unban_rowid', type: 'server', perms: 'qadmin.action.unban_player' },
                selectedData: { ban_id: { value: confirmBan.id } }
            })
            setConfirmBan(null)
            fetchBans()
        } catch (_e) {
            console.error(_e)
        }
    }

    const banOptions = React.useMemo(() => {
        return bans.map(b => ({
            value: b.name || b.id,
            label: `${b.name || 'Unknown'} (${b.id})`
        }))
    }, [bans])

    const filteredBans = React.useMemo(() => {
        if (search && !isInitialLoad.current) return bans // If searching, server already filtered it

        // Otherwise local filter (for background sync results)
        const s = search.toLowerCase()
        return bans.filter(ban => {
            return (ban.name && ban.name.toLowerCase().includes(s)) ||
                (ban.reason && ban.reason.toLowerCase().includes(s)) ||
                (ban.license && ban.license.toLowerCase().includes(s)) ||
                (ban.bannedby && ban.bannedby.toLowerCase().includes(s)) ||
                (ban.discord && ban.discord.toLowerCase().includes(s)) ||
                (ban.ip && ban.ip.toLowerCase().includes(s)) ||
                String(ban.id).includes(s)
        })
    }, [bans, search])

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('nav_bans')} icon={Gavel} countLabel={t('records')} count={filteredBans.length}>
                <div className="flex items-center gap-2">
                    <MriCompactSearch
                        placeholder={t('search_placeholder_players')}
                        value={search}
                        onChange={setSearch}
                        options={banOptions}
                        searchPlaceholder={t('search_placeholder_players')}
                        className="w-8 h-8 border-border bg-card/60"
                    />
                    {search && (
                        <MriButton
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => setSearch('')}
                            title={t('common_clear')}
                        >
                            <X size={16} />
                        </MriButton>
                    )}
                </div>
                <MriButton onClick={() => fetchBans()} disabled={loading} size="icon" variant="outline" className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10">
                    <RefreshCw className={cn("h-4 w-4", loading && 'animate-spin')} />
                </MriButton>
            </MriPageHeader>

            <div className="flex-1 overflow-hidden py-2">
                {loading && bans.length === 0 ? (
                    <BansSkeleton />
                ) : filteredBans.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Gavel className="w-12 h-12 opacity-20" />
                        <p>{t('none_found')}</p>
                    </div>
                ) : (
                    <TableVirtuoso
                        style={{ height: '100%' }}
                        data={filteredBans}
                        fixedHeaderContent={() => (
                            <tr className="bg-card border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
                                <th className="px-6 py-4 text-left font-bold w-[20%]">{t('bans_name')}</th>
                                <th className="px-6 py-4 text-left font-bold w-[30%]">{t('bans_reason')}</th>
                                <th className="px-6 py-4 text-left font-bold w-[15%]">{t('bans_expire')}</th>
                                <th className="px-6 py-4 text-left font-bold w-[15%]">{t('bans_banned_by')}</th>
                                <th className="px-6 py-4 text-left font-bold hidden 2xl:table-cell w-[15%]">{t('bans_license')}</th>
                                <th className="px-6 py-4 text-center font-bold w-[100px]">{t('bans_action')}</th>
                            </tr>
                        )}
                        components={{
                            Table: (props: any) => <table {...props} className="w-full text-left table-fixed" />,
                            TableRow: (props: any) => <tr {...props} className="hover:bg-muted/40 transition-colors group border-b border-border/50" />,
                        }}
                        itemContent={(_: number, ban: Ban) => (
                            <BanListRow ban={ban} onUnban={setConfirmBan} />
                        )}
                    />
                )}
            </div>

            {confirmBan && (
                <ConfirmAction
                    text={t('confirm_unban', [confirmBan.name])}
                    onConfirm={handleUnban}
                    onCancel={() => setConfirmBan(null)}
                />
            )}
        </div>
    )
}
