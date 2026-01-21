import { useI18n } from '@/context/I18n'
import { useAppState } from '@/context/AppState'
import { MriSidebar, MriSidebarItem } from '@mriqbox/ui-kit'
import {
    LayoutDashboard,
    Users,
    Terminal,
    MessageSquare,
    Box,
    Wand2,
    Ban,
    Car,
    Info,
    Briefcase,
    Settings
} from 'lucide-react'

interface SidebarProps {
    onRoute: (r: any) => void
    currentRoute: string
}

export default function Sidebar({ onRoute, currentRoute }: SidebarProps) {
  const { t } = useI18n()
  const { menuWide, setMenuWide } = useAppState()

  const items: MriSidebarItem[] = [
    { icon: LayoutDashboard, label: t('nav_dashboard'), route: 'dashboard' },
    { icon: Box, label: '', divider: true },
    { icon: Users, label: t('nav_players'), route: 'players' },
    { icon: Briefcase, label: t('nav_groups'), route: 'groups' },
    { icon: Ban, label: t('nav_bans'), route: 'bans' },
    { icon: MessageSquare, label: t('nav_staffchat'), route: 'staffchat' },
    { icon: Box, label: t('nav_items'), route: 'items' },
    { icon: Car, label: t('nav_vehicles'), route: 'vehicles' },
    { icon: Terminal, label: t('nav_commands'), route: 'commands' },
    { icon: Wand2, label: t('nav_actions'), route: 'actions' },
    { icon: Box, label: t('nav_resources'), route: 'resources' },
    { icon: Box, label: '', divider: true },
    { icon: Settings, label: t('nav_settings'), route: 'settings' },
    { icon: Info, label: t('nav_credits'), route: 'credits' },
  ]

  return (
    <MriSidebar
      items={items}
      activeRoute={currentRoute}
      onNavigate={onRoute}
      collapsed={!menuWide}
      onToggleCollapse={() => setMenuWide(!menuWide)}
    />
  )
}
