import React from 'react'
import { useI18n } from '@/context/I18n'
import { useNui } from '@/context/NuiContext'
import Spinner from '@/components/Spinner'
import { MriButton, MriPageHeader } from '@mriqbox/ui-kit'
import { RefreshCw, Gavel } from 'lucide-react'
import ConfirmAction from '@/components/players/ConfirmAction'

import { cn } from '@/lib/utils'
import { MOCK_GAME_DATA } from '@/utils/mockData'

import SearchInput from '@/components/shared/SearchInput'
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
      <MriPageHeader title={t('nav_bans')} icon={Gavel} countLabel={t('records')} count={filteredBans.length}>
          <SearchInput
             placeholder={t('search_placeholder_players')}
             value={search}
             onChange={setSearch}
             width="w-72"
          />
          <MriButton onClick={fetchBans} disabled={loading} size="icon" variant="outline" className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10">
              <RefreshCw className={cn("h-4 w-4", loading && 'animate-spin')} />
          </MriButton>
      </MriPageHeader>

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
                        <BanListRow key={i} ban={ban} onUnban={setConfirmBan} />
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
