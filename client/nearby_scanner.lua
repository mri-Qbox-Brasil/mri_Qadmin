-- luacheck: ignore 113/GetGamePool 113/GetDisplayNameFromVehicleModel 113/SetDrawOrigin 113/DrawRect 113/ClearDrawOrigin
local QBCore = exports['qb-core']:GetCoreObject()

local ObjectList = require "data.object"

local activeNearbyScanner = false
local lastScanEntities = {}
local nextScanTime = 0

local function GetEntityName(model, type)
    if type == 'Vehicle' then
        return GetDisplayNameFromVehicleModel(model)
    elseif type == 'Ped' then
        return locale('devmode.ped')
    elseif type == 'Object' then
        return ObjectList[model] or locale('devmode.object')
    end
    return locale('devmode.unknown')
end


local function DrawText3D(x, y, z, text)
    SetTextScale(0.35, 0.35)
    SetTextFont(4)
    SetTextProportional(1)
    SetTextColour(255, 255, 255, 215)
    SetTextEntry("STRING")
    SetTextCentre(true)
    AddTextComponentString(text)
    SetDrawOrigin(x, y, z, 0)
    DrawText(0.0, 0.0)
    local factor = (string.len(text)) / 370
    DrawRect(0.0, 0.0 + 0.0125, 0.017 + factor, 0.03, 0, 0, 0, 75)
    ClearDrawOrigin()
end

local function ScannerLoop()
    while activeNearbyScanner do
        local playerPed = cache.ped
        local playerCoords = GetEntityCoords(playerPed)
        
        -- Scan every 1 second
        if GetGameTimer() > nextScanTime then
            nextScanTime = GetGameTimer() + 1000
            local entities = {}
            
            -- Scan Pools
            local pools = {
                { name = 'CPed', type = 'Ped' },
                { name = 'CVehicle', type = 'Vehicle' },
                { name = 'CObject', type = 'Object' }
            }

            for _, pool in ipairs(pools) do
                local found = GetGamePool(pool.name)
                for _, entity in ipairs(found) do
                    if entity ~= playerPed then
                        local coords = GetEntityCoords(entity)
                        local dist = #(playerCoords - coords)

                        if dist < 50.0 then
                            local model = GetEntityModel(entity)
                            
                            table.insert(entities, {
                                id = entity,
                                name = GetEntityName(model, pool.type),
                                distance = QBCore.Shared.Round(dist, 1),
                                type = pool.type
                            })
                        end
                    end
                end
            end

            -- Sort by distance
            table.sort(entities, function(a, b) return a.distance < b.distance end)

            -- Keep only top 15
            lastScanEntities = {}
            for i=1, math.min(#entities, 15) do
                table.insert(lastScanEntities, entities[i])
            end

            SendNUIMessage({
                action = "showNearbyEntities",
                data = {
                    show = true,
                    entities = lastScanEntities
                }
            })
        end

        -- Draw 3D Text every frame
        for _, ent in ipairs(lastScanEntities) do
            if DoesEntityExist(ent.id) then
                local coords = GetEntityCoords(ent.id)
                DrawText3D(coords.x, coords.y, coords.z + 1.1, string.format("~g~%s~w~\nID: %s", ent.name, ent.id))

            end
        end

        Wait(0)
    end

    SendNUIMessage({
        action = "showNearbyEntities",
        data = {
            show = false,
            entities = {}
        }
    })
end

RegisterNetEvent('mri_Qadmin:client:ToggleNearbyScanner', function()
    activeNearbyScanner = not activeNearbyScanner
    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'actions', 'info', activeNearbyScanner and 'Scanner de entidades: ativado' or 'Scanner de entidades: desativado', {})
    if activeNearbyScanner then
        nextScanTime = 0 -- Force immediate scan
        CreateThread(ScannerLoop)
    end
end)
