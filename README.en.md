# mri_Qadmin

Modern and extensible admin panel for FiveM servers based on QBCore and Qbox, with full player management, vehicles, inventory, group-based permissions, live screen streaming via WebRTC, and a plugin architecture for external modules.

[Leitura em Português](README.md)

## Main Features

- **Full Admin Panel** — Intuitive NUI interface for server, player, and resource management.
- **Group-Based Permission System** — Create groups with granular permissions, FiveM ACE links, and real-time synchronization. Permission definitions are Lua-only (server side).
- **Player & Vehicle Management** — Teleport, vitals, inventory, spawn, repair, vehicle modification, and key control.
- **Staff Chat** — Dedicated chat with `@mention` support and notification alerts.
- **Live Screen Streaming (WebRTC)** — Real-time screen viewing of players. Supports FiveM-native, WebSocket, and Cloudflare SFU backends.
- **Plugin Architecture** — External scripts register admin pages and their own permissions via exports.
- **Smart Auto-Scaling** — Panel automatically adapts for resolutions above 1920px (4K, ultrawide) and optimized for 1366×768.

## Required Dependencies

| Resource | Purpose |
| :--- | :--- |
| `ox_lib` | Callbacks, commands, ACE management, utilities |
| `oxmysql` | MySQL persistence |
| `qb-core` or `qbx_core` | Player framework |

> `server/server_secrets.json` is only required when `Config.SignalingProvider = "cloudflare-sfu"`.

## Installation

1. Copy the `mri_Qadmin` folder to your server's `resources` directory.
2. Import `database.sql` into your database.
3. Add `ensure mri_Qadmin` to your `server.cfg` (after `ox_lib` and `oxmysql`).

## Permission System

MRI QAdmin uses an ACE-based group system:

- **Groups** — Admins are assigned to groups. Each group holds a set of ACE permissions stored in the DB and applied on every resource start.
- **Linked Principals** — Groups can inherit from FiveM principals (`group.admin`, `job.police`, `gang.ballas`) for automatic permission based on the player's current role.
- **Master Admin** — Special bypass status granted via console command. Ignores all permission checks.
- **Plugin Permissions** — External scripts register their own permissions through `RegisterPlugin` or `RegisterPermissions`. These appear in the group editor automatically.

### Permission Hierarchy (recommended)

```
Master Admin (console bypass)
  └── Group Permissions (stored in DB, applied as ACEs)
        └── Linked Principals (inherited: job/gang/group)
```

### Console Commands

| Command | Description |
| :--- | :--- |
| `mri_qadmin.setmaster [id/license]` | Grant Master Admin access |
| `mri_qadmin.removemaster [id/license]` | Revoke Master Admin access |
| `mri_qadmin.purgemasters` | Clear all Master Admin bypasses from DB |
| `mri_qadmin.debugperms [id]` | Show detailed permission debug for a player |
| `mri_qadmin.inspectdb` | Inspect permission tables in the DB |

## In-Game Commands

| Command | Requires | Description |
| :--- | :--- | :--- |
| `/adm` | `qadmin.open` | Open the admin panel |
| `/nc` | `qadmin.action.noclip` | Toggle noclip |
| `/vector2`, `/vec2` | Admin | Copy coords as Vector2 |
| `/vector3`, `/vec3` | Admin | Copy coords as Vector3 |
| `/vector4`, `/vec4` | Admin | Copy coords as Vector4 (with heading) |
| `/heading` | Admin | Copy current heading |
| `/setammo` | `qadmin.action.set_ammo` | Set ammo for current weapon |
| `wall` | `qadmin.action.enable_wall` | Toggle ESP/Wallhack |

## API / Developer Exports

### Server-side

#### `HasPerms(source, node)`

Checks if a player has a specific permission. Returns `boolean`.

```lua
local ok = exports.mri_Qadmin:HasPerms(source, 'qadmin.page.dashboard')
```

#### `CheckPerms(source, node)`

Checks permission and sends a denial notification to the player if they don't have access. Returns `boolean`.

```lua
if exports.mri_Qadmin:CheckPerms(source, 'qadmin.action.revive') then
    -- execute revival
end
```

#### `IsPlayerInPrincipal(source, principal)`

Checks if a player belongs to a specific ACE principal.

```lua
if exports.mri_Qadmin:IsPlayerInPrincipal(source, 'group.admin') then
    print("Player is an administrator!")
end
```

#### `GeneratePlate()`

Generates a random 8-character vehicle plate not already in the database.

```lua
local plate = exports.mri_Qadmin:GeneratePlate()
```

#### `AddLog(resource, category, level, message, data[, source])`

Adds an entry to the log system (DB + Discord webhook).

```lua
exports.mri_Qadmin:AddLog('my_resource', 'players', 'info', 'Player did something', { playerId = source }, source)
```

#### `RegisterPlugin(manifest)`

Registers an admin page in the sidebar. Automatically registers `requiredPerms` (excluding FiveM built-ins) in the group editor.

```lua
exports['mri_Qadmin']:RegisterPlugin({
    id            = 'mri_Qspawn',
    label         = 'Spawns',
    icon          = 'car',
    resource      = 'mri_Qspawn',
    requiredPerms = { 'mri_Qspawn.admin', 'command' },
    permDefs = {  -- optional: rich label/desc per permission
        { id = 'mri_Qspawn.admin', label = 'Administrator', desc = 'Full access to spawn panel' },
    },
    description = 'Vehicle spawn manager',
})
```

#### `UnregisterPlugin(id)`

Removes a previously registered plugin.

```lua
exports['mri_Qadmin']:UnregisterPlugin('mri_Qspawn')
```

#### `RegisterPermissions(perms, categoryDef?)`

Registers permissions from external scripts that don't need a sidebar page.

```lua
exports['mri_Qadmin']:RegisterPermissions(
    {
        { id = 'mri_Qshop.open',   label = 'Open Shop',   desc = 'Access the shop panel' },
        { id = 'mri_Qshop.manage', label = 'Manage',      desc = 'Create and edit shops' },
    },
    { id = 'mri_Qshop', label = 'Shops' }
)
```

### Client-side

#### `ToggleUI(show)`

Opens or closes the admin panel.

```lua
exports.mri_Qadmin:ToggleUI(true)
```

#### `OpenUI()`

Opens the admin panel.

```lua
exports.mri_Qadmin:OpenUI()
```

#### `IsMenuVisible()`

Returns `true` if the panel is currently open.

```lua
local isOpen = exports.mri_Qadmin:IsMenuVisible()
```

## Credits & Acknowledgements

This project is a heavily modified, enhanced, and modernized version inspired by the excellent **ps-adminmenu**.
We express our sincere gratitude to the [Project Sloth](https://github.com/Project-Sloth) team and contributors.

## License

Licensed under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.

- Credit must be given.
- **Cannot** be used for commercial purposes.
- Modifications must be distributed under the same license.

See the full [LICENSE](LICENSE) file for details.
