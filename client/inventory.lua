-- Open Inventory
RegisterNetEvent('mri_Qadmin:client:openInventory', function(data, selectedData)
    if not CheckPerms('qadmin.action.open_inventory') then return end
    local player = selectedData["Player"].value

    if Config.Inventory == 'ox_inventory' then
        TriggerServerEvent("mri_Qadmin:server:OpenInv", player)
    else
        TriggerServerEvent("inventory:server:OpenInventory", "otherplayer", player)
    end
end)

-- Open Stash
RegisterNetEvent('mri_Qadmin:client:openStash', function(data, selectedData)
    if not CheckPerms('qadmin.action.open_stash') then return end
    local stash = selectedData["Stash"].value

    if Config.Inventory == 'ox_inventory' then
        TriggerServerEvent("mri_Qadmin:server:OpenStash", stash)
    else
        TriggerServerEvent("inventory:server:OpenInventory", "stash", tostring(stash))
        TriggerEvent("inventory:client:SetCurrentStash", tostring(stash))
    end
end)

-- Open Trunk
RegisterNetEvent('mri_Qadmin:client:openTrunk', function(data, selectedData)
    if not CheckPerms('qadmin.action.open_trunk') then return end
    local vehiclePlate = selectedData["Plate"].value

    if Config.Inventory == 'ox_inventory' then
        TriggerServerEvent("mri_Qadmin:server:OpenTrunk", data, vehiclePlate)
    else
        TriggerServerEvent("inventory:server:OpenInventory", "trunk", tostring(vehiclePlate))
        TriggerEvent("inventory:client:SetCurrentStash", tostring(vehiclePlate))
    end
end)

--------------------------------------------------------------------------------
-- NUI Callbacks Bridging
--------------------------------------------------------------------------------

RegisterNUICallback('mri_Qadmin:callback:GetPlayerInventory', function(data, cb)
    local resp = lib.callback.await('mri_Qadmin:callback:GetPlayerInventory', false, data.targetId)
    cb(resp)
end)

RegisterNUICallback('mri_Qadmin:callback:GetVehicleInventory', function(data, cb)
    local resp = lib.callback.await('mri_Qadmin:callback:GetVehicleInventory', false, data.plate, data.type)
    cb(resp)
end)

RegisterNUICallback('mri_Qadmin:server:RemoveInventoryItem', function(data, cb)
    local success = lib.callback.await('mri_Qadmin:server:RemoveInventoryItem', false, data.targetId, data.item, data.count, data.slot, data.type)
    cb(success)
end)

RegisterNUICallback('mri_Qadmin:server:TransferItemToSelf', function(data, cb)
    local success = lib.callback.await('mri_Qadmin:server:TransferItemToSelf', false, data.targetId, data.item, data.count, data.slot, data.type)
    cb(success)
end)

RegisterNUICallback('mri_Qadmin:server:CopyInventoryToSelf', function(data, cb)
    local success = lib.callback.await('mri_Qadmin:server:CopyInventoryToSelf', false, data.targetId, data.type)
    cb(success)
end)

RegisterNUICallback('mri_Qadmin:server:ClearPlayerInventory', function(data, cb)
    local success = lib.callback.await('mri_Qadmin:server:ClearPlayerInventory', false, data.targetId, data.type)
    cb(success)
end)

RegisterNUICallback('mri_Qadmin:server:GiveInventoryItem', function(data, cb)
    local success = lib.callback.await('mri_Qadmin:server:GiveInventoryItem', false, data.targetId, data.item, data.count, data.type)
    cb(success)
end)
