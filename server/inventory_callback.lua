-- ox_lib is already global via manifest

local watching = {} -- [inventoryId] = { [adminSrc] = true }

local function NotifyAdmins(inventoryId)
    if not watching[inventoryId] then return end
    for adminSrc, _ in pairs(watching[inventoryId]) do
        TriggerClientEvent('mri_Qadmin:client:InventoryUpdated', adminSrc, inventoryId)
    end
end

local function AdminLog(src, action, target, item, count, invType)
    local admin = QBCore.Functions.GetPlayer(src)
    local adminName = admin and (admin.PlayerData.charinfo.firstname .. ' ' .. admin.PlayerData.charinfo.lastname) or GetPlayerName(src)
    local targetName = "Unknown"

    if invType == 'player' or not invType then
        local tPlayer = QBCore.Functions.GetPlayer(tonumber(target))
        if tPlayer then
            targetName = tPlayer.PlayerData.charinfo.firstname .. ' ' .. tPlayer.PlayerData.charinfo.lastname .. " (" .. target .. ")"
        else
            targetName = "Offline/Unknown (" .. tostring(target) .. ")"
        end
    else
        targetName = tostring(target) .. " (" .. tostring(invType) .. ")"
    end

    local logMsg = ("[INVENTORY] Admin %s executou '%s' em %s. Item: %s, Qtd: %s"):format(
        adminName, action, targetName, tostring(item or "N/A"), tostring(count or "N/A")
    )

    print(logMsg)
    -- TriggerEvent('qb-log:server:CreateLog', 'adminactions', 'Inventory Action', 'red', logMsg)
end

lib.callback.register('mri_Qadmin:callback:GetPlayerInventory', function(source, targetId)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return nil end

    local target = tonumber(targetId)
    if not target then return nil end

    if Config.Inventory == 'ox_inventory' then
        local inventory = exports.ox_inventory:GetInventory(target)
        if inventory then
            local items = {}
            for _, item in pairs(inventory.items) do
                if item.count > 0 then
                    table.insert(items, {
                        name = item.name,
                        label = item.label,
                        count = item.count,
                        metadata = item.metadata,
                        slot = item.slot,
                        weight = item.weight
                    })
                end
            end
            table.sort(items, function(a, b) return a.slot < b.slot end)
            return {
                items = items,
                weight = inventory.weight or 0,
                maxWeight = inventory.maxWeight or 0,
                slots = inventory.slots or 0
            }
        end
    end

    -- Fallback for other inventories
    local Player = QBCore.Functions.GetPlayer(target)
    if Player and Player.PlayerData.inventory then
        local items = {}
        for _, item in pairs(Player.PlayerData.inventory) do
            if item.amount and item.amount > 0 then
                table.insert(items, {
                    name = item.name or item.item,
                    label = item.label,
                    count = item.amount,
                    metadata = item.info or item.metadata,
                    slot = item.slot
                })
            end
        end
        table.sort(items, function(a, b) return (a.slot or 0) < (b.slot or 0) end)
        return {
            items = items,
            weight = Player.PlayerData.charinfo.weight or 0, -- QBCore might differ
            maxWeight = 120000, -- Typical default
            slots = 40 -- Typical QBCore default
        }
    end

    return nil
end)

lib.callback.register('mri_Qadmin:callback:GetVehicleInventory', function(source, plate, type)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return nil end

    local invId = type == 'trunk' and 'trunk'..plate or 'glovebox'..plate

    if Config.Inventory == 'ox_inventory' then
        local inventory = exports.ox_inventory:GetInventory(invId)
        if inventory then
            local items = {}
            for _, item in pairs(inventory.items) do
                if item.count > 0 then
                    table.insert(items, {
                        name = item.name,
                        label = item.label,
                        count = item.count,
                        metadata = item.metadata,
                        slot = item.slot,
                        weight = item.weight
                    })
                end
            end
            table.sort(items, function(a, b) return a.slot < b.slot end)
            return {
                items = items,
                weight = inventory.weight or 0,
                maxWeight = inventory.maxWeight or 0,
                slots = inventory.slots or 0,
                label = (type == 'trunk' and 'Porta-malas: ' or 'Porta-luvas: ') .. plate
            }
        end
    end

    -- QBCore / Other Fallback
    local items = {}
    local result = MySQL.query.await('SELECT items FROM trunkitems WHERE plate = ?', { plate })
    if type == 'glovebox' then
        result = MySQL.query.await('SELECT items FROM gloveboxitems WHERE plate = ?', { plate })
    end

    if result and result[1] then
        local invItems = json.decode(result[1].items)
        if invItems then
            for _, item in pairs(invItems) do
                table.insert(items, {
                    name = item.name or item.item,
                    label = item.label or item.name,
                    count = item.amount or item.count,
                    metadata = item.info or item.metadata,
                    slot = item.slot
                })
            end
            table.sort(items, function(a, b) return (a.slot or 0) < (b.slot or 0) end)
        end
    end

    return {
        items = items,
        weight = 0, -- Hard to determine without specific inv export
        maxWeight = 100000,
        slots = 50,
        label = (type == 'trunk' and 'Porta-malas: ' or 'Porta-luvas: ') .. plate
    }
end)

lib.callback.register('mri_Qadmin:server:RemoveInventoryItem', function(source, targetId, item, count, slot, invType)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end

    local target = (not invType or invType == 'player') and tonumber(targetId) or (invType == 'trunk' and 'trunk'..targetId or 'glovebox'..targetId)
    if not target then return false end

    AdminLog(source, "Remove Item", targetId, item, count, invType)

    if Config.Inventory == 'ox_inventory' then
        if slot then
            return exports.ox_inventory:RemoveItem(target, item, count, nil, slot)
        else
            return exports.ox_inventory:RemoveItem(target, item, count)
        end
    end

    -- QBCore Fallback (Players only for now)
    if not invType or invType == 'player' then
        local Player = QBCore.Functions.GetPlayer(target)
        if Player then
            if slot then
                return Player.Functions.RemoveItem(item, count, slot)
            else
                return Player.Functions.RemoveItem(item, count)
            end
        end
    end

    return false
end)

lib.callback.register('mri_Qadmin:server:ClearPlayerInventory', function(source, targetId, invType)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end

    local target = (not invType or invType == 'player') and tonumber(targetId) or (invType == 'trunk' and 'trunk'..targetId or 'glovebox'..targetId)
    if not target then return false end

    AdminLog(source, "Clear Inventory", targetId, nil, nil, invType)

    if Config.Inventory == 'ox_inventory' then
        exports.ox_inventory:ClearInventory(target)
        return true
    end

    -- QBCore Fallback
    if not invType or invType == 'player' then
        local Player = QBCore.Functions.GetPlayer(target)
        if Player then
            Player.Functions.ClearInventory()
            return true
        end
    end

    return false
end)

lib.callback.register('mri_Qadmin:server:GiveInventoryItem', function(source, targetId, item, count, invType)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end

    local target = (not invType or invType == 'player') and tonumber(targetId) or (invType == 'trunk' and 'trunk'..targetId or 'glovebox'..targetId)
    if not target then return false end

    AdminLog(source, "Give Item", targetId, item, count, invType)

    if Config.Inventory == 'ox_inventory' then
        return exports.ox_inventory:AddItem(target, item, count)
    end

    -- QBCore Fallback
    if not invType or invType == 'player' then
        local Player = QBCore.Functions.GetPlayer(target)
        if Player then
            return Player.Functions.AddItem(item, count)
        end
    end

    return false
end)

lib.callback.register('mri_Qadmin:server:TransferItemToSelf', function(source, targetId, item, count, slot, invType)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end

    local target = (not invType or invType == 'player') and tonumber(targetId) or (invType == 'trunk' and 'trunk'..targetId or 'glovebox'..targetId)
    if not target then return false end

    AdminLog(source, "Transfer Item to Self", targetId, item, count, invType)

    if Config.Inventory == 'ox_inventory' then
        local success = exports.ox_inventory:RemoveItem(target, item, count, nil, slot)
        if success then
            exports.ox_inventory:AddItem(source, item, count)
            return true
        end
    end

    -- QBCore Fallback (Player to Player)
    if not invType or invType == 'player' then
        local TargetPlayer = QBCore.Functions.GetPlayer(tonumber(targetId))
        local AdminPlayer = QBCore.Functions.GetPlayer(source)
        if TargetPlayer and AdminPlayer then
            local success = TargetPlayer.Functions.RemoveItem(item, count, slot)
            if success then
                AdminPlayer.Functions.AddItem(item, count)
                return true
            end
        end
    end

    return false
end)

lib.callback.register('mri_Qadmin:server:CopyInventoryToSelf', function(source, targetId, invType)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end

    local target = (not invType or invType == 'player') and tonumber(targetId) or (invType == 'trunk' and 'trunk'..targetId or 'glovebox'..targetId)
    if not target then return false end

    AdminLog(source, "Copy Inventory to Self", targetId, nil, nil, invType)

    if Config.Inventory == 'ox_inventory' then
        local inventory = exports.ox_inventory:GetInventory(target)
        if inventory and inventory.items then
            for _, item in pairs(inventory.items) do
                exports.ox_inventory:AddItem(source, item.name, item.count, item.metadata)
            end
            return true
        end
    end

    -- QBCore Fallback (Player to Player)
    if not invType or invType == 'player' then
        local TargetPlayer = QBCore.Functions.GetPlayer(tonumber(targetId))
        local AdminPlayer = QBCore.Functions.GetPlayer(source)
        if TargetPlayer and AdminPlayer and TargetPlayer.PlayerData.inventory then
            for _, item in pairs(TargetPlayer.PlayerData.inventory) do
                AdminPlayer.Functions.AddItem(item.name, item.amount, item.slot, item.info)
            end
            return true
        end
    end

    return false
end)

lib.callback.register('mri_Qadmin:server:MoveInventoryItem', function(source, data)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end
    Debug("Move Request:", json.encode(data))

    local fromTarget = (not data.fromType or data.fromType == 'player') and tonumber(data.fromId) or (data.fromType == 'trunk' and 'trunk'..data.fromId or 'glovebox'..data.fromId)
    local toTarget = (not data.toType or data.toType == 'player') and tonumber(data.toId) or (data.toType == 'trunk' and 'trunk'..data.toId or 'glovebox'..data.toId)

    if not fromTarget or not toTarget then return false end

    AdminLog(source, "Move Item", data.fromId, data.item, data.count, data.fromType)
    if data.fromId ~= data.toId then
        AdminLog(source, "Move Item (To Target)", data.toId, data.item, data.count, data.toType)
    end

    if Config.Inventory == 'ox_inventory' then
        Debug("Ox Inventory Move/Swap (Manual):", fromTarget, toTarget, data.fromSlot, data.toSlot, data.count)

        local fromInv = exports.ox_inventory:GetInventory(fromTarget)
        local toInv = exports.ox_inventory:GetInventory(toTarget)
        if not fromInv or not toInv then return false end

        local sourceItem = nil
        for _, it in pairs(fromInv.items) do
            if it.slot == data.fromSlot then
                sourceItem = it
                break
            end
        end

        if not sourceItem then return false end

        local targetItem = nil
        for _, it in pairs(toInv.items) do
            if it.slot == data.toSlot then
                targetItem = it
                break
            end
        end

        -- Start transaction-like move
        local removedSource = exports.ox_inventory:RemoveItem(fromTarget, sourceItem.name, data.count, sourceItem.metadata, data.fromSlot)
        if not removedSource then return false end

        if targetItem then
            -- Swap logic: Remove target, add source to target slot, then add target to source slot
            local removedTarget = exports.ox_inventory:RemoveItem(toTarget, targetItem.name, targetItem.count, targetItem.metadata, data.toSlot)
            if removedTarget then
                local addedSource = exports.ox_inventory:AddItem(toTarget, sourceItem.name, data.count, sourceItem.metadata, data.toSlot)
                local addedTarget = exports.ox_inventory:AddItem(fromTarget, targetItem.name, targetItem.count, targetItem.metadata, data.fromSlot)

                if not addedSource or not addedTarget then
                    -- This is rare, but we should log it
                    Debug("Swap partial failure! Items might be lost or duplicated in slots.")
                end
            else
                -- Could not remove target, rollback source
                exports.ox_inventory:AddItem(fromTarget, sourceItem.name, data.count, sourceItem.metadata, data.fromSlot)
                return false
            end
        else
            -- Simple move
            local added = exports.ox_inventory:AddItem(toTarget, sourceItem.name, data.count, sourceItem.metadata, data.toSlot)
            if not added then
                exports.ox_inventory:AddItem(fromTarget, sourceItem.name, data.count, sourceItem.metadata, data.fromSlot)
                return false
            end
        end

        Debug("Ox Manual Move/Swap Success")
        return true
    end

    -- QBCore Fallback (Simple slot update if same player, or move if different)
    if data.fromType == 'player' and data.toType == 'player' then
        local fromPlayer = QBCore.Functions.GetPlayer(tonumber(data.fromId))
        local toPlayer = QBCore.Functions.GetPlayer(tonumber(data.toId))

        if fromPlayer and toPlayer then
            local itemData = fromPlayer.Functions.GetItemBySlot(data.fromSlot)
            if itemData then
                if tostring(data.fromId) == tostring(data.toId) then
                    -- Same player reordering
                    fromPlayer.PlayerData.inventory[data.fromSlot] = nil
                    itemData.slot = data.toSlot
                    fromPlayer.PlayerData.inventory[data.toSlot] = itemData
                    fromPlayer.Functions.Save()
                    Debug("QBCore reorder success")
                    return true
                else
                    -- Cross player move
                    if fromPlayer.Functions.RemoveItem(itemData.name, data.count, data.fromSlot) then
                        local added = toPlayer.Functions.AddItem(itemData.name, data.count, data.toSlot, itemData.info)
                        Debug("QBCore cross-player move result:", added)
                        return added
                    end
                end
            end
        end
    end

    return false
end)

lib.callback.register('mri_Qadmin:server:StartWatchingInventory', function(source, inventoryId)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end
    if not inventoryId or inventoryId == '' then return false end
    if not watching[inventoryId] then watching[inventoryId] = {} end
    watching[inventoryId][source] = true
    return true
end)

lib.callback.register('mri_Qadmin:server:StopWatchingInventory', function(source, inventoryId)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end
    if watching[inventoryId] then
        watching[inventoryId][source] = nil
        if next(watching[inventoryId]) == nil then
            watching[inventoryId] = nil
        end
    end
    return true
end)

-- Sincronização em tempo real (Hooks)
local function RegisterOxHooks()
    if Config.Inventory ~= 'ox_inventory' then
        if GetResourceState('ox_inventory') == 'started' then
            Config.Inventory = 'ox_inventory'
        else
            return
        end
    end

    Debug("Registering ox_inventory hooks for real-time sync")

    exports.ox_inventory:registerHook('swapItems', function(payload)
        NotifyAdmins(payload.fromInventory)
        if payload.fromInventory ~= payload.toInventory then
            NotifyAdmins(payload.toInventory)
        end
        return true
    end, {})

    exports.ox_inventory:registerHook('createItem', function(payload)
        NotifyAdmins(payload.inventoryId)
        return true
    end, {})

    -- New hooks for comprehensive sync
    exports.ox_inventory:registerHook('removeItem', function(payload)
        NotifyAdmins(payload.inventoryId)
        return true
    end, {})

    exports.ox_inventory:registerHook('buyItem', function(payload)
        NotifyAdmins(payload.inventoryId)
        return true
    end, {})
end

CreateThread(function()
    Wait(1000) -- Give some time for ox_inventory to be fully ready
    RegisterOxHooks()
end)

AddEventHandler('playerDropped', function()
    local src = source
    for invId, admins in pairs(watching) do
        if admins[src] then
            admins[src] = nil
            if next(admins) == nil then
                watching[invId] = nil
            end
        end
    end
end)
