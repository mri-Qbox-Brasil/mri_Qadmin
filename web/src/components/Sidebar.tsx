import { useI18n } from '@/hooks/useI18n'
import { useAppState } from '@/context/AppState'
import { MriSidebar, MriSidebarItem } from '@mriqbox/ui-kit'
import * as LucideIcons from 'lucide-react'
import { LayoutDashboard, Users, Box, Car, Settings, Map as MapIcon, Sun, Monitor, MessageSquare, Wand2, Info, Briefcase, Shield, Container, Moon, SquareCode, ScrollText, Crown } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import pkg from '../../package.json'
import { MriPluginManifest } from '@/plugin/types'

interface SidebarProps {
    onRoute: (r: any) => void
    currentRoute: string
    plugins?: Record<string, MriPluginManifest>
}

// Resolve nome de icone lucide ('map-pin' -> MapPin) pra component. Fallback
// pra Box se icone nao existir. Usado pra plugins que mandam icone como string
// no manifest (nao da pra serializar component pelo bridge Lua->NUI).
const resolveLucideIcon = (name: string) => {
    const pascal = name
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('')
    return (LucideIcons as any)[pascal] || Box
}

import { hasPermission, getPagePermissions } from '@/utils/permissions'
import { useMemo } from 'react'

export default function Sidebar({ onRoute, currentRoute, plugins = {} }: SidebarProps) {
    const { t } = useI18n()
    const { menuWide, setMenuWide, myPermissions, permissionDefinitions, gameData } = useAppState()
    const qboxEnabled = !!gameData?.qboxEnabled
    const pagePermissions = useMemo(() => getPagePermissions(permissionDefinitions), [permissionDefinitions])
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => {
        if (theme === 'dark') setTheme('light')
        else if (theme === 'light') setTheme('system')
        else setTheme('dark')
    }

    const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

    // Plugin items dinamicos (vem do registry Lua via mri_Qadmin:registerPlugin).
    // Server-side ja filtra por ACE perm do source antes de enviar — qualquer
    // plugin que chegar aqui e acessivel pelo user atual.
    const pluginItems: MriSidebarItem[] = useMemo(() => {
        return Object.values(plugins).map((p) => ({
            icon: resolveLucideIcon(p.icon),
            label: p.label,
            route: `plugin:${p.id}`,
        }))
    }, [plugins])

    const items: MriSidebarItem[] = [
        { icon: LayoutDashboard, label: t('qadmin.page.dashboard'), route: 'dashboard' },
        { icon: MapIcon, label: t('qadmin.page.livemap') || 'Live Map', route: 'livemap' },
        { icon: Monitor, label: t('qadmin.page.livescreens') || 'Live Screens', route: 'livescreens' },
        { icon: Users, label: t('qadmin.page.players'), route: 'players' },
        { icon: Briefcase, label: t('qadmin.page.groups'), route: 'groups' },
        { icon: MessageSquare, label: t('qadmin.page.staffchat'), route: 'staffchat' },
        { icon: Box, label: t('qadmin.page.items'), route: 'items' },
        { icon: Car, label: t('qadmin.page.vehicles'), route: 'vehicles' },
        ...(qboxEnabled ? [{ icon: Crown, label: t('qadmin.page.vip') || 'VIP', route: 'vip' }] : []),
        { icon: Wand2, label: t('qadmin.page.actions'), route: 'actions' },
        { icon: Shield, label: t('qadmin.page.permissions') || 'Permissions', route: 'permissions' },
        { icon: Container, label: t('qadmin.page.resources'), route: 'resources' },
        { icon: ScrollText, label: t('qadmin.page.logs') || 'Logs', route: 'logs' },
        // Divider entre items built-in e plugins (so aparece se tem plugin)
        ...(pluginItems.length > 0 ? [{ icon: Box, label: '', divider: true }, ...pluginItems] : []),
        { icon: Box, label: '', divider: true },
        { icon: Settings, label: t('nav.settings'), route: 'settings' },
        { icon: Info, label: t('nav.credits'), route: 'credits' },
        { icon: SquareCode, label: t('qadmin.page.devmode'), route: 'devmode' },
    ].filter(item => {
        if (item.divider) return true
        if (!item.route) return true
        if (item.route === 'credits') return true
        if (item.route.startsWith('plugin:')) return true // ja filtrado em pluginItems
        if (item.route in pagePermissions) {
            return hasPermission(myPermissions, pagePermissions[item.route])
        }
        if (permissionDefinitions.length === 0) return false
        return true
    })

    return (
        <div className="flex flex-col h-full bg-card border-r border-border">
            <div className="flex-1 min-h-0 overflow-hidden">
                <MriSidebar
                    items={items}
                    activeRoute={currentRoute}
                    onNavigate={onRoute}
                    collapsed={!menuWide}
                    onToggleCollapse={() => setMenuWide(!menuWide)}
                />
            </div>

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
