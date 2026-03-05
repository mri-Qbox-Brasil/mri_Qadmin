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
