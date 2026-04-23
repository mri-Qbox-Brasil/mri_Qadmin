local function GetVehiclesList()
    local vehicles = {}
    local baseVehicles

    if GetResourceState('qbx_core') == 'started' then
        baseVehicles = exports.qbx_core:GetVehiclesByName()
    else
        baseVehicles = QBCore.Shared.Vehicles
    end

    local dbStocks = {}
    if Config.Dealership == 'mri' then
        local dbResult = MySQL.query.await('SELECT model, stock FROM vehicles_data')
        if dbResult then
            for _, v in pairs(dbResult) do
                dbStocks[v.model] = v.stock
            end
        end
    end

    for model, data in pairs(baseVehicles) do
        local m = data.model or model
        local vehicle = {
            name = data.name,
            hash = data.hash,
            model = m,
            category = data.category,
            brand = data.brand,
            price = data.price
        }

        if Config.Dealership == 'mri' then
            vehicle.stock = dbStocks[m] or 0
        end

        vehicles[#vehicles + 1] = vehicle
    end

    table.sort(vehicles, function(a, b) return (a.name or "") < (b.name or "") end)
    return vehicles
end
_G.GetVehiclesList = GetVehiclesList

lib.callback.register('mri_Qadmin:callback:GetVehicles', function(source)
    if not CheckPerms(source, 'qadmin.page.vehicles') then return {} end
    return GetVehiclesList()
end)

-- Admin Car
RegisterNetEvent('mri_Qadmin:server:SaveCar', function(mods, vehicle, _, plate)
    local src = source
    if not CheckPerms(src, 'qadmin.action.admincar') then return end

    local Player = QBCore.Functions.GetPlayer(src)
    local result = MySQL.query.await('SELECT plate FROM player_vehicles WHERE plate = ?', { plate })

    if result[1] == nil then
        MySQL.insert.await(
        'INSERT INTO player_vehicles (license, citizenid, vehicle, hash, mods, plate, state) VALUES (?, ?, ?, ?, ?, ?, ?)',
            {
                Player.PlayerData.license,
                Player.PlayerData.citizenid,
                vehicle.model,
                vehicle.hash,
                json.encode(mods),
                plate,
                0
            })
        TriggerClientEvent('QBCore:Notify', src, locale("veh_owner"), 'success', 5000)
        AddLog(src, 'mri_Qadmin', 'vehicles', 'info', ('Admin Car: veículo %s salvo com placa %s'):format(vehicle.model, plate), { model = vehicle.model, plate = plate })
    else
        TriggerClientEvent('QBCore:Notify', src, locale("notifications.u_veh_owner"), 'error', 3000)
    end
end)

-- Give Car
RegisterNetEvent("mri_Qadmin:server:givecar", function(_, selectedData)
    local src = source

    if not CheckPerms(src, 'qadmin.action.spawn_vehicle') then
        QBCore.Functions.Notify(src, locale("notifications.no_perms"), "error", 5000)
        return
    end

    local vehmodel = selectedData['Vehicle'].value
    local vehicleData = lib.callback.await("mri_Qadmin:client:getvehData", src, vehmodel)

    if not next(vehicleData) then
        return
    end

    local tsrc = selectedData['Player'].value
    local plate = selectedData['Placa (Opcional)'] and selectedData['Placa (Opcional)'].value or vehicleData.plate
    local garage = selectedData['Garagem (Opcional)'] and selectedData['Garagem (Opcional)'].value or Config.DefaultGarage
    local Player = QBCore.Functions.GetPlayer(tsrc)

    if plate and #plate < 1 then
        plate = vehicleData.plate
    end

    if garage and #garage < 1 then
        garage = Config.DefaultGarage
    end

    if plate:len() > 8 then
        QBCore.Functions.Notify(src, locale("notifications.plate_max"), "error", 5000)
        return
    end

    if not Player then
        QBCore.Functions.Notify(src, locale("notifications.not_online"), "error", 5000)
        return
    end

    if CheckAlreadyPlate(plate) then
        QBCore.Functions.Notify(src, locale("notifications.givecar.plates_alreadyused", plate:upper()), "error", 5000)
        return
    end

    MySQL.insert.await(
    'INSERT INTO player_vehicles (license, citizenid, vehicle, hash, mods, plate, garage, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        {
            Player.PlayerData.license,
            Player.PlayerData.citizenid,
            vehmodel,
            joaat(vehmodel),
            json.encode(vehicleData),
            plate,
            garage,
            1
        })

    local targetName = Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname
    QBCore.Functions.Notify(src,
        locale("notifications.givecar.success.source", QBCore.Shared.Vehicles[vehmodel].name, targetName), "success", 5000)
    QBCore.Functions.Notify(Player.PlayerData.source, locale("notifications.givecar.success.target", plate:upper(), garage), "success",
        5000)
    local giveCarData = GetTargetData(tsrc)
    giveCarData.model = vehmodel
    giveCarData.plate = plate
    giveCarData.garage = garage
    AddLog(src, 'mri_Qadmin', 'vehicles', 'info', ('Dar veículo: %s dado a %s (placa: %s)'):format(vehmodel, targetName, plate), giveCarData)
end)

-- Dedicated event for the Vehicle Wizard (Frontend)
RegisterNetEvent("mri_Qadmin:server:GiveVehicle", function(data)
    local src = source
    if not CheckPerms(src, 'qadmin.action.spawn_vehicle') then
        QBCore.Functions.Notify(src, locale("notifications.no_perms"), "error")
        return
    end

    local playerId = tonumber(data.playerId)
    local model = data.model
    local garage = data.garage or Config.DefaultGarage
    local props = data.props or {}
    local plate = props.plate and props.plate:upper() or nil

    local Player = QBCore.Functions.GetPlayer(playerId)
    if not Player then
        QBCore.Functions.Notify(src, locale("notifications.not_online"), "error")
        return
    end

    if not plate or plate == "" then
        plate = GeneratePlate()
    end
    props.plate = plate -- Put plate in overrides for client application

    if CheckAlreadyPlate(plate) then
        QBCore.Functions.Notify(src, locale("notifications.givecar.plates_alreadyused", plate), "error")
        return
    end

    -- Fetch FULL default properties with NATIVE customization from the admin's client
    local vehicleMods = lib.callback.await("mri_Qadmin:client:getvehData", src, model, props)
    if not vehicleMods or not next(vehicleMods) then
        vehicleMods = { model = model, plate = plate } -- Minimum Fallback
    end

    MySQL.insert.await(
        'INSERT INTO player_vehicles (license, citizenid, vehicle, hash, mods, plate, garage, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        {
            Player.PlayerData.license,
            Player.PlayerData.citizenid,
            model,
            joaat(model),
            json.encode(vehicleMods),
            plate,
            garage,
            1
        }
    )

    local vehName = QBCore.Shared.Vehicles[model] and QBCore.Shared.Vehicles[model].name or model
    local targetName = Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname

    QBCore.Functions.Notify(src, locale("notifications.givecar.success.source", vehName, targetName), "success")
    QBCore.Functions.Notify(Player.PlayerData.source, locale("notifications.givecar.success.target", plate, garage), "success")
    local wizardCarData = GetTargetData(playerId)
    wizardCarData.model = model
    wizardCarData.plate = plate
    wizardCarData.garage = garage
    AddLog(src, 'mri_Qadmin', 'vehicles', 'info', ('Dar veículo (wizard): %s dado a %s (placa: %s)'):format(model, targetName, plate), wizardCarData)
end)

-- Give Car
RegisterNetEvent("mri_Qadmin:server:SetVehicleState", function(_, selectedData)
    local src = source

    if not CheckPerms(src, 'qadmin.action.change_vehicle_state') then
        QBCore.Functions.Notify(src, locale("notifications.no_perms"), "error", 5000)
        return
    end

    local plate = string.upper(selectedData['Plate'].value)
    local state = tonumber(selectedData['State'].value)

    if plate:len() > 8 then
        QBCore.Functions.Notify(src, locale("notifications.plate_max"), "error", 5000)
        return
    end

    if not CheckAlreadyPlate(plate) then
        QBCore.Functions.Notify(src, locale("plate_doesnt_exist"), "error", 5000)
        return
    end

    MySQL.update.await('UPDATE player_vehicles SET state = ?, depotprice = ? WHERE plate = ?', { state, 0, plate })

    QBCore.Functions.Notify(src, locale("notifications.state_changed"), "success", 5000)
    AddLog(src, 'mri_Qadmin', 'vehicles', 'info', ('Estado do veículo: placa %s alterada para estado %d'):format(plate, state), { plate = plate, state = state })
end)

-- Change Plate
RegisterNetEvent('mri_Qadmin:server:ChangePlate', function(newPlate, currentPlate)
    local src = source
    if not CheckPerms(src, 'qadmin.action.change_plate') then return end

    newPlate = newPlate:upper()

    if Config.Inventory == 'ox_inventory' then
        exports.ox_inventory:UpdateVehicle(currentPlate, newPlate)
    end

    MySQL.update.await('UPDATE player_vehicles SET plate = ? WHERE plate = ?', { newPlate, currentPlate })
    MySQL.update.await('UPDATE trunkitems SET plate = ? WHERE plate = ?', { newPlate, currentPlate })
    MySQL.update.await('UPDATE gloveboxitems SET plate = ? WHERE plate = ?', { newPlate, currentPlate })
    AddLog(src, 'mri_Qadmin', 'vehicles', 'info', ('Placa alterada: %s -> %s'):format(currentPlate, newPlate), { oldPlate = currentPlate, newPlate = newPlate })
end)

lib.callback.register('mri_Qadmin:server:GetVehicleByPlate', function(_source, plate)
    if not CheckPerms(_source, 'qadmin.page.vehicles') then return nil end
    local result = MySQL.query.await('SELECT vehicle FROM player_vehicles WHERE plate = ?', { plate })
    local veh = result[1] and result[1].vehicle or {}
    return veh
end)

-- Fix Vehicle for player
RegisterNetEvent('mri_Qadmin:server:FixVehFor', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.fix_vehicle') then return end
    local src = source
    local playerId = selectedData['Player'].value
    local Player = QBCore.Functions.GetPlayer(tonumber(playerId))
    if Player then
        local name = Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname
        TriggerClientEvent('iens:repaira', Player.PlayerData.source)
        TriggerClientEvent('vehiclemod:client:fixEverything', Player.PlayerData.source)
        QBCore.Functions.Notify(src, locale("notifications.veh_fixed", name), 'success', 7500)
        AddLog(src, 'mri_Qadmin', 'vehicles', 'info', ('Reparar veículo: veículo de %s reparado'):format(name), { target = playerId })
    else
        TriggerClientEvent('QBCore:Notify', src, locale("notifications.not_online"), "error")
    end
end)

-- Delete Vehicle by Plate
RegisterNetEvent('mri_Qadmin:server:DeleteVehicleByPlate', function(_, selectedData)
    local src = source

    if not CheckPerms(src, 'qadmin.action.delete_vehicle') then
        QBCore.Functions.Notify(src, locale("notifications.no_perms"), "error", 5000)
        return
    end

    local plate = selectedData["Plate"].value:upper()

    if plate:len() > 8 then
        QBCore.Functions.Notify(src, locale("notifications.plate_max"), "error", 5000)
        return
    end

    if not CheckAlreadyPlate(plate) then
        QBCore.Functions.Notify(src, locale("plate_doesnt_exist", plate), "error", 5000)
        return
    end

    -- Apagar dados relacionados
    MySQL.query.await('DELETE FROM player_vehicles WHERE plate = ?', { plate })

    QBCore.Functions.Notify(src, locale("veh_deleted", plate), "success", 5000)
    AddLog(src, 'mri_Qadmin', 'vehicles', 'warn', ('Deletar veículo: placa %s removida do banco'):format(plate), { plate = plate })
end)

-- Update Vehicle Stock
lib.callback.register('mri_Qadmin:server:UpdateVehicleStock', function(src, actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(src, actionData.perms) then return false end

    if Config.Dealership ~= 'mri' then
        QBCore.Functions.Notify(src, "Stock management is only available for mri dealership system", "error")
        return false
    end

    local model = selectedData["model"].value
    local stock = tonumber(selectedData["stock"].value)

    local vehInfo = QBCore.Shared.Vehicles[model]
    if vehInfo then
        MySQL.query.await('INSERT INTO vehicles_data (model, stock, name, brand, category, price, hash) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE stock = VALUES(stock)',
        {
            model, stock, vehInfo.name or model, vehInfo.brand or "", vehInfo.category or "", vehInfo.price or 0, vehInfo.hash or 0
        })
        QBCore.Functions.Notify(src, "Stock updated for " .. model, "success")
        return true
    else
        -- Fallback if not in shared vehicles, just try to update existing record
        local affected = MySQL.update.await('UPDATE vehicles_data SET stock = ? WHERE model = ?', { stock, model })
        if affected and affected >= 0 then
             QBCore.Functions.Notify(src, "Stock updated for " .. model, "success")
             return true
        end
    end

    return false
end)
