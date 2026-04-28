export interface PermDef {
    id: string
    label: string
    desc: string
    category: string
}

/** Derives a route→permissionId map from server-provided definitions. */
export function getPagePermissions(defs: PermDef[]): Record<string, string> {
    const map: Record<string, string> = {}
    for (const d of defs) {
        if (d.id.startsWith('qadmin.page.')) {
            map[d.id.replace('qadmin.page.', '')] = d.id
        }
    }
    // action_manager is gated by an action perm, not a page perm
    map['action_manager'] = 'qadmin.action.manage_actions'
    return map
}

export function hasPermission(userAces: string[], permission: string): boolean {
    if (!userAces || !Array.isArray(userAces)) return false
    if (userAces.includes('qadmin.master')) return true
    if (userAces.includes(permission)) return true

    const parts = permission.split('.')
    let current = parts[0]
    for (let i = 1; i < parts.length; i++) {
        if (userAces.includes(`${current}.*`)) return true
        current += `.${parts[i]}`
    }

    return false
}
