import { useI18n } from '@/hooks/useI18n'
import { useAppState } from '@/context/AppState'
import { MriSidebar, MriSidebarItem, MriScrollArea } from '@mriqbox/ui-kit'
import { LayoutDashboard, Users, Box, Car, Settings, Map as MapIcon, Sun, Monitor, MessageSquare, Wand2, Info, Briefcase, Shield, Container, Moon, SquareCode, ScrollText } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import pkg from '../../package.json'

interface SidebarProps {
    onRoute: (r: any) => void
    currentRoute: string
}

import { hasPermission, getPagePermissions } from '@/utils/permissions'
import { useMemo } from 'react'

export default function Sidebar({ onRoute, currentRoute }: SidebarProps) {
    const { t } = useI18n()
    const { menuWide, setMenuWide, myPermissions, permissionDefinitions } = useAppState()
    const pagePermissions = useMemo(() => getPagePermissions(permissionDefinitions), [permissionDefinitions])
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => {
        if (theme === 'dark') setTheme('light')
        else if (theme === 'light') setTheme('system')
        else setTheme('dark')
    }

    const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

    const items: MriSidebarItem[] = [
        { icon: LayoutDashboard, label: t('qadmin.page.dashboard'), route: 'dashboard' },
        { icon: MapIcon, label: t('qadmin.page.livemap') || 'Live Map', route: 'livemap' },
        { icon: Monitor, label: t('qadmin.page.livescreens') || 'Live Screens', route: 'livescreens' },
        { icon: Users, label: t('qadmin.page.players'), route: 'players' },
        { icon: Briefcase, label: t('qadmin.page.groups'), route: 'groups' },
        { icon: MessageSquare, label: t('qadmin.page.staffchat'), route: 'staffchat' },
        { icon: Box, label: t('qadmin.page.items'), route: 'items' },
        { icon: Car, label: t('qadmin.page.vehicles'), route: 'vehicles' },
        { icon: Wand2, label: t('qadmin.page.actions'), route: 'actions' },
        { icon: Shield, label: t('qadmin.page.permissions') || 'Permissions', route: 'permissions' },
        { icon: Container, label: t('qadmin.page.resources'), route: 'resources' },
        { icon: ScrollText, label: t('qadmin.page.logs') || 'Logs', route: 'logs' },
        { icon: Box, label: '', divider: true },
        { icon: Settings, label: t('nav.settings'), route: 'settings' },
        { icon: Info, label: t('nav.credits'), route: 'credits' },
        { icon: SquareCode, label: t('qadmin.page.devmode'), route: 'devmode' },
    ].filter(item => {
        if (item.divider) return true
        if (!item.route) return true
        if (item.route in pagePermissions) {
            return hasPermission(myPermissions, pagePermissions[item.route])
        }
        return true
    })

    return (
        <div className="flex flex-col h-full bg-card border-r border-border">
            <MriScrollArea className="flex-1 min-h-0">
                <MriSidebar
                    items={items}
                    activeRoute={currentRoute}
                    onNavigate={onRoute}
                    collapsed={!menuWide}
                    onToggleCollapse={() => setMenuWide(!menuWide)}
                />
            </MriScrollArea>

            <div className={cn(
                "p-3 border-t border-border flex flex-col gap-2 transition-all duration-300",
                !menuWide && "items-center"
            )}>
                <div className={cn(
                    "flex items-center w-full",
                    !menuWide ? "justify-center" : "justify-between"
                )}>
                    {menuWide && (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                            {t('settings.theme.mode') || "Theme"}
                        </span>
                    )}
                    <button
                        onClick={toggleTheme}
                        className={cn(
                            "p-2 rounded-lg transition-all hover:bg-muted text-muted-foreground hover:text-primary active:scale-95",
                            !menuWide && "w-10 h-10 flex items-center justify-center bg-secondary/30"
                        )}
                        title={t(`settings.theme.${theme}`)}
                    >
                        <ThemeIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className={cn(
                    "flex px-1 items-center",
                    !menuWide ? "justify-center" : "justify-start"
                )}>
                    <span className="text-[9px] font-mono text-muted-foreground/60 select-none">
                        v{pkg.version}
                    </span>
                </div>
            </div>
        </div>
    )
}
