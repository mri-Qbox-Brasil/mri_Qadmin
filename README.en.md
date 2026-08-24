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

## Resource File Browser

The **Resources** page includes a browser to explore, open and **edit text files** of any resource, plus create/delete files and folders — straight from the panel.

### Writing and the FiveM sandbox (must read)

Since artifacts **> 25770**, FiveM **blocks by default** a resource from writing to **another** resource's files (anti-malware protection). This affects the browser:

- **Reading/browsing** works for **all** resources.
- **Saving / creating / deleting** only works:
  - on **`mri_Qadmin`'s own** files; or
  - on resources **explicitly allowed** in `server.cfg`.

To allow editing a resource, add this to `server.cfg` (then restart `mri_Qadmin`):

```cfg
add_filesystem_permission mri_Qadmin write resource_name
```

> One line **per resource** — FiveM does **not** support wildcards (`*`), and there is **no** convar to disable the sandbox globally. Reverting to artifacts ≤ 25770 unlocks it but is a security regression and is not recommended.

When a resource isn't writable, the panel shows a **"read-only"** notice with the exact line to add and disables the write controls. Write actions require the `qadmin.action.change_resource` permission; deletion also requires `qadmin.action.resource_delete`.

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

Adds an entry to the log system. The in-memory buffer always receives it; database, Discord webhook, relay event and Fivemanage follow whatever `Config.Logs` defines for that category and resource.

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
    defaultRoute    = 'plugin:mri_Qspawn',  -- optional: panel page (defaults to `plugin:<id>`)
    defaultPage     = 'list',               -- optional: page INSIDE the plugin
    defaultCategory = 'vehicles',           -- optional: initial category/tab
})
```

#### `UnregisterPlugin(id)`

Removes a previously registered plugin.

```lua
exports['mri_Qadmin']:UnregisterPlugin('mri_Qspawn')
```

#### `OpenPluginForPlayer` / `TogglePluginForPlayer` / `ClosePluginForPlayer`

Server-driven open/close of the panel on the plugin's own page. The permission gate runs here, with `HasPerms`, before anything reaches the client. Closing is not privileged.

```lua
local ok, reason = exports['mri_Qadmin']:OpenPluginForPlayer(source, 'mri_Qspawn')
exports['mri_Qadmin']:TogglePluginForPlayer(source, 'mri_Qspawn')
exports['mri_Qadmin']:ClosePluginForPlayer(source, 'mri_Qspawn')
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

#### `OpenPlugin` / `TogglePlugin` / `ClosePlugin` / `IsPluginOpen`

Open and close the panel straight on the plugin's page. The target comes from the plugin's own manifest (`defaultRoute` / `defaultPage`), falling back to `plugin:<id>`; `opts` overrides it per call.

```lua
local ok, reason = exports['mri_Qadmin']:OpenPlugin('mri_Qspawn')
-- reason: see the table below

exports['mri_Qadmin']:TogglePlugin('mri_Qspawn')
exports['mri_Qadmin']:ClosePlugin('mri_Qspawn')  -- only closes if that page is the active one
exports['mri_Qadmin']:ClosePlugin()              -- closes regardless
local isOpen = exports['mri_Qadmin']:IsPluginOpen('mri_Qspawn')

exports['mri_Qadmin']:OpenPlugin('mri_Qspawn', {
    route    = 'plugin:mri_Qspawn',  -- panel page
    page     = 'editor',             -- page inside the plugin
    category = 'vehicles',           -- category/tab within the page
    focus    = 'plate-field',        -- component marked with data-nav-id (see below)
})
```

| Reason | When | Returned by |
| :--- | :--- | :--- |
| `invalid_id` | a `pluginId` was passed and it is not a non-empty string | all of them |
| `not_registered` | the plugin does not exist **or** the player cannot see it | `Open` · `Toggle` · `Close(id)` |
| `no_permission` | missing `qadmin.open` — or, on the server exports, the plugin's `requiredPerms` | `Open` · `Toggle` |
| `already_closed` | the panel was already closed | `Close` |
| `not_active` | the panel is open, but on another page | `Close(id)` |
| `invalid_source` | invalid `source` | `*ForPlayer` exports only |

`not_registered` covering two cases is deliberate: the panel never tells a plugin whether the admin *could* see some other plugin. `IsPluginOpen` is the exception to the contract — it returns a plain boolean, with no reason.

| Field | What it does | Manifest counterpart |
| :--- | :--- | :--- |
| `route` | Panel page (`plugin:<id>` or a built-in page) | `defaultRoute` |
| `page` | Page inside the plugin | `defaultPage` |
| `category` | Category/tab within the page | `defaultCategory` |
| `focus` | Component focused, scrolled to and highlighted for ~2s — **requires prior marking** | — (per call only) |

All four are independent. The `default*` fields also apply when the admin opens the tab by hand; `focus` has no manifest counterpart on purpose, otherwise the highlight would flash on every open.

On **built-in pages**, `category` selects the tab (`settings`: `general`/`server`/`wall` · `permissions`: `groups`/`players` · `actions`: `all`/`favorites`/`manager` plus the `All`/`Actions`/`PlayerActions`/`OtherActions` groups).

> **`focus` has no targets on built-in pages yet.** It looks up `[data-nav-id="<focus>"]`, then `#<focus>` and `[name="<focus>"]` — and today **no built-in panel component carries any of the three**. In practice it retries for 2s and gives up silently. Marking the components is the missing step; until then use `focus` only on plugin pages, where the guest implements it. To make a component reachable, add `data-nav-id="<id>"` to it.

On **plugin pages** the panel never touches the iframe DOM: `page`, `category` and `focus` reach the plugin through the `mri-plugin/navigate` postMessage (and in `mri-plugin/init`, when it opens straight into them). Navigating internally is up to the plugin.

#### What survives a close

Closing the panel **hides it, it does not unmount it**. Reopening — through `OpenPlugin`, `/adm` or the key — brings the screen back exactly as it was:

| Survives | Does not survive |
| :--- | :--- |
| Typed fields, selected tab, scroll, selection | Switching tabs in the sidebar (the route remounts the page) |
| The plugin iframe, without a reload | Restarting the resource (`ensure mri_Qadmin`) |

Two consequences for plugin authors:

- **The panel tells the plugin when it leaves the screen.** Since the iframe no longer unmounts, the guest gets `mri-plugin/visibility` with `visible: false` on close and `true` on reopen — that is where the plugin pauses its own polling and streams. Not to be confused with `mri-plugin/close`: closing **preserves** state, it does not ask the plugin to clear it.

- **The plugin gets no fresh boot on reopen.** The iframe stays alive, so `mri-plugin/init` does not run again — to react to every open, listen to `mri-plugin/navigate`, which arrives on every `OpenPlugin` with `page`/`category`/`focus`.
- **Switching sidebar tabs remounts the iframe** — that is how the plugin picks up a fresh build after an `ensure` on its own resource.

While hidden the panel does not keep working for nothing: live map, map modal and screen stream polling pauses and resumes on reopen.

## Credits & Acknowledgements

This project is a heavily modified, enhanced, and modernized version inspired by the excellent **ps-adminmenu**.
We express our sincere gratitude to the [Project Sloth](https://github.com/Project-Sloth) team and contributors.

## License

Licensed under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.

- Credit must be given.
- **Cannot** be used for commercial purposes.
- Modifications must be distributed under the same license.

See the full [LICENSE](LICENSE) file for details.
