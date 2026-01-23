export const PAGE_PERMISSIONS = {
    // Top-level pages
    dashboard: 'qadmin.page.dashboard',
    players: 'qadmin.page.players',
    groups: 'qadmin.page.groups',
    bans: 'qadmin.page.bans',
    staffchat: 'qadmin.page.staffchat',
    items: 'qadmin.page.items',
    vehicles: 'qadmin.page.vehicles',
    commands: 'qadmin.page.commands',
    actions: 'qadmin.page.actions',
    permissions: 'qadmin.page.permissions',
    resources: 'qadmin.page.resources',
    settings: 'qadmin.page.settings',
    credits: 'qadmin.page.credits',
}

export function hasPermission(userAces: string[], permission: string): boolean {
    if (!userAces) return false
    // Admin bypass (optional, but good for testing)
    if (userAces.includes('qadmin.master')) return true

    // Check exact match or wildcard * (basic implementation)
    return userAces.includes(permission) || userAces.includes('qadmin.page.*')
}
