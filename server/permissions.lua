local QBCore = exports['qb-core']:GetCoreObject()

-- Forward declarations: populated further down, but declared here so every
-- closure in this file (including exports defined before the assignments) captures
-- them as upvalues rather than looking them up as globals (which would be nil).
local PERM_DEFINITIONS
local ALL_KNOWN_QADMIN_PERMS
local KNOWN_PERMS_SET
local BroadcastPermissionUpdate

-----------------------------------------------------------------------------------------------------------------------------------------
-- WHITELIST DE NÓS
-----------------------------------------------------------------------------------------------------------------------------------------

--- Nós que nunca podem virar ACE de um grupo, venham de onde vierem.
--- `command`/`command.*` e `builtin.*` são ACEs nativas do FiveM (escalonamento fora do
--- painel); `qadmin.master` é bypass total. Vale inclusive para nó já salvo no banco, pra
--- purgar injeções feitas antes desta validação existir.
local function IsForbiddenPermNode(node)
    if type(node) ~= 'string' or node == '' or #node > 255 then return true end
    if node:find('%s') then return true end
    if node == 'qadmin.master' then return true end
    if node == 'command' or node:sub(1, 8) == 'command.' then return true end
    if node:sub(1, 8) == 'builtin.' then return true end
    return false
end

--- Único ponto de entrada da whitelist: mantém a lista plana (usada nas iterações de ACE)
--- e o set de lookup em sincronia, deduplicando.
--- @return boolean true se o nó era novo
local function RegisterKnownPerm(node)
    if type(node) ~= 'string' or node == '' then return false end
    if KNOWN_PERMS_SET[node] then return false end
    ALL_KNOWN_QADMIN_PERMS[#ALL_KNOWN_QADMIN_PERMS + 1] = node
    KNOWN_PERMS_SET[node] = true
    return true
end

-- A whitelist em memória é reconstruída do zero a cada start do resource, e nós de plugin
-- só entram nela quando o plugin se registra. Persistir os nós de plugin é o que impede que
-- um `ensure mri_Qadmin` (ou um plugin parado) faça um save de grupo apagar permissões que
-- estão salvas e funcionando. Ver mri_qadmin_known_permissions em database.sql.
local dbReady = false
local pendingPluginPerms = {}

local function PersistPluginPerms(nodes, sourceId)
    if #nodes == 0 then return end
    if not dbReady then
        for _, node in ipairs(nodes) do
            pendingPluginPerms[#pendingPluginPerms + 1] = { node = node, source = sourceId }
        end
        return
    end
    -- CreateThread: o export pode ser chamado de fora de uma coroutine, e .await exige uma.
    CreateThread(function()
        for _, node in ipairs(nodes) do
            MySQL.insert.await(
                'INSERT IGNORE INTO mri_qadmin_known_permissions (permission, source) VALUES (?, ?)',
                { node, sourceId or 'plugin' }
            )
        end
    end)
end

--- Restaura a whitelist de plugins salva no banco. Roda no boot, antes de qualquer grupo ser
--- carregado, para que os nós de plugin já estejam conhecidos mesmo com o plugin parado.
local function LoadKnownPluginPerms()
    for _, pending in ipairs(pendingPluginPerms) do
        MySQL.insert.await(
            'INSERT IGNORE INTO mri_qadmin_known_permissions (permission, source) VALUES (?, ?)',
            { pending.node, pending.source or 'plugin' }
        )
    end
    pendingPluginPerms = {}

    local rows = MySQL.query.await('SELECT permission FROM mri_qadmin_known_permissions') or {}
    local restored = 0
    for _, row in ipairs(rows) do
        if not IsForbiddenPermNode(row.permission) and RegisterKnownPerm(row.permission) then
            restored = restored + 1
        end
    end
    if restored > 0 then
        Debug('info', ('[mri_Qadmin] Whitelist: %d permissão(ões) de plugin restaurada(s) do banco'):format(restored))
    end
end

-----------------------------------------------------------------------------------------------------------------------------------------
-- MIGRATION
-----------------------------------------------------------------------------------------------------------------------------------------

local ALLOWED_LINKED_PREFIXES = { 'group.', 'job.', 'gang.' }
local function isValidLinkedPrincipal(p)
    if type(p) ~= 'string' or p == '' or #p > 128 then return false end
    for _, prefix in ipairs(ALLOWED_LINKED_PREFIXES) do
        if p:sub(1, #prefix) == prefix then return true end
    end
    return false
end

-- Cache: linked principals per group (populated on LoadPermissions)
local groupLinkedPrincipals = {} -- [groupId] = { 'group.admin', ... }

local function parseLinkedPrincipals(raw)
    if not raw or raw == '' then return {} end
    local ok, parsed = pcall(json.decode, raw)
    if not ok or type(parsed) ~= 'table' then return {} end
    local result = {}
    for _, p in ipairs(parsed) do
        if isValidLinkedPrincipal(p) then result[#result + 1] = p end
    end
    return result
end

local function RunMigration()
    -- Add linked_principals column if missing (idempotent)
    local hasLPCol = MySQL.scalar.await("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'mri_qadmin_groups' AND column_name = 'linked_principals' AND table_schema = DATABASE()")
    if hasLPCol == 0 then
        MySQL.query.await("ALTER TABLE mri_qadmin_groups ADD COLUMN linked_principals TEXT NULL DEFAULT NULL")
        Debug('info', 'MIGRATION: Added linked_principals column to mri_qadmin_groups')
    end

    -- Verifica AS DUAS tabelas legadas separadamente
    local hasAces = MySQL.scalar.await("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mri_qadmin_aces' AND table_schema = DATABASE()")
    local hasPrincipals = MySQL.scalar.await("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mri_qadmin_principals' AND table_schema = DATABASE()")

    if hasAces == 0 and hasPrincipals == 0 then
        return -- nada legado sobrando, já migrado
    end

    Debug('info', 'MIGRATION: Old permissions tables found. Running migration to group-based system...')

    local groups = {}
    local dbPrincipals = MySQL.query.await('SELECT * FROM mri_qadmin_principals') or {}
    local dbAces = MySQL.query.await('SELECT * FROM mri_qadmin_aces') or {}

    -- Default admin group
    MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {'admin', 'Administrador', 'Grupo de Administração'})
    groups['group.admin'] = 'admin'

    for _, p in ipairs(dbPrincipals) do
        local parent = p.parent
        if string.find(parent, 'group%.') then                       -- '.' escapado
            local groupName = string.gsub(parent, 'group%.', '')
            if not groups[parent] then
                MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {groupName, groupName:gsub("^%l", string.upper), 'Migrado'})
                groups[parent] = groupName
            end

            local child = p.child
            if string.find(child, 'license:', 1, true) or string.find(child, 'license2:', 1, true) then
                local cleanLicense = child:gsub('identifier%.', '')
                local qbplayers = MySQL.query.await('SELECT citizenid FROM players WHERE license = ?', {cleanLicense}) or {}
                for _, row in ipairs(qbplayers) do
                    MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_character_groups (citizenid, group_id) VALUES (?, ?)', {row.citizenid, groups[parent]})
                end
            elseif string.find(child, 'char:', 1, true) then
                local cid = child:gsub('char:', '')
                MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_character_groups (citizenid, group_id) VALUES (?, ?)', {cid, groups[parent]})
            end
        end
    end

    for _, a in ipairs(dbAces) do
        local principal = a.principal
        local obj = a.object
        if a.allow == 1 and string.find(principal, 'group%.') then
            local groupName = string.gsub(principal, 'group%.', '')
            if not groups[principal] then
                MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {groupName, groupName:gsub("^%l", string.upper), 'Migrado'})
                groups[principal] = groupName
            end
            MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_group_permissions (group_id, permission) VALUES (?, ?)', {groupName, obj})
        end

        if a.allow == 1 and string.find(principal, 'identifier%.') and obj == 'qadmin.master' then
            local lic = principal:gsub('identifier%.', '')
            MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_masters (license) VALUES (?)', {lic})
        end
    end

    -- ---- RENAME seguro e atômico ----
    local renames = {}

    if hasAces > 0 then
        MySQL.query.await('DROP TABLE IF EXISTS bkp_mri_qadmin_aces')
        renames[#renames + 1] = 'mri_qadmin_aces TO bkp_mri_qadmin_aces'
    end
    if hasPrincipals > 0 then
        MySQL.query.await('DROP TABLE IF EXISTS bkp_mri_qadmin_principals')
        renames[#renames + 1] = 'mri_qadmin_principals TO bkp_mri_qadmin_principals'
    end

    if #renames > 0 then
        local ok, err = pcall(function()
            -- statement único: as duas renomeiam juntas ou nenhuma renomeia
            MySQL.query.await('RENAME TABLE ' .. table.concat(renames, ', '))
        end)
        if not ok then
            Debug('error', ('MIGRATION: Failed to rename legacy tables: %s'):format(tostring(err)))
            return
        end
    end

    Debug('info', 'MIGRATION: Migration complete!')
end

-----------------------------------------------------------------------------------------------------------------------------------------
-- FUNCTIONS
-----------------------------------------------------------------------------------------------------------------------------------------

-----------------------------------------------------------------------------------------------------------------------------------------
-- CATEGORY DEFINITIONS (source of truth for frontend categorization)
-----------------------------------------------------------------------------------------------------------------------------------------

local CATEGORY_DEFINITIONS = {
    { id = 'dashboard',   label = 'Dashboard',       order = 1  },
    { id = 'players',     label = 'Jogadores',        order = 2  },
    { id = 'moderation',  label = 'Moderação',        order = 3  },
    { id = 'staffchat',   label = 'Staff Chat',       order = 4  },
    { id = 'items',       label = 'Itens',            order = 5  },
    { id = 'vehicles',    label = 'Veículos',         order = 6  },
    { id = 'self',        label = 'Habilidades',      order = 7  },
    { id = 'actions',     label = 'Ações',            order = 8  },
    { id = 'commands',    label = 'Comandos',         order = 9  },
    { id = 'resources',   label = 'Recursos',         order = 10 },
    { id = 'settings',    label = 'Configurações',    order = 11 },
    { id = 'livemap',     label = 'Mapa ao Vivo',     order = 12 },
    { id = 'livescreens', label = 'Telas ao Vivo',    order = 13 },
    { id = 'devmode',     label = 'Dev Mode',         order = 14 },
    { id = 'groups',      label = 'Grupos',           order = 15 },
    { id = 'permissions', label = 'Permissões',       order = 16 },
    { id = 'vip',         label = 'VIP',              order = 17 },
    { id = 'other',       label = 'Outros',           order = 18 },
}

-- Registries for external script permissions
local _pluginPerms       = {}
local _pluginCategories  = {}

--- Registers permissions from an external script.
--- @param perms table  List of { id, label, desc?, category? }
--- @param categoryDef? table  Optional { id, label } for a new category
exports('RegisterPermissions', function(perms, categoryDef)
    if type(perms) ~= 'table' then return end

    if categoryDef and type(categoryDef) == 'table' and type(categoryDef.id) == 'string' then
        local exists = false
        for _, c in ipairs(CATEGORY_DEFINITIONS) do
            if c.id == categoryDef.id then exists = true; break end
        end
        if not exists then
            for _, c in ipairs(_pluginCategories) do
                if c.id == categoryDef.id then exists = true; break end
            end
        end
        if not exists then
            _pluginCategories[#_pluginCategories + 1] = {
                id    = categoryDef.id,
                label = categoryDef.label or categoryDef.id,
                order = 1000 + #_pluginCategories,
            }
        end
    end

    local knownIds = {}
    for _, p in ipairs(_pluginPerms) do knownIds[p.id] = true end

    local added = {}
    for _, p in ipairs(perms) do
        if type(p) == 'table' and type(p.id) == 'string' and not knownIds[p.id] then
            if IsForbiddenPermNode(p.id) then
                Debug('error', ('[mri_Qadmin] RegisterPermissions: nó proibido recusado: %s'):format(tostring(p.id)))
            else
                _pluginPerms[#_pluginPerms + 1] = {
                    id       = p.id,
                    label    = p.label or p.id,
                    desc     = p.desc or '',
                    category = p.category or (categoryDef and categoryDef.id) or 'other',
                }
                RegisterKnownPerm(p.id)
                knownIds[p.id] = true
                added[#added + 1] = p.id
            end
        end
    end

    PersistPluginPerms(added, (categoryDef and categoryDef.id) or 'plugin')
end)

--- Returns category definitions (built-in + plugin).
function GetCategoryDefinitions()
    local result = {}
    for _, c in ipairs(CATEGORY_DEFINITIONS) do result[#result + 1] = c end
    for _, c in ipairs(_pluginCategories)    do result[#result + 1] = c end
    return result
end

--- Called by plugins.lua right after a plugin manifest is stored.
--- Registers plugin-scoped perms in the group editor without duplicating builtins.
function RegisterPermissionsForPlugin(manifest)
    if type(manifest) ~= 'table' then return end

    local catId    = manifest.id
    local catLabel = manifest.label or manifest.id
    local rawPerms = manifest.requiredPerms or {}

    -- Index optional rich perm defs keyed by perm id
    local permDefs = {}
    if type(manifest.permDefs) == 'table' then
        for _, d in ipairs(manifest.permDefs) do
            if type(d) == 'table' and type(d.id) == 'string' then permDefs[d.id] = d end
        end
    end

    -- Collect all plugin-specific perms: requiredPerms union permDefs ids.
    -- Plugins listam fallbacks como `command` em requiredPerms (ver plugins.lua): esses são
    -- filtrados aqui, nunca viram permissão concedível pelo editor de grupos.
    local toRegisterSet = {}
    local toRegister = {}
    for _, perm in ipairs(rawPerms) do
        if not IsForbiddenPermNode(perm) and not toRegisterSet[perm] then
            toRegisterSet[perm] = true
            toRegister[#toRegister + 1] = perm
        end
    end
    for permId, _ in pairs(permDefs) do
        if not IsForbiddenPermNode(permId) and not toRegisterSet[permId] then
            toRegisterSet[permId] = true
            toRegister[#toRegister + 1] = permId
        end
    end
    if #toRegister == 0 then return end

    -- Ensure a category exists for this plugin
    local catExists = false
    for _, c in ipairs(CATEGORY_DEFINITIONS) do if c.id == catId then catExists = true; break end end
    if not catExists then
        for _, c in ipairs(_pluginCategories) do if c.id == catId then catExists = true; break end end
    end
    if not catExists then
        _pluginCategories[#_pluginCategories + 1] = { id = catId, label = catLabel, order = 1000 + #_pluginCategories }
    end

    -- Deduplicate against everything already registered
    local knownIds = {}
    for _, p in ipairs(PERM_DEFINITIONS)  do knownIds[p.id] = true end
    for _, p in ipairs(_pluginPerms)      do knownIds[p.id] = true end

    local added = {}
    for _, permId in ipairs(toRegister) do
        if not knownIds[permId] then
            local def = permDefs[permId]
            _pluginPerms[#_pluginPerms + 1] = {
                id       = permId,
                label    = (def and def.label) or permId:match('%.(.+)$') or permId,
                desc     = (def and def.desc) or '',
                category = (def and def.category) or catId,
            }
            RegisterKnownPerm(permId)
            knownIds[permId] = true
            added[#added + 1] = permId
        end
    end

    -- Persiste a whitelist para que estes nós sobrevivam a um restart do Qadmin mesmo que o
    -- plugin não volte a se registrar (senão um save de grupo os apagaria do banco).
    PersistPluginPerms(added, catId)

    -- Seed god group for any newly registered perms
    for _, permId in ipairs(added) do
        MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_group_permissions (group_id, permission) VALUES ("god", ?)', { permId })
        lib.addAce('mri.group.god', permId, true)
    end
    if #added > 0 then
        Debug('debug', ('RegisterPermissionsForPlugin [%s]: %d perm(s) registrada(s)'):format(catId, #added))
    end
    -- Always broadcast so clients get fresh permissionDefinitions + categoryDefinitions,
    -- even when perms were already known (re-registration after space_economy restart)
    BroadcastPermissionUpdate()
end

-----------------------------------------------------------------------------------------------------------------------------------------
-- PERMISSION DEFINITIONS
-----------------------------------------------------------------------------------------------------------------------------------------

-- Single source of truth for all known permissions.
-- Each entry: { id, category }
-- Labels and descriptions live in locales/*/perm_labels and perm_descs.
-- The flat ALL_KNOWN_QADMIN_PERMS list is derived below for internal ACE operations.
PERM_DEFINITIONS = {
    -- ── System ───────────────────────────────────────────────────────────────
    { id = 'qadmin.open',   category = 'other'  },
    { id = 'qadmin.master', category = 'other'  },
    -- ── Pages ────────────────────────────────────────────────────────────────
    { id = 'qadmin.page.dashboard',    category = 'dashboard'   },
    { id = 'qadmin.page.players',      category = 'players'     },
    { id = 'qadmin.page.groups',       category = 'groups'      },
    -- qadmin.page.bans removido: banimentos agora são filtro na tela de jogadores
    { id = 'qadmin.page.staffchat',    category = 'staffchat'   },
    { id = 'qadmin.page.items',        category = 'items'       },
    { id = 'qadmin.page.vehicles',     category = 'vehicles'    },
    { id = 'qadmin.page.commands',     category = 'commands'    },
    { id = 'qadmin.page.actions',      category = 'actions'     },
    { id = 'qadmin.page.permissions',  category = 'permissions' },
    { id = 'qadmin.page.resources',    category = 'resources'   },
    { id = 'qadmin.page.settings',     category = 'settings'    },
    { id = 'qadmin.page.devmode',      category = 'devmode'     },
    { id = 'qadmin.page.livemap',      category = 'livemap'     },
    { id = 'qadmin.page.livescreens',  category = 'livescreens' },
    { id = 'qadmin.page.logs',         category = 'dashboard'   },
    { id = 'qadmin.page.statistics',   category = 'dashboard'   },
    { id = 'qadmin.page.reports',      category = 'players'     },
    { id = 'qadmin.page.terminal',     category = 'commands'    },
    { id = 'qadmin.page.staff_point',  category = 'other'       },
    { id = 'qadmin.page.vip',          category = 'vip'         },
    -- ── Dashboard ────────────────────────────────────────────────────────────
    { id = 'qadmin.action.announcements',      category = 'dashboard'   },
    { id = 'qadmin.action.clear_chat',         category = 'dashboard'   },
    { id = 'qadmin.action.info_admin',         category = 'dashboard'   },
    { id = 'qadmin.action.view_detailed_logs', category = 'dashboard'   },
    -- ── Actions Manager ───────────────────────────────────────────────────────
    { id = 'qadmin.action.manage_actions',     category = 'actions'     },
    -- ── Player Information & Management ──────────────────────────────────────
    { id = 'qadmin.action.view_player_identifiers', category = 'players' },
    { id = 'qadmin.action.track_player',            category = 'players' },
    { id = 'qadmin.action.set_vital',               category = 'players' },
    { id = 'qadmin.action.tag',                     category = 'players' },
    { id = 'qadmin.action.manage_reports',          category = 'players' },
    { id = 'qadmin.action.delete_report',           category = 'players' },
    { id = 'qadmin.action.staff_clothing',          category = 'players' },
    { id = 'qadmin.action.revive',                  category = 'players' },
    { id = 'qadmin.action.revive_all',              category = 'players' },
    { id = 'qadmin.action.bring_player',            category = 'players' },
    { id = 'qadmin.action.teleport_to_player',      category = 'players' },
    { id = 'qadmin.action.teleport_back',           category = 'players' },
    { id = 'qadmin.action.teleport_to_coords',      category = 'players' },
    { id = 'qadmin.action.teleport_to_location',    category = 'players' },
    { id = 'qadmin.action.teleport_to_marker',      category = 'players' },
    { id = 'qadmin.action.set_job',                 category = 'players' },
    { id = 'qadmin.action.set_gang',                category = 'players' },
    { id = 'qadmin.action.fire_job',                category = 'players' },
    { id = 'qadmin.action.fire_gang',               category = 'players' },
    { id = 'qadmin.action.set_bucket',              category = 'players' },
    { id = 'qadmin.action.get_bucket',              category = 'players' },
    { id = 'qadmin.action.give_money',              category = 'players' },
    { id = 'qadmin.action.remove_money',            category = 'players' },
    { id = 'qadmin.action.give_money_all',          category = 'players' },
    { id = 'qadmin.action.remove_stress',           category = 'players' },
    { id = 'qadmin.action.clothing_menu',           category = 'players' },
    { id = 'qadmin.action.set_ped',                 category = 'players' },
    -- ── Moderation (punishments / player control) ─────────────────────────────
    { id = 'qadmin.action.kill_player',             category = 'moderation' },
    { id = 'qadmin.action.kick_player',             category = 'moderation' },
    { id = 'qadmin.action.warn_player',             category = 'moderation' },
    { id = 'qadmin.action.verify_player',           category = 'moderation' },
    { id = 'qadmin.action.delete_character',        category = 'moderation' },
    { id = 'qadmin.action.spectate_player',         category = 'moderation' },
    { id = 'qadmin.action.freeze_player',           category = 'moderation' },
    { id = 'qadmin.action.mute_player',             category = 'moderation' },
    { id = 'qadmin.action.blackout',                category = 'moderation' },
    { id = 'qadmin.action.toggle_cuffs',            category = 'moderation' },
    { id = 'qadmin.action.drunk_player',            category = 'moderation' },
    { id = 'qadmin.action.play_sound',              category = 'moderation' },
    -- ── Bans (na tela de jogadores) ───────────────────────────────────────────
    { id = 'qadmin.action.ban_player',              category = 'players'    },
    { id = 'qadmin.action.unban_player',            category = 'players'    },
    -- ── Staff Chat ───────────────────────────────────────────────────────────
    { id = 'qadmin.action.staff_chat_send',         category = 'staffchat'  },
    -- ── Items / Inventory ─────────────────────────────────────────────────────
    { id = 'qadmin.action.give_item',               category = 'items'      },
    { id = 'qadmin.action.give_item_all',           category = 'items'      },
    { id = 'qadmin.action.clear_inventory',         category = 'items'      },
    { id = 'qadmin.action.clear_inventory_offline', category = 'items'      },
    { id = 'qadmin.action.open_inventory',          category = 'items'      },
    { id = 'qadmin.action.view_inventory',          category = 'items'      },
    { id = 'qadmin.action.modify_inventory',        category = 'items'      },
    { id = 'qadmin.action.open_trunk',              category = 'items'      },
    { id = 'qadmin.action.open_stash',              category = 'items'      },
    { id = 'qadmin.action.copy_inventory',          category = 'items'      },
    -- ── Vehicles ─────────────────────────────────────────────────────────────
    { id = 'qadmin.action.spawn_vehicle',           category = 'vehicles'   },
    { id = 'qadmin.action.delete_vehicle',          category = 'vehicles'   },
    { id = 'qadmin.action.admincar',                category = 'vehicles'   },
    { id = 'qadmin.action.give_car',                category = 'vehicles'   },
    { id = 'qadmin.action.change_plate',            category = 'vehicles'   },
    { id = 'qadmin.action.fix_vehicle',             category = 'vehicles'   },
    { id = 'qadmin.action.fix_vehicle_for',         category = 'vehicles'   },
    { id = 'qadmin.action.fix_self_vehicle',        category = 'vehicles'   },
    { id = 'qadmin.action.refuel_vehicle',          category = 'vehicles'   },
    { id = 'qadmin.action.max_mods',                category = 'vehicles'   },
    { id = 'qadmin.action.manage_vehicles',         category = 'vehicles'   },
    { id = 'qadmin.action.change_vehicle_property', category = 'vehicles'   },
    { id = 'qadmin.action.change_vehicle_state',    category = 'vehicles'   },
    { id = 'qadmin.action.update_vehicle_stock',    category = 'vehicles'   },
    -- ── Self Abilities (admin para si mesmo) ──────────────────────────────────
    { id = 'qadmin.action.revive_self',             category = 'self'       },
    { id = 'qadmin.action.god_mode',                category = 'self'       },
    { id = 'qadmin.action.noclip',                  category = 'self'       },
    { id = 'qadmin.action.invisible',               category = 'self'       },
    { id = 'qadmin.action.set_ammo',                category = 'self'       },
    { id = 'qadmin.action.infinite_ammo',           category = 'self'       },
    { id = 'qadmin.action.toggle_duty',             category = 'self'       },
    { id = 'qadmin.action.toggle_laser',            category = 'self'       },
    { id = 'qadmin.action.goto_waypoint',           category = 'self'       },
    -- ── Commands ─────────────────────────────────────────────────────────────
    { id = 'qadmin.commands',                       category = 'commands'   },
    -- ── Resources ────────────────────────────────────────────────────────────
    { id = 'qadmin.action.change_resource',         category = 'resources'  },
    { id = 'qadmin.action.resource_delete',         category = 'resources'  },
    -- ── Settings ─────────────────────────────────────────────────────────────
    { id = 'qadmin.action.manage_settings',         category = 'settings'   },
    { id = 'qadmin.action.change_weather',          category = 'settings'   },
    { id = 'qadmin.action.change_time',             category = 'settings'   },
    { id = 'qadmin.action.server_time',             category = 'settings'   },
    -- ── Dev Mode ─────────────────────────────────────────────────────────────
    { id = 'qadmin.action.toggle_devmode',          category = 'devmode'    },
    { id = 'qadmin.action.vehicle_dev',             category = 'devmode'    },
    { id = 'qadmin.action.toggle_coords',           category = 'devmode'    },
    { id = 'qadmin.action.copy_coords',             category = 'devmode'    },
    { id = 'qadmin.action.toggle_blips',            category = 'devmode'    },
    { id = 'qadmin.action.toggle_names',            category = 'devmode'    },
    { id = 'qadmin.action.toggle_mock_mode',        category = 'devmode'    },
    -- ── Live Screens ─────────────────────────────────────────────────────────
    { id = 'qadmin.action.screen_capture',          category = 'livescreens' },
    { id = 'qadmin.action.enable_wall',             category = 'livescreens' },
    { id = 'qadmin.action.manage_wall',             category = 'livescreens' },
    -- ── VIP ──────────────────────────────────────────────────────────────────
    { id = 'qadmin.action.manage_vip',              category = 'vip'         },
    -- ── Staff / Other ─────────────────────────────────────────────────────────
    { id = 'qadmin.action.staff_clock_in',          category = 'other'       },
    { id = 'qadmin.action.staff_clock_out',         category = 'other'       },
}

-- Flat ID list derived from PERM_DEFINITIONS for internal ACE operations.
-- KNOWN_PERMS_SET é o mesmo conteúdo como set, para lookup O(1) na validação de save.
-- Nós de plugin são acrescentados em runtime (RegisterKnownPerm) e restaurados do banco
-- no boot por LoadKnownPluginPerms.
ALL_KNOWN_QADMIN_PERMS = {}
KNOWN_PERMS_SET = {}
do
    for _, p in ipairs(PERM_DEFINITIONS) do RegisterKnownPerm(p.id) end
    if Config.Actions then for _, v in pairs(Config.Actions) do if v.perms then RegisterKnownPerm(v.perms) end end end
    if Config.PlayerActions then for _, v in pairs(Config.PlayerActions) do if v.perms then RegisterKnownPerm(v.perms) end end end
    if Config.OtherActions then for _, v in pairs(Config.OtherActions) do if v.perms then RegisterKnownPerm(v.perms) end end end
end

--- Returns full permission definitions including config-driven entries.
--- Called by data_sync.lua to include in the initial data payload.
function GetPermissionDefinitions()
    local defs = {}
    for _, p in ipairs(PERM_DEFINITIONS) do defs[#defs + 1] = p end
    if Config.Actions then
        for _, v in pairs(Config.Actions) do
            if v.perms then defs[#defs + 1] = { id = v.perms, label = v.label or v.perms, desc = v.description or '', category = 'actions' } end
        end
    end
    if Config.PlayerActions then
        for _, v in pairs(Config.PlayerActions) do
            if v.perms then defs[#defs + 1] = { id = v.perms, label = v.label or v.perms, desc = v.description or '', category = 'actions' } end
        end
    end
    if Config.OtherActions then
        for _, v in pairs(Config.OtherActions) do
            if v.perms then defs[#defs + 1] = { id = v.perms, label = v.label or v.perms, desc = v.description or '', category = 'other' } end
        end
    end
    for _, p in ipairs(_pluginPerms) do defs[#defs + 1] = p end
    return defs
end

--- Sincroniza a whitelist com as definições dinâmicas e devolve a lista plana de TODOS
--- os nós conhecidos agora.
---
--- Nenhuma das duas fontes basta sozinha:
--- * `ALL_KNOWN_QADMIN_PERMS` é montada no parse deste arquivo, e `server/actions.lua`
---   (que popula `Config.Actions` a partir do `data/default_actions.lua` + overrides do
---   banco) só carrega DEPOIS — então a lista plana nasce sem nenhum nó que exista
---   apenas numa ação, incluindo as ações criadas pelo próprio painel;
--- * `GetPermissionDefinitions()` é dinâmica, mas não enxerga nó de plugin restaurado do
---   banco por `LoadKnownPluginPerms` enquanto o plugin não voltar a se registrar.
---
--- Registrar os nós dinâmicos na whitelist conserta de uma vez três caminhos que hoje
--- ignoram as perms de ação: o `ClearGroupAces` (deixava ACE órfã no restart), o
--- `SeedAces` e a validação de escrita do `UpdateGroupPermissions` — que REJEITA como
--- desconhecido um nó de ação nunca salvo antes, mesmo tendo sido oferecido pela UI.
---@return string[]
local function AllKnownPermNodes()
    for _, def in ipairs(GetPermissionDefinitions()) do
        if def.id and not IsForbiddenPermNode(def.id) then RegisterKnownPerm(def.id) end
    end
    return ALL_KNOWN_QADMIN_PERMS
end

local function ClearGroupAces(groupId)
    local principal = 'mri.group.' .. groupId
    for _, perm in ipairs(AllKnownPermNodes()) do
        lib.removeAce(principal, perm, true)
    end
end

local function SeedGodGroup()
    MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)',
        {'god', 'God', 'Perfil com acesso total a todas as permissões'})

    local existing = MySQL.query.await('SELECT permission FROM mri_qadmin_group_permissions WHERE group_id = "god"') or {}
    local existingSet = {}
    for _, row in ipairs(existing) do existingSet[row.permission] = true end

    local toAdd = {}
    for _, def in ipairs(GetPermissionDefinitions()) do
        if def.id ~= 'qadmin.master' and not existingSet[def.id] then
            toAdd[#toAdd + 1] = def.id
        end
    end

    if #toAdd > 0 then
        for _, perm in ipairs(toAdd) do
            MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_group_permissions (group_id, permission) VALUES ("god", ?)', {perm})
        end
        Debug('debug', ('[mri_Qadmin] SeedGodGroup: %d permissões adicionadas ao grupo god'):format(#toAdd))
    end
end

local function LoadPermissions()
    RunMigration()

    -- Antes dos grupos: repovoa a whitelist com os nós de plugin já conhecidos, para que
    -- ClearGroupAces também os limpe e para que um save de grupo não os apague enquanto o
    -- plugin ainda não se registrou (ou está parado).
    dbReady = true
    LoadKnownPluginPerms()

    -- Puxa para a whitelist os nós que só existem em ações. É chamado de novo em
    -- ClearGroupAces/SeedAces (é idempotente), mas aqui pega o caso de um servidor sem
    -- nenhum grupo cadastrado, em que o ClearGroupAces nunca roda.
    AllKnownPermNodes()

    SeedGodGroup()

    -- Load Groups and their Aces
    groupLinkedPrincipals = {}
    local groups = MySQL.query.await('SELECT * FROM mri_qadmin_groups') or {}
    for _, g in ipairs(groups) do
        -- Wipe all known ACEs first so removed permissions don't persist across restarts
        ClearGroupAces(g.id)

        -- FORCE qadmin.open for any managed group
        lib.addAce('mri.group.' .. g.id, 'qadmin.open', true)

        local perms = MySQL.query.await('SELECT * FROM mri_qadmin_group_permissions WHERE group_id = ?', {g.id}) or {}
        for _, p in ipairs(perms) do
            -- A whitelist protege a ESCRITA (UpdateGroupPermissions). Ela não protegia a
            -- LEITURA: um servidor que rodou a versão vulnerável ao #54 tem um `command`
            -- gravado aqui, e este laço — que antes só barrava a string `qadmin.master` —
            -- reaplicava a ACE a cada boot. A escalada seguia viva num servidor que já
            -- tinha atualizado e se considerava corrigido, sem ninguém fazer nada.
            --
            -- Não apagamos a linha: boot não destrói dado. Ela é purgada no próximo save
            -- do grupo, que também barra o nó proibido mesmo já estando salvo.
            if IsForbiddenPermNode(p.permission) then
                local msg = ('nó proibido "%s" gravado no grupo "%s" — ACE NÃO aplicada')
                    :format(tostring(p.permission), g.id)
                print(('^1[mri_Qadmin] SECURITY ALERT: %s. Salve o grupo pelo painel para removê-lo do banco.^7'):format(msg))
                AddLog(0, 'mri_Qadmin', 'permissions', 'error', ('Permissões: %s'):format(msg),
                    { group = g.id, permission = tostring(p.permission), actor = 'boot' })
            else
                Debug('debug', ('[mri_Qadmin] Applying ACE: mri.group.%s -> %s'):format(g.id, p.permission))
                lib.addAce('mri.group.' .. g.id, p.permission, true)
            end
        end

        groupLinkedPrincipals[g.id] = parseLinkedPrincipals(g.linked_principals)
        if #groupLinkedPrincipals[g.id] > 0 then
            Debug('debug', ('[mri_Qadmin] Linked principals for group "%s": %s'):format(g.id, table.concat(groupLinkedPrincipals[g.id], ', ')))
        end
    end

    -- Load Master bypasses
    local masters = MySQL.query.await('SELECT license FROM mri_qadmin_masters') or {}
    for _, m in ipairs(masters) do
        Debug('debug', ('[mri_Qadmin] Applying Master Bypass: identifier.%s -> qadmin.master'):format(m.license))
        lib.addAce('identifier.' .. m.license, 'qadmin.master', true)
        lib.addAce('identifier.' .. m.license, 'qadmin.open', true)
    end

    Debug('debug', ('[mri_Qadmin] Loaded %d Groups from DB'):format(#groups))

    -- Re-sync all online players (essential for script restarts)
    CreateThread(function()
        Wait(1000) -- Give QBCore a second
        local players = QBCore.Functions.GetPlayers()
        Debug('debug', ('[mri_Qadmin] Re-syncing %d online players...'):format(#players))
        for _, id in ipairs(players) do
            local attempts = 0
            while not QBCore.Functions.GetPlayer(id) and attempts < 20 do
                Wait(500)
                attempts = attempts + 1
            end

            local Player = QBCore.Functions.GetPlayer(id)
            if Player then
                TriggerEvent('mri_Qadmin:server:Reload', id)
            else
                Debug('error', ('[mri_Qadmin] FAILED to sync player %d after 10 seconds. Principal mapping will be missing!^7'):format(id))
            end
        end
    end)

    TriggerEvent('mri_Qadmin:server:PermissionsLoaded')
end

-----------------------------------------------------------------------------------------------------------------------------------------
-- EVENTS & CALLBACKS
-----------------------------------------------------------------------------------------------------------------------------------------

-- Cache: stores principal data set on load so unload can clean up without relying on QBCore player data
local principalCache = {} -- [src] = { fivemPrincipal, citizenid, groups[] }

local function CleanupPlayerPrincipals(src)
    local cache = principalCache[src]
    if not cache then return end

    -- Remove linked principals before group principals
    for _, lp in ipairs(cache.linkedPrincipals or {}) do
        lib.removePrincipal('char:' .. cache.citizenid, lp)
        Debug('debug', ('Cleanup: linked principal removido: char:%s -> %s'):format(cache.citizenid, lp))
    end

    lib.removePrincipal(cache.fivemPrincipal, 'char:' .. cache.citizenid)
    Debug('debug', ('Cleanup: principal removido: %s -> char:%s'):format(cache.fivemPrincipal, cache.citizenid))
    for _, gid in ipairs(cache.groups) do
        lib.removePrincipal('char:' .. cache.citizenid, 'mri.group.' .. gid)
        Debug('debug', ('Cleanup: principal removido: %s -> char:%s'):format('mri.group.' .. gid, cache.citizenid))
    end

    Debug('debug', ('[mri_Qadmin] Cleanup: principals revogados para char:%s'):format(cache.citizenid))
    principalCache[src] = nil
end

local function SetupPlayerPrincipals(src, isReload)
    local player = QBCore.Functions.GetPlayer(src)
    if not player then return end

    local citizenid = player.PlayerData.citizenid
    local license = QBCore.Functions.GetIdentifier(src, 'license')
    if not license then return end

    local cleanLicense = license:gsub('license:', '')
    local fivemPrincipal = 'identifier.license:' .. cleanLicense

    -- On reload: clean stale cache/principals before re-adding
    if isReload then
        if principalCache[src] then
            CleanupPlayerPrincipals(src)
        else
            -- Cache lost (resource restart) — derive cleanup from DB
            local prevGroups = MySQL.query.await('SELECT group_id FROM mri_qadmin_character_groups WHERE citizenid = ?', {citizenid}) or {}
            lib.removePrincipal(fivemPrincipal, 'char:' .. citizenid)
            for _, g in ipairs(prevGroups) do
                lib.removePrincipal('char:' .. citizenid, 'mri.group.' .. g.group_id)
            end
            for _, lpList in pairs(groupLinkedPrincipals) do
                for _, lp in ipairs(lpList) do
                    lib.removePrincipal('char:' .. citizenid, lp)
                end
            end
        end
    end

    lib.addPrincipal(fivemPrincipal, 'char:' .. citizenid)
    Debug('debug', ('[mri_Qadmin] Principal Mapping: %s -> char:%s'):format(fivemPrincipal, citizenid))

    local charGroups = MySQL.query.await('SELECT group_id FROM mri_qadmin_character_groups WHERE citizenid = ?', {citizenid}) or {}
    local activeGroups = {}

    for _, g in ipairs(charGroups) do
        Debug('debug', ('[mri_Qadmin] Group Mapping: char:%s -> mri.group.%s'):format(citizenid, g.group_id))
        lib.addPrincipal('char:' .. citizenid, 'mri.group.' .. g.group_id)
        activeGroups[#activeGroups + 1] = g.group_id
    end

    -- Reverse Permission Sync (QBCore -> mri_Qadmin)
    -- Only fires on first load (not reload) and only when the player has no group yet.
    -- Any QBCore 'god' or 'admin' maps to mri_Qadmin 'god' (already seeded with all perms).
    -- Sub-tiers (mod/staff) devem ser criados manualmente via UI pelo dono do servidor.
    if not isReload and Config.QBCoreAutoSync ~= false and #activeGroups == 0 then
        local hasQBCorePriv = QBCore.Functions.HasPermission(src, 'god') or QBCore.Functions.HasPermission(src, 'admin')

        if hasQBCorePriv then
            Debug('debug', ('[mri_Qadmin] Auto-Sync: Jogador %s possui permissão admin/god do QBCore. Sincronizando com grupo "god" do painel...'):format(GetPlayerName(src)))
            MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_character_groups (citizenid, group_id) VALUES (?, ?)', {citizenid, 'god'})
            lib.addPrincipal('char:' .. citizenid, 'mri.group.god')
            activeGroups[#activeGroups + 1] = 'god'
        end
    end

    -- Apply linked principals from each group (deduplicated via set)
    local linkedSet = {}
    for _, gid in ipairs(activeGroups) do
        for _, lp in ipairs(groupLinkedPrincipals[gid] or {}) do
            if not linkedSet[lp] then
                linkedSet[lp] = true
                lib.addPrincipal('char:' .. citizenid, lp)
                Debug('debug', ('[mri_Qadmin] Linked: char:%s -> %s (grupo: %s)'):format(citizenid, lp, gid))
            end
        end
    end
    local linkedList = {}
    for lp, _ in pairs(linkedSet) do linkedList[#linkedList + 1] = lp end

    principalCache[src] = { fivemPrincipal = fivemPrincipal, citizenid = citizenid, groups = activeGroups, linkedPrincipals = linkedList }
end

RegisterNetEvent('QBCore:Server:OnPlayerLoaded', function()
    local src = source
    SetupPlayerPrincipals(src, false)
    TriggerEvent('mri_Qadmin:server:PlayerPermissionsReady', src)
    -- Principals/ACE já aplicados: só agora avisa o client pra carregar o painel.
    -- Evita a corrida em que o GetInitialData chegava antes das permissões prontas
    -- (voltava vazio, exigindo `ensure`).
    TriggerClientEvent('mri_Qadmin:client:SetupPanel', src)
end)

AddEventHandler('mri_Qadmin:server:Reload', function(src)
    SetupPlayerPrincipals(src, true)
    TriggerEvent('mri_Qadmin:server:PlayerPermissionsReady', src)
end)

RegisterNetEvent('QBCore:Server:OnPlayerUnload', function(source)
    local src = source
    Debug('debug', ('OnPlayerUnload chamado para: %s'):format(src))
    CleanupPlayerPrincipals(src)
    TriggerClientEvent('mri_Qadmin:client:CloseUI', src)
end)

AddEventHandler('playerDropped', function()
    CleanupPlayerPrincipals(source)
end)

BroadcastPermissionUpdate = function()
    Debug('debug', ('[mri_Qadmin] Broadcasting Permission Update to ALL clients'))
    local permDefs = GetPermissionDefinitions()
    local catDefs  = GetCategoryDefinitions()
    TriggerClientEvent('mri_Qadmin:client:ForceReloadPermissions', -1, permDefs, catDefs)
end

--- Adia a propagação da mudança de permissão até a fila de comandos do console drenar.
---
--- `lib.addAce`/`lib.addPrincipal` do ox_lib são `ExecuteCommand` — a fila só é drenada no
--- FIM do frame do servidor. Broadcastar no MESMO tick faz o cliente re-ler
--- `GetMyPermissions` ANTES de a ACE/principal existir e ver o estado ANTIGO: é por isso
--- que criar grupo, salvar permissões ou setar o grupo de um personagem parecia só "pegar"
--- depois de um `restart` (no boot o `LoadPermissions` já dá um `Wait` antes de checar).
---
--- `resyncFn` (opcional) re-mapeia os principals dos players afetados ENTRE as duas
--- esperas: a primeira deixa aplicar o que o callback enfileirou; a segunda, os
--- `add_principal` do próprio re-sync, antes do broadcast que dispara a re-leitura.
---@param resyncFn? fun()
local function DeferAcePropagation(resyncFn)
    CreateThread(function()
        Wait(250)
        if resyncFn then
            resyncFn()
            Wait(150)
        end
        BroadcastPermissionUpdate()
    end)
end

-- Callbacks
lib.callback.register('mri_Qadmin:callback:GetGroups', function(source)
    if not HasPerms(source, 'qadmin.page.permissions') then return {} end

    local groups = MySQL.query.await('SELECT * FROM mri_qadmin_groups ORDER BY createdAt DESC') or {}
    local perms = MySQL.query.await('SELECT * FROM mri_qadmin_group_permissions') or {}

    for _, g in ipairs(groups) do
        g.permissions = {}
        for _, p in ipairs(perms) do
            if p.group_id == g.id then
                table.insert(g.permissions, p.permission)
            end
        end
        g.linkedPrincipals = parseLinkedPrincipals(g.linked_principals)
        g.linked_principals = nil -- drop raw DB field
    end

    return groups
end)

-- Callbacks: Players and Groups
lib.callback.register('mri_Qadmin:callback:GetCharacterGroups', function(source, citizenid)
    if not HasPerms(source, 'qadmin.page.permissions') then return {} end
    local current = MySQL.query.await('SELECT group_id FROM mri_qadmin_character_groups WHERE citizenid = ?', {citizenid}) or {}
    local list = {}
    for _, g in ipairs(current) do
        table.insert(list, g.group_id)
    end
    return list
end)

lib.callback.register('mri_Qadmin:server:SaveGroup', function(source, id, label, description)
    if not HasPerms(source, 'qadmin.page.permissions') then
        return false, "Acesso Negado."
    end

    local cleanId = id:lower():gsub("%s+", "_")
    local isNew = false

    local ok, err = pcall(function()
        local exists = MySQL.single.await('SELECT id FROM mri_qadmin_groups WHERE id = ?', {cleanId})
        if exists then
            MySQL.update.await('UPDATE mri_qadmin_groups SET label = ?, description = ? WHERE id = ?', {label, description, cleanId})
            TriggerClientEvent('QBCore:Notify', source, 'Grupo atualizado', 'success')
        else
            MySQL.insert.await('INSERT INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {cleanId, label, description})
            TriggerClientEvent('QBCore:Notify', source, 'Grupo criado', 'success')
            isNew = true
        end
    end)

    if not ok then
        print('^1[mri_Qadmin] ERRO ao salvar grupo:^7', err)
        return false, "Erro ao salvar grupo no banco de dados."
    end

    if isNew then
        lib.addAce('mri.group.' .. cleanId, 'qadmin.open', true)
        Debug('debug', ('[mri_Qadmin] Novo grupo "%s": ACE qadmin.open aplicado imediatamente'):format(cleanId))
    end

    AddLog(source, 'mri_Qadmin', 'permissions', 'info', ('Grupo: grupo "%s" criado/atualizado'):format(cleanId), { group = cleanId, label = label })
    DeferAcePropagation()
    return true
end)

lib.callback.register('mri_Qadmin:server:DeleteGroup', function(source, id)
    if not HasPerms(source, 'qadmin.page.permissions') then
        return false, "Acesso Negado."
    end

    -- Collect online players in this group before deleting
    local affectedSources = {}
    local players = QBCore.Functions.GetPlayers()
    for _, pid in ipairs(players) do
        local cache = principalCache[pid]
        if cache then
            for _, gid in ipairs(cache.groups or {}) do
                if gid == id then affectedSources[#affectedSources + 1] = pid; break end
            end
        end
    end

    local ok, err = pcall(function()
        local perms = MySQL.query.await('SELECT permission FROM mri_qadmin_group_permissions WHERE group_id = ?', {id})
        if perms then
            for _, p in ipairs(perms) do
                lib.removeAce('mri.group.'..id, p.permission, true)
            end
        end

        local charGroups = MySQL.query.await('SELECT citizenid FROM mri_qadmin_character_groups WHERE group_id = ?', {id})
        if charGroups then
            for _, cg in ipairs(charGroups) do
                lib.removePrincipal('char:'..cg.citizenid, 'mri.group.'..id)
            end
        end

        MySQL.query.await('DELETE FROM mri_qadmin_groups WHERE id = ?', {id})
        groupLinkedPrincipals[id] = nil
    end)

    if not ok then
        print('^1[mri_Qadmin] ERRO ao deletar grupo:^7', err)
        return false, "Erro ao deletar grupo do banco de dados."
    end

    TriggerClientEvent('QBCore:Notify', source, 'Grupo removido', 'success')
    AddLog(source, 'mri_Qadmin', 'permissions', 'warn', ('Grupo: grupo "%s" removido'):format(id), { group = id })
    -- Re-sync affected players so linked principals are also revoked (depois de a fila de
    -- removeAce/removePrincipal drenar), e só então broadcast.
    DeferAcePropagation(function()
        for _, pid in ipairs(affectedSources) do
            SetupPlayerPrincipals(pid, true)
        end
    end)
    return true
end)

lib.callback.register('mri_Qadmin:server:UpdateGroupPermissions', function(source, groupId, permissionsArray, linkedPrincipals)
    if not HasPerms(source, 'qadmin.page.permissions') then
        return false, "Acesso Negado."
    end

    Debug('debug', ('[mri_Qadmin] Iniciando atualização de permissões para grupo: %s'):format(groupId))

    -- Validate and sanitize linked principals
    local cleanLinked = {}
    local droppedLinked = {}
    if type(linkedPrincipals) == 'table' then
        for _, p in ipairs(linkedPrincipals) do
            if isValidLinkedPrincipal(p) then
                cleanLinked[#cleanLinked + 1] = p
            else
                -- Descartado, e o admin PRECISA saber. Isto saía num Debug de nível debug
                -- enquanto o callback respondia sucesso: o principal era adicionado na tela,
                -- o toast ficava verde, e ele nunca existia. Ver o bloco de descarte abaixo.
                droppedLinked[#droppedLinked + 1] = tostring(p)
            end
        end
    end

    if type(permissionsArray) ~= 'table' then
        return false, "Payload inválido."
    end

    local blocked = {}   -- nós proibidos (nunca podem ser concedidos)
    local rejected = {}  -- nós novos e desconhecidos (possível injeção)

    local ok, err = pcall(function()
        local oldPerms = MySQL.query.await('SELECT permission FROM mri_qadmin_group_permissions WHERE group_id = ?', {groupId})
        local oldSet = {}
        if oldPerms then
            for _, p in ipairs(oldPerms) do
                oldSet[p.permission] = true
                lib.removeAce('mri.group.'..groupId, p.permission, true)
            end
        end
        MySQL.query.await('DELETE FROM mri_qadmin_group_permissions WHERE group_id = ?', {groupId})

        local written = {}
        for _, p in ipairs(permissionsArray) do
            if not written[p] then
                if IsForbiddenPermNode(p) then
                    -- Sempre barrado, mesmo se já estava salvo: é o buraco do #54 (ACE nativa /
                    -- bypass total). Barrar o que já estava salvo purga injeções antigas.
                    blocked[#blocked + 1] = tostring(p)
                elseif KNOWN_PERMS_SET[p] or oldSet[p] then
                    -- `oldSet` é o que salva as permissões de plugin: a whitelist em memória não
                    -- conhece um nó cujo plugin está parado ou ainda não se registrou. Como este
                    -- callback apaga tudo e regrava, sem esse fallback um save inocente destruiria
                    -- essas permissões permanentemente. A whitelist barra ADIÇÃO nova; ela não
                    -- decide o que sobrevive.
                    MySQL.insert.await('INSERT INTO mri_qadmin_group_permissions (group_id, permission) VALUES (?, ?)', {groupId, p})
                    lib.addAce('mri.group.'..groupId, p, true)
                    written[p] = true
                else
                    rejected[#rejected + 1] = tostring(p)
                end
            end
        end

        -- Persist linked principals
        local lpJson = json.encode(cleanLinked)
        MySQL.update.await('UPDATE mri_qadmin_groups SET linked_principals = ? WHERE id = ?', { lpJson, groupId })
        groupLinkedPrincipals[groupId] = cleanLinked
    end)

    if not ok then
        print('^1[mri_Qadmin] ERRO ao atualizar permissões do grupo:^7', err)
        return false, "Erro ao salvar no banco de dados."
    end

    -- Descarte tem que ser barulhento: o callback responde SUCESSO e a NUI mostra um toast
    -- verde. Um drop silencioso passaria por "salvou tudo" quando na verdade alguma coisa
    -- sumiu do banco. Vale para os dois tipos de descarte — permissão e linked principal.
    if #blocked > 0 or #rejected > 0 or #droppedLinked > 0 then
        local parts = {}

        if #blocked > 0 or #rejected > 0 then
            local discarded = {}
            for _, p in ipairs(blocked)  do discarded[#discarded + 1] = p end
            for _, p in ipairs(rejected) do discarded[#discarded + 1] = p end
            parts[#parts + 1] = ('%d permissão(ões) descartada(s): %s')
                :format(#discarded, table.concat(discarded, ', '))
        end

        if #droppedLinked > 0 then
            parts[#parts + 1] = ('%d linked principal(is) descartado(s): %s')
                :format(#droppedLinked, table.concat(droppedLinked, ', '))
        end

        local msg = ('Permissões: grupo "%s" — %s'):format(groupId, table.concat(parts, ' | '))
        Debug('error', ('[mri_Qadmin] %s'):format(msg))
        Notify(source, msg, 'error')
        AddLog(source, 'mri_Qadmin', 'permissions', 'warn', msg,
            { group = groupId, blocked = blocked, rejected = rejected, droppedLinked = droppedLinked })
    end

    -- Re-sync online players who belong to this group (query DB — cache may be nil after restart)
    local memberRows = MySQL.query.await('SELECT citizenid FROM mri_qadmin_character_groups WHERE group_id = ?', {groupId}) or {}
    local memberSet = {}
    for _, row in ipairs(memberRows) do memberSet[row.citizenid] = true end

    TriggerClientEvent('QBCore:Notify', source, 'Permissões do grupo atualizadas.', 'success')
    AddLog(source, 'mri_Qadmin', 'permissions', 'warn',
        ('Permissões: grupo "%s" atualizado (%d perms, %d linked principals)'):format(groupId, #permissionsArray, #cleanLinked),
        { group = groupId, count = #permissionsArray, linkedPrincipals = cleanLinked })
    -- Adia o re-sync/broadcast até os add_ace/remove_ace deste save aplicarem, senão o
    -- cliente re-lê GetMyPermissions antes e continua vendo as permissões antigas.
    DeferAcePropagation(function()
        for _, id in ipairs(QBCore.Functions.GetPlayers()) do
            local p = QBCore.Functions.GetPlayer(id)
            if p and memberSet[p.PlayerData.citizenid] then
                SetupPlayerPrincipals(id, true)
            end
        end
    end)
    return true
end)

lib.callback.register('mri_Qadmin:server:UpdateCharacterGroups', function(source, citizenid, groupsArray)
    if not HasPerms(source, 'qadmin.page.permissions') then
        return false, "Acesso Negado."
    end

    Debug('debug', ('[mri_Qadmin] Atualizando grupos para citizenid: %s'):format(citizenid))

    local ok, err = pcall(function()
        local oldGroups = MySQL.query.await('SELECT group_id FROM mri_qadmin_character_groups WHERE citizenid = ?', {citizenid})
        if oldGroups then
            for _, og in ipairs(oldGroups) do
                lib.removePrincipal('char:'..citizenid, 'mri.group.'..og.group_id)
            end
        end
        MySQL.query.await('DELETE FROM mri_qadmin_character_groups WHERE citizenid = ?', {citizenid})

        for _, gId in ipairs(groupsArray) do
            MySQL.insert.await('INSERT INTO mri_qadmin_character_groups (citizenid, group_id) VALUES (?, ?)', {citizenid, gId})
            lib.addPrincipal('char:'..citizenid, 'mri.group.'..gId)
        end
    end)

    if not ok then
        print('^1[mri_Qadmin] ERRO ao atualizar grupos do personagem:^7', err)
        return false, "Erro ao salvar no banco de dados."
    end

    TriggerClientEvent('QBCore:Notify', source, 'Grupos do jogador atualizados.', 'success')
    AddLog(source, 'mri_Qadmin', 'permissions', 'warn', ('Grupos: personagem %s teve grupos atualizados: %s'):format(citizenid, table.concat(groupsArray, ', ')), { citizenid = citizenid, groups = groupsArray })
    -- Adia o re-sync/broadcast até os add_principal/remove_principal aplicarem, senão o
    -- cliente re-lê GetMyPermissions antes e continua vendo os grupos antigos.
    DeferAcePropagation(function()
        for _, id in ipairs(QBCore.Functions.GetPlayers()) do
            local p = QBCore.Functions.GetPlayer(id)
            if p and p.PlayerData.citizenid == citizenid then
                SetupPlayerPrincipals(id, true)
                Debug('debug', ('[mri_Qadmin] Principals recarregados para source %d (%s) após mudança de grupos'):format(id, citizenid))
                break
            end
        end
    end)
    return true
end)

function GetUserPermissions(src)
    local allowed = {}

    -- Check all known permissions dynamically
    for _, node in ipairs(ALL_KNOWN_QADMIN_PERMS) do
        if HasPerms(src, node) then
            -- For Config actions, map them to 'action.xxx' for frontend compatibility if they don't start with qadmin.
            -- This preserves legacy behavior while supporting native qadmin. nodes
            if not string.find(node, 'qadmin%.') then
                -- Try to find the key in config
                local found = false
                if Config.Actions then for k, v in pairs(Config.Actions) do if v.perms == node then table.insert(allowed, 'action.'..k) found = true break end end end
                if not found and Config.PlayerActions then for k, v in pairs(Config.PlayerActions) do if v.perms == node then table.insert(allowed, 'action.'..k) found = true break end end end

                if not found then table.insert(allowed, node) end
            else
                table.insert(allowed, node)
            end
        end
    end

    Debug('debug', ('[mri_Qadmin] Permissions for Source %s: %d nodes found: %s'):format(src, #allowed, table.concat(allowed, ', ')))

    return allowed
end

lib.callback.register('mri_Qadmin:callback:GetMyPermissions', function(source)
    local allowed = GetUserPermissions(source)
    return allowed
end)

lib.callback.register('mri_Qadmin:callback:GetAces', function(source)
    -- Gated on qadmin.page.permissions (not qadmin.open): raw ACE lines expose
    -- every principal and the license identifiers of Master Admins.
    if not CheckPerms(source, 'qadmin.page.permissions') then return {} end
    local raw = GetAces() or ''
    local result = {}
    for line in raw:gmatch('[^\n]+') do
        local atype, principal, object = line:match('^(%S+)%s+(%S+)%s+(%S+)$')
        if atype and principal and object then
            table.insert(result, { type = atype, principal = principal, object = object })
        end
    end
    return result
end)

lib.callback.register('mri_Qadmin:callback:GetPrincipals', function(source)
    -- Gated on qadmin.page.permissions (not qadmin.open): principal inheritance
    -- lines reveal the full ACE/permission topology of the server.
    if not CheckPerms(source, 'qadmin.page.permissions') then return {} end
    local raw = GetPrincipals() or ''
    local result = {}
    for line in raw:gmatch('[^\n]+') do
        local child, parent = line:match('^(%S+)%s+(%S+)$')
        if child and parent then
            table.insert(result, { child = child, parent = parent })
        end
    end
    return result
end)

lib.addCommand('mri_qadmin.setmaster', {
    help = 'Set a player as Master Admin (Console Only)',
    params = {
        { name = 'target', help = 'Player ID, License or License2' },
    },
}, function(source, args)
    if source ~= 0 then return end

    local target = args.target
    local license = target
    if tonumber(target) then
        local p = QBCore.Functions.GetPlayer(tonumber(target))
        if p then
            license = p.PlayerData.license
            print(('[mri_Qadmin] Resolved ID %s to %s (%s)'):format(target, p.PlayerData.name, license))
        else
            print('^1[mri_Qadmin] Player ID not found online. Provide full string (license:xxx)^7')
            return
        end
    end

    if not string.find(license, 'license:') and not string.find(license, 'license2:') then
        print('^3[mri_Qadmin] Assuming parameter is already a valid identifier.^7')
    end

    local cleanLicense = license:gsub("identifier.", "")

    -- Store in DB immediately
    MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_masters (license) VALUES (?)', {cleanLicense})

    -- Apply immediately
    lib.addAce('identifier.' .. cleanLicense, 'qadmin.master', true)
    print(('^2[mri_Qadmin] Executed: lib.addAce identifier.%s qadmin.master true^7'):format(cleanLicense))

    -- AUDIT: master grant é a ação mais privilegiada do sistema.
    AddLog(0, 'mri_Qadmin', 'permissions', 'error', ('Master Admin CONCEDIDO via console: %s'):format(cleanLicense), { license = cleanLicense, actor = 'console' })

    local players = QBCore.Functions.GetPlayers()
    for _, id in ipairs(players) do
        local p = QBCore.Functions.GetPlayer(id)
        if p and (p.PlayerData.license == cleanLicense) then
            TriggerEvent('mri_Qadmin:server:Reload', id)
            TriggerClientEvent('QBCore:Notify', id, 'Você agora é Master Admin!', 'success')
            BroadcastPermissionUpdate()
        end
    end
end)

lib.addCommand('mri_qadmin.removemaster', {
    help = 'Remove a player from Master Admin (Console Only)',
    params = {
        { name = 'target', help = 'Player ID, License or License2' },
    },
}, function(source, args)
    if source ~= 0 then return end

    local target = args.target
    local license = target
    if tonumber(target) then
        local p = QBCore.Functions.GetPlayer(tonumber(target))
        if p then license = p.PlayerData.license end
    end

    local cleanLicense = license:gsub("identifier.", "")

    MySQL.query.await('DELETE FROM mri_qadmin_masters WHERE license = ?', {cleanLicense})
    lib.removeAce('identifier.' .. cleanLicense, 'qadmin.master', true)

    print(('^2[mri_Qadmin] Executed: lib.removeAce identifier.%s qadmin.master^7'):format(cleanLicense))

    -- AUDIT
    AddLog(0, 'mri_Qadmin', 'permissions', 'warn', ('Master Admin REVOGADO via console: %s'):format(cleanLicense), { license = cleanLicense, actor = 'console' })

    local players = QBCore.Functions.GetPlayers()
    for _, id in ipairs(players) do
        local p = QBCore.Functions.GetPlayer(id)
        if p and (p.PlayerData.license == cleanLicense) then
            TriggerEvent('mri_Qadmin:server:Reload', id)
            TriggerClientEvent('QBCore:Notify', id, 'Seu acesso Master Admin foi revogado.', 'error')
            BroadcastPermissionUpdate()
        end
    end
end)

lib.addCommand('mri_qadmin.debugperms', {
    help = 'Debug player permissions (Console Only)',
    params = {
        { name = 'target', help = 'Player ID' },
    },
}, function(source, args)
    if source ~= 0 then return end
    local targetId = tonumber(args.target)
    if not targetId then print('^1[mri_Qadmin] ID inválido.^7') return end

    local p = QBCore.Functions.GetPlayer(targetId)
    if not p then print('^1[mri_Qadmin] Jogador não encontrado.^7') return end

    print(('^3--- DEBUG PERMISSIONS: %s (%s) ---^7'):format(p.PlayerData.name, p.PlayerData.citizenid))

    print('PAGES:')
    for _, def in ipairs(PERM_DEFINITIONS) do
        if def.id:find('qadmin%.page%.') then
            local allowed = HasPerms(targetId, def.id)
            local color = allowed and '^2' or '^1'
            print(('%s- %s: %s^7'):format(color, def.id, tostring(allowed)))
        end
    end

    local isMaster = HasPerms(targetId, 'qadmin.master')
    print(('^5MASTER BYPASS ACTIVE: %s^7'):format(tostring(isMaster)))

    if isMaster then
        print('^3RASTREAMENTO DE ORIGEM (MASTER):^7')
        local principals = { 'identifier.license:' .. p.PlayerData.license, 'char:' .. p.PlayerData.citizenid }
        local num = GetNumPlayerIdentifiers(targetId)
        for i = 0, num - 1 do
            local id = GetPlayerIdentifier(targetId, i)
            table.insert(principals, 'identifier.' .. id)
            table.insert(principals, id)
        end

        -- Check common groups
        local commonGroups = {'group.admin', 'group.god', 'group.mod', 'group.user'}
        for _, g in ipairs(commonGroups) do table.insert(principals, g) end

        for _, principal in ipairs(principals) do
            if IsPrincipalAceAllowed(principal, 'qadmin.master') then
                print(('^1[!] ACE ENCONTRADO NO PRINCIPAL: %s^7'):format(principal))
            end
        end
    end

    -- Check Database masters
    local dbMasters = MySQL.query.await('SELECT * FROM mri_qadmin_masters') or {}
    print(('^3DATABASE MASTERS (%d found):^7'):format(#dbMasters))
    for _, m in ipairs(dbMasters) do
        local isThisOne = (p.PlayerData.license == m.license)
        print(('%s- %s %s^7'):format(isThisOne and '^2' or '^7', m.license, isThisOne and '[SUA LICENÇA]' or ''))
    end

    -- DB groups for this character
    local dbGroups = MySQL.query.await('SELECT group_id FROM mri_qadmin_character_groups WHERE citizenid = ?', {p.PlayerData.citizenid}) or {}
    print(('^3DB GROUPS para %s (%d found):^7'):format(p.PlayerData.citizenid, #dbGroups))
    if #dbGroups == 0 then
        print('^1  (nenhum — char não está em nenhum grupo no banco)^7')
    end
    for _, g in ipairs(dbGroups) do
        print(('  - group.%s'):format(g.group_id))
    end

    -- Principal source trace for qadmin.page.dashboard
    local tracePerm = 'qadmin.page.dashboard'
    print(('^5--- ORIGIN TRACE (%s) ---^7'):format(tracePerm))
    print(('^5  IsPlayerAceAllowed(src): %s^7'):format(tostring(IsPlayerAceAllowed(targetId, tracePerm))))

    -- Check FiveM native groups (txAdmin/server.cfg)
    local nativeGroups = {'group.admin', 'group.god', 'group.mod', 'group.user', 'group.superadmin'}
    for _, g in ipairs(nativeGroups) do
        if IsPrincipalAceAllowed(g, tracePerm) then
            print(('^1  [WARN] %s tem %s -> ACE vazando do FiveM nativo! (txAdmin/server.cfg)^7'):format(g, tracePerm))
        end
    end

    -- Check mri.group.* principals (nosso namespace isolado)
    local mriGroupRows = MySQL.query.await('SELECT id FROM mri_qadmin_groups') or {}
    for _, gr in ipairs(mriGroupRows) do
        local mriPrincipal = 'mri.group.' .. gr.id
        if IsPrincipalAceAllowed(mriPrincipal, tracePerm) then
            print(('^2  [OK] %s tem %s -> via namespace isolado (correto)^7'):format(mriPrincipal, tracePerm))
        end
    end

    local charAllow = IsPrincipalAceAllowed('char:' .. p.PlayerData.citizenid, tracePerm)
    print(('^5  char:%s -> %s^7'):format(p.PlayerData.citizenid, tostring(charAllow)))

    local numIds = GetNumPlayerIdentifiers(targetId)
    for i = 0, numIds - 1 do
        local id = GetPlayerIdentifier(targetId, i)
        if IsPrincipalAceAllowed('identifier.' .. id, tracePerm) or IsPrincipalAceAllowed(id, tracePerm) then
            print(('^1  [SOURCE] identifier.%s -> ALLOW (vazamento de principal externo!)^7'):format(id))
        end
    end
    print('^3------------------------------------------^7')
end)

lib.addCommand('mri_qadmin.purgemasters', {
    help = 'WIPE ALL Master Bypasses from DB and Session (Console Only)',
}, function(source, args)
    if source ~= 0 then return end

    local masters = MySQL.query.await('SELECT license FROM mri_qadmin_masters') or {}
    for _, m in ipairs(masters) do
        lib.removeAce('identifier.' .. m.license, 'qadmin.master', true)
        lib.removeAce('identifier.' .. m.license, 'qadmin', true)
    end

    -- Force clean common groups just in case
    local targets = {'group.admin', 'group.god', 'group.mod', 'group.user'}
    for _, t in ipairs(targets) do
        lib.removeAce(t, 'qadmin.master', true)
        lib.removeAce(t, 'qadmin', true)
    end

    -- Clean group permissions for master too! (THE SMOKING GUN)
    MySQL.query.await('DELETE FROM mri_qadmin_group_permissions WHERE permission = "qadmin.master"')

    local affectedMasters = MySQL.query.await('SELECT COUNT(*) AS c FROM mri_qadmin_masters')
    local mastersCount = (affectedMasters and affectedMasters[1] and affectedMasters[1].c) or 0
    MySQL.query.await('DELETE FROM mri_qadmin_masters')
    print('^2[mri_Qadmin] DATABASE WIPED: mri_qadmin_masters and Master nodes for groups are now empty.^7')
    print('^2[mri_Qadmin] SESSION CLEANED: Master ACES removed from known licenses and common groups.^7')

    -- AUDIT: wipe global de masters — operação irreversível.
    AddLog(0, 'mri_Qadmin', 'permissions', 'error', ('PURGE MASTERS via console: %d masters removidos do DB, group_permissions limpos'):format(mastersCount), { actor = 'console', count = mastersCount })

    BroadcastPermissionUpdate()
end)

lib.addCommand('mri_qadmin.inspectdb', {
    help = 'Inspect Permission Tables for Hidden Master Rows (Console Only)',
}, function(source, args)
    if source ~= 0 then return end

    print('^3--- DATABASE INSPECTION ---^7')

    -- Check Groups
    local groups = MySQL.query.await('SELECT * FROM mri_qadmin_groups') or {}
    print(('^5Groups Found: %d^7'):format(#groups))
    for _, g in ipairs(groups) do
        local lp = g.linked_principals or 'NULL'
        print(('  - %s (%s) | linked_principals: %s'):format(g.id, g.label, lp))
    end

    -- Check Group Permissions for Master
    local groupPerms = MySQL.query.await('SELECT * FROM mri_qadmin_group_permissions WHERE permission LIKE ?', {'%qadmin%'}) or {}
    print(('^5Relevant Group Permissions Found: %d^7'):format(#groupPerms))
    for _, p in ipairs(groupPerms) do
        local color = p.permission == 'qadmin.master' and '^1' or '^7'
        print(('%s  - Group: %s | Perm: %s^7'):format(color, p.group_id, p.permission))
    end

    -- Check Legacy Tables
    local tables = MySQL.query.await("SHOW TABLES LIKE 'mri_qadmin_aces'") or {}
    if #tables > 0 then
        print('^1[!] ALERT: Legacy table mri_qadmin_aces STILL EXISTS. This may cause re-migration.^7')
    else
        print('^2Legacy table mri_qadmin_aces not found (Good).^7')
    end

    print('^3---------------------------^7')
end)

RegisterNetEvent('mri_Qadmin:server:SeedAces', function()
    local src = source
    if not CheckPerms(src, 'qadmin.page.permissions') then return end

    local count = 0
    MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {'admin', 'Administrador', 'Default Admin Group'})

    local function addSafe(perm)
        -- SECURITY: nunca semear master nem ACE nativa (Config.OpenPanelPerms pode ser 'command').
        if IsForbiddenPermNode(perm) then return end
        local exists = MySQL.single.await('SELECT id FROM mri_qadmin_group_permissions WHERE group_id = "admin" AND permission = ?', {perm})
        if not exists then
            MySQL.insert.await('INSERT INTO mri_qadmin_group_permissions (group_id, permission) VALUES ("admin", ?)', {perm})
            lib.addAce('mri.group.admin', perm, true)
            count = count + 1
        end
    end

    -- Seed a partir de AllKnownPermNodes(): a lista plana crua nasce ANTES de
    -- server/actions.lua popular Config.Actions, então sozinha ela não contém as perms que
    -- só existem numa ação — era isso que deixava o botão "Seed" entregando um grupo admin
    -- incompleto.
    for _, perm in ipairs(AllKnownPermNodes()) do addSafe(perm) end

    if type(Config.OpenPanelPerms) == "string" then addSafe(Config.OpenPanelPerms) end

    if count > 0 then
        TriggerClientEvent('QBCore:Notify', src, ('Seeded %d permissions for \'admin\' group'):format(count), 'success')
        AddLog(src, 'mri_Qadmin', 'permissions', 'warn', ('SeedAces: %d permissões adicionadas ao grupo "admin"'):format(count), { count = count })
        DeferAcePropagation()
    else
        TriggerClientEvent('QBCore:Notify', src, 'All permissions already exist', 'primary')
    end
end)

AddEventHandler('mri_Qadmin:db:ready', function()
    LoadPermissions()
end)
