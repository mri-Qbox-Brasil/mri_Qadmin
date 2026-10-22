local function GetVehicleName(hash)
    for _, v in pairs(QBCore.Shared.Vehicles) do
        if hash == v.hash then
            return v.model
        end
    end
end

-- Own Vehicle
RegisterNetEvent('mri_Qadmin:client:Admincar', function(_data)
    if not CheckPerms('qadmin.action.admincar') then return end

    if not cache.vehicle then return end

    local props = lib.getVehicleProperties(cache.vehicle)
    local name = GetVehicleName(props.model)
    local sharedVehicles = QBCore.Shared.Vehicles[name]
    local hash = GetHashKey(cache.vehicle)

    if sharedVehicles then
        TriggerServerEvent('mri_Qadmin:server:SaveCar', props, sharedVehicles, hash, props.plate)
    else
        QBCore.Functions.Notify(locale("notifications.cannot_store_veh"), 'error')
    end
end)

-- One spawn path for catalog and owned cars: created on the server, since sv_entityLockdown refuses client network entities.
local function SpawnAdminVehicle(model, mods, plate)
    if cache.vehicle then
        DeleteVehicle(cache.vehicle)
    end

    local coords = GetEntityCoords(cache.ped)
    local groundFound, groundZ = GetGroundSafe(coords.x, coords.y, coords.z + 100.0)
    local spawnAt = vec4(coords.x, coords.y, groundFound and groundZ + 0.5 or coords.z + 0.5, GetEntityHeading(cache.ped))
    ToggleUI(false)

    QBCore.Functions.TriggerCallback('QBCore:Server:SpawnVehicle', function(netId)
        local veh = lib.waitFor(function()
            if NetworkDoesEntityExistWithNetworkId(netId) then return NetToVeh(netId) end
        end, nil, 5000)
        TaskWarpPedIntoVehicle(cache.ped, veh, -1)

        if mods then lib.setVehicleProperties(veh, mods) end
        -- The plate column is the truth: a plate change does not rewrite mods.plate.
        if plate then SetVehicleNumberPlateText(veh, plate) end
        SetVehicleFixed(veh)
        SetVehicleEngineHealth(veh, 1000.0)
        SetVehicleBodyHealth(veh, 1000.0)

        if Config.Fuel == "ox_fuel" then
            Entity(veh).state.fuel = 100.0
        else
            exports[Config.Fuel]:SetFuel(veh, 100.0)
        end

        TriggerEvent("vehiclekeys:client:SetOwner", QBCore.Functions.GetPlate(veh))
    end, model, spawnAt, true)
end

-- Spawn Vehicle
RegisterNetEvent('mri_Qadmin:client:SpawnVehicle', function(_data, selectedData)
    if not CheckPerms('qadmin.action.spawn_vehicle') then return end

    local selectedVehicle = selectedData["Vehicle"].value
    if not IsModelValid(GetHashKey(selectedVehicle)) then return end

    SpawnAdminVehicle(selectedVehicle)
    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'vehicles', 'info', 'audit.vehicle_spawn_temp', {}, { selectedVehicle })
end)

-- Delete Vehicle: o que o admin está dirigindo ou, a pé, o que ele está mirando (até 10m).
-- Era `type = "command"` apontando para o /dv, que exige a ACE `command.dv` — um admin
-- não-master do painel não tem essa ACE e o clique morria em silêncio.
RegisterNetEvent('mri_Qadmin:client:DeleteVehicle', function(data)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end

    local veh = cache.vehicle
    if not veh or veh == 0 then
        local ped = cache.ped
        local from = GetEntityCoords(ped)
        local to = from + GetEntityForwardVector(ped) * 10.0
        local ray = StartExpensiveSynchronousShapeTestLosProbe(from.x, from.y, from.z, to.x, to.y, to.z, 10, ped, 0)
        local _, hit, _, _, entityHit = GetShapeTestResult(ray)
        if hit == 1 and entityHit and entityHit ~= 0 and IsEntityAVehicle(entityHit) then
            veh = entityHit
        end
    end

    if not veh or veh == 0 or not DoesEntityExist(veh) then
        return QBCore.Functions.Notify(locale("notifications.no_vehicle_found"), 'error')
    end

    -- Toma posse na rede antes de deletar: sem controle da entidade o motor recusa o
    -- delete e o veículo volta a aparecer para os outros jogadores.
    SetEntityAsMissionEntity(veh, true, true)
    NetworkRequestControlOfEntity(veh)
    local timeout = 0
    while not NetworkHasControlOfEntity(veh) and timeout < 500 do
        NetworkRequestControlOfEntity(veh)
        Wait(0)
        timeout = timeout + 1
    end

    DeleteVehicle(veh)
    if DoesEntityExist(veh) then DeleteEntity(veh) end

    QBCore.Functions.Notify(locale("notifications.vehicle_deleted"), 'success')
    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'vehicles', 'info', 'audit.vehicle_deleted', {})
end)

-- Fix Vehicle (o próprio veículo do admin). Era `type = "command"` apontando para o /fix,
-- mesma história da ACE `command.fix`.
RegisterNetEvent('mri_Qadmin:client:FixVehicle', function(data)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end

    local veh = cache.vehicle
    if not veh or veh == 0 then
        return QBCore.Functions.Notify(locale("notifications.not_in_vehicle"), 'error')
    end

    SetVehicleFixed(veh)
    SetVehicleDeformationFixed(veh)
    SetVehicleUndriveable(veh, false)
    SetVehicleEngineOn(veh, true, true, false)
    SetVehicleEngineHealth(veh, 1000.0)
    SetVehicleBodyHealth(veh, 1000.0)
    SetVehiclePetrolTankHealth(veh, 1000.0)
    SetVehicleDirtLevel(veh, 0.0)

    QBCore.Functions.Notify(locale("notifications.vehicle_repaired"), 'success')
    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'vehicles', 'info', 'audit.vehicle_self_repaired', {})
end)

-- Refuel Vehicle
RegisterNetEvent('mri_Qadmin:client:RefuelVehicle', function()
    if not CheckPerms('qadmin.action.refuel_vehicle') then return end

    if cache.vehicle then
        if Config.Fuel == "ox_fuel" then
            Entity(cache.vehicle).state.fuel = 100.0
        else
            exports[Config.Fuel]:SetFuel(cache.vehicle, 100.0)
        end
        QBCore.Functions.Notify(locale("notifications.refueled_vehicle"), 'success')
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'vehicles', 'info', 'audit.vehicle_self_refueled', {})
    else
        QBCore.Functions.Notify(locale("notifications.not_in_vehicle"), 'error')
    end
end)

RegisterNUICallback('mri_Qadmin:callback:GetPlayerVehicles', function(data, cb)
    cb(lib.callback.await('mri_Qadmin:callback:GetPlayerVehicles', false, data and data.citizenid) or false)
end)

-- Plate of a garage car, straight in the database (the panel is not inside the car).
RegisterNUICallback('mri_Qadmin:server:ChangeOwnedPlate', function(data, cb)
    if type(data) == 'table' then TriggerServerEvent('mri_Qadmin:server:ChangePlate', data.newPlate, data.plate) end
    cb('ok')
end)

-- Change plate
RegisterNetEvent('mri_Qadmin:client:ChangePlate', function(data, selectedData)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end
    local plate = selectedData["Plate"].value

    if string.len(plate) > 8 then
        return QBCore.Functions.Notify(locale("notifications.plate_max"), "error", 5000)
    end

    if cache.vehicle then
        local AlreadyPlate = lib.callback.await("mri_Qadmin:callback:CheckAlreadyPlate", false, plate)

        if AlreadyPlate then
            QBCore.Functions.Notify(locale("notifications.already_plate"), "error", 5000)
            return
        end

        local currentPlate = GetVehicleNumberPlateText(cache.vehicle)
        TriggerServerEvent('mri_Qadmin:server:ChangePlate', plate, currentPlate)
        Wait(100)
        SetVehicleNumberPlateText(cache.vehicle, plate)
        Wait(100)
        TriggerServerEvent('qb-vehiclekeys:server:AcquireVehicleKeys', QBCore.Functions.GetPlate(cache.vehicle))
    else
        QBCore.Functions.Notify(locale("notifications.not_in_vehicle"), 'error')
    end
end)


-- Toggle Vehicle Dev mode
local VEHICLE_DEV_MODE = false
local function UpdateVehicleMenu()
    while VEHICLE_DEV_MODE do
        Wait(1000)

        -- Admin may have left the vehicle: bail out cleanly instead of
        -- calling lib.getVehicleProperties on a false handle.
        if not cache.vehicle then
            VEHICLE_DEV_MODE = false
            break
        end

        local vehicle = lib.getVehicleProperties(cache.vehicle)
        local name = GetVehicleName(vehicle.model)
        local netID = VehToNet(cache.vehicle)

        SendNUIMessage({
            action = "showVehicleMenu",
            data = {
                show = VEHICLE_DEV_MODE,
                name = name,
                model = vehicle.model,
                netID = netID,
                engine_health = vehicle.engineHealth,
                body_health = vehicle.bodyHealth,
                plate = vehicle.plate,
                fuel = vehicle.fuelLevel,
            }
        })
    end

    -- Loop ended: clear the overlay.
    SendNUIMessage({
        action = "showVehicleMenu",
        data = {
            show = false,
        }
    })
end

RegisterNetEvent('mri_Qadmin:client:ToggleVehDevMenu', function(data)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end
    if not cache.vehicle then return end

    VEHICLE_DEV_MODE = not VEHICLE_DEV_MODE

    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'vehicles', 'info', VEHICLE_DEV_MODE and 'audit.vehicle_dev_menu_on' or 'audit.vehicle_dev_menu_off', {})

    if VEHICLE_DEV_MODE then
        CreateThread(UpdateVehicleMenu)
    end
end)

-- Max Mods
local PERFORMANCE_MOD_INDICES = { 11, 12, 13, 15, 16 }
local function UpgradePerformance(vehicle)
    SetVehicleModKit(vehicle, 0)
    ToggleVehicleMod(vehicle, 18, true)
    SetVehicleFixed(vehicle)

    for _, modType in ipairs(PERFORMANCE_MOD_INDICES) do
        local maxMod = GetNumVehicleMods(vehicle, modType) - 1
        SetVehicleMod(vehicle, modType, maxMod, false)
    end

    QBCore.Functions.Notify(locale("notifications.vehicle_max_modded"), 'success', 7500)
end


RegisterNetEvent('mri_Qadmin:client:maxmodVehicle', function(data)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end

    if cache.vehicle then
        UpgradePerformance(cache.vehicle)
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'vehicles', 'info', 'audit.vehicle_self_max_mods', {})
    else
        QBCore.Functions.Notify(locale("notifications.vehicle_not_driver"), 'error', 7500)
    end
end)

-- Spawn Personal vehicles

RegisterNetEvent("mri_Qadmin:client:SpawnPersonalVehicle", function(_data, selectedData)
    if not CheckPerms('qadmin.action.spawn_vehicle') then return end

    local plate = selectedData['VehiclePlate'].value
    local owned = lib.callback.await('mri_Qadmin:server:GetVehicleByPlate', false, plate)
    if type(owned) ~= 'table' or type(owned.model) ~= 'string' or owned.model == '' then
        QBCore.Functions.Notify(locale('vehicle.messages.not_found', plate), 'error')
        return
    end

    SpawnAdminVehicle(owned.model, owned.mods, plate)
end)


-- Get Vehicle Data
local function HexToRGB(hex)
    hex = hex:gsub("#","")
    if #hex ~= 6 then return {255, 255, 255} end
    return {
        tonumber("0x"..hex:sub(1,2)),
        tonumber("0x"..hex:sub(3,4)),
        tonumber("0x"..hex:sub(5,6))
    }
end

lib.callback.register("mri_Qadmin:client:getvehData", function(vehicle, overrides)
    lib.requestModel(vehicle)

    local coords = vec(GetOffsetFromEntityInWorldCoords(cache.ped, 0.0, 2.0, 0.5), GetEntityHeading(cache.ped) + 90)
    local veh = CreateVehicle(vehicle, coords, false, false)

    local prop = {}
    if DoesEntityExist(veh) then
        SetEntityCollision(veh, false, false)
        SetEntityVisible(veh, false, 0)
        FreezeEntityPosition(veh, true)

        if overrides then
            if overrides.plate then
                SetVehicleNumberPlateText(veh, overrides.plate)
            end
            if overrides.color1 then
                local rgb = HexToRGB(overrides.color1)
                SetVehicleCustomPrimaryColour(veh, rgb[1], rgb[2], rgb[3])
                SetVehicleCustomSecondaryColour(veh, rgb[1], rgb[2], rgb[3])
            end
            if overrides.maxTuned then
                UpgradePerformance(veh)
            end
        end

        prop = QBCore.Functions.GetVehicleProperties(veh)
        Wait(500)
        DeleteVehicle(veh)
    end

    return prop
end)
