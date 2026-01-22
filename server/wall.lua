local QBCore = exports['qb-core']:GetCoreObject()

GlobalState["mri_wall"] = "mri_wall:"..math.random(100000000,200000000)
local encrypt = GlobalState["mri_wall"]

local wall_infos = {}

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
    enableWall(source)
end, "admin")

RegisterNetEvent("mri_Qadmin:server:enableWall", function(data)
    print('wall_source', source)
    print('wall_data', data)
    enableWall(source)
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
    for _, PlayerId in pairs(Players) do
        updateWallInfos(PlayerId)
    end
end)

AddEventHandler('playerDropped', function()
    local src = source
    if wall_infos[src] then
        wall_infos[src] = nil
    end
end)
