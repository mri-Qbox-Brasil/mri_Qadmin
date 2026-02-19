local QBCore = exports['qb-core']:GetCoreObject()

-----------------------------------------------------------------------------------------------------------------------------------------
-- FUNCTIONS
-----------------------------------------------------------------------------------------------------------------------------------------

-- Helper: Apply principal to all identifiers of a source
-- [MODIFIED] Disabled expansion to prevent "sticky" permissions on Steam/Discord IDs that are hard to remove.
-- Relying on the primary database identifier (License) is sufficient for FiveM's IsPlayerAceAllowed.
local function ApplyPrincipalToAllIdentifiers(src, parent)
    -- local num = GetNumPlayerIdentifiers(src)
    -- for i = 0, num-1 do
    --     local id = GetPlayerIdentifier(src, i)
    --     print(('[mri_Qadmin] Expanding Principal: identifier.%s -> %s'):format(id, parent))
    --     ExecuteCommand(('add_principal identifier.%s %s'):format(id, parent))
    -- end
    Debug('[mri_Qadmin] ApplyPrincipalToAllIdentifiers called but DISABLED (using primary identifier only).')
end

local function LoadPermissions()
    -- Check/Add Description column for Aces
    local hasDesc = MySQL.scalar.await("SELECT count(*) FROM information_schema.columns WHERE table_name = 'mri_qadmin_aces' AND column_name = 'description' AND table_schema = DATABASE()")
    if hasDesc == 0 then
        MySQL.query.await('ALTER TABLE mri_qadmin_aces ADD COLUMN description VARCHAR(255) DEFAULT NULL')
        Debug('[mri_Qadmin] Added description column to mri_qadmin_aces')
    end

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
        local child = p.child
        -- Fix: Ensure identifier prefix if missing for license-style strings that aren't already prefixed
        -- This fixes the issue where permissions are lost on restart because "license:xxx" is not a valid principal, it must be "identifier.license:xxx"
        if not string.find(child, 'identifier.') and (string.find(child, 'license:') or string.find(child, 'license2:')) then
             child = 'identifier.' .. child
        end

        Debug(('[mri_Qadmin] [DEBUG] Executing: add_principal %s %s'):format(child, p.parent))
        ExecuteCommand(('add_principal %s %s'):format(child, p.parent))

        -- Expand for online players
        for src, data in pairs(onlinePlayers) do
             local license = data.license
             local fullLicense = 'license:'..license
             local fullLicense2 = 'license2:'..license

             if p.child == license or p.child == fullLicense or p.child == fullLicense2 or p.child == data.name then
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
    Debug(('[mri_Qadmin] Loaded %d Principals from DB'):format(#principals))

    -- Load Aces (Permissions)
    local aces = MySQL.query.await('SELECT * FROM mri_qadmin_aces') or {}
    for _, a in ipairs(aces) do
        local type = a.allow == 1 and 'allow' or 'deny'
        Debug(('[mri_Qadmin] [DEBUG] Executing: add_ace %s %s %s'):format(a.principal, a.object, type))
        ExecuteCommand(('add_ace %s %s %s'):format(a.principal, a.object, type))
    end
    Debug(('[mri_Qadmin] Loaded %d Aces from DB'):format(#aces))
    TriggerEvent('mri_Qadmin:server:PermissionsLoaded')
end

-- ...

RegisterCommand('qadmin_check', function(source, args)
    if source ~= 0 then
        if not (QBCore.Functions.HasPermission(source, 'admin') or IsPlayerAceAllowed(source, 'qadmin.master')) then
             return
        end
    end
    local target = tonumber(args[1])
    local extraGroup = args[2] -- Optional: Check a specific group name
    if not target then return Debug('Usage: qadmin_check [id] [optional_group_to_check]') end

    local Name = GetPlayerName(target)
    if not Name then return Debug('Player not found') end

    Debug(('--- Checking Permissions for %s (%d) ---'):format(Name, target))
    local testNodes = {'qadmin.page.players', 'qadmin.page.dashboard', 'group.indy'}

    if extraGroup then
        Debug(('--- Checking Group Principal: %s ---'):format(extraGroup))
        for _, node in ipairs(testNodes) do
            local allowed = IsPrincipalAceAllowed(extraGroup, node)
            Debug(('Principal "%s" -> %s: %s'):format(extraGroup, node, tostring(allowed)))
        end
    end

    Debug('--- Checking Player ACEs ---')
    for _, node in ipairs(testNodes) do
        local allowed = IsPlayerAceAllowed(target, node)
        Debug(('Player -> %s: %s'):format(node, tostring(allowed)))
    end

    Debug('--- Checking Player Identifiers Direct Mapping ---')
    local num = GetNumPlayerIdentifiers(target)
    for i = 0, num-1 do
        local id = GetPlayerIdentifier(target, i)
        Debug('Identifier: ' .. id)
        -- Check if this specific identifier has the permission directly or via inheritance
        for _, node in ipairs(testNodes) do
             if IsPrincipalAceAllowed(id, node) then
                 Debug(('   -> Has Ace: %s'):format(node))
             end
        end
    end
    Debug('-------------------------------------------')
end, true)

-----------------------------------------------------------------------------------------------------------------------------------------
-- EVENTS & CALLBACKS
-----------------------------------------------------------------------------------------------------------------------------------------

RegisterNetEvent('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        local myRes = 'resource.' .. resourceName
        if not IsPrincipalAceAllowed(myRes, 'command.add_principal') then
             Debug('^1[mri_Qadmin] [CRITICAL WARNING] Resource does not have permission to execute "add_principal"!^7')
             Debug('^1[mri_Qadmin] Please add the following to your server.cfg:^7')
             Debug(('^3add_ace %s command.add_principal allow^7'):format(myRes))
             Debug(('^3add_ace %s command.remove_principal allow^7'):format(myRes))
             Debug(('^3add_ace %s command.add_ace allow^7'):format(myRes))
             Debug(('^3add_ace %s command.remove_ace allow^7'):format(myRes))
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
        Debug(('[mri_Qadmin] Re-applying permissions for %s -> %s'):format(GetPlayerName(src), parent))
        ApplyPrincipalToAllIdentifiers(src, parent)
    end

    TriggerEvent('mri_Qadmin:server:PlayerPermissionsReady', src)
end)

-- CALLBACKS: ACES
lib.callback.register('mri_Qadmin:callback:GetAces', function(source)
    if not (QBCore.Functions.HasPermission(source, 'admin') or IsPlayerAceAllowed(source, 'qadmin.page.permissions')) then return {} end
    return MySQL.query.await('SELECT * FROM mri_qadmin_aces')
end)

local function BroadcastPermissionUpdate()
    Debug('[mri_Qadmin] Broadcasting Permission Update to ALL clients')
    TriggerClientEvent('mri_Qadmin:client:ForceReloadPermissions', -1)
end

-- Hook into existing events
RegisterNetEvent('mri_Qadmin:server:AddAce', function(principal, object, allow, description)
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    Debug(('[mri_Qadmin] AddAce Request: %s %s %s Desc=%s'):format(principal, object, tostring(allow), tostring(description)))

    -- Check if exists
    local exists = MySQL.single.await('SELECT id FROM mri_qadmin_aces WHERE principal = ? AND object = ?', {principal, object})
    if exists then
        Debug(('[mri_Qadmin] Ace already exists (ID: %s). Updating allow state and description.'):format(exists.id))
        MySQL.update.await('UPDATE mri_qadmin_aces SET allow = ?, description = ? WHERE id = ?', {allow and 1 or 0, description, exists.id})
    else
        MySQL.insert.await('INSERT INTO mri_qadmin_aces (principal, object, allow, description) VALUES (?, ?, ?, ?)', {principal, object, allow and 1 or 0, description})
    end

    local type = allow and 'allow' or 'deny'
    ExecuteCommand(('add_ace %s %s %s'):format(principal, object, type))

    TriggerClientEvent('QBCore:Notify', src, 'Ace Added/Updated successfully', 'success')
    BroadcastPermissionUpdate()
end)

RegisterNetEvent('mri_Qadmin:server:RemoveAce', function(id)
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    Debug(('[mri_Qadmin] RemoveAce Request ID: %s'):format(id))
    local ace = MySQL.single.await('SELECT * FROM mri_qadmin_aces WHERE id = ?', {id})
    if ace then
        Debug(('[mri_Qadmin] Removing Ace: %s %s'):format(ace.principal, ace.object))
        MySQL.query.await('DELETE FROM mri_qadmin_aces WHERE id = ?', {id})
        local type = ace.allow == 1 and 'allow' or 'deny'
        ExecuteCommand(('remove_ace %s %s %s'):format(ace.principal, ace.object, type))
        TriggerClientEvent('QBCore:Notify', src, 'Ace Removed successfully', 'success')
        BroadcastPermissionUpdate()
    else
        Debug('[mri_Qadmin] Ace not found in DB')
    end
end)

RegisterNetEvent('mri_Qadmin:server:ToggleAce', function(id)
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    Debug(('[mri_Qadmin] ToggleAce ID: %s'):format(id))
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
        Debug('[mri_Qadmin] AddPrincipal DENIED (Not Admin/Perms) for src: ' .. tostring(src))
        return
    end

    Debug(('[mri_Qadmin] AddPrincipal REQUEST: Child=%s Parent=%s Desc=%s'):format(child, parent, tostring(description)))

    -- Check if exists
    local exists = MySQL.single.await('SELECT id FROM mri_qadmin_principals WHERE child = ? AND parent = ?', {child, parent})
    if exists then
        Debug('[mri_Qadmin] Principal already exists in DB. Skipping insert.')
    else
        local success, result = pcall(function()
            return MySQL.insert.await('INSERT INTO mri_qadmin_principals (child, parent, description) VALUES (?, ?, ?)', {child, parent, description})
        end)

        if not success then
            Debug('[mri_Qadmin] DB ERROR during AddPrincipal: ' .. tostring(result))
            TriggerClientEvent('QBCore:Notify', src, 'Database Error: Check Server Console', 'error')
            return
        end
        Debug('[mri_Qadmin] DB Insert Success. ID: ' .. tostring(result))
    end

    -- Execute for the specific child string provided
    ExecuteCommand(('add_principal %s %s'):format(child, parent))

    -- SAFETY: If child looks like an identifier (e.g., license:...), add it as identifier.child too
    -- This ensures it works even if the online player check below fails or if player is offline
    if string.find(child, ':') and not string.find(child, 'identifier%.') then
        Debug(('[mri_Qadmin] Executing Safety Command: add_principal identifier.%s %s'):format(child, parent))
        ExecuteCommand(('add_principal identifier.%s %s'):format(child, parent))
    end

    -- Try to find if 'child' is an online player and expand to all their identifiers
    local players = QBCore.Functions.GetPlayers()
    local foundOnline = false
    for _, id in ipairs(players) do
        local p = QBCore.Functions.GetPlayer(id)
        if p then
            local pLicense = p.PlayerData.license
            local fullLicense = 'license:'..pLicense
            local fullLicense2 = 'license2:'..pLicense  -- Support for license2 (new FiveM standard)
            -- Match loosely against license, license2 or exact string
            -- Also check if child matches any identifier directly

            local match = false
            if child == pLicense or child == fullLicense or child == fullLicense2 or child == p.PlayerData.name then
                match = true
            else
                local num = GetNumPlayerIdentifiers(id)
                for i = 0, num-1 do
                    if GetPlayerIdentifier(id, i) == child then
                         match = true
                         break
                    end
                end
            end

            if match then
                 Debug(('[mri_Qadmin] Found Online Player for Principal Add: %s (Src: %s)'):format(p.PlayerData.name, id))
                 ApplyPrincipalToAllIdentifiers(id, parent)
                 foundOnline = true
                 break
            end
        end
    end

    if not foundOnline then
        Debug('[mri_Qadmin] Player not found online for immediate expansion. Permissions will apply when they rejoin/relog.')
    end

    TriggerClientEvent('QBCore:Notify', src, 'Principal Added successfully', 'success')
    BroadcastPermissionUpdate()
end)

RegisterNetEvent('mri_Qadmin:server:RemovePrincipal', function(id)
    local src = source
    if not (QBCore.Functions.HasPermission(src, 'admin') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    Debug(('[mri_Qadmin] RemovePrincipal REQUEST from src %d. ID: %s (Type: %s)'):format(src, tostring(id), type(id)))

    local data = MySQL.single.await('SELECT * FROM mri_qadmin_principals WHERE id = ?', {id})
    if data then
        Debug(('[mri_Qadmin] Found Principal to delete: %s -> %s'):format(data.child, data.parent))
        MySQL.query.await('DELETE FROM mri_qadmin_principals WHERE id = ?', {id})

        -- Also need to remove the ACL entry
        Debug(('[mri_Qadmin] RemovePrincipal: Data Child: "%s" Parent: "%s"'):format(data.child, data.parent))

        -- Remove "identifier.license:xxx"
        local cmd1 = ('remove_principal identifier.%s %s'):format(data.child, data.parent)
        Debug(('[mri_Qadmin] Executing: %s'):format(cmd1))
        ExecuteCommand(cmd1)

        -- Remove "license:xxx"
        local cmd2 = ('remove_principal %s %s'):format(data.child, data.parent)
        Debug(('[mri_Qadmin] Executing: %s'):format(cmd2))
        ExecuteCommand(cmd2)

        -- Force refresh for the specific client if they are online to be sure
        local players = QBCore.Functions.GetPlayers()
        for _, id in ipairs(players) do
             local p = QBCore.Functions.GetPlayer(id)
             if p then
                 -- Debug matching
                 local fullLicense = 'license:'..p.PlayerData.license
                 -- print(('[mri_Qadmin] Checking player %s (License: %s Full: %s) against %s'):format(p.PlayerData.name, p.PlayerData.license, fullLicense, data.child))

                 if p.PlayerData.license == data.child or fullLicense == data.child then
                     Debug(('[mri_Qadmin] Targeting online player %s (Src: %s) for update'):format(p.PlayerData.name, id))
                     TriggerClientEvent('QBCore:Notify', id, 'Suas permissões foram atualizadas.', 'primary')

                     -- Try removing explicit runtime identifiers too just in case
                     local num = GetNumPlayerIdentifiers(id)
                     for i = 0, num-1 do
                        local ident = GetPlayerIdentifier(id, i)
                        ExecuteCommand(('remove_principal identifier.%s %s'):format(ident, data.parent))
                     end
                 end
             end
        end

        -- Logic to remove from all online identifiers if player is online
        local child = data.child
        local parent = data.parent
        local players = QBCore.Functions.GetPlayers()
        for _, id in ipairs(players) do
            local p = QBCore.Functions.GetPlayer(id)
            if p then
                local pLicense = p.PlayerData.license
                local fullLicense = 'license:'..pLicense

                local match = false
                if child == pLicense or child == fullLicense or child == p.PlayerData.name then
                    match = true
                else
                    local num = GetNumPlayerIdentifiers(id)
                    for i = 0, num-1 do
                        if GetPlayerIdentifier(id, i) == child then
                             match = true
                             break
                        end
                    end
                end

                if match then
                    Debug(('[mri_Qadmin] Found Online Player for Principal Remove: %s (Src: %s)'):format(p.PlayerData.name, id))
                    local num = GetNumPlayerIdentifiers(id)
                    for i = 0, num-1 do
                        local ident = GetPlayerIdentifier(id, i)
                        Debug(('[mri_Qadmin] Removing Principal: identifier.%s -> %s'):format(ident, parent))
                        ExecuteCommand(('remove_principal identifier.%s %s'):format(ident, parent))
                    end
                    break
                end
            end
        end

        TriggerClientEvent('QBCore:Notify', src, 'Principal Removed successfully', 'success')
        BroadcastPermissionUpdate()
        -- Verification Loop
        local checks = 0
        local stillHas = true
        while checks < 5 and stillHas do
            Wait(100)
            if IsPrincipalAceAllowed(child, data.parent) or IsPrincipalAceAllowed('identifier.'..child, data.parent) then
                Debug(('[mri_Qadmin] WARNING: Permission still active after removal attempt %d...'):format(checks+1))
            else
                stillHas = false
                Debug('[mri_Qadmin] SUCCESS: Permission successfully revoked.')
            end
            checks = checks + 1
        end
        if stillHas then
            Debug('^1[mri_Qadmin] CRITICAL: Failed to revoke permission! Check if resource has "command.remove_principal" allowed in server.cfg!^7')
        end

    else
         Debug('[mri_Qadmin] Principal NOT FOUND in DB with ID: ' .. tostring(id))
    end
end)

local function verifyAndAdd(group, ace, allow, description)
    local exists = MySQL.single.await('SELECT id FROM mri_qadmin_aces WHERE principal = ? AND object = ?', {group, ace})
    if not exists then
         MySQL.insert.await('INSERT INTO mri_qadmin_aces (principal, object, allow, description) VALUES (?, ?, ?, ?)', {group, ace, allow, description})
         ExecuteCommand(('add_ace %s %s %s'):format(group, ace, allow))
         return true
    end
    return false
end

RegisterNetEvent('mri_Qadmin:server:SeedAces', function()
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not (QBCore.Functions.HasPermission(src, 'admin') or QBCore.Functions.HasPermission(src, 'god') or IsPlayerAceAllowed(src, 'qadmin.page.permissions')) then return end

    -- Assign current admin to group.admin if they aren't master yet
    if not IsPlayerAceAllowed(src, 'qadmin.master') then
        local license = Player.PlayerData.license
        ExecuteCommand(('add_principal identifier.license:%s group.admin'):format(license))
        Debug(('[DEBUG] Assigned identifier.license:%s to group.admin'):format(license))
    end

    -- List of pages to protect
    local pages = {
        'dashboard', 'players', 'groups', 'bans', 'staffchat', 'items', 'vehicles',
        'commands', 'actions', 'permissions', 'resources', 'settings', 'credits'
    }

    local count = 0
    for _, page in ipairs(pages) do
        local ace = 'qadmin.page.' .. page
        -- Check if exists for group.admin
        if verifyAndAdd('group.admin', ace, 1, 'Page: ' .. page) then
            count = count + 1
        end
    end

    -- Add qadmin.master
    if verifyAndAdd('group.admin', 'qadmin.master', 1, 'Master') then
        count = count + 1
    end

    -- Seed Actions from Config
    local actionTypes = {
        { tbl = Config.Actions, label = 'Action' },
        { tbl = Config.PlayerActions, label = 'Player Action' },
        { tbl = Config.OtherActions, label = 'Other Action' }
    }

    for _, typeInfo in ipairs(actionTypes) do
        if typeInfo.tbl then
            for k, v in pairs(typeInfo.tbl) do
                if v.perms and string.find(v.perms, 'qadmin.action.') then
                    if verifyAndAdd('group.admin', v.perms, 1, typeInfo.label .. ': ' .. (v.label or k)) then
                        count = count + 1
                    end
                end
            end
        end
    end

    -- Add qadmin.open by default too
    if verifyAndAdd('group.admin', 'qadmin.open', 1, 'Open Panel') then
        count = count + 1
    end

    if count > 0 then
        TriggerClientEvent('QBCore:Notify', src, ('Seeded %d permissions for group.admin'):format(count), 'success')
    else
        TriggerClientEvent('QBCore:Notify', src, 'All permissions already exist', 'primary')
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
        end
    end

    -- Check Actions
    if Config.Actions then
        for k, v in pairs(Config.Actions) do
            if CheckPerms(src, v.perms) then
                table.insert(allowed, 'action.' .. k)
            end
        end
    end

    -- Check Player Actions
    if Config.PlayerActions then
        for k, v in pairs(Config.PlayerActions) do
            if CheckPerms(src, v.perms) then
                table.insert(allowed, 'action.' .. k)
            end
        end
    end

    -- Also check for master bypass
    if IsPlayerAceAllowed(src, 'qadmin.master') then
        table.insert(allowed, 'qadmin.master')
        debugResults['qadmin.master'] = true
    end

    Debug(('[mri_Qadmin] GetMyPermissions for Src %d (%s)'):format(src, GetPlayerName(src)))
    Debug(('[mri_Qadmin] Allowed: %s'):format(json.encode(allowed)))

    return allowed
end)



RegisterCommand('mri_qadmin.setmaster', function(source, args)
    if source ~= 0 then return end -- Console only

    local target = args[1]
    if not target then
        print('^1[mri_Qadmin] Usage: mri_qadmin.setmaster [id/license]^7')
        return
    end

    local license = target
    -- Check if it's a numeric ID (online player)
    if tonumber(target) then
        local p = QBCore.Functions.GetPlayer(tonumber(target))
        if p then
            license = 'license:' .. p.PlayerData.license
            print(('[mri_Qadmin] Resolved ID %s to %s (%s)'):format(target, p.PlayerData.name, license))
        else
            print('^1[mri_Qadmin] Player ID not found online. If using license, provide full string (license:xxx)^7')
            return
        end
    end

    if not string.find(license, 'license:') and not string.find(license, 'license2:') then
        print('^3[mri_Qadmin] Warning: Target %s does not look like a license. Assuming it is valid.^7')
    end

    local parent = 'group.admin'

    -- 1. Insert into DB
    local function doInsert()
        local exists = MySQL.single.await('SELECT id FROM mri_qadmin_principals WHERE child = ? AND parent = ?', {license, parent})
        if exists then
            print('^3[mri_Qadmin] Principal already exists in DB.^7')
        else
            MySQL.insert.await('INSERT INTO mri_qadmin_principals (child, parent, description) VALUES (?, ?, ?)', {license, parent, 'Master Admin (Console)'})
            print('^2[mri_Qadmin] Added to database.^7')
        end
    end

    -- Run async
    CreateThread(function()
        doInsert()

        -- 2. Apply immediately
        ExecuteCommand(('add_principal identifier.%s %s'):format(license, parent))
        print(('^2[mri_Qadmin] Executed: add_principal identifier.%s %s^7'):format(license, parent))

        -- 3. If online, notify and reload
        local players = QBCore.Functions.GetPlayers()
        for _, id in ipairs(players) do
            local p = QBCore.Functions.GetPlayer(id)
            if p and ('license:'..p.PlayerData.license == license or 'license2:'..p.PlayerData.license == license) then
                print(('[mri_Qadmin] Target is online (Src: %s). Reloading permissions...'):format(id))
                TriggerEvent('QBCore:Server:OnPlayerLoaded', id) -- Re-trigger load logic or just rely on add_principal
                TriggerClientEvent('QBCore:Notify', id, 'Você agora é Master Admin!', 'success')
                BroadcastPermissionUpdate()
            end
        end
    end)
end, true)
