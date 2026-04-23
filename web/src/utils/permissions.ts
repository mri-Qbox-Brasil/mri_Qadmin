export const PAGE_PERMISSIONS = {
    // Top-level pages
    dashboard: 'qadmin.page.dashboard',
    players: 'qadmin.page.players',
    groups: 'qadmin.page.groups',
    staffchat: 'qadmin.page.staffchat',
    items: 'qadmin.page.items',
    vehicles: 'qadmin.page.vehicles',
    commands: 'qadmin.page.commands',
    actions: 'qadmin.page.actions',
    permissions: 'qadmin.page.permissions',
    resources: 'qadmin.page.resources',
    settings: 'qadmin.page.settings',
    action_manager: 'qadmin.action.manage_actions',
    livemap: 'qadmin.page.livemap',
    livescreens: 'qadmin.page.livescreens',
    logs: 'qadmin.page.logs',
    devmode: 'qadmin.page.devmode',
}

export function hasPermission(userAces: string[], permission: string): boolean {
    if (!userAces || !Array.isArray(userAces)) return false
    // Admin bypass (optional, but good for testing)
    if (userAces.includes('qadmin.master')) return true

    // Check exact match
    if (userAces.includes(permission)) return true

    // Check wildcards: split permission by dot and build up to check for .*
    const parts = permission.split('.')
    let current = parts[0]
    for (let i = 1; i < parts.length; i++) {
        if (userAces.includes(`${current}.*`)) return true
        current += `.${parts[i]}`
    }

    return false
}
