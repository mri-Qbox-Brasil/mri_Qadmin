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
    Container,
    Sun,
    Moon,
    Monitor,
    Map as MapIcon
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

interface SidebarProps {
    onRoute: (r: any) => void
    currentRoute: string
}

import { hasPermission, PAGE_PERMISSIONS } from '@/utils/permissions'

// ... existing imports

export default function Sidebar({ onRoute, currentRoute }: SidebarProps) {
  const { t } = useI18n()
  const { menuWide, setMenuWide, myPermissions } = useAppState()
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light')
    else if (theme === 'light') setTheme('system')
    else setTheme('dark')
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  const items: MriSidebarItem[] = [
    { icon: LayoutDashboard, label: t('nav_dashboard'), route: 'dashboard' },
    { icon: MapIcon, label: 'Live Map', route: 'livemap' },
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
    { icon: Container, label: t('nav_resources'), route: 'resources' },
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
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="flex-1 overflow-y-auto min-h-0">
        <MriSidebar
          items={items}
          activeRoute={currentRoute}
          onNavigate={onRoute}
          collapsed={!menuWide}
          onToggleCollapse={() => setMenuWide(!menuWide)}
        />
      </div>

      <div className={cn(
        "p-3 border-t border-border flex items-center transition-all duration-300",
        !menuWide ? "justify-center" : "justify-between"
      )}>
        {menuWide && (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            {t('settings_theme_mode') || "Theme"}
          </span>
        )}
        <button
          onClick={toggleTheme}
          className={cn(
            "p-2 rounded-lg transition-all hover:bg-muted text-muted-foreground hover:text-primary active:scale-95",
            !menuWide && "w-10 h-10 flex items-center justify-center bg-secondary/30"
          )}
          title={t(`settings_theme_${theme}`)}
        >
          <ThemeIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
