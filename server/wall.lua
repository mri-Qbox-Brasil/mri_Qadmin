local QBCore = exports['qb-core']:GetCoreObject()

GlobalState["mri_wall"] = "mri_wall:"..math.random(100000000,200000000)
local encrypt = GlobalState["mri_wall"]

local wall_infos = {}
local principal_colors = {}
local wall_settings = {
    dead = "#FF0000",
    invisible = "#FFFF00",
    default = "#0000FF"
}

local function LoadWallData()
    local success, colors = pcall(MySQL.query.await, 'SELECT * FROM mri_qadmin_wall_colors')
    colors = success and colors or {}
    principal_colors = {}
    for _, c in ipairs(colors) do
        principal_colors[c.principal] = c.color
    end

    local success2, settings = pcall(MySQL.query.await, 'SELECT * FROM mri_qadmin_settings WHERE name LIKE "wall_%"')
    settings = success2 and settings or {}
    for _, s in ipairs(settings) do
        local key = s.name:gsub("wall_", "")
        wall_settings[key] = s.value
    end
    Debug('Wall Data Loaded:', #colors .. ' colors, ' .. #settings .. ' settings')
    for p, c in pairs(principal_colors) do
        Debug(' - Color Cache:', p, c)
    end
end

local function GetPlayerESPColor(src)
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return nil end

    local license = 'license:' .. Player.PlayerData.license
    local identifier = 'identifier.' .. license

    local bestColor = nil

    -- Check principals in principal_colors
    -- We sort them to ensure consistent priority (e.g. group.admin > group.mod)
    local sortedPrincipals = {}
    for p, _ in pairs(principal_colors) do table.insert(sortedPrincipals, p) end
    table.sort(sortedPrincipals) -- Lexicographical order as a simple priority

    for _, principal in ipairs(sortedPrincipals) do
        if IsPrincipalAceAllowed(identifier, principal) or IsPrincipalAceAllowed(license, principal) then
            bestColor = principal_colors[principal]
        end
    end

    return bestColor
end

local function updateWallInfos(source)
    local Player = QBCore.Functions.GetPlayer(source)
    if Player then
        wall_infos[source] = {}
        wall_infos[source].citizenid = Player.PlayerData.citizenid
        wall_infos[source].staff = Player.PlayerData.metadata['staff']
        local charInfo = Player.PlayerData.charinfo
        local name = charInfo.firstname .. " " .. charInfo.lastname
        if name == nil or name == "" then
            name = "N/A"
        else
            wall_infos[source].name = name
        end
        wall_infos[source].wallstats = false
        wall_infos[source].group_color = GetPlayerESPColor(source)
        wall_infos[source].dead_color = wall_settings.dead
        wall_infos[source].inv_color = wall_settings.invisible
        wall_infos[source].default_color = wall_settings.default
    end
end

local function enableWall(source)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)

    if wall_infos[src] and wall_infos[src].wallstats == true then
        wall_infos[src].wallstats = false
        TriggerClientEvent(encrypt..":toggleWall", src, wall_infos[src].wallstats)
    else
        if not wall_infos[src] then updateWallInfos(src) end
        wall_infos[src].wallstats = true
        TriggerClientEvent(encrypt..":toggleWall", src, wall_infos[src].wallstats)
    end
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
AddEventHandler('QBCore:Server:PlayerLoaded', function(Player)
    updateWallInfos(Player.PlayerData.source)
end)

AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then
        return
    end

    local Players = QBCore.Functions.GetPlayers()
    CreateThread(function()
        Wait(500) -- Wait for DB
        LoadWallData()
        for _, PlayerId in pairs(Players) do
            updateWallInfos(PlayerId)
        end
    end)
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
    if not CheckPerms(src, 'admin') then return end

    if type == 'global' then
        wall_settings[key] = value
        MySQL.query.await('INSERT INTO mri_qadmin_settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', { 'wall_' .. key, value, value })
    elseif type == 'principal' then
        principal_colors[key] = value
        MySQL.query.await('INSERT INTO mri_qadmin_wall_colors (principal, color) VALUES (?, ?) ON DUPLICATE KEY UPDATE color = ?', { key, value, value })
    end

    -- Refresh all online players colors
    local Players = QBCore.Functions.GetPlayers()
    for _, id in pairs(Players) do
        updateWallInfos(id)
    end

    TriggerClientEvent('QBCore:Notify', src, 'Wall settings updated', 'success')
end)

RegisterNetEvent('mri_Qadmin:server:DeleteWallPrincipalColor', function(principal)
    local src = source
    if not CheckPerms(src, 'admin') then return end

    principal_colors[principal] = nil
    MySQL.query.await('DELETE FROM mri_qadmin_wall_colors WHERE principal = ?', { principal })

    -- Refresh all online players colors
    local Players = QBCore.Functions.GetPlayers()
    for _, id in pairs(Players) do
        updateWallInfos(id)
    end

    TriggerClientEvent('QBCore:Notify', src, 'Principal color removed', 'success')
end)

AddEventHandler('playerDropped', function()
    local src = source
    if wall_infos[src] then
        wall_infos[src] = nil
    end
end)
