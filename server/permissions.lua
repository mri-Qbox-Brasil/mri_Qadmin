local QBCore = exports['qb-core']:GetCoreObject()

-----------------------------------------------------------------------------------------------------------------------------------------
-- FUNCTIONS
-----------------------------------------------------------------------------------------------------------------------------------------

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

        Debug(('[mri_Qadmin] [DEBUG] Executing: lib.addPrincipal %s %s'):format(child, p.parent))
        lib.addPrincipal(child, p.parent)

        -- Expand for online players
        for src, data in pairs(onlinePlayers) do
             local license = data.license
             local fullLicense = 'license:'..license
             local fullLicense2 = 'license2:'..license

             if p.child == license or p.child == fullLicense or p.child == fullLicense2 or p.child == data.name then
                 -- Rely on the direct execute command above; this logic previously incorrectly called the disabled expansion
             else
                 -- Check secondary IDs if needed, but license is primary
                 local num = GetNumPlayerIdentifiers(src)
                 for i = 0, num-1 do
                    if GetPlayerIdentifier(src, i) == p.child then
                        -- Primary matching handled the rest
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
        local allow = a.allow == 1
        Debug(('[mri_Qadmin] [DEBUG] Executing: lib.addAce %s %s %s'):format(a.principal, a.object, tostring(allow)))
        lib.addAce(a.principal, a.object, allow)
    end
    Debug(('[mri_Qadmin] Loaded %d Aces from DB'):format(#aces))
    TriggerEvent('mri_Qadmin:server:PermissionsLoaded')
end

-----------------------------------------------------------------------------------------------------------------------------------------
-- EVENTS & CALLBACKS
-----------------------------------------------------------------------------------------------------------------------------------------

RegisterNetEvent('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
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

    -- Reverse Permission Sync (QBCore -> mri_Qadmin)
    local hasQBCoreAdmin = QBCore.Functions.HasPermission(src, 'admin') or QBCore.Functions.HasPermission(src, 'god')

    if hasQBCoreAdmin and not found['group.admin'] then
        Debug(('[mri_Qadmin] Auto-Sync: Jogador %s (%s) possui permissão de base (QBCore admin/god). Sincronizando com group.admin do painel...'):format(GetPlayerName(src), license))

        local fullLicense = 'license:' .. license

        -- Insert into the database to persist this link
        MySQL.insert.await('INSERT INTO mri_qadmin_principals (child, parent, description) VALUES (?, ?, ?)', {fullLicense, 'group.admin', 'Auto-Sync (QBCore Admin)'})

        -- Apply the principal to the runtime cache immediately
        found['group.admin'] = true
        lib.addPrincipal('identifier.' .. fullLicense, 'group.admin')
    end

    for parent, _ in pairs(found) do
        Debug(('[mri_Qadmin] Re-applying permissions natively for %s -> %s (Handled by LoadPermissions / AutoSync)'):format(GetPlayerName(src), parent))
        -- Applying permissions dynamically handles natively via DB insertion / lib functions.
    end

    TriggerEvent('mri_Qadmin:server:PlayerPermissionsReady', src)
end)

-- CALLBACKS: ACES
lib.callback.register('mri_Qadmin:callback:GetAces', function(source)
    if not IsPlayerAceAllowed(source, 'qadmin.page.permissions') then return {} end
    return MySQL.query.await('SELECT * FROM mri_qadmin_aces')
end)

local function BroadcastPermissionUpdate()
    Debug('[mri_Qadmin] Broadcasting Permission Update to ALL clients')
    TriggerClientEvent('mri_Qadmin:client:ForceReloadPermissions', -1)
end

-- Hook into existing events
RegisterNetEvent('mri_Qadmin:server:AddAce', function(principal, object, allow, description)
    local src = source
    if not IsPlayerAceAllowed(src, 'qadmin.page.permissions') then return end

    Debug(('[mri_Qadmin] AddAce Request: %s %s %s Desc=%s'):format(principal, object, tostring(allow), tostring(description)))

    -- Check if exists
    local exists = MySQL.single.await('SELECT id FROM mri_qadmin_aces WHERE principal = ? AND object = ?', {principal, object})
    if exists then
        Debug(('[mri_Qadmin] Ace already exists (ID: %s). Updating allow state and description.'):format(exists.id))
        MySQL.update.await('UPDATE mri_qadmin_aces SET allow = ?, description = ? WHERE id = ?', {allow and 1 or 0, description, exists.id})
    else
        MySQL.insert.await('INSERT INTO mri_qadmin_aces (principal, object, allow, description) VALUES (?, ?, ?, ?)', {principal, object, allow and 1 or 0, description})
    end

    local allowState = allow and true or false
    lib.addAce(principal, object, allowState)

    TriggerClientEvent('QBCore:Notify', src, 'Ace Added/Updated successfully', 'success')
    BroadcastPermissionUpdate()
end)

RegisterNetEvent('mri_Qadmin:server:RemoveAce', function(id)
    local src = source
    if not IsPlayerAceAllowed(src, 'qadmin.page.permissions') then return end

    Debug(('[mri_Qadmin] RemoveAce Request ID: %s'):format(id))
    local ace = MySQL.single.await('SELECT * FROM mri_qadmin_aces WHERE id = ?', {id})
    if ace then
        Debug(('[mri_Qadmin] Removing Ace: %s %s'):format(ace.principal, ace.object))
        MySQL.query.await('DELETE FROM mri_qadmin_aces WHERE id = ?', {id})
        local allow = ace.allow == 1
        lib.removeAce(ace.principal, ace.object, allow)
        TriggerClientEvent('QBCore:Notify', src, 'Ace Removed successfully', 'success')
        BroadcastPermissionUpdate()
    else
        Debug('[mri_Qadmin] Ace not found in DB')
    end
end)

RegisterNetEvent('mri_Qadmin:server:ToggleAce', function(id)
    local src = source
    if not IsPlayerAceAllowed(src, 'qadmin.page.permissions') then return end

    Debug(('[mri_Qadmin] ToggleAce ID: %s'):format(id))
    local ace = MySQL.single.await('SELECT * FROM mri_qadmin_aces WHERE id = ?', {id})
    if ace then
        -- Remove old
        local oldAllow = ace.allow == 1
        lib.removeAce(ace.principal, ace.object, oldAllow)

        -- Toggle
        local newAllowVal = ace.allow == 1 and 0 or 1
        MySQL.update.await('UPDATE mri_qadmin_aces SET allow = ? WHERE id = ?', {newAllowVal, id})

        -- Add new
        local newAllow = newAllowVal == 1
        lib.addAce(ace.principal, ace.object, newAllow)

        TriggerClientEvent('QBCore:Notify', src, 'Ace Updated successfully', 'success')
        BroadcastPermissionUpdate()
    end
end)

-- CALLBACKS: PRINCIPALS
lib.callback.register('mri_Qadmin:callback:GetPrincipals', function(source)
    if not IsPlayerAceAllowed(source, 'qadmin.page.permissions') then return {} end
    return MySQL.query.await('SELECT * FROM mri_qadmin_principals')
end)

RegisterNetEvent('mri_Qadmin:server:AddPrincipal', function(child, parent, description)
    local src = source
    if not IsPlayerAceAllowed(src, 'qadmin.page.permissions') then
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
    lib.addPrincipal(child, parent)

    -- SAFETY: If child looks like an identifier (e.g., license:...), add it as identifier.child too
    -- This ensures it works even if the online player check below fails or if player is offline
    if string.find(child, ':') and not string.find(child, 'identifier%.') then
        Debug(('[mri_Qadmin] Executing Safety Command: lib.addPrincipal identifier.%s %s'):format(child, parent))
        lib.addPrincipal('identifier.' .. child, parent)
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
                 -- Player is online, Native FiveM takes care of principal propagation.
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
    if not IsPlayerAceAllowed(src, 'qadmin.page.permissions') then return end

    Debug(('[mri_Qadmin] RemovePrincipal REQUEST from src %d. ID: %s (Type: %s)'):format(src, tostring(id), type(id)))

    local data = MySQL.single.await('SELECT * FROM mri_qadmin_principals WHERE id = ?', {id})
    if data then
        Debug(('[mri_Qadmin] Found Principal to delete: %s -> %s'):format(data.child, data.parent))
        MySQL.query.await('DELETE FROM mri_qadmin_principals WHERE id = ?', {id})

        -- Also need to remove the ACL entry
        Debug(('[mri_Qadmin] RemovePrincipal: Data Child: "%s" Parent: "%s"'):format(data.child, data.parent))

        -- Remove "identifier.license:xxx"
        Debug(('[mri_Qadmin] Executing: lib.removePrincipal identifier.%s %s'):format(data.child, data.parent))
        lib.removePrincipal('identifier.' .. data.child, data.parent)

        -- Remove "license:xxx"
        Debug(('[mri_Qadmin] Executing: lib.removePrincipal %s %s'):format(data.child, data.parent))
        lib.removePrincipal(data.child, data.parent)

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
                        lib.removePrincipal('identifier.' .. ident, data.parent)
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
                    -- Legacy loop to forcefully remove from all identifiers, just to be sure
                    local num = GetNumPlayerIdentifiers(id)
                    for i = 0, num-1 do
                        local ident = GetPlayerIdentifier(id, i)
                        Debug(('[mri_Qadmin] Removing Principal: identifier.%s -> %s'):format(ident, parent))
                        lib.removePrincipal('identifier.' .. ident, parent)
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
    local allowInt = (allow == 1 or allow == true) and 1 or 0
    local allowState = (allowInt == 1)

    local exists = MySQL.single.await('SELECT id FROM mri_qadmin_aces WHERE principal = ? AND object = ?', {group, ace})
    if not exists then
         MySQL.insert.await('INSERT INTO mri_qadmin_aces (principal, object, allow, description) VALUES (?, ?, ?, ?)', {group, ace, allowInt, description})
         lib.addAce(group, ace, allowState)
         return true
    else
         -- Re-apply in lib natively just in case it exists in DB but not ACL
         lib.addAce(group, ace, allowState)
    end
    return false
end

RegisterNetEvent('mri_Qadmin:server:SeedAces', function()
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)

    local hasPerms = IsPlayerAceAllowed(src, 'qadmin.page.permissions')
    local isMaster = IsPlayerAceAllowed(src, 'qadmin.master')

    if not hasPerms and not isMaster then
        local num = GetNumPlayerIdentifiers(src)
        local foundFallback = false
        for i = 0, num - 1 do
            local id = GetPlayerIdentifier(src, i)
            if IsPrincipalAceAllowed('identifier.' .. id, 'qadmin.master') or IsPrincipalAceAllowed(id, 'qadmin.master') then
                foundFallback = true
                break
            end
        end
        if not foundFallback then return end
    end

    -- Assign current admin to group.admin if they aren't master yet
    if not IsPlayerAceAllowed(src, 'qadmin.master') then
        local license = Player.PlayerData.license
        lib.addPrincipal('identifier.license:' .. license, 'group.admin')
        Debug(('[DEBUG] Assigned identifier.license:%s to group.admin'):format(license))
    end

    local count = 0
    local pages = {
        'dashboard', 'players', 'groups', 'bans', 'staffchat', 'items', 'vehicles',
        'commands', 'actions', 'permissions', 'resources', 'settings', 'credits', 'livemap', 'livescreens'
    }

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
        'commands', 'actions', 'permissions', 'resources', 'settings', 'credits', 'livemap', 'livescreens'
    }

    local allowed = {}
    -- Always allow dashboard if able to open menu
    table.insert(allowed, 'qadmin.page.dashboard')

    -- Debug list
    local debugResults = {}

    local function checkNode(node)
        if IsPlayerAceAllowed(src, node) then return true end
        local num = GetNumPlayerIdentifiers(src)
        for i = 0, num - 1 do
            local id = GetPlayerIdentifier(src, i)
            if IsPrincipalAceAllowed('identifier.' .. id, node) or IsPrincipalAceAllowed(id, node) then
                return true
            end
        end
        return false
    end

    for _, page in ipairs(pages) do
        local node = 'qadmin.page.' .. page
        if checkNode(node) then
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
    if checkNode('qadmin.master') then
        table.insert(allowed, 'qadmin.master')
        debugResults['qadmin.master'] = true
    end

    Debug(('[mri_Qadmin] GetMyPermissions for Src %d (%s)'):format(src, GetPlayerName(src)))
    Debug(('[mri_Qadmin] Allowed: %s'):format(json.encode(allowed)))

    return allowed
end)

lib.addCommand('mri_qadmin.setmaster', {
    help = 'Set a player as Master Admin (Console Only)',
    params = {
        { name = 'target', help = 'Player ID', type = 'playerId' },
    },
}, function(source, args)
    if source ~= 0 then return end -- Console only

    local target = args.target
    if tonumber(target) then
        local p = QBCore.Functions.GetPlayer(tonumber(target))
        if p then
            license = p.PlayerData.license
            print(('[mri_Qadmin] Resolved ID %s to %s (%s)'):format(target, p.PlayerData.name, license))
        else
            print('^1[mri_Qadmin] Player ID not found online. If using license, provide full string (license:xxx)^7')
            return
        end
    end

    if not string.find(license, 'license:') and not string.find(license, 'license2:') then
        print('^3[mri_Qadmin] Warning: Target %s does not look like a license. Assuming it is valid.^7')
    end

    -- 1. Insert into DB (As an Ace for Master bypass, and also add them to group.admin)
    local function doInsert()
        -- Add to group.admin just in case
        local existsGrp = MySQL.single.await('SELECT id FROM mri_qadmin_principals WHERE child = ? AND parent = ?', {license, 'group.admin'})
        if not existsGrp then
            MySQL.insert.await('INSERT INTO mri_qadmin_principals (child, parent, description) VALUES (?, ?, ?)', {license, 'group.admin', 'Master Admin (Console)'})
        end

        local existsAce = MySQL.single.await('SELECT id FROM mri_qadmin_aces WHERE principal = ? AND object = ?', {'identifier.'..license, 'qadmin.master'})
        if existsAce then
            print('^3[mri_Qadmin] Master Ace already exists in DB.^7')
        else
            MySQL.insert.await('INSERT INTO mri_qadmin_aces (principal, object, allow, description) VALUES (?, ?, ?, ?)', {'identifier.'..license, 'qadmin.master', 1, 'Master Admin (Console)'})
            print('^2[mri_Qadmin] Added Master to database.^7')
        end
    end

    -- Run async
    CreateThread(function()
        doInsert()

        -- 2. Apply immediately
        lib.addPrincipal('identifier.' .. license, 'group.admin')
        lib.addAce('identifier.' .. license, 'qadmin.master', true)
        print(('^2[mri_Qadmin] Executed: lib.addAce identifier.%s qadmin.master true^7'):format(license))

        -- 3. If online, notify and reload
        local players = QBCore.Functions.GetPlayers()
        for _, id in ipairs(players) do
            local p = QBCore.Functions.GetPlayer(id)
            if p and (p.PlayerData.license == license) then
                print(('[mri_Qadmin] Target is online (Src: %s). Reloading permissions...'):format(id))
                TriggerEvent('QBCore:Server:OnPlayerLoaded', id) -- Re-trigger load logic or just rely on add_principal
                TriggerClientEvent('QBCore:Notify', id, 'Você agora é Master Admin!', 'success')
                BroadcastPermissionUpdate()
            end
        end
    end)
end)

lib.addCommand('mri_qadmin.addpermission', {
    help = 'Add permission to a player (Console Only)',
    params = {
        { name = 'target', help = 'Player ID or License', type = 'string' },
        { name = 'permission', help = 'Permission node (e.g., group.admin)', type = 'string' },
    },
}, function(source, args)
    if source ~= 0 then return end -- Console only

    local target = args.target
    local permission = args.permission

    local license = target
    -- Check if it's a numeric ID (online player)
    if tonumber(target) then
        local p = QBCore.Functions.GetPlayer(tonumber(target))
        if p then
            license = p.PlayerData.license
            print(('[mri_Qadmin] Resolved ID %s to %s (%s)'):format(target, p.PlayerData.name, license))
        else
            print('^1[mri_Qadmin] Player ID not found online. If using license, provide full string (license:xxx)^7')
            return
        end
    end

    if not string.find(license, 'license:') and not string.find(license, 'license2:') then
        print('^3[mri_Qadmin] Warning: Target '..license..' does not look like a license. Assuming it is valid.^7')
    end

    -- 1. Insert into DB
    local function doInsert()
        local exists = MySQL.single.await('SELECT id FROM mri_qadmin_principals WHERE child = ? AND parent = ?', {license, permission})
        if exists then
            print('^3[mri_Qadmin] Principal already exists in DB.^7')
        else
            MySQL.insert.await('INSERT INTO mri_qadmin_principals (child, parent, description) VALUES (?, ?, ?)', {license, permission, 'Added via Console'})
            print('^2[mri_Qadmin] Added to database.^7')
        end
    end

    -- Run async
    CreateThread(function()
        doInsert()

        -- 2. Apply immediately
        lib.addPrincipal('identifier.' .. license, permission)
        print(('^2[mri_Qadmin] Executed: lib.addPrincipal identifier.%s %s^7'):format(license, permission))

        -- 3. If online, notify and reload
        local players = QBCore.Functions.GetPlayers()
        for _, id in ipairs(players) do
            local p = QBCore.Functions.GetPlayer(id)
            if p and (p.PlayerData.license == license) then
                print(('[mri_Qadmin] Target is online (Src: %s). Reloading permissions...'):format(id))
                TriggerEvent('QBCore:Server:OnPlayerLoaded', id)
                TriggerClientEvent('QBCore:Notify', id, 'Você recebeu uma nova permissão administrativa.', 'success')
                BroadcastPermissionUpdate()
            end
        end
    end)
end)
