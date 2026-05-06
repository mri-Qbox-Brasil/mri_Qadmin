local QBCore = exports['qb-core']:GetCoreObject()
local ObjectList = require "data.object"

local function RotationToDirection(rotation)

    local adjustedRotation = {
        x = (math.pi / 180) * rotation.x,
        y = (math.pi / 180) * rotation.y,
        z = (math.pi / 180) * rotation.z
    }
    local direction = {
        x = -math.sin(adjustedRotation.z) * math.abs(math.cos(adjustedRotation.x)),
        y = math.cos(adjustedRotation.z) * math.abs(math.cos(adjustedRotation.x)),
        z = math.sin(adjustedRotation.x)
    }
    return direction
end

local function RayCastGamePlayCamera(distance)
    local cameraRotation = GetGameplayCamRot()
    local cameraCoord = GetGameplayCamCoord()
    local direction = RotationToDirection(cameraRotation)
    local destination = {
        x = cameraCoord.x + direction.x * distance,
        y = cameraCoord.y + direction.y * distance,
        z = cameraCoord.z + direction.z * distance
    }
    local _, b, coords, _, e = GetShapeTestResult(StartShapeTestRay(cameraCoord.x, cameraCoord.y, cameraCoord.z,
        destination.x, destination.y, destination.z, -1, PlayerPedId(), 0))
    return b, coords, e
end

-- Toggle Delete Laser
local activeLaser = false
RegisterNetEvent('mri_Qadmin:client:ToggleLaser', function()
    activeLaser = not activeLaser
    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'actions', 'info',
        activeLaser and 'Laser dev: ativado' or 'Laser dev: desativado', {})
    CreateThread(function()
        while true do
            local wait = 1
            if activeLaser then
                local color = {
                    r = 0,
                    g = 255,
                    b = 0,
                    a = 200
                }
                local position = GetEntityCoords(PlayerPedId())
                local hit, coords, entity = RayCastGamePlayCamera(1000.0)
                local objectData = {}

                if not MenuVisible then
                    DisableControlAction(0, 200)
                end
                DisableControlAction(0, 26)

                if hit and (IsEntityAVehicle(entity) or IsEntityAPed(entity) or IsEntityAnObject(entity)) then

                    local entityCoord = GetEntityCoords(entity)
                    local heading = GetEntityHeading(entity)
                    local model = GetEntityModel(entity)
                    local min, max = GetModelDimensions(model)
                    local radius = #(max - min) * 0.5

                    DrawMarker(1, entityCoord.x, entityCoord.y, entityCoord.z - 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                        radius * 1.5, radius * 1.5, 2.0, color.r, color.g, color.b, color.a, false, false, 2, nil, nil,
                        false)
                    DrawLine(position.x, position.y, position.z, coords.x, coords.y, coords.z, color.r, color.g,
                        color.b, color.a)

                    local playerCoords = GetEntityCoords(cache.ped)
                    local dist = #(playerCoords - entityCoord)
                    local entNetId = NetworkGetEntityIsNetworked(entity) and NetworkGetNetworkIdFromEntity(entity) or
                                         nil
                    local entType = locale('devmode.unknown')
                    if IsEntityAVehicle(entity) then
                        entType = locale('devmode.vehicle')
                    elseif IsEntityAPed(entity) then
                        entType = locale('devmode.ped')
                    elseif IsEntityAnObject(entity) then
                        entType = locale('devmode.object')
                    end

                    objectData.hash = model
                    objectData.id = entity
                    objectData.netId = entNetId
                    objectData.name = ObjectList[model] or "Unknown"
                    objectData.coords = ("vec4(%s, %s, %s, %s)"):format(entityCoord.x, entityCoord.y, entityCoord.z,
                        heading)
                    objectData.type = entType
                    objectData.distance = QBCore.Shared.Round(dist, 1)

                    if IsControlJustReleased(0, 38) then
                        SetEntityAsMissionEntity(entity, true, true)
                        DeleteEntity(entity)
                    end

                    if IsDisabledControlJustReleased(0, 26) then
                        lib.setClipboard(json.encode(objectData, {
                            indent = true
                        }))
                    end

                elseif coords.x ~= 0.0 and coords.y ~= 0.0 then
                    DrawLine(position.x, position.y, position.z, coords.x, coords.y, coords.z, color.r, color.g,
                        color.b, color.a)
                    DrawMarker(28, coords.x, coords.y, coords.z, 0.0, 0.0, 0.0, 0.0, 180.0, 0.0, 0.1, 0.1, 0.1, color.r,
                        color.g, color.b, color.a, false, true, 2, nil, nil, false)
                end

                SendNUIMessage({
                    action = "showEntityInfo",
                    data = {
                        show = true,
                        hash = objectData.hash or "",
                        name = objectData.name or "Unknown",
                        id = objectData.id,
                        netId = objectData.netId,
                        type = objectData.type,
                        distance = objectData.distance
                    }
                })
            else
                wait = 500
                SendNUIMessage({
                    action = "showEntityInfo",
                    data = {
                        show = false
                    }
                })
            end
            Wait(wait)
        end
    end)
end)