local QBCore = exports['qb-core']:GetCoreObject()

-----------------------------------------------------------------------------------------------------------------------------------------
-- FUNCTIONS
-----------------------------------------------------------------------------------------------------------------------------------------

local function LoadPermissions()
    -- Load Principals (Inheritance)
    local principals = MySQL.query.await('SELECT * FROM mri_qadmin_principals') or {}
    for _, p in ipairs(principals) do
        ExecuteCommand(('add_principal %s %s'):format(p.child, p.parent))
    end
    print(('[mri_Qadmin] Loaded %d Principals from DB'):format(#principals))

    -- Load Aces (Permissions)
    local aces = MySQL.query.await('SELECT * FROM mri_qadmin_aces') or {}
    for _, a in ipairs(aces) do
        local type = a.allow == 1 and 'allow' or 'deny'
        ExecuteCommand(('add_ace %s %s %s'):format(a.principal, a.object, type))
    end
    print(('[mri_Qadmin] Loaded %d Aces from DB'):format(#aces))
end

-----------------------------------------------------------------------------------------------------------------------------------------
-- EVENTS & CALLBACKS
-----------------------------------------------------------------------------------------------------------------------------------------

RegisterNetEvent('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        LoadPermissions()
    end
end)

-- CALLBACKS: ACES
lib.callback.register('mri_Qadmin:callback:GetAces', function(source)
    if not QBCore.Functions.HasPermission(source, 'admin') then return {} end
    return MySQL.query.await('SELECT * FROM mri_qadmin_aces')
end)

local function BroadcastPermissionUpdate()
    print('[mri_Qadmin] Broadcasting Permission Update to ALL clients')
    TriggerClientEvent('mri_Qadmin:client:ForceReloadPermissions', -1)
end

-- Hook into existing events
RegisterNetEvent('mri_Qadmin:server:AddAce', function(principal, object, allow)
    local src = source
    if not QBCore.Functions.HasPermission(src, 'admin') then return end

    print(('[mri_Qadmin] AddAce Request: %s %s %s'):format(principal, object, tostring(allow)))

    MySQL.insert.await('INSERT INTO mri_qadmin_aces (principal, object, allow) VALUES (?, ?, ?)', {principal, object, allow and 1 or 0})
    local type = allow and 'allow' or 'deny'
    ExecuteCommand(('add_ace %s %s %s'):format(principal, object, type))

    TriggerClientEvent('QBCore:Notify', src, 'Ace Added successfully', 'success')
    BroadcastPermissionUpdate()
end)

RegisterNetEvent('mri_Qadmin:server:RemoveAce', function(id)
    local src = source
    if not QBCore.Functions.HasPermission(src, 'admin') then return end

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
    if not QBCore.Functions.HasPermission(src, 'admin') then return end

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
    end
end)

-- CALLBACKS: PRINCIPALS
lib.callback.register('mri_Qadmin:callback:GetPrincipals', function(source)
    if not QBCore.Functions.HasPermission(source, 'admin') then return {} end
    return MySQL.query.await('SELECT * FROM mri_qadmin_principals')
end)

RegisterNetEvent('mri_Qadmin:server:AddPrincipal', function(child, parent, description)
    local src = source
    if not QBCore.Functions.HasPermission(src, 'admin') then return end

    MySQL.insert.await('INSERT INTO mri_qadmin_principals (child, parent, description) VALUES (?, ?, ?)', {child, parent, description})
    ExecuteCommand(('add_principal %s %s'):format(child, parent))

    TriggerClientEvent('QBCore:Notify', src, 'Principal Added successfully', 'success')
end)

RegisterNetEvent('mri_Qadmin:server:RemovePrincipal', function(id)
    local src = source
    if not QBCore.Functions.HasPermission(src, 'admin') then return end

    local data = MySQL.single.await('SELECT * FROM mri_qadmin_principals WHERE id = ?', {id})
    if data then
        MySQL.query.await('DELETE FROM mri_qadmin_principals WHERE id = ?', {id})
        ExecuteCommand(('remove_principal %s %s'):format(data.child, data.parent))
        TriggerClientEvent('QBCore:Notify', src, 'Principal Removed successfully', 'success')
    end
end)

RegisterNetEvent('mri_Qadmin:server:SeedPageAces', function()
    local src = source
    if not QBCore.Functions.HasPermission(src, 'admin') then return end

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

    for _, page in ipairs(pages) do
        local node = 'qadmin.page.' .. page
        if IsPlayerAceAllowed(src, node) then
            table.insert(allowed, node)
        else
            -- Debug failure for specific pages if needed, or just generally
            -- print(('[mri_Qadmin] Denied %s for %s'):format(node, GetPlayerName(src)))
        end
    end

    -- Also check for master bypass or QBCore admin
    if IsPlayerAceAllowed(src, 'qadmin.master') or QBCore.Functions.HasPermission(src, 'admin') then
        table.insert(allowed, 'qadmin.master')
    end

    print(('[mri_Qadmin] GetMyPermissions for %s: %s'):format(GetPlayerName(src), json.encode(allowed)))

    return allowed
end)
