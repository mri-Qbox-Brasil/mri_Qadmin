local QBCore = exports['qb-core']:GetCoreObject()

-----------------------------------------------------------------------------------------------------------------------------------------
-- FUNCTIONS
-----------------------------------------------------------------------------------------------------------------------------------------

-- Helper: Apply principal to all identifiers of a source
local function ApplyPrincipalToAllIdentifiers(src, parent)
    local num = GetNumPlayerIdentifiers(src)
    for i = 0, num-1 do
        local id = GetPlayerIdentifier(src, i)
        print(('[mri_Qadmin] Expanding Principal: identifier.%s -> %s'):format(id, parent))
        ExecuteCommand(('add_principal identifier.%s %s'):format(id, parent))
    end
end

local function LoadPermissions()
    -- Cleanup Duplicates first
    MySQL.query.await('DELETE t1 FROM mri_qadmin_principals t1 INNER JOIN mri_qadmin_principals t2 WHERE t1.id > t2.id AND t1.child = t2.child AND t1.parent = t2.parent')
    MySQL.query.await('DELETE t1 FROM mri_qadmin_aces t1 INNER JOIN mri_qadmin_aces t2 WHERE t1.id > t2.id AND t1.principal = t2.principal AND t1.object = t2.object')

    -- Load Principals (Inheritance)
    local principals = MySQL.query.await('SELECT * FROM mri_qadmin_principals') or {}

    -- Cache players for optimization
    local onlinePlayers = {}
    for _, id in ipairs(QBCore.Functions.GetPlayers()) do
        local p = QBCore.Functions.GetPlayer(id)
        if p then
            onlinePlayers[id] = {
                license = p.PlayerData.license,
                name = p.PlayerData.name
            }
        end
    end

    for _, p in ipairs(principals) do
        print(('[mri_Qadmin] [DEBUG] Executing: add_principal %s %s'):format(p.child, p.parent))
        ExecuteCommand(('add_principal %s %s'):format(p.child, p.parent))

        -- Expand for online players
        for src, data in pairs(onlinePlayers) do
             if p.child == data.license or p.child == ('license:'..data.license) or p.child == data.name then
                 ApplyPrincipalToAllIdentifiers(src, p.parent)
             else
                 -- Check secondary IDs if needed, but license is primary
                 local num = GetNumPlayerIdentifiers(src)
                 for i = 0, num-1 do
                    if GetPlayerIdentifier(src, i) == p.child then
                        ApplyPrincipalToAllIdentifiers(src, p.parent)
                        break
                    end
                 end
             end
        end
    end
    print(('[mri_Qadmin] Loaded %d Principals from DB'):format(#principals))

    -- Load Aces (Permissions)
    local aces = MySQL.query.await('SELECT * FROM mri_qadmin_aces') or {}
    for _, a in ipairs(aces) do
        local type = a.allow == 1 and 'allow' or 'deny'
        print(('[mri_Qadmin] [DEBUG] Executing: add_ace %s %s %s'):format(a.principal, a.object, type))
        ExecuteCommand(('add_ace %s %s %s'):format(a.principal, a.object, type))
    end
    print(('[mri_Qadmin] Loaded %d Aces from DB'):format(#aces))
end

-- ...

RegisterCommand('qadmin_check', function(source, args)
    if source ~= 0 then return end -- Console only for safety
    local target = tonumber(args[1])
    local extraGroup = args[2] -- Optional: Check a specific group name
    if not target then return print('Usage: qadmin_check [id] [optional_group_to_check]') end

    local Name = GetPlayerName(target)
    if not Name then return print('Player not found') end

    print(('--- Checking Permissions for %s (%d) ---'):format(Name, target))
    local testNodes = {'qadmin.page.players', 'qadmin.page.dashboard', 'group.indy'}

    if extraGroup then
        print(('--- Checking Group Principal: %s ---'):format(extraGroup))
        for _, node in ipairs(testNodes) do
            local allowed = IsPrincipalAceAllowed(extraGroup, node)
            print(('Principal "%s" -> %s: %s'):format(extraGroup, node, tostring(allowed)))
        end
    end

    print('--- Checking Player ACEs ---')
    for _, node in ipairs(testNodes) do
        local allowed = IsPlayerAceAllowed(target, node)
        print(('Player -> %s: %s'):format(node, tostring(allowed)))
    end

    print('--- Checking Player Identifiers Direct Mapping ---')
    local num = GetNumPlayerIdentifiers(target)
    for i = 0, num-1 do
        local id = GetPlayerIdentifier(target, i)
        print('Identifier: ' .. id)
        -- Check if this specific identifier has the permission directly or via inheritance
        for _, node in ipairs(testNodes) do
             if IsPrincipalAceAllowed(id, node) then
                 print(('   -> Has Ace: %s'):format(node))
             end
        end
    end
    print('-------------------------------------------')
end, true)

-----------------------------------------------------------------------------------------------------------------------------------------
-- EVENTS & CALLBACKS
-----------------------------------------------------------------------------------------------------------------------------------------

RegisterNetEvent('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        local myRes = 'resource.' .. resourceName
        if not IsPrincipalAceAllowed(myRes, 'command.add_principal') then
             print('^1[mri_Qadmin] [CRITICAL WARNING] Resource does not have permission to execute "add_principal"!^7')
             print('^1[mri_Qadmin] Please add the following to your server.cfg:^7')
             print(('^3add_ace %s command.add_principal allow^7'):format(myRes))
             print(('^3add_ace %s command.remove_principal allow^7'):format(myRes))
             print(('^3add_ace %s command.add_ace allow^7'):format(myRes))
             print(('^3add_ace %s command.remove_ace allow^7'):format(myRes))
        end

        LoadPermissions()
    end
end)

RegisterNetEvent('QBCore:Server:OnPlayerLoaded', function()
    local src = source
    local player = QBCore.Functions.GetPlayer(src)
    if not player then return end

    local license = player.PlayerData.license
    -- Check if this license is a child in any principal inheritance
    local principals = MySQL.query.await('SELECT parent FROM mri_qadmin_principals WHERE child = ?', {license}) or {}
    local principals2 = MySQL.query.await('SELECT parent FROM mri_qadmin_principals WHERE child = ?', {'license:'..license}) or {}

    -- Combine results
    local found = {}
    for _, p in ipairs(principals) do found[p.parent] = true end
    for _, p in ipairs(principals2) do found[p.parent] = true end

    for parent, _ in pairs(found) do
        print(('[mri_Qadmin] Re-applying permissions for %s -> %s'):format(GetPlayerName(src), parent))
        ApplyPrincipalToAllIdentifiers(src, parent)
    end
end)

-- CALLBACKS: ACES
lib.callback.register('mri_Qadmin:callback:GetAces', function(source)
    if not (QBCore.Functions.HasPermission(source, 'admin') or IsPlayerAceAllowed(source, 'qadmin.page.permissions')) then return {} end
    return MySQL.query.await('SELECT * FROM mri_qadmin_aces')
end)

local function BroadcastPermissionUpdate()
    print('[mri_Qadmin] Broadcasting Permission Update to ALL clients')
    TriggerClientEvent('mri_Qadmin:client:ForceReloadPermissions', -1)
end

-- Hook into existing events
RegisterNetEvent('mri_Qadmin:server:AddAce', function(principal, object, allow)
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    print(('[mri_Qadmin] AddAce Request: %s %s %s'):format(principal, object, tostring(allow)))

    -- Check if exists
    local exists = MySQL.single.await('SELECT id FROM mri_qadmin_aces WHERE principal = ? AND object = ?', {principal, object})
    if exists then
        print(('[mri_Qadmin] Ace already exists (ID: %s). Updating allow state.'):format(exists.id))
        MySQL.update.await('UPDATE mri_qadmin_aces SET allow = ? WHERE id = ?', {allow and 1 or 0, exists.id})
    else
        MySQL.insert.await('INSERT INTO mri_qadmin_aces (principal, object, allow) VALUES (?, ?, ?)', {principal, object, allow and 1 or 0})
    end

    local type = allow and 'allow' or 'deny'
    ExecuteCommand(('add_ace %s %s %s'):format(principal, object, type))

    TriggerClientEvent('QBCore:Notify', src, 'Ace Added successfully', 'success')
    BroadcastPermissionUpdate()
end)

RegisterNetEvent('mri_Qadmin:server:RemoveAce', function(id)
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    print(('[mri_Qadmin] RemoveAce Request ID: %s'):format(id))
    local ace = MySQL.single.await('SELECT * FROM mri_qadmin_aces WHERE id = ?', {id})
    if ace then
        print(('[mri_Qadmin] Removing Ace: %s %s'):format(ace.principal, ace.object))
        MySQL.query.await('DELETE FROM mri_qadmin_aces WHERE id = ?', {id})
        local type = ace.allow == 1 and 'allow' or 'deny'
        ExecuteCommand(('remove_ace %s %s %s'):format(ace.principal, ace.object, type))
        TriggerClientEvent('QBCore:Notify', src, 'Ace Removed successfully', 'success')
        BroadcastPermissionUpdate()
    else
        print('[mri_Qadmin] Ace not found in DB')
    end
end)

RegisterNetEvent('mri_Qadmin:server:ToggleAce', function(id)
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    print(('[mri_Qadmin] ToggleAce ID: %s'):format(id))
    local ace = MySQL.single.await('SELECT * FROM mri_qadmin_aces WHERE id = ?', {id})
    if ace then
        -- Remove old
        local oldType = ace.allow == 1 and 'allow' or 'deny'
        ExecuteCommand(('remove_ace %s %s %s'):format(ace.principal, ace.object, oldType))

        -- Toggle
        local newAllow = ace.allow == 1 and 0 or 1
        MySQL.update.await('UPDATE mri_qadmin_aces SET allow = ? WHERE id = ?', {newAllow, id})

        -- Add new
        local newType = newAllow == 1 and 'allow' or 'deny'
        ExecuteCommand(('add_ace %s %s %s'):format(ace.principal, ace.object, newType))

        TriggerClientEvent('QBCore:Notify', src, 'Ace Updated successfully', 'success')
        BroadcastPermissionUpdate()
    end
end)

-- CALLBACKS: PRINCIPALS
lib.callback.register('mri_Qadmin:callback:GetPrincipals', function(source)
    if not (QBCore.Functions.HasPermission(source, 'admin') or IsPlayerAceAllowed(source, 'qadmin.page.permissions')) then return {} end
    return MySQL.query.await('SELECT * FROM mri_qadmin_principals')
end)

RegisterNetEvent('mri_Qadmin:server:AddPrincipal', function(child, parent, description)
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then
        print('[mri_Qadmin] AddPrincipal DENIED (Not Admin/Perms) for src: ' .. tostring(src))
        return
    end

    print(('[mri_Qadmin] AddPrincipal REQUEST: Child=%s Parent=%s Desc=%s'):format(child, parent, tostring(description)))

    -- Check if exists
    local exists = MySQL.single.await('SELECT id FROM mri_qadmin_principals WHERE child = ? AND parent = ?', {child, parent})
    if exists then
        print('[mri_Qadmin] Principal already exists in DB. Skipping insert.')
    else
        local success, result = pcall(function()
            return MySQL.insert.await('INSERT INTO mri_qadmin_principals (child, parent, description) VALUES (?, ?, ?)', {child, parent, description})
        end)

        if not success then
            print('[mri_Qadmin] DB ERROR during AddPrincipal: ' .. tostring(result))
            TriggerClientEvent('QBCore:Notify', src, 'Database Error: Check Server Console', 'error')
            return
        end
        print('[mri_Qadmin] DB Insert Success. ID: ' .. tostring(result))
    end

    -- Execute for the specific child string provided
    ExecuteCommand(('add_principal %s %s'):format(child, parent))

    -- Try to find if 'child' is an online player and expand to all their identifiers
    local players = QBCore.Functions.GetPlayers()
    for _, id in ipairs(players) do
        local p = QBCore.Functions.GetPlayer(id)
        if p then
            local pLicense = p.PlayerData.license
            local fullLicense = 'license:'..pLicense
            -- Match loosely against license or exact string
            if child == pLicense or child == fullLicense or child == p.PlayerData.name then
                 ApplyPrincipalToAllIdentifiers(id, parent)
                 break
            end
            -- Also check arbitrary identifiers
            local num = GetNumPlayerIdentifiers(id)
            for i = 0, num-1 do
                if GetPlayerIdentifier(id, i) == child then
                     ApplyPrincipalToAllIdentifiers(id, parent)
                     break
                end
            end
        end
    end

    TriggerClientEvent('QBCore:Notify', src, 'Principal Added successfully', 'success')
    BroadcastPermissionUpdate()
end)

RegisterNetEvent('mri_Qadmin:server:RemovePrincipal', function(id)
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    print(('[mri_Qadmin] RemovePrincipal REQUEST from src %d. ID: %s (Type: %s)'):format(src, tostring(id), type(id)))

    local data = MySQL.single.await('SELECT * FROM mri_qadmin_principals WHERE id = ?', {id})
    if data then
        print(('[mri_Qadmin] Found Principal to delete: %s -> %s'):format(data.child, data.parent))
        MySQL.query.await('DELETE FROM mri_qadmin_principals WHERE id = ?', {id})

        -- Also need to remove the ACL entry
        -- Since we added it via 'identifier.', we might need to remove it similarly if we want it gone from runtime too
        ExecuteCommand(('remove_principal identifier.%s %s'):format(data.child, data.parent))
        ExecuteCommand(('remove_principal %s %s'):format(data.child, data.parent)) -- Try raw too just in case

        TriggerClientEvent('QBCore:Notify', src, 'Principal Removed successfully', 'success')
        BroadcastPermissionUpdate()
    else
         print('[mri_Qadmin] Principal NOT FOUND in DB with ID: ' .. tostring(id))
    end
end)

RegisterNetEvent('mri_Qadmin:server:SeedPageAces', function()
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    -- List of pages to protect
    local pages = {
        'dashboard', 'players', 'groups', 'bans', 'staffchat', 'items', 'vehicles',
        'commands', 'actions', 'permissions', 'resources', 'settings', 'credits'
    }

    local count = 0
    for _, page in ipairs(pages) do
        local ace = 'qadmin.page.' .. page
        -- Check if exists for group.admin
        local exists = MySQL.single.await('SELECT id FROM mri_qadmin_aces WHERE principal = ? AND object = ?', {'group.admin', ace})
        if not exists then
             MySQL.insert.await('INSERT INTO mri_qadmin_aces (principal, object, allow) VALUES (?, ?, ?)', {'group.admin', ace, 1})
             ExecuteCommand(('add_ace %s %s allow'):format('group.admin', ace))
             count = count + 1
        end
    end

    if count > 0 then
        TriggerClientEvent('QBCore:Notify', src, ('Seeded %d page permissions for group.admin'):format(count), 'success')
    else
        TriggerClientEvent('QBCore:Notify', src, 'All page permissions already exist', 'primary')
    end
end)

-- CALLBACKS: MY PERMISSIONS
lib.callback.register('mri_Qadmin:callback:GetMyPermissions', function(source)
    local src = source
    local pages = {
        'dashboard', 'players', 'groups', 'bans', 'staffchat', 'items', 'vehicles',
        'commands', 'actions', 'permissions', 'resources', 'settings', 'credits'
    }

    local allowed = {}
    -- Always allow dashboard if able to open menu
    table.insert(allowed, 'qadmin.page.dashboard')

    -- Debug list
    local debugResults = {}

    for _, page in ipairs(pages) do
        local node = 'qadmin.page.' .. page
        if IsPlayerAceAllowed(src, node) then
            table.insert(allowed, node)
            debugResults[node] = true
        else
            debugResults[node] = false
        end
    end

    -- Also check for master bypass or QBCore admin
    if IsPlayerAceAllowed(src, 'qadmin.master') or QBCore.Functions.HasPermission(src, 'admin') then
        table.insert(allowed, 'qadmin.master')
        debugResults['qadmin.master'] = true
    end

    print(('[mri_Qadmin] GetMyPermissions for Src %d (%s)'):format(src, GetPlayerName(src)))
    print(('[mri_Qadmin] Allowed: %s'):format(json.encode(allowed)))

    return allowed
end)

RegisterCommand('qadmin_check', function(source, args)
    if source ~= 0 then return end -- Console only for safety
    local target = tonumber(args[1])
    if not target then return print('Usage: qadmin_check [id]') end

    local Name = GetPlayerName(target)
    if not Name then return print('Player not found') end

    print(('--- Checking Permissions for %s (%d) ---'):format(Name, target))
    local testNodes = {'qadmin.page.players', 'qadmin.page.dashboard', 'group.indy'}
    for _, node in ipairs(testNodes) do
        local allowed = IsPlayerAceAllowed(target, node)
        print(('%s: %s'):format(node, tostring(allowed)))
    end

    local num = GetNumPlayerIdentifiers(target)
    for i = 0, num-1 do
        print('Identifier: ' .. GetPlayerIdentifier(target, i))
    end
    print('-------------------------------------------')
end, true)
