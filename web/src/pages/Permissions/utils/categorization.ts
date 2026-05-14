import {
    LayoutDashboard,
    Users,
    Shield,
    Ban,
    MessageSquare,
    Package,
    Car,
    Terminal,
    Zap,
    Settings,
    Map,
    Monitor,
    Hammer,
    Key,
    Wrench,
    MoveUpRight,
    Info,
    Clock,
    Tag,
    Hand,
    Ghost,
    Lock,
    Trash2,
    Megaphone,
    Shirt,
    DollarSign,
    Archive,
    Unlock,
    Play,
    LucideIcon,
    Crosshair,
    Heart,
    Fingerprint,
    Copy,
    RefreshCw,
    Code,
    Server,
    Eye,
    VolumeX,
    Activity,
    Fuel,
    Navigation,
    AlertTriangle,
    Gavel,
    Wand2,
    Star,
} from 'lucide-react';
import type { PermDef } from '@/utils/permissions';

export interface PermissionCategory {
    id: string;
    label: string;
    icon: LucideIcon;
}

// Display order matters — this is the order sections appear in the GroupEditor.
export const CATEGORIES: Record<string, PermissionCategory> = {
    dashboard:   { id: 'dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
    players:     { id: 'players',     label: 'Jogadores',      icon: Users           },
    moderation:  { id: 'moderation',  label: 'Moderação',      icon: Gavel           },
    staffchat:   { id: 'staffchat',   label: 'Staff Chat',     icon: MessageSquare   },
    items:       { id: 'items',       label: 'Itens',          icon: Package         },
    vehicles:    { id: 'vehicles',    label: 'Veículos',       icon: Car             },
    self:        { id: 'self',        label: 'Habilidades',    icon: Wand2           },
    actions:     { id: 'actions',     label: 'Ações',          icon: Zap             },
    commands:    { id: 'commands',    label: 'Comandos',       icon: Terminal        },
    resources:   { id: 'resources',   label: 'Recursos',       icon: Play            },
    settings:    { id: 'settings',    label: 'Configurações',  icon: Settings        },
    livemap:     { id: 'livemap',     label: 'Mapa ao Vivo',   icon: Map             },
    livescreens: { id: 'livescreens', label: 'Telas ao Vivo',  icon: Monitor         },
    devmode:     { id: 'devmode',     label: 'Dev Mode',       icon: Hammer          },
    groups:      { id: 'groups',      label: 'Grupos',         icon: Shield          },
    permissions: { id: 'permissions', label: 'Permissões',     icon: Key             },
    vip:         { id: 'vip',         label: 'VIP',            icon: Star            },
    other:       { id: 'other',       label: 'Outros',         icon: Lock            },
};

// Default icon per category — used when a permission has no specific icon override.
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
};

// Per-permission icon overrides (only when it differs from the category default).
const PERM_ICONS: Partial<Record<string, LucideIcon>> = {
    // Pages
    'qadmin.page.dashboard':   LayoutDashboard,
    'qadmin.page.players':     Users,
    'qadmin.page.staffchat':   MessageSquare,
    'qadmin.page.items':       Package,
    'qadmin.page.vehicles':    Car,
    'qadmin.page.commands':    Terminal,
    'qadmin.page.actions':     Zap,
    'qadmin.page.resources':   Play,
    'qadmin.page.settings':    Settings,
    'qadmin.page.livemap':     Map,
    'qadmin.page.livescreens': Monitor,
    'qadmin.page.devmode':     Hammer,
    'qadmin.page.groups':      Shield,
    'qadmin.page.permissions': Key,
    'qadmin.page.logs':        MessageSquare,
    'qadmin.page.statistics':  LayoutDashboard,
    'qadmin.page.reports':     Info,
    'qadmin.page.terminal':    Terminal,
    'qadmin.page.staff_point': Clock,
    'qadmin.page.vip':         Star,
    // Dashboard actions
    'qadmin.action.announcements':      Megaphone,
    'qadmin.action.clear_chat':         Trash2,
    'qadmin.action.info_admin':         Info,
    'qadmin.action.view_detailed_logs': MessageSquare,
    // Actions manager
    'qadmin.action.manage_actions':     Settings,
    // Players
    'qadmin.action.view_player_identifiers': Fingerprint,
    'qadmin.action.track_player':       Crosshair,
    'qadmin.action.set_vital':          Heart,
    'qadmin.action.tag':                Tag,
    'qadmin.action.manage_reports':     Info,
    'qadmin.action.delete_report':      Trash2,
    'qadmin.action.staff_clothing':     Shirt,
    'qadmin.action.revive':             Heart,
    'qadmin.action.revive_all':         Heart,
    'qadmin.action.bring_player':       Hand,
    'qadmin.action.teleport_to_player': MoveUpRight,
    'qadmin.action.teleport_back':      MoveUpRight,
    'qadmin.action.teleport_to_coords': MoveUpRight,
    'qadmin.action.teleport_to_location': MoveUpRight,
    'qadmin.action.teleport_to_marker': MoveUpRight,
    'qadmin.action.set_job':            Users,
    'qadmin.action.set_gang':           Users,
    'qadmin.action.fire_job':           Users,
    'qadmin.action.fire_gang':          Users,
    'qadmin.action.set_bucket':         Archive,
    'qadmin.action.get_bucket':         Archive,
    'qadmin.action.give_money':         DollarSign,
    'qadmin.action.remove_money':       DollarSign,
    'qadmin.action.give_money_all':     DollarSign,
    'qadmin.action.remove_stress':      Activity,
    'qadmin.action.clothing_menu':      Shirt,
    'qadmin.action.set_ped':            Users,
    // Moderation
    'qadmin.action.kill_player':        Trash2,
    'qadmin.action.kick_player':        Users,
    'qadmin.action.warn_player':        AlertTriangle,
    'qadmin.action.verify_player':      Shield,
    'qadmin.action.delete_character':   Trash2,
    'qadmin.action.spectate_player':    Monitor,
    'qadmin.action.freeze_player':      Lock,
    'qadmin.action.mute_player':        VolumeX,
    'qadmin.action.blackout':           Ghost,
    'qadmin.action.toggle_cuffs':       Lock,
    'qadmin.action.drunk_player':       Zap,
    'qadmin.action.play_sound':         Megaphone,
    // Bans (now in players screen)
    'qadmin.action.ban_player':         Ban,
    'qadmin.action.unban_player':       Unlock,
    // Staff Chat
    'qadmin.action.staff_chat_send':    MessageSquare,
    // Items
    'qadmin.action.give_item':          Package,
    'qadmin.action.give_item_all':      Package,
    'qadmin.action.clear_inventory':    Trash2,
    'qadmin.action.clear_inventory_offline': Trash2,
    'qadmin.action.open_inventory':     Package,
    'qadmin.action.view_inventory':     Eye,
    'qadmin.action.modify_inventory':   Package,
    'qadmin.action.open_trunk':         Car,
    'qadmin.action.open_stash':         Archive,
    'qadmin.action.copy_inventory':     Copy,
    // Vehicles
    'qadmin.action.spawn_vehicle':      Car,
    'qadmin.action.delete_vehicle':     Trash2,
    'qadmin.action.admincar':           Car,
    'qadmin.action.give_car':           Car,
    'qadmin.action.change_plate':       Key,
    'qadmin.action.fix_vehicle':        Wrench,
    'qadmin.action.fix_vehicle_for':    Wrench,
    'qadmin.action.fix_self_vehicle':   Wrench,
    'qadmin.action.refuel_vehicle':     Fuel,
    'qadmin.action.max_mods':           Wrench,
    'qadmin.action.manage_vehicles':    Wrench,
    'qadmin.action.change_vehicle_property': Wrench,
    'qadmin.action.change_vehicle_state': Wrench,
    'qadmin.action.update_vehicle_stock': RefreshCw,
    // Self abilities
    'qadmin.action.revive_self':        Heart,
    'qadmin.action.god_mode':           Shield,
    'qadmin.action.noclip':             Ghost,
    'qadmin.action.invisible':          Ghost,
    'qadmin.action.set_ammo':           Zap,
    'qadmin.action.infinite_ammo':      Zap,
    'qadmin.action.toggle_duty':        Shield,
    'qadmin.action.toggle_laser':       Crosshair,
    'qadmin.action.goto_waypoint':      Navigation,
    // Commands
    'qadmin.commands':                  Terminal,
    // Resources
    'qadmin.action.change_resource':    RefreshCw,
    // Settings
    'qadmin.action.manage_settings':    Server,
    'qadmin.action.change_weather':     Settings,
    'qadmin.action.change_time':        Clock,
    'qadmin.action.server_time':        Clock,
    // Dev Mode
    'qadmin.action.toggle_devmode':     Hammer,
    'qadmin.action.vehicle_dev':        Hammer,
    'qadmin.action.toggle_coords':      Hammer,
    'qadmin.action.toggle_blips':       Hammer,
    'qadmin.action.toggle_names':       Hammer,
    'qadmin.action.toggle_mock_mode':   Code,
    // Live Screens
    'qadmin.action.screen_capture':     Monitor,
    'qadmin.action.enable_wall':        Monitor,
    'qadmin.action.manage_wall':        Eye,
    // VIP
    'qadmin.action.manage_vip':         Star,
    // Other
    'qadmin.action.staff_clock_in':     Clock,
    'qadmin.action.staff_clock_out':    Clock,
};

export function getPermIcon(id: string, category?: string): LucideIcon {
    return PERM_ICONS[id] ?? (category ? CATEGORY_ICONS[category] : undefined) ?? Lock;
}

export function getPermissionInfo(permission: string, defs: PermDef[], t?: (key: string) => string) {
    const def = defs.find(d => d.id === permission);
    const labelKey = `perm_labels.${permission}`;
    const descKey = `perm_descs.${permission}`;
    const label = (t ? t(labelKey) : undefined) || def?.label;
    const desc = (t ? t(descKey) : undefined) || def?.desc;
    if (def) {
        return { category: def.category, icon: getPermIcon(def.id, def.category), label, desc };
    }
    if (permission.startsWith('qadmin.page.'))   return { category: 'settings', icon: Key,  label, desc };
    if (permission.startsWith('qadmin.action.')) return { category: 'other',    icon: Zap,  label, desc };
    return { category: 'other', icon: Lock, label, desc };
}

export function getFriendlyPermissionName(permission: string, defs: PermDef[], t?: (key: string) => string): string {
    if (t) {
        const translated = t(`perm_labels.${permission}`);
        if (translated !== `perm_labels.${permission}`) return translated;
    }
    const def = defs.find(d => d.id === permission);
    if (def?.label) return def.label;
    if (permission.startsWith('qadmin.page.')) {
        const page = permission.replace('qadmin.page.', '');
        return page.charAt(0).toUpperCase() + page.slice(1);
    }
    if (permission.startsWith('qadmin.action.')) {
        const action = permission.replace('qadmin.action.', '').replace(/_/g, ' ');
        return action.charAt(0).toUpperCase() + action.slice(1);
    }
    return permission;
}
