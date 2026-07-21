local QBCore = exports['qb-core']:GetCoreObject()

local encrypt = "mri_wall:"..math.random(100000000,200000000)
GlobalState["mri_wall"] = encrypt

local wall_infos = {}
local principal_colors = {}
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
    -- Migrate legacy "group.*" entries to "mri.group.*"
    MySQL.query.await("UPDATE mri_qadmin_wall_colors SET principal = CONCAT('mri.', principal) WHERE principal LIKE 'group.%' AND principal NOT LIKE 'mri.%'")

    -- Load Principal Colors
    principal_colors = {}
    local colors = MySQL.query.await('SELECT * FROM mri_qadmin_wall_colors')
    if colors then
        for _, v in pairs(colors) do
            principal_colors[v.principal] = toRGBString(v.color)
        end
    end

    local success2, settings = pcall(MySQL.query.await, 'SELECT * FROM mri_qadmin_settings WHERE name LIKE "wall_%"')
    settings = success2 and settings or {}
    for _, s in ipairs(settings) do
        local key = s.name:gsub("wall_", "")
        wall_settings[key] = toRGBString(s.value)
    end
    Debug('debug', 'Wall Data Loaded:', (colors and #colors or 0) .. ' colors, ' .. #settings .. ' settings')
    for p, c in pairs(principal_colors) do
        Debug('debug', ' - Color Cache:', p, c)
    end
end

function GetPlayerESPColor(src)
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return nil end

    -- local _license = 'license:' .. Player.PlayerData.license
    -- local identifier = 'identifier.' .. license

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
            Debug('debug', 'Found Color for Principal:', principal, 'Color:', bestColor)
        end
    end

    return bestColor, table.concat(matches, ", ")
end

-- SECURITY: o wall_infos contém citizenid/job/gang de TODOS os players. Não
-- broadcast para -1 (todos) — só para quem tem perm de enable_wall ou
-- qadmin.master. Outros players recebem objeto vazio.
local function broadcastWallInfos()
    local players = QBCore.Functions.GetPlayers()
    for _, pid in ipairs(players) do
        if HasPerms(pid, 'qadmin.action.enable_wall') or HasPerms(pid, 'qadmin.master') then
            TriggerClientEvent('mri_wall:updateWallUsers', pid, wall_infos)
        end
    end
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
        wall_infos[srcStr].name = (name ~= nil and name ~= "") and name or "N/A"
        wall_infos[srcStr].job = Player.PlayerData.job.label .. " (" .. Player.PlayerData.job.grade.name .. ")"
        wall_infos[srcStr].gang = (Player.PlayerData.gang.name ~= "none") and (Player.PlayerData.gang.label .. " (" .. Player.PlayerData.gang.grade.name .. ")") or nil
        wall_infos[srcStr].wallstats = false
        local gColor, gPrincipals = GetPlayerESPColor(source)
        wall_infos[srcStr].group_color = gColor
        wall_infos[srcStr].found_principals = gPrincipals -- Debug info (plural)
        wall_infos[srcStr].dead_color = wall_settings.dead
        wall_infos[srcStr].inv_color = wall_settings.invisible
        wall_infos[srcStr].default_color = wall_settings.default

        if not silent then
            broadcastWallInfos()
        end
    end
end

local function enableWall(source)
    local src = source
    local srcStr = tostring(src)

    if wall_infos[srcStr] and wall_infos[srcStr].wallstats == true then
        wall_infos[srcStr].wallstats = false
        TriggerClientEvent(encrypt..":toggleWall", src, wall_infos[srcStr].wallstats)
    else
        if not wall_infos[srcStr] then updateWallInfos(src, true) end
        wall_infos[srcStr].wallstats = true
        TriggerClientEvent(encrypt..":toggleWall", src, wall_infos[srcStr].wallstats)
    end

    broadcastWallInfos()
end

QBCore.Commands.Add("wall", "Enable/Disable wall", {}, false, function(source, _args)
    if not CheckPerms(source, 'qadmin.action.enable_wall') then return end
    enableWall(source)
end)

RegisterNetEvent("mri_Qadmin:server:enableWall", function(data)
    local src = source
    if not CheckPerms(src, 'qadmin.action.enable_wall') then return end
    Debug('debug', ('Wall Source: %s'):format(tostring(src)))
    Debug('debug', ('Wall Data: %s'):format(tostring(data)))
    enableWall(src)
    AddLog(src, 'mri_Qadmin', 'server', 'info', 'Wall: admin alternou o wall ESP', {})
end)

QBCore.Functions.CreateCallback('mri_wall:getWallInfos', function(src, cb)
    if not HasPerms(src, 'qadmin.action.enable_wall') and not HasPerms(src, 'qadmin.master') then
        return cb({})
    end
    cb(wall_infos)
end)

-----------------------------------------------------------------------------------------------------------------------------------------
-- CONNECT/DISCONNECT
-----------------------------------------------------------------------------------------------------------------------------------------
-- Player permissions ready event (replaces standard PlayerLoaded to avoid race conditions)
-- IMPORTANTE: aceita apenas trigger interno (source == "") — clients não podem
-- forjar o source via TriggerServerEvent.
AddEventHandler('mri_Qadmin:server:PlayerPermissionsReady', function(target)
    if source ~= "" then return end -- bloqueia chamadas vindas do client
    updateWallInfos(target)
end)

-- Global permissions loaded event (initialization)
AddEventHandler('mri_Qadmin:server:PermissionsLoaded', function()
    if source ~= "" then return end -- bloqueia chamadas vindas do client
    local Players = QBCore.Functions.GetPlayers()
    LoadWallData()
    for _, PlayerId in pairs(Players) do
        updateWallInfos(PlayerId, true)
    end
    broadcastWallInfos()
end)

-----------------------------------------------------------------------------------------------------------------------------------------
-- NUI CALLBACKS & EVENTS
-----------------------------------------------------------------------------------------------------------------------------------------

lib.callback.register('mri_Qadmin:callback:GetWallSettings', function(src)
    if not CheckPerms(src, 'qadmin.open') then return nil end
    return {
        colors = principal_colors,
        settings = wall_settings
    }
end)

lib.callback.register('mri_Qadmin:callback:GetWallGroups', function(source)
    if not CheckPerms(source, 'qadmin.open') then return {} end
    local groups = MySQL.query.await('SELECT id, label FROM mri_qadmin_groups ORDER BY id') or {}
    return groups
end)

RegisterNetEvent('mri_Qadmin:server:SaveWallSetting', function(type, key, value)
    local src = source
    if not CheckPerms(src, 'qadmin.page.permissions') then return end

    value = toRGBString(value) -- Ensure strictly RGB string

    if type == 'global' then
        wall_settings[key] = value
        MySQL.query.await('INSERT INTO mri_qadmin_settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', { 'wall_' .. key, value, value })
    elseif type == 'principal' then
        -- Whitelist de prefixos: só aceita principals já gerenciados pelo Qadmin
        -- (mri.group.*, group.*, job.*, gang.*, char:*). Isso impede um admin
        -- de injetar entradas que façam o sistema chamar lib.addAce em
        -- principals arbitrários como "qadmin.master".
        local allowed = false
        local prefixes = { 'mri.group.', 'group.', 'job.', 'gang.', 'char:' }
        for _, p in ipairs(prefixes) do
            if key:sub(1, #p) == p then allowed = true; break end
        end
        if not allowed then
            QBCore.Functions.Notify(src, 'Principal inválido: ' .. tostring(key), 'error')
            return
        end
        principal_colors[key] = value
        MySQL.query.await('INSERT INTO mri_qadmin_wall_colors (principal, color) VALUES (?, ?) ON DUPLICATE KEY UPDATE color = ?', { key, value, value })
    end

    -- Refresh all online players colors silently
    local Players = QBCore.Functions.GetPlayers()
    for _, id in pairs(Players) do
        updateWallInfos(id, true)
    end

    -- Single broadcast
    broadcastWallInfos()

    TriggerClientEvent('QBCore:Notify', src, 'Wall settings updated', 'success')
    AddLog(src, 'mri_Qadmin', 'server', 'info', ('Wall: configuração "%s/%s" atualizada'):format(type, key), { type = type, key = key, value = value })
end)

RegisterNetEvent('mri_Qadmin:server:DeleteWallPrincipalColor', function(principal)
    local src = source
    if not CheckPerms(src, 'qadmin.page.permissions') then return end
    if type(principal) ~= 'string' or principal == '' or #principal > 128 then return end

    principal_colors[principal] = nil
    MySQL.query.await('DELETE FROM mri_qadmin_wall_colors WHERE principal = ?', { principal })

    -- Refresh all online players colors silently
    local Players = QBCore.Functions.GetPlayers()
    for _, id in pairs(Players) do
        updateWallInfos(id, true)
    end

    -- Single broadcast
    broadcastWallInfos()

    TriggerClientEvent('QBCore:Notify', src, 'Principal color removed', 'success')
    AddLog(src, 'mri_Qadmin', 'server', 'info', ('Wall: cor do principal "%s" removida'):format(principal), { principal = principal })
end)

AddEventHandler('playerDropped', function()
    local src = source
    local srcStr = tostring(src)
    if wall_infos[srcStr] then
        wall_infos[srcStr] = nil
        broadcastWallInfos()
    end
end)
