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
    UserPlus,
    Ghost,
    Wrench,
    MoveUpRight,
    Search,
    Play,
    Info,
    Clock,
    Tag,
    Hand,
    Lock,
    Trash2,
    LucideIcon
} from 'lucide-react';

export interface PermissionCategory {
    id: string;
    label: string;
    icon: LucideIcon;
}

export const CATEGORIES: Record<string, PermissionCategory> = {
    dashboard: { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    players: { id: 'players', label: 'Players', icon: Users },
    vehicles: { id: 'vehicles', label: 'Vehicles', icon: Car },
    bans: { id: 'bans', label: 'Bans', icon: Ban },
    groups: { id: 'groups', label: 'Groups', icon: Shield },
    staffchat: { id: 'staffchat', label: 'Staff Chat', icon: MessageSquare },
    items: { id: 'items', label: 'Items', icon: Package },
    commands: { id: 'commands', label: 'Commands', icon: Terminal },
    actions: { id: 'actions', label: 'Actions', icon: Zap },
    resources: { id: 'resources', label: 'Resources', icon: Play },
    settings: { id: 'settings', label: 'Settings', icon: Settings },
    livemap: { id: 'livemap', label: 'Live Map', icon: Map },
    livescreens: { id: 'livescreens', label: 'Live Screens', icon: Monitor },
    devmode: { id: 'devmode', label: 'Dev Mode', icon: Hammer },
    other: { id: 'other', label: 'Other', icon: Key },
};

export const PERMISSION_MAP: Record<string, { category: string, icon: LucideIcon, label?: string, desc?: string }> = {
    // Pages (Sections)
    'qadmin.page.dashboard': { category: 'dashboard', icon: LayoutDashboard },
    'qadmin.page.players': { category: 'players', icon: Users },
    'qadmin.page.groups': { category: 'groups', icon: Shield },
    'qadmin.page.bans': { category: 'bans', icon: Ban },
    'qadmin.page.staffchat': { category: 'staffchat', icon: MessageSquare },
    'qadmin.page.items': { category: 'items', icon: Package },
    'qadmin.page.vehicles': { category: 'vehicles', icon: Car },
    'qadmin.page.commands': { category: 'commands', icon: Terminal },
    'qadmin.page.actions': { category: 'actions', icon: Zap },
    'qadmin.page.permissions': { category: 'groups', icon: Shield },
    'qadmin.page.resources': { category: 'resources', icon: Play },
    'qadmin.page.settings': { category: 'settings', icon: Settings },
    'qadmin.page.livemap': { category: 'livemap', icon: Map },
    'qadmin.page.livescreens': { category: 'livescreens', icon: Monitor },
    'qadmin.page.devmode': { category: 'devmode', icon: Hammer },

    'qadmin.page.logs': { category: 'dashboard', icon: MessageSquare, label: 'Logs', desc: 'Action logs' },
    'qadmin.page.statistics': { category: 'dashboard', icon: LayoutDashboard, label: 'Statistics', desc: 'Server statistics' },
    'qadmin.page.reports': { category: 'players', icon: Info, label: 'Reports', desc: 'Player reports' },
    'qadmin.page.terminal': { category: 'commands', icon: Terminal, label: 'Terminal', desc: 'Console management' },

    // Core Player Actions
    'command.revive': { category: 'players', icon: Zap, label: 'Revive', desc: 'Heal and revive player' },
    'command.car': { category: 'vehicles', icon: Car, label: 'Spawn Vehicle', desc: 'Spawn a new vehicle' },
    'command.dv': { category: 'vehicles', icon: Trash2, label: 'Delete Vehicle', desc: 'Remove current vehicle' },
    
    // Action permissions from screenshots
    'info_admin': { category: 'dashboard', icon: Info, label: 'Info admin', desc: 'View admin info' },
    'server_time': { category: 'settings', icon: Clock, label: 'Server time', desc: 'Change time' },
    'staff_clothing': { category: 'players', icon: Users, label: 'Staff clothing', desc: 'Staff clothing' },
    'fix_vehicle': { category: 'vehicles', icon: Wrench, label: 'Fix vehicle', desc: 'Repair vehicle' },
    'announcements': { category: 'dashboard', icon: Zap, label: 'Announcements', desc: 'Global announcements' },
    'god_mode': { category: 'players', icon: Shield, label: 'God mode', desc: 'Damage immunity' },
    'tag': { category: 'players', icon: Tag, label: 'Tag', desc: 'Tags above players' },
    'bring': { category: 'players', icon: Hand, label: 'Bring', desc: 'Bring player' },
    'noclip': { category: 'players', icon: Ghost, label: 'Noclip', desc: 'Pass through surfaces' },
    'invisibility': { category: 'players', icon: Ghost, label: 'Invisibility', desc: 'Invisible mode' },
    'delete_vehicle': { category: 'vehicles', icon: Car, label: 'Delete vehicle', desc: 'Delete vehicle' },
    'teleport_to_player': { category: 'players', icon: MoveUpRight, label: 'Teleport to player', desc: 'Go to player' },
};

export const getPermissionInfo = (permission: string) => {
    // Try exact match
    if (PERMISSION_MAP[permission]) return PERMISSION_MAP[permission];

    // Try page match
    for (const [key, value] of Object.entries(PERMISSION_MAP)) {
        if (permission.startsWith(key)) return value;
    }

    // Default categorization
    if (permission.startsWith('qadmin.page.')) return { category: 'settings', icon: Key };
    if (permission.startsWith('command.')) return { category: 'commands', icon: Terminal };
    if (permission.startsWith('action.')) return { category: 'actions', icon: Zap };

    return { category: 'other', icon: Lock };
};
