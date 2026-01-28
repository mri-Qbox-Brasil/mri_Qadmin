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
    Settings,
    Shield,
    Package
} from 'lucide-react'

interface SidebarProps {
    onRoute: (r: any) => void
    currentRoute: string
}

import { hasPermission, PAGE_PERMISSIONS } from '@/utils/permissions'

// ... existing imports

export default function Sidebar({ onRoute, currentRoute }: SidebarProps) {
  const { t } = useI18n()
  const { menuWide, setMenuWide, myPermissions } = useAppState()

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
    { icon: Shield, label: 'Permissions', route: 'permissions' },
    { icon: Package, label: t('nav_resources'), route: 'resources' },
    { icon: Box, label: '', divider: true },
    { icon: Settings, label: t('nav_settings'), route: 'settings' },
    { icon: Info, label: t('nav_credits'), route: 'credits' },
  ].filter(item => {
      if (item.divider) return true
      if (!item.route) return true
      // Check if permission exists for route
      if (item.route in PAGE_PERMISSIONS) {
          return hasPermission(myPermissions, PAGE_PERMISSIONS[item.route as keyof typeof PAGE_PERMISSIONS])
      }
      return true
  })

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
