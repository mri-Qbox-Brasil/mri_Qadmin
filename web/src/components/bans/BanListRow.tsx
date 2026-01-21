import { MriButton } from '@mriqbox/ui-kit'
import { Unlock } from 'lucide-react'
import { useI18n } from '@/context/I18n'
import StatusBadge from '@/components/shared/StatusBadge'

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

interface BanListRowProps {
  ban: Ban
  onUnban: (ban: Ban) => void
}

export default function BanListRow({ ban, onUnban }: BanListRowProps) {
  const { t } = useI18n()

  const formatDate = (ts: number) => {
    if (!ts) return t('na')
    if (ts === 2147483647) return t('ban_duration_permanent')
    return new Date(ts * 1000).toLocaleString()
  }

  const isPermanent = ban.expire === 2147483647

  return (
    <tr className="hover:bg-muted/40 transition-colors group">
        <td className="px-6 py-4 font-medium text-foreground">
            {ban.name}
            <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">ID: {ban.id}</div>
        </td>
        <td className="px-6 py-4 text-muted-foreground max-w-[300px] truncate" title={ban.reason}>{ban.reason}</td>
        <td className="px-6 py-4">
            <StatusBadge
                label={formatDate(ban.expire)}
                variant={isPermanent ? 'destructive' : 'warning'}
                size="xs"
            />
        </td>
        <td className="px-6 py-4 text-muted-foreground">{ban.bannedby}</td>
        <td className="px-6 py-4 hidden 2xl:table-cell text-muted-foreground font-mono text-xs">{ban.license}</td>
        <td className="px-6 py-4 text-center">
            <MriButton
                variant="ghost"
                size="sm"
                onClick={() => onUnban(ban)}
                className="h-8 text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-colors"
            >
                <Unlock className="h-4 w-4 mr-2" />
                {t('unban')}
            </MriButton>
        </td>
    </tr>
  )
}
