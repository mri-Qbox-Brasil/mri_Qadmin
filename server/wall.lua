local QBCore = exports['qb-core']:GetCoreObject()

GlobalState["mri_wall"] = "mri_wall:"..math.random(100000000,200000000)
local encrypt = GlobalState["mri_wall"]

local wall_infos = {}
principal_colors = {}
local wall_settings = {
    dead = "255, 0, 0",
    invisible = "255, 255, 0",
    default = "0, 0, 255"
}

local function toRGBString(col)
    if type(col) == "string" and col:find("#") then
        local hex = col:gsub("#", "")
        return string.format("%d, %d, %d", tonumber("0x" .. hex:sub(1, 2)) or 0, tonumber("0x" .. hex:sub(3, 4)) or 0, tonumber("0x" .. hex:sub(5, 6)) or 0)
    end
    return col
end

local function LoadWallData()
    -- Load Principal Colors
    principal_colors = {}
    local colors = MySQL.query.await('SELECT * FROM mri_qadmin_wall_colors')
    if colors then
        for _, v in pairs(colors) do
            principal_colors[v.principal] = toRGBString(v.color)
            -- Ensure the principal itself is an allowed ACE so IsPlayerInPrincipal checks pass
            ExecuteCommand(('add_ace %s %s allow'):format(v.principal, v.principal))
        end
    end

    local success2, settings = pcall(MySQL.query.await, 'SELECT * FROM mri_qadmin_settings WHERE name LIKE "wall_%"')
    settings = success2 and settings or {}
    for _, s in ipairs(settings) do
        local key = s.name:gsub("wall_", "")
        wall_settings[key] = toRGBString(s.value)
    end
    Debug('Wall Data Loaded:', #colors .. ' colors, ' .. #settings .. ' settings')
    for p, c in pairs(principal_colors) do
        Debug(' - Color Cache:', p, c)
    end
end

function GetPlayerESPColor(src)
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return nil end

    local license = 'license:' .. Player.PlayerData.license
    local identifier = 'identifier.' .. license

    local bestColor = nil
    local matches = {}

    -- Check principals in principal_colors
    -- We sort them to ensure consistent priority (e.g. group.admin > group.mod)
    local sortedPrincipals = {}
    for p, _ in pairs(principal_colors) do table.insert(sortedPrincipals, p) end
    table.sort(sortedPrincipals, function(a, b) return a > b end) -- Reverse Lexicographical order to fix priority (e.g. Mod processed before Admin, so Admin overwrites)

    for _, principal in ipairs(sortedPrincipals) do
        if IsPlayerInPrincipal(src, principal) then
            bestColor = principal_colors[principal]
            table.insert(matches, principal)
            -- Debug('Found Color for Principal:', principal, 'Color:', bestColor)
        end
    end

    return bestColor, table.concat(matches, ", ")
end

local function updateWallInfos(source, silent)
    local Player = QBCore.Functions.GetPlayer(source)
    if Player then
        local srcStr = tostring(source)
        wall_infos[srcStr] = {}
        wall_infos[srcStr].citizenid = Player.PlayerData.citizenid
        wall_infos[srcStr].staff = Player.PlayerData.metadata['staff']
        local charInfo = Player.PlayerData.charinfo
        local name = charInfo.firstname .. " " .. charInfo.lastname
        if name == nil or name == "" then
            name = "N/A"
        else
            wall_infos[srcStr].name = name
        end
        wall_infos[srcStr].wallstats = false
        local gColor, gPrincipals = GetPlayerESPColor(source)
        wall_infos[srcStr].group_color = gColor
        wall_infos[srcStr].found_principals = gPrincipals -- Debug info (plural)
        wall_infos[srcStr].dead_color = wall_settings.dead
        wall_infos[srcStr].inv_color = wall_settings.invisible
        wall_infos[srcStr].default_color = wall_settings.default

        -- Broadcast update to all clients with wall enabled (or just all clients for simplicity/sync)
        if not silent then
            TriggerClientEvent('mri_wall:updateWallUsers', -1, wall_infos)
        end
    end
end

local function enableWall(source)
    local src = source
    local srcStr = tostring(src)
    local Player = QBCore.Functions.GetPlayer(src)

    if wall_infos[srcStr] and wall_infos[srcStr].wallstats == true then
        wall_infos[srcStr].wallstats = false
        TriggerClientEvent(encrypt..":toggleWall", src, wall_infos[srcStr].wallstats)
    else
        if not wall_infos[srcStr] then updateWallInfos(src, true) end
        wall_infos[srcStr].wallstats = true
        TriggerClientEvent(encrypt..":toggleWall", src, wall_infos[srcStr].wallstats)
    end

    -- Broadcast update regarding wallstats change
    TriggerClientEvent('mri_wall:updateWallUsers', -1, wall_infos)
end

QBCore.Commands.Add("wall", "Enable/Disable wall", {}, false, function(source, args)
    if not CheckPerms(source, 'qadmin.action.enable_wall') then return end
    enableWall(source)
end)

RegisterNetEvent("mri_Qadmin:server:enableWall", function(data)
    local src = source
    if not CheckPerms(src, 'qadmin.action.enable_wall') then return end
    Debug('wall_source', src)
    Debug('wall_data', data)
    enableWall(src)
end)

QBCore.Functions.CreateCallback('mri_wall:getWallInfos', function(source, cb)
    cb(wall_infos)
end)

-----------------------------------------------------------------------------------------------------------------------------------------
-- CONNECT/DISCONNECT
-----------------------------------------------------------------------------------------------------------------------------------------
-- Player permissions ready event (replaces standard PlayerLoaded to avoid race conditions)
RegisterNetEvent('mri_Qadmin:server:PlayerPermissionsReady', function(source)
    updateWallInfos(source)
end)

-- Global permissions loaded event (initialization)
-- Global permissions loaded event (initialization)
RegisterNetEvent('mri_Qadmin:server:PermissionsLoaded', function()
    local Players = QBCore.Functions.GetPlayers()
    LoadWallData()
    for _, PlayerId in pairs(Players) do
        updateWallInfos(PlayerId, true)
    end
    TriggerClientEvent('mri_wall:updateWallUsers', -1, wall_infos)
end)

-----------------------------------------------------------------------------------------------------------------------------------------
-- NUI CALLBACKS & EVENTS
-----------------------------------------------------------------------------------------------------------------------------------------

lib.callback.register('mri_Qadmin:callback:GetWallSettings', function(source)
    return {
        colors = principal_colors,
        settings = wall_settings
    }
end)

RegisterNetEvent('mri_Qadmin:server:SaveWallSetting', function(type, key, value)
    local src = source
    if not CheckPerms(src, 'qadmin.page.permissions') then return end

    value = toRGBString(value) -- Ensure strictly RGB string

    if type == 'global' then
        wall_settings[key] = value
        MySQL.query.await('INSERT INTO mri_qadmin_settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', { 'wall_' .. key, value, value })
    elseif type == 'principal' then
        principal_colors[key] = value
        MySQL.query.await('INSERT INTO mri_qadmin_wall_colors (principal, color) VALUES (?, ?) ON DUPLICATE KEY UPDATE color = ?', { key, value, value })
        -- Ensure the principal itself is an allowed ACE so IsPlayerInPrincipal checks pass
        ExecuteCommand(('add_ace %s %s allow'):format(key, key))
    end

    -- Refresh all online players colors silently
    local Players = QBCore.Functions.GetPlayers()
    for _, id in pairs(Players) do
        updateWallInfos(id, true)
    end

    -- Single broadcast
    TriggerClientEvent('mri_wall:updateWallUsers', -1, wall_infos)

    TriggerClientEvent('QBCore:Notify', src, 'Wall settings updated', 'success')
end)

RegisterNetEvent('mri_Qadmin:server:DeleteWallPrincipalColor', function(principal)
    local src = source
    if not CheckPerms(src, 'qadmin.page.permissions') then return end

    principal_colors[principal] = nil
    MySQL.query.await('DELETE FROM mri_qadmin_wall_colors WHERE principal = ?', { principal })

    -- Refresh all online players colors silently
    local Players = QBCore.Functions.GetPlayers()
    for _, id in pairs(Players) do
        updateWallInfos(id, true)
    end

    -- Single broadcast
    TriggerClientEvent('mri_wall:updateWallUsers', -1, wall_infos)

    TriggerClientEvent('QBCore:Notify', src, 'Principal color removed', 'success')
end)

AddEventHandler('playerDropped', function()
    local src = source
    local srcStr = tostring(src)
    if wall_infos[srcStr] then
        wall_infos[srcStr] = nil
        TriggerClientEvent('mri_wall:updateWallUsers', -1, wall_infos)
    end
end)
