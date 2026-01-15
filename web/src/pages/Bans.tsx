import React from 'react'
import { useI18n } from '@/context/I18n'
import { useNui } from '@/context/NuiContext'
import Spinner from '@/components/Spinner'
import { Button, Input, PageHeader, Badge } from '@mriqbox/ui-kit'
import { RefreshCw, Unlock, Search, Gavel } from 'lucide-react'
import ConfirmAction from '@/components/players/ConfirmAction'

import { cn } from '@/lib/utils'
import { MOCK_GAME_DATA } from '@/utils/mockData'


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

  const fetchBans = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await sendNui('mri_Qadmin:callback:GetBans', {}, MOCK_GAME_DATA.bans)
      setBans(result || [])
    } catch (e) {
      console.error(e)
      setBans([])
    } finally {
      setLoading(false)
    }
  }, [sendNui])

  React.useEffect(() => {
    fetchBans()

    const handleRefresh = (data: any) => {
        if (data.action === 'refreshBans') fetchBans()
    }

    return () => {}
  }, [fetchBans])

  const handleUnban = async () => {
    if (!confirmBan) return
    try {
      await sendNui('clickButton', {
        data: 'unban_rowid',
        selectedData: { ban_id: { value: confirmBan.id } }
      })
      setConfirmBan(null)
      fetchBans()
    } catch (e) {
      console.error(e)
    }
  }

  const formatDate = (ts: number) => {
    if (!ts) return t('na')
    if (ts === 2147483647) return t('ban_duration_permanent')
    return new Date(ts * 1000).toLocaleString()
  }

  const filteredBans = bans.filter(ban => {
    const s = search.toLowerCase()
    return (ban.name && ban.name.toLowerCase().includes(s)) ||
           (ban.reason && ban.reason.toLowerCase().includes(s)) ||
           (ban.license && ban.license.toLowerCase().includes(s)) ||
           (ban.bannedby && ban.bannedby.toLowerCase().includes(s)) ||
           (ban.discord && ban.discord.toLowerCase().includes(s)) ||
           (ban.ip && ban.ip.toLowerCase().includes(s)) ||
           String(ban.id).includes(s)
  })

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <PageHeader title={t('nav_bans')} icon={Gavel} count={filteredBans.length}>
          <div className="relative w-72">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input
                  placeholder={t('search_placeholder_players')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-card border-border focus:border-ring h-10 transition-colors"
               />
          </div>
          <Button onClick={fetchBans} disabled={loading} size="icon" variant="outline" className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10">
              <RefreshCw className={cn("h-4 w-4", loading && 'animate-spin')} />
          </Button>
      </PageHeader>

      <div className="flex-1 overflow-hidden p-8">
        <div className="w-full h-full overflow-auto border border-border rounded-xl bg-card">
        {loading ? (
             <div className="h-full flex items-center justify-center text-primary"><Spinner /></div>
        ) : filteredBans.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                 <Gavel className="w-12 h-12 opacity-20" />
                 <p>{t('none_found')}</p>
             </div>
        ) : (
            <table className="w-full text-left">
                <thead className="bg-muted/50 border-b border-border sticky top-0">
                    <tr className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                        <th className="px-6 py-4">{t('bans_name')}</th>
                        <th className="px-6 py-4">{t('bans_reason')}</th>
                        <th className="px-6 py-4">{t('bans_expire')}</th>
                        <th className="px-6 py-4">{t('bans_banned_by')}</th>
                        <th className="px-6 py-4 hidden 2xl:table-cell">{t('bans_license')}</th>
                        <th className="px-6 py-4 text-center">{t('bans_action')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {filteredBans.map((ban, i) => (
                        <tr key={i} className="hover:bg-muted/40 transition-colors group">
                            <td className="px-6 py-4 font-medium text-foreground">
                                {ban.name}
                                <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">ID: {ban.id}</div>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground max-w-[300px] truncate" title={ban.reason}>{ban.reason}</td>
                            <td className="px-6 py-4">
                                <span className={cn(
                                    "px-2 py-1 rounded text-xs font-bold border",
                                    ban.expire === 2147483647
                                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                                        : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                )}>
                                    {formatDate(ban.expire)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{ban.bannedby}</td>
                            <td className="px-6 py-4 hidden 2xl:table-cell text-muted-foreground font-mono text-xs">{ban.license}</td>
                            <td className="px-6 py-4 text-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setConfirmBan(ban)}
                                    className="h-8 text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-colors"
                                >
                                    <Unlock className="h-4 w-4 mr-2" />
                                    {t('unban')}
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
        </div>
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
