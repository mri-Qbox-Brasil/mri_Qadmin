import {
    LayoutDashboard,
    Users,
    Gavel,
    MessageSquare,
    Package,
    Car,
    Wand2,
    Zap,
    Terminal,
    Play,
    Settings,
    Map,
    Monitor,
    Hammer,
    Shield,
    Key,
    Star,
    Lock,
    LucideIcon,
} from 'lucide-react'
import type { PermDef } from '@/utils/permissions'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    dashboard:   LayoutDashboard,
    players:     Users,
    moderation:  Gavel,
    staffchat:   MessageSquare,
    items:       Package,
    vehicles:    Car,
    self:        Wand2,
    actions:     Zap,
    commands:    Terminal,
    resources:   Play,
    settings:    Settings,
    livemap:     Map,
    livescreens: Monitor,
    devmode:     Hammer,
    groups:      Shield,
    permissions: Key,
    vip:         Star,
    other:       Lock,
}

export function getCategoryIcon(id: string): LucideIcon {
    return CATEGORY_ICONS[id] ?? Lock
}

export function getFriendlyPermissionName(permission: string, defs: PermDef[], t?: (key: string) => string): string {
    if (t) {
        const translated = t(`perm_labels.${permission}`)
        if (translated !== `perm_labels.${permission}`) return translated
    }
    const def = defs.find(d => d.id === permission)
    if (def?.label) return def.label
    if (permission.startsWith('qadmin.page.')) {
        const page = permission.replace('qadmin.page.', '')
        return page.charAt(0).toUpperCase() + page.slice(1)
    }
    if (permission.startsWith('qadmin.action.')) {
        const action = permission.replace('qadmin.action.', '').replace(/_/g, ' ')
        return action.charAt(0).toUpperCase() + action.slice(1)
    }
    return permission
}
