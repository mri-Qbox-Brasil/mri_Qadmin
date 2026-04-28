local QBCore = exports['qb-core']:GetCoreObject()

-----------------------------------------------------------------------------------------------------------------------------------------
-- MIGRATION
-----------------------------------------------------------------------------------------------------------------------------------------

local function RunMigration()
    local hasOld = MySQL.scalar.await("SELECT count(*) FROM information_schema.tables WHERE table_name = 'mri_qadmin_aces' AND table_schema = DATABASE()")
    if hasOld > 0 then
        Debug('[mri_Qadmin] MIGRATION: Old permissions tables found. Running migration to group-based system...')

        local groups = {}
        local dbPrincipals = MySQL.query.await('SELECT * FROM mri_qadmin_principals') or {}
        local dbAces = MySQL.query.await('SELECT * FROM mri_qadmin_aces') or {}

        -- Default admin group
        MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {'admin', 'Administrador', 'Grupo de Administração'})
        groups['group.admin'] = 'admin'

        for _, p in ipairs(dbPrincipals) do
            local parent = p.parent
            if string.find(parent, 'group.') then
                local groupName = string.gsub(parent, 'group.', '')
                if not groups[parent] then
                    MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {groupName, groupName:gsub("^%l", string.upper), 'Migrado'})
                    groups[parent] = groupName
                end

                local child = p.child
                if string.find(child, 'license:') or string.find(child, 'license2:') then
                    local cleanLicense = child:gsub('identifier.', '')
                    local qbplayers = MySQL.query.await('SELECT citizenid FROM players WHERE license = ?', {cleanLicense}) or {}
                    for _, row in ipairs(qbplayers) do
                        MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_character_groups (citizenid, group_id) VALUES (?, ?)', {row.citizenid, groups[parent]})
                    end
                elseif string.find(child, 'char:') then
                    local cid = child:gsub('char:', '')
                    MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_character_groups (citizenid, group_id) VALUES (?, ?)', {cid, groups[parent]})
                end
            end
        end

        for _, a in ipairs(dbAces) do
            local principal = a.principal
            local obj = a.object
            if a.allow == 1 and string.find(principal, 'group.') then
                local groupName = string.gsub(principal, 'group.', '')
                if not groups[principal] then
                    MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {groupName, groupName:gsub("^%l", string.upper), 'Migrado'})
                    groups[principal] = groupName
                end
                MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_group_permissions (group_id, permission) VALUES (?, ?)', {groupName, obj})
            end

            if a.allow == 1 and string.find(principal, 'identifier.') and obj == 'qadmin.master' then
                local lic = principal:gsub('identifier.', '')
                MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_masters (license) VALUES (?)', {lic})
            end
        end

        MySQL.query.await('RENAME TABLE mri_qadmin_aces TO bkp_mri_qadmin_aces')
        MySQL.query.await('RENAME TABLE mri_qadmin_principals TO bkp_mri_qadmin_principals')
        Debug('[mri_Qadmin] MIGRATION: Migration complete!')
    end
end

-----------------------------------------------------------------------------------------------------------------------------------------
-- FUNCTIONS
-----------------------------------------------------------------------------------------------------------------------------------------

local ALL_KNOWN_QADMIN_PERMS = (function()
    local pages = {
        'dashboard', 'players', 'groups', 'bans', 'staffchat', 'items', 'vehicles',
        'commands', 'actions', 'permissions', 'resources', 'settings', 'devmode', 'livemap', 'livescreens',
        'logs', 'statistics', 'reports', 'terminal', 'staff_point'
    }
    local actions = {
        'qadmin.action.revive', 'qadmin.action.revive_all', 'qadmin.action.revive_self',
        'qadmin.action.kill_player', 'qadmin.action.ban_player',
        'qadmin.action.unban_player', 'qadmin.action.kick_player', 'qadmin.action.warn_player',
        'qadmin.action.verify_player', 'qadmin.action.delete_character', 'qadmin.action.set_job',
        'qadmin.action.set_gang', 'qadmin.action.give_money', 'qadmin.action.remove_money',
        'qadmin.action.set_bucket', 'qadmin.action.give_item', 'qadmin.action.clear_inventory',
        'qadmin.action.open_inventory', 'qadmin.action.view_inventory', 'qadmin.action.modify_inventory',
        'qadmin.action.open_trunk', 'qadmin.action.open_stash',
        'qadmin.action.delete_vehicle', 'qadmin.action.spawn_vehicle', 'qadmin.action.admincar',
        'qadmin.action.change_plate', 'qadmin.action.change_vehicle_state',
        'qadmin.action.fix_vehicle', 'qadmin.action.fix_self_vehicle', 'qadmin.action.spectate_player',
        'qadmin.action.freeze_player', 'qadmin.action.teleport_to_player', 'qadmin.action.bring_player',
        'qadmin.action.teleport_back', 'qadmin.action.drunk_player', 'qadmin.action.blackout',
        'qadmin.action.toggle_cuffs', 'qadmin.action.clothing_menu', 'qadmin.action.staff_clothing',
        'qadmin.action.set_ped', 'qadmin.action.noclip', 'qadmin.action.god_mode',
        'qadmin.action.invisibility', 'qadmin.action.invisible', 'qadmin.action.tag',
        'qadmin.action.announcements', 'qadmin.action.clear_chat', 'qadmin.action.goto_waypoint',
        'qadmin.action.info_admin', 'qadmin.action.server_time', 'qadmin.action.change_resource',
        'qadmin.action.enable_wall', 'qadmin.action.screen_capture', 'qadmin.action.change_vehicle_property',
        'qadmin.action.view_detailed_logs', 'qadmin.action.manage_reports', 'qadmin.action.delete_report',
        'qadmin.action.staff_clock_in', 'qadmin.action.staff_clock_out', 'qadmin.commands',
        'qadmin.action.track_player', 'qadmin.action.set_vital', 'qadmin.action.view_player_identifiers',
        'qadmin.action.manage_vehicles', 'qadmin.action.copy_inventory', 'qadmin.action.manage_actions',
        'qadmin.action.staff_chat_send', 'qadmin.action.toggle_mock_mode', 'qadmin.action.manage_settings',
        'qadmin.action.manage_wall', 'qadmin.action.mute_player', 'qadmin.action.refuel_vehicle'
    }
    local all = {'qadmin.open', 'qadmin.master'}
    for _, p in ipairs(pages) do all[#all + 1] = 'qadmin.page.' .. p end
    for _, a in ipairs(actions) do all[#all + 1] = a end
    -- Config-driven action perms
    if Config.Actions then for _, v in pairs(Config.Actions) do if v.perms then all[#all + 1] = v.perms end end end
    if Config.PlayerActions then for _, v in pairs(Config.PlayerActions) do if v.perms then all[#all + 1] = v.perms end end end
    if Config.OtherActions then for _, v in pairs(Config.OtherActions) do if v.perms then all[#all + 1] = v.perms end end end
    return all
end)()

local function ClearGroupAces(groupId)
    local principal = 'mri.group.' .. groupId
    for _, perm in ipairs(ALL_KNOWN_QADMIN_PERMS) do
        lib.removeAce(principal, perm, true)
    end
end

local function LoadPermissions()
    RunMigration()

    -- Load Groups and their Aces
    local groups = MySQL.query.await('SELECT * FROM mri_qadmin_groups') or {}
    for _, g in ipairs(groups) do
        -- Wipe all known ACEs first so removed permissions don't persist across restarts
        ClearGroupAces(g.id)

        -- FORCE qadmin.open for any managed group
        lib.addAce('mri.group.' .. g.id, 'qadmin.open', true)

        local perms = MySQL.query.await('SELECT * FROM mri_qadmin_group_permissions WHERE group_id = ?', {g.id}) or {}
        for _, p in ipairs(perms) do
            if p.permission ~= 'qadmin.master' then
                Debug(('[mri_Qadmin] Applying ACE: mri.group.%s -> %s'):format(g.id, p.permission))
                lib.addAce('mri.group.' .. g.id, p.permission, true)
            else
                print(('^1[mri_Qadmin] SECURITY ALERT: Found forbidden "qadmin.master" for group "%s" in DB. Skipping synchronization.^7'):format(g.id))
            end
        end
    end

    -- Load Master bypasses
    local masters = MySQL.query.await('SELECT license FROM mri_qadmin_masters') or {}
    for _, m in ipairs(masters) do
        Debug(('[mri_Qadmin] Applying Master Bypass: identifier.%s -> qadmin.master'):format(m.license))
        lib.addAce('identifier.' .. m.license, 'qadmin.master', true)
        lib.addAce('identifier.' .. m.license, 'qadmin.open', true)
    end

    Debug(('[mri_Qadmin] Loaded %d Groups from DB'):format(#groups))

    -- Re-sync all online players (essential for script restarts)
    CreateThread(function()
        Wait(1000) -- Give QBCore a second
        local players = QBCore.Functions.GetPlayers()
        Debug(('[mri_Qadmin] Re-syncing %d online players...'):format(#players))
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
                print(('^1[mri_Qadmin] FAILED to sync player %d after 10 seconds. Principal mapping will be missing!^7'):format(id))
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

    lib.removePrincipal(cache.fivemPrincipal, 'char:' .. cache.citizenid)
    Debug(('Cleanup: principal removido: %s -> char:%s'):format(cache.fivemPrincipal, cache.citizenid))
    for _, gid in ipairs(cache.groups) do
        lib.removePrincipal('char:' .. cache.citizenid, 'mri.group.' .. gid)
        Debug(('Cleanup: principal removido: %s -> char:%s'):format('mri.group.' .. gid, cache.citizenid))
    end

    Debug(('[mri_Qadmin] Cleanup: principals revogados para char:%s'):format(cache.citizenid))
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
    if isReload then CleanupPlayerPrincipals(src) end

    lib.addPrincipal(fivemPrincipal, 'char:' .. citizenid)
    Debug(('[mri_Qadmin] Principal Mapping: %s -> char:%s'):format(fivemPrincipal, citizenid))

    local charGroups = MySQL.query.await('SELECT group_id FROM mri_qadmin_character_groups WHERE citizenid = ?', {citizenid}) or {}
    local foundAdmin = false
    local activeGroups = {}

    for _, g in ipairs(charGroups) do
        Debug(('[mri_Qadmin] Group Mapping: char:%s -> mri.group.%s'):format(citizenid, g.group_id))
        lib.addPrincipal('char:' .. citizenid, 'mri.group.' .. g.group_id)
        activeGroups[#activeGroups + 1] = g.group_id
        if g.group_id == 'admin' then foundAdmin = true end
    end

    -- Reverse Permission Sync (QBCore -> mri_Qadmin admin group)
    if not isReload and Config.QBCoreAutoSync ~= false then
        local hasQBCoreAdmin = QBCore.Functions.HasPermission(src, 'admin') or QBCore.Functions.HasPermission(src, 'god')
        if hasQBCoreAdmin and not foundAdmin then
            Debug(('[mri_Qadmin] Auto-Sync: Jogador %s possui permissão de base (QBCore admin). Sincronizando com grupo admin do painel...'):format(GetPlayerName(src)))
            MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {'admin', 'Administrador', 'Default Admin Group'})
            MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_character_groups (citizenid, group_id) VALUES (?, ?)', {citizenid, 'admin'})
            lib.addPrincipal('char:' .. citizenid, 'mri.group.admin')
            activeGroups[#activeGroups + 1] = 'admin'
            foundAdmin = true
        end
    end

    principalCache[src] = { fivemPrincipal = fivemPrincipal, citizenid = citizenid, groups = activeGroups }
end

RegisterNetEvent('QBCore:Server:OnPlayerLoaded', function()
    local src = source
    SetupPlayerPrincipals(src, false)
    TriggerEvent('mri_Qadmin:server:PlayerPermissionsReady', src)
end)

AddEventHandler('mri_Qadmin:server:Reload', function(src)
    SetupPlayerPrincipals(src, true)
    TriggerEvent('mri_Qadmin:server:PlayerPermissionsReady', src)
end)

RegisterNetEvent('QBCore:Server:OnPlayerUnload', function(source)
    local src = source
    Debug(('OnPlayerUnload chamado para: %s'):format(src))
    CleanupPlayerPrincipals(src)
    TriggerClientEvent('mri_Qadmin:client:CloseUI', src)
end)

AddEventHandler('playerDropped', function()
    CleanupPlayerPrincipals(source)
end)

local function BroadcastPermissionUpdate()
    Debug('[mri_Qadmin] Broadcasting Permission Update to ALL clients')
    TriggerClientEvent('mri_Qadmin:client:ForceReloadPermissions', -1)
end

-- Callbacks
lib.callback.register('mri_Qadmin:callback:GetGroups', function(source)
    if not IsPlayerAceAllowed(source, 'qadmin.page.permissions') and not IsPlayerAceAllowed(source, 'qadmin.master') then return {} end

    local groups = MySQL.query.await('SELECT * FROM mri_qadmin_groups ORDER BY createdAt DESC') or {}
    local perms = MySQL.query.await('SELECT * FROM mri_qadmin_group_permissions') or {}

    for _, g in ipairs(groups) do
        g.permissions = {}
        for _, p in ipairs(perms) do
            if p.group_id == g.id then
                table.insert(g.permissions, p.permission)
            end
        end
    end

    return groups
end)

-- Callbacks: Players and Groups
lib.callback.register('mri_Qadmin:callback:GetCharacterGroups', function(source, citizenid)
    if not IsPlayerAceAllowed(source, 'qadmin.page.permissions') and not IsPlayerAceAllowed(source, 'qadmin.master') then return {} end
    local current = MySQL.query.await('SELECT group_id FROM mri_qadmin_character_groups WHERE citizenid = ?', {citizenid}) or {}
    local list = {}
    for _, g in ipairs(current) do
        table.insert(list, g.group_id)
    end
    return list
end)

lib.callback.register('mri_Qadmin:server:SaveGroup', function(source, id, label, description)
    if not IsPlayerAceAllowed(source, 'qadmin.page.permissions') and not IsPlayerAceAllowed(source, 'qadmin.master') then
        return false, "Acesso Negado."
    end

    local cleanId = id:lower():gsub("%s+", "_")

    local ok, err = pcall(function()
        local exists = MySQL.single.await('SELECT id FROM mri_qadmin_groups WHERE id = ?', {cleanId})
        if exists then
            MySQL.update.await('UPDATE mri_qadmin_groups SET label = ?, description = ? WHERE id = ?', {label, description, cleanId})
            TriggerClientEvent('QBCore:Notify', source, 'Grupo atualizado', 'success')
        else
            MySQL.insert.await('INSERT INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {cleanId, label, description})
            TriggerClientEvent('QBCore:Notify', source, 'Grupo criado', 'success')
        end
    end)

    if not ok then
        print('^1[mri_Qadmin] ERRO ao salvar grupo:^7', err)
        return false, "Erro ao salvar grupo no banco de dados."
    end

    AddLog(source, 'mri_Qadmin', 'permissions', 'info', ('Grupo: grupo "%s" criado/atualizado'):format(cleanId), { group = cleanId, label = label })
    BroadcastPermissionUpdate()
    return true
end)

lib.callback.register('mri_Qadmin:server:DeleteGroup', function(source, id)
    if not IsPlayerAceAllowed(source, 'qadmin.page.permissions') and not IsPlayerAceAllowed(source, 'qadmin.master') then
        return false, "Acesso Negado."
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
    end)

    if not ok then
        print('^1[mri_Qadmin] ERRO ao deletar grupo:^7', err)
        return false, "Erro ao deletar grupo do banco de dados."
    end

    TriggerClientEvent('QBCore:Notify', source, 'Grupo removido', 'success')
    AddLog(source, 'mri_Qadmin', 'permissions', 'warn', ('Grupo: grupo "%s" removido'):format(id), { group = id })
    BroadcastPermissionUpdate()
    return true
end)

lib.callback.register('mri_Qadmin:server:UpdateGroupPermissions', function(source, groupId, permissionsArray)
    if not IsPlayerAceAllowed(source, 'qadmin.page.permissions') and not IsPlayerAceAllowed(source, 'qadmin.master') then
        return false, "Acesso Negado."
    end

    Debug(('[mri_Qadmin] Iniciando atualização de permissões para grupo: %s'):format(groupId))

    local ok, err = pcall(function()
        local oldPerms = MySQL.query.await('SELECT permission FROM mri_qadmin_group_permissions WHERE group_id = ?', {groupId})
        if oldPerms then
            for _, p in ipairs(oldPerms) do
                lib.removeAce('mri.group.'..groupId, p.permission, true)
            end
        end
        MySQL.query.await('DELETE FROM mri_qadmin_group_permissions WHERE group_id = ?', {groupId})

        for _, p in ipairs(permissionsArray) do
            if p ~= 'qadmin.master' then
                MySQL.insert.await('INSERT INTO mri_qadmin_group_permissions (group_id, permission) VALUES (?, ?)', {groupId, p})
                lib.addAce('mri.group.'..groupId, p, true)
            end
        end
    end)

    if not ok then
        print('^1[mri_Qadmin] ERRO ao atualizar permissões do grupo:^7', err)
        return false, "Erro ao salvar no banco de dados."
    end

    TriggerClientEvent('QBCore:Notify', source, 'Permissões do grupo atualizadas.', 'success')
    AddLog(source, 'mri_Qadmin', 'permissions', 'warn', ('Permissões: grupo "%s" teve permissões atualizadas (%d perms)'):format(groupId, #permissionsArray), { group = groupId, count = #permissionsArray })
    BroadcastPermissionUpdate()
    return true
end)

lib.callback.register('mri_Qadmin:server:UpdateCharacterGroups', function(source, citizenid, groupsArray)
    if not IsPlayerAceAllowed(source, 'qadmin.page.permissions') and not IsPlayerAceAllowed(source, 'qadmin.master') then
        return false, "Acesso Negado."
    end

    Debug(('[mri_Qadmin] Atualizando grupos para citizenid: %s'):format(citizenid))

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
    BroadcastPermissionUpdate()
    return true
end)

local function GetUserPermissions(src)
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

    Debug(('[mri_Qadmin] Permissions for Source %s: %d nodes found'):format(src, #allowed))
    if Config.Debug then
        print(('[mri_Qadmin] Nodes: %s'):format(table.concat(allowed, ', ')))
    end

    return allowed
end
_G.GetUserPermissions = GetUserPermissions

lib.callback.register('mri_Qadmin:callback:GetMyPermissions', function(source)
    local allowed = GetUserPermissions(source)
    return allowed
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

    local pages = {
        'dashboard', 'players', 'groups', 'bans', 'staffchat', 'items', 'vehicles',
        'commands', 'actions', 'permissions', 'resources', 'settings', 'devmode', 'livemap', 'livescreens'
    }

    print('PAGES:')
    for _, page in ipairs(pages) do
        local node = 'qadmin.page.' .. page
        local allowed = HasPerms(targetId, node)
        local color = allowed and '^2' or '^1'
        print(('%s- %s: %s^7'):format(color, node, tostring(allowed)))
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

    MySQL.query.await('DELETE FROM mri_qadmin_masters')
    print('^2[mri_Qadmin] DATABASE WIPED: mri_qadmin_masters and Master nodes for groups are now empty.^7')
    print('^2[mri_Qadmin] SESSION CLEANED: Master ACES removed from known licenses and common groups.^7')

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
        print(('  - %s (%s)'):format(g.id, g.label))
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
    if not IsPlayerAceAllowed(src, 'qadmin.page.permissions') and not IsPlayerAceAllowed(src, 'qadmin.master') then return end

    local count = 0
    MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_groups (id, label, description) VALUES (?, ?, ?)', {'admin', 'Administrador', 'Default Admin Group'})

    local function addSafe(perm)
        if perm == 'qadmin.master' then return end -- SECURITY: Never seed master to group
        local exists = MySQL.single.await('SELECT id FROM mri_qadmin_group_permissions WHERE group_id = "admin" AND permission = ?', {perm})
        if not exists then
            MySQL.insert.await('INSERT INTO mri_qadmin_group_permissions (group_id, permission) VALUES ("admin", ?)', {perm})
            lib.addAce('mri.group.admin', perm, true)
            count = count + 1
        end
    end

    local pages = {
        'dashboard', 'players', 'groups', 'bans', 'staffchat', 'items', 'vehicles',
        'commands', 'actions', 'permissions', 'resources', 'settings', 'devmode', 'livemap', 'livescreens',
        'logs', 'statistics', 'reports', 'terminal', 'staff_point'
    }
    for _, page in ipairs(pages) do addSafe('qadmin.page.' .. page) end

    local corePermissions = {
        'qadmin.action.revive', 'qadmin.action.kill_player', 'qadmin.action.ban_player',
        'qadmin.action.unban_player', 'qadmin.action.kick_player', 'qadmin.action.warn_player',
        'qadmin.action.verify_player', 'qadmin.action.delete_character', 'qadmin.action.set_job',
        'qadmin.action.set_gang', 'qadmin.action.give_money', 'qadmin.action.remove_money',
        'qadmin.action.set_bucket', 'qadmin.action.give_item', 'qadmin.action.clear_inventory',
        'qadmin.action.open_inventory', 'qadmin.action.open_trunk', 'qadmin.action.open_stash',
        'qadmin.action.delete_vehicle', 'qadmin.action.spawn_vehicle', 'qadmin.action.admincar',
        'qadmin.action.change_plate', 'qadmin.action.fix_vehicle', 'qadmin.action.spectate_player',
        'qadmin.action.freeze_player', 'qadmin.action.teleport_to_player', 'qadmin.action.bring_player',
        'qadmin.action.teleport_back', 'qadmin.action.drunk_player', 'qadmin.action.blackout',
        'qadmin.action.toggle_cuffs', 'qadmin.action.clothing_menu', 'qadmin.action.staff_clothing',
        'qadmin.action.set_ped', 'qadmin.action.noclip', 'qadmin.action.god_mode',
        'qadmin.action.invisibility', 'qadmin.action.tag', 'qadmin.action.announcements',
        'qadmin.action.info_admin', 'qadmin.action.server_time', 'qadmin.action.change_resource',
        'qadmin.action.enable_wall', 'qadmin.action.screen_capture', 'qadmin.action.change_vehicle_property',
        'qadmin.action.view_detailed_logs', 'qadmin.action.manage_reports', 'qadmin.action.delete_report',
        'qadmin.action.staff_clock_in', 'qadmin.action.staff_clock_out', 'qadmin.commands',
        'qadmin.action.track_player', 'qadmin.action.set_vital', 'qadmin.action.view_player_identifiers',
        'qadmin.action.manage_vehicles', 'qadmin.action.copy_inventory', 'qadmin.action.manage_actions',
        'qadmin.action.staff_chat_send', 'qadmin.action.toggle_mock_mode', 'qadmin.action.manage_settings',
        'qadmin.action.manage_wall'
    }
    for _, perms in ipairs(corePermissions) do addSafe(perms) end

    -- Seed Actions from Config
    if Config.Actions then for k, v in pairs(Config.Actions) do if v.perms then addSafe(v.perms) end end end
    if Config.PlayerActions then for k, v in pairs(Config.PlayerActions) do if v.perms then addSafe(v.perms) end end end
    if Config.OtherActions then for k, v in pairs(Config.OtherActions) do if v.perms then addSafe(v.perms) end end end

    if type(Config.OpenPanelPerms) == "string" then addSafe(Config.OpenPanelPerms) end

    if count > 0 then
        TriggerClientEvent('QBCore:Notify', src, ('Seeded %d permissions for \'admin\' group'):format(count), 'success')
        BroadcastPermissionUpdate()
    else
        TriggerClientEvent('QBCore:Notify', src, 'All permissions already exist', 'primary')
    end
end)

RegisterNetEvent('mri_Qadmin:db:ready', function()
    LoadPermissions()
end)