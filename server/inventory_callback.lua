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

    return nil
end)

lib.callback.register('mri_Qadmin:server:RemoveInventoryItem', function(source, targetId, item, count, slot, invType)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end

    local target = (not invType or invType == 'player') and tonumber(targetId) or (invType == 'trunk' and 'trunk'..targetId or 'glovebox'..targetId)
    if not target then return false end

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

    if Config.Inventory == 'ox_inventory' then
        local success = exports.ox_inventory:RemoveItem(target, item, count, nil, slot)
        if success then
            exports.ox_inventory:AddItem(source, item, count)
            return true
        end
    end

    -- Fallback/QBCore logic could be added here
    return false
end)

lib.callback.register('mri_Qadmin:server:CopyInventoryToSelf', function(source, targetId, invType)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return false end

    local target = (not invType or invType == 'player') and tonumber(targetId) or (invType == 'trunk' and 'trunk'..targetId or 'glovebox'..targetId)
    if not target then return false end

    if Config.Inventory == 'ox_inventory' then
        local inventory = exports.ox_inventory:GetInventory(target)
        if inventory and inventory.items then
            for _, item in pairs(inventory.items) do
                exports.ox_inventory:AddItem(source, item.name, item.count, item.metadata)
            end
            return true
        end
    end

    return false
end)
