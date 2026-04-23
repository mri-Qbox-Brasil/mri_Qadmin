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
} from 'lucide-react';

export interface PermissionCategory {
    id: string;
    label: string;
    icon: LucideIcon;
}

export const CATEGORIES: Record<string, PermissionCategory> = {
    dashboard: { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    players: { id: 'players', label: 'Players', icon: Users },
    staffchat: { id: 'staffchat', label: 'Staff Chat', icon: MessageSquare },
    items: { id: 'items', label: 'Items', icon: Package },
    vehicles: { id: 'vehicles', label: 'Vehicles', icon: Car },
    commands: { id: 'commands', label: 'Commands', icon: Terminal },
    actions: { id: 'actions', label: 'Actions', icon: Zap },
    resources: { id: 'resources', label: 'Resources', icon: Play },
    settings: { id: 'settings', label: 'Settings', icon: Settings },
    livemap: { id: 'livemap', label: 'Live Map', icon: Map },
    livescreens: { id: 'livescreens', label: 'Live Screens', icon: Monitor },
    devmode: { id: 'devmode', label: 'Dev Mode', icon: Hammer },
    groups: { id: 'groups', label: 'Groups', icon: Shield },
    permissions: { id: 'permissions', label: 'Permissions', icon: Key },
    other: { id: 'other', label: 'Other', icon: Lock },
};

export const PERMISSION_MAP: Record<string, { category: string, icon: LucideIcon, label?: string, desc?: string }> = {
    // ── Pages ────────────────────────────────────────────────────────────────
    'qadmin.page.dashboard': { category: 'dashboard', icon: LayoutDashboard },
    'qadmin.page.players': { category: 'players', icon: Users },
    'qadmin.page.staffchat': { category: 'staffchat', icon: MessageSquare },
    'qadmin.page.items': { category: 'items', icon: Package },
    'qadmin.page.vehicles': { category: 'vehicles', icon: Car },
    'qadmin.page.commands': { category: 'commands', icon: Terminal },
    'qadmin.page.actions': { category: 'actions', icon: Zap },
    'qadmin.page.resources': { category: 'resources', icon: Play },
    'qadmin.page.settings': { category: 'settings', icon: Settings },
    'qadmin.page.livemap': { category: 'livemap', icon: Map },
    'qadmin.page.livescreens': { category: 'livescreens', icon: Monitor },
    'qadmin.page.devmode': { category: 'devmode', icon: Hammer },
    'qadmin.page.groups': { category: 'groups', icon: Shield },
    'qadmin.page.permissions': { category: 'permissions', icon: Key },

    // Placeholder pages (not yet implemented)
    'qadmin.page.logs': { category: 'dashboard', icon: MessageSquare, label: 'Logs', desc: 'Action logs' },
    'qadmin.page.statistics': { category: 'dashboard', icon: LayoutDashboard, label: 'Lista da Dashboard', desc: 'Permite visualizar a lista de jogadores e saldos financeiros na Dashboard' },
    'qadmin.page.reports': { category: 'players', icon: Info, label: 'Reports', desc: 'Player reports' },
    'qadmin.page.terminal': { category: 'commands', icon: Terminal, label: 'Terminal', desc: 'Console management' },
    'qadmin.page.staff_point': { category: 'other', icon: Clock, label: 'Staff Point', desc: 'Staff clock in/out system' },

    // ── Dashboard Actions ────────────────────────────────────────────────────
    'qadmin.action.announcements': { category: 'dashboard', icon: Megaphone, label: 'Announcements', desc: 'Send global announcements' },
    'qadmin.action.clear_chat': { category: 'dashboard', icon: Trash2, label: 'Limpar Chat', desc: 'Limpar o chat global do servidor' },
    'qadmin.action.info_admin': { category: 'dashboard', icon: Info, label: 'Info admin', desc: 'View global financial summaries on dashboard' },
    'qadmin.action.view_detailed_logs': { category: 'dashboard', icon: MessageSquare, label: 'Detailed Logs', desc: 'View detailed CitizenID based logs' },
    'qadmin.action.manage_actions': { category: 'dashboard', icon: Settings, label: 'Gerenciar Ações', desc: 'Criar, editar e excluir ações no Action Manager' },

    // ── Player panel-native features (no action entry) ───────────────────────
    'qadmin.action.view_player_identifiers': { category: 'players', icon: Fingerprint, label: 'Ver Identificadores', desc: 'Ver Steam ID, IP e Licenças dos jogadores' },
    'qadmin.action.track_player': { category: 'players', icon: Crosshair, label: 'Track Player', desc: 'Locate and track player on the map' },
    'qadmin.action.set_vital': { category: 'players', icon: Heart, label: 'Set Vitals', desc: 'Manually adjust player health, armor, hunger, etc.' },
    'qadmin.action.tag': { category: 'players', icon: Tag, label: 'Player Tags', desc: 'Show name tags above players' },
    'qadmin.action.manage_reports': { category: 'players', icon: Info, label: 'Manage Reports', desc: 'View and reply to player reports' },
    'qadmin.action.delete_report': { category: 'players', icon: Trash2, label: 'Delete Report', desc: 'Remove reports from the system' },
    'qadmin.action.staff_clothing': { category: 'players', icon: Shirt, label: 'Staff Clothing', desc: 'Apply staff uniform' },

    // ── Actions (entries in default_actions.lua) ─────────────────────────────
    'qadmin.action.revive': { category: 'actions', icon: Zap, label: 'Revive', desc: 'Heal and revive a single player' },
    'qadmin.action.revive_all': { category: 'actions', icon: Zap, label: 'Revive All / Radius', desc: 'Revive all players or everyone in radius' },
    'qadmin.action.revive_self': { category: 'actions', icon: Heart, label: 'Reviver-se', desc: 'Reviver o próprio administrador' },
    'qadmin.action.kill_player': { category: 'actions', icon: Trash2, label: 'Kill Player', desc: 'Kill a player' },
    'qadmin.action.kick_player': { category: 'actions', icon: Users, label: 'Kick Player', desc: 'Kick a player from the server' },
    'qadmin.action.warn_player': { category: 'actions', icon: Info, label: 'Warn Player', desc: 'Issue a warning to a player' },
    'qadmin.action.verify_player': { category: 'actions', icon: Shield, label: 'Verify Player', desc: 'Verify player identity' },
    'qadmin.action.delete_character': { category: 'actions', icon: Trash2, label: 'Delete Character', desc: 'Permanently delete a character' },
    'qadmin.action.spectate_player': { category: 'actions', icon: Monitor, label: 'Spectate', desc: 'Spectate a player' },
    'qadmin.action.freeze_player': { category: 'actions', icon: Lock, label: 'Freeze Player', desc: 'Immobilize a player' },
    'qadmin.action.bring_player': { category: 'actions', icon: Hand, label: 'Bring Player', desc: 'Teleport a player to you' },
    'qadmin.action.teleport_to_player': { category: 'actions', icon: MoveUpRight, label: 'Teleport to Player', desc: 'Teleport yourself to a player' },
    'qadmin.action.teleport_back': { category: 'actions', icon: MoveUpRight, label: 'Teleport Back', desc: 'Return to previous position' },
    'qadmin.action.teleport_to_coords': { category: 'actions', icon: MoveUpRight, label: 'Teleport to Coords', desc: 'Teleport yourself to specific coordinates' },
    'qadmin.action.teleport_to_location': { category: 'actions', icon: MoveUpRight, label: 'Teleport to Location', desc: 'Teleport to a saved location' },
    'qadmin.action.teleport_to_marker': { category: 'actions', icon: MoveUpRight, label: 'Teleport to Marker', desc: 'Teleport to waypoint marker' },
    'qadmin.action.set_job': { category: 'actions', icon: Users, label: 'Set Job', desc: 'Change a player\'s job' },
    'qadmin.action.set_gang': { category: 'actions', icon: Users, label: 'Set Gang', desc: 'Change a player\'s gang' },
    'qadmin.action.set_bucket': { category: 'actions', icon: Archive, label: 'Set Bucket', desc: 'Change player routing bucket' },
    'qadmin.action.get_bucket': { category: 'actions', icon: Archive, label: 'Get Bucket', desc: 'Query a player\'s routing bucket' },
    'qadmin.action.fire_job': { category: 'actions', icon: Users, label: 'Fire from Job', desc: 'Remove a player from their job' },
    'qadmin.action.fire_gang': { category: 'actions', icon: Users, label: 'Fire from Gang', desc: 'Remove a player from their gang' },
    'qadmin.action.give_money': { category: 'actions', icon: DollarSign, label: 'Give Money', desc: 'Add money to a player' },
    'qadmin.action.remove_money': { category: 'actions', icon: DollarSign, label: 'Remove Money', desc: 'Remove money from a player' },
    'qadmin.action.give_money_all': { category: 'actions', icon: DollarSign, label: 'Give Money to All', desc: 'Give money to all online players' },
    'qadmin.action.drunk_player': { category: 'actions', icon: Zap, label: 'Drunk Effect', desc: 'Apply intoxication effect' },
    'qadmin.action.remove_stress': { category: 'actions', icon: Activity, label: 'Remove Stress', desc: 'Clear player stress level' },
    'qadmin.action.mute_player': { category: 'actions', icon: VolumeX, label: 'Mute Player', desc: 'Silence a player\'s voice chat' },
    'qadmin.action.goto_waypoint': { category: 'actions', icon: Navigation, label: 'Ir para Waypoint', desc: 'Teleportar para o marcador no mapa' },
    'qadmin.action.blackout': { category: 'actions', icon: Ghost, label: 'Blackout', desc: 'Knock player unconscious' },
    'qadmin.action.toggle_cuffs': { category: 'actions', icon: Lock, label: 'Toggle Cuffs', desc: 'Handcuff or uncuff a player' },
    'qadmin.action.clothing_menu': { category: 'actions', icon: Shirt, label: 'Clothing Menu', desc: 'Open player clothing editor' },
    'qadmin.action.set_ped': { category: 'actions', icon: Users, label: 'Set Ped', desc: 'Change player character model' },
    'qadmin.action.god_mode': { category: 'actions', icon: Shield, label: 'God Mode', desc: 'Toggle damage immunity' },
    'qadmin.action.noclip': { category: 'actions', icon: Ghost, label: 'Noclip', desc: 'Toggle pass-through surfaces' },
    'qadmin.action.invisibility': { category: 'actions', icon: Ghost, label: 'Invisibility', desc: 'Toggle invisible mode' },
    'qadmin.action.invisible': { category: 'actions', icon: Ghost, label: 'Invisibility', desc: 'Toggle invisible mode' },
    'qadmin.action.set_ammo': { category: 'actions', icon: Zap, label: 'Set Ammo', desc: 'Set infinite or specific ammo amount' },
    'qadmin.action.infinite_ammo': { category: 'actions', icon: Zap, label: 'Infinite Ammo', desc: 'Toggle unlimited ammunition' },
    'qadmin.action.toggle_duty': { category: 'actions', icon: Shield, label: 'Toggle Duty', desc: 'Toggle on/off duty status' },
    'qadmin.action.toggle_laser': { category: 'actions', icon: Crosshair, label: 'Toggle Laser', desc: 'Toggle weapon laser sight' },
    'qadmin.action.play_sound': { category: 'actions', icon: Megaphone, label: 'Play Sound', desc: 'Play a sound for a specific player' },
    'qadmin.action.ban_player': { category: 'actions', icon: Ban, label: 'Ban Player', desc: 'Ban a player from the server' },
    'qadmin.action.unban_player': { category: 'actions', icon: Unlock, label: 'Desbanir Jogador', desc: 'Remover um banimento ativo da lista' },
    'qadmin.action.give_item': { category: 'actions', icon: Package, label: 'Give Item', desc: 'Give an item to a player' },
    'qadmin.action.give_item_all': { category: 'actions', icon: Package, label: 'Give Item to All', desc: 'Give an item to all online players' },
    'qadmin.action.clear_inventory': { category: 'actions', icon: Trash2, label: 'Clear Inventory', desc: 'Empty a player\'s inventory' },
    'qadmin.action.clear_inventory_offline': { category: 'actions', icon: Trash2, label: 'Clear Inventory (Offline)', desc: 'Empty inventory of an offline player by CitizenID' },
    'qadmin.action.open_inventory': { category: 'actions', icon: Package, label: 'Abrir Inventário (Nativo)', desc: 'Abrir o inventário de um jogador diretamente pelo ox_inventory' },
    'qadmin.action.view_inventory': { category: 'actions', icon: Eye, label: 'Ver Inventário (Painel)', desc: 'Visualizar o inventário de um jogador pelo painel admin' },
    'qadmin.action.modify_inventory': { category: 'actions', icon: Package, label: 'Modificar Inventário', desc: 'Adicionar, remover e mover itens no inventário via painel' },
    'qadmin.action.open_trunk': { category: 'actions', icon: Car, label: 'Open Trunk', desc: 'Access a vehicle trunk' },
    'qadmin.action.open_stash': { category: 'actions', icon: Archive, label: 'Open Stash', desc: 'Access a player\'s stash' },
    'qadmin.action.spawn_vehicle': { category: 'actions', icon: Car, label: 'Spawn Vehicle', desc: 'Spawn a vehicle' },
    'qadmin.action.delete_vehicle': { category: 'actions', icon: Trash2, label: 'Delete Vehicle', desc: 'Despawn a vehicle' },
    'qadmin.action.admin_car': { category: 'actions', icon: Car, label: 'Admin Car', desc: 'Spawn and save an admin vehicle' },
    'qadmin.action.admincar': { category: 'actions', icon: Car, label: 'Admin Car', desc: 'Spawn and save an admin vehicle' },
    'qadmin.action.give_car': { category: 'actions', icon: Car, label: 'Give Car', desc: 'Spawn and save a vehicle to player garage' },
    'qadmin.action.change_plate': { category: 'actions', icon: Key, label: 'Change Plate', desc: 'Change a vehicle\'s license plate' },
    'qadmin.action.fix_vehicle': { category: 'actions', icon: Wrench, label: 'Fix Vehicle', desc: 'Repair a player\'s vehicle' },
    'qadmin.action.fix_vehicle_for': { category: 'actions', icon: Wrench, label: 'Fix Vehicle For Player', desc: 'Repair a specific player\'s vehicle' },
    'qadmin.action.fix_self_vehicle': { category: 'actions', icon: Wrench, label: 'Reparar Próprio Veículo', desc: 'Reparar o veículo em que o admin está' },
    'qadmin.action.refuel_vehicle': { category: 'actions', icon: Fuel, label: 'Refuel Vehicle', desc: 'Fully refuel the current vehicle' },
    'qadmin.action.max_mods': { category: 'actions', icon: Wrench, label: 'Max Vehicle Mods', desc: 'Apply maximum upgrades to current vehicle' },
    'qadmin.action.change_vehicle_state': { category: 'vehicles', icon: Wrench, label: 'Alterar Estado do Veículo', desc: 'Alterar o estado de garagem de um veículo (dentro/fora)' },
    'qadmin.action.update_vehicle_stock': { category: 'actions', icon: RefreshCw, label: 'Atualizar Estoque', desc: 'Atualizar o estoque de veículos da garagem' },
    'qadmin.action.change_weather': { category: 'actions', icon: Settings, label: 'Change Weather', desc: 'Change the server weather' },
    'qadmin.action.change_time': { category: 'actions', icon: Clock, label: 'Change Time', desc: 'Change the server time via quick presets' },
    'qadmin.action.toggle_devmode': { category: 'actions', icon: Hammer, label: 'Toggle Dev Mode', desc: 'Ativar/Desativar o modo desenvolvedor' },
    'qadmin.action.vehicle_dev': { category: 'actions', icon: Hammer, label: 'Vehicle Dev Menu', desc: 'Open vehicle development/tuning menu' },
    'qadmin.action.toggle_coords': { category: 'actions', icon: Hammer, label: 'Toggle Coords', desc: 'Show/hide coordinate HUD' },
    'qadmin.action.toggle_blips': { category: 'actions', icon: Hammer, label: 'Toggle Blips', desc: 'Show/hide player blips on map' },
    'qadmin.action.toggle_names': { category: 'actions', icon: Hammer, label: 'Toggle Names', desc: 'Show/hide player name tags' },
    'qadmin.action.enable_wall': { category: 'actions', icon: Monitor, label: 'Enable Wall', desc: 'Toggle live screen wall display' },

    // ── Items panel-native features ───────────────────────────────────────────
    'qadmin.action.copy_inventory': { category: 'items', icon: Copy, label: 'Copiar Inventário', desc: 'Copiar itens do inventário de outro para si' },

    // ── Vehicles panel-native features ────────────────────────────────────────
    'qadmin.action.manage_vehicles': { category: 'vehicles', icon: Wrench, label: 'Gerenciar Veículos', desc: 'Permite spawnar veículos livremente e atualizar estoque' },
    'qadmin.action.change_vehicle_property': { category: 'vehicles', icon: Wrench, label: 'Modify Stock', desc: 'Change vehicle properties or stock' },

    // ── Commands ─────────────────────────────────────────────────────────────
    'qadmin.commands': { category: 'commands', icon: Terminal, label: 'Commands List', desc: 'Access the server commands list' },

    // ── Resources ────────────────────────────────────────────────────────────
    'qadmin.action.change_resource': { category: 'resources', icon: RefreshCw, label: 'Gerenciar Recursos', desc: 'Iniciar, parar e reiniciar recursos do servidor' },

    // ── Settings panel-native ─────────────────────────────────────────────────
    'qadmin.action.server_time': { category: 'settings', icon: Clock, label: 'Server Time', desc: 'Change the server time' },

    // ── Live Screens ─────────────────────────────────────────────────────────
    'qadmin.action.screen_capture': { category: 'livescreens', icon: Monitor, label: 'Screen Capture', desc: 'Capture player screen' },

    // ── Staff Point ──────────────────────────────────────────────────────────
    'qadmin.action.staff_clock_in': { category: 'other', icon: Clock, label: 'Staff Clock In', desc: 'Start staff duty session' },
    'qadmin.action.staff_clock_out': { category: 'other', icon: Clock, label: 'Staff Clock Out', desc: 'End staff duty session' },
    'qadmin.action.staff_chat_send': { category: 'other', icon: MessageSquare, label: 'Enviar Mensagens (StaffChat)', desc: 'Permite enviar mensagens e mencionar outros membros no Staff Chat' },
    'qadmin.action.toggle_mock_mode': { category: 'other', icon: Code, label: 'Alternar Mock Mode', desc: 'Habilitar dados fictícios para testes em ambiente FiveM' },
    'qadmin.action.manage_settings': { category: 'dashboard', icon: Server, label: 'Gerenciar Configurações Globais', desc: 'Alterar configurações do servidor e APIs' },
    'qadmin.action.manage_wall': { category: 'dashboard', icon: Eye, label: 'Gerenciar Configurações de Wall/ESP', desc: 'Alterar cores e comportamentos globais do ESP para a staff' },
};

export const getPermissionInfo = (permission: string) => {
    if (PERMISSION_MAP[permission]) return PERMISSION_MAP[permission];

    for (const [key, value] of Object.entries(PERMISSION_MAP)) {
        if (permission.startsWith(key)) return value;
    }

    if (permission.startsWith('qadmin.page.')) return { category: 'settings', icon: Key };
    if (permission.startsWith('qadmin.action.')) return { category: 'other', icon: Zap };
    if (permission.startsWith('qadmin.')) return { category: 'other', icon: Lock };

    return { category: 'other', icon: Lock };
};

export const getFriendlyPermissionName = (permission: string) => {
    const info = PERMISSION_MAP[permission];
    if (info?.label) return info.label;

    if (permission.startsWith('qadmin.page.')) {
        const page = permission.replace('qadmin.page.', '');
        return page.charAt(0).toUpperCase() + page.slice(1);
    }

    if (permission.startsWith('qadmin.action.')) {
        const action = permission.replace('qadmin.action.', '').replace(/_/g, ' ');
        return action.charAt(0).toUpperCase() + action.slice(1);
    }

    return permission;
};
