-- Clear Inventory
RegisterNetEvent('mri_Qadmin:server:ClearInventory', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.clear_inventory') then return end

    local src = source
    local player = tonumber(GetValue(selectedData, "Player"))
    if not CheckTargetable(src, player) then return end
    local Player = QBCore.Functions.GetPlayer(player)

    if not Player then
        return QBCore.Functions.Notify(source, locale("notifications.not_online"), 'error', 7500)
    end

    if Config.Inventory == 'ox_inventory' then
        exports.ox_inventory:ClearInventory(tonumber(player))
    else
        exports[Config.Inventory]:ClearInventory(player, nil)
    end

    local playerName = Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname
    QBCore.Functions.Notify(src, locale("notifications.invcleared", playerName), 'success', 7500)
    AddLog(src, 'mri_Qadmin', 'inventory', 'warn', ('Limpar inventário: inventário de %s limpo'):format(playerName), GetTargetData(tonumber(player)))
end)

-- Clear Inventory Offline
RegisterNetEvent('mri_Qadmin:server:ClearInventoryOffline', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.clear_inventory') then return end

    local src = source
    local citizenId = GetValue(selectedData, "Citizen ID")
    if type(citizenId) ~= 'string' or citizenId == '' or #citizenId > 64 then
        return QBCore.Functions.Notify(src, "CID inválido.", 'error', 5000)
    end
    local Player = QBCore.Functions.GetPlayerByCitizenId(citizenId)

    -- Hierarquia: se o dono do char está online e é master, bloqueia.
    if Player and not CheckTargetable(src, Player.PlayerData.source) then return end

    if Player then
        if Config.Inventory == 'ox_inventory' then
            exports.ox_inventory:ClearInventory(Player.PlayerData.source)
        else
            exports[Config.Inventory]:ClearInventory(Player.PlayerData.source, nil)
        end
        local playerName = Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname
        QBCore.Functions.Notify(src, locale("notifications.invcleared", playerName), 'success', 7500)
        AddLog(src, 'mri_Qadmin', 'inventory', 'warn', ('Limpar inventário (offline): inventário de %s limpo'):format(playerName), { citizenid = citizenId })
    else
        local result = MySQL.query.await("SELECT * FROM players WHERE citizenid = ?", { citizenId })
        if result and result[1] then
            MySQL.update.await("UPDATE players SET inventory = '{}' WHERE citizenid = ?", { citizenId })
            QBCore.Functions.Notify(src, "Player's inventory cleared", 'success', 7500)
            AddLog(src, 'mri_Qadmin', 'inventory', 'warn', ('Limpar inventário (offline-db): CID %s limpo'):format(citizenId), { citizenid = citizenId })
        else
            QBCore.Functions.Notify(src, locale("notifications.player_not_found"), 'error', 7500)
        end
    end
end)

-- Open Inv [ox side]
RegisterNetEvent('mri_Qadmin:server:OpenInv', function(data)
    if not CheckPerms(source, 'qadmin.action.open_inventory') then return end
    local targetPlayer = tonumber(data) or 0

    if source == targetPlayer then
        return TriggerClientEvent("QBCore:Notify", source, locale("notifications.no_self"), "error", 7500)
    end
    if not CheckTargetable(source, targetPlayer) then return end
    exports.ox_inventory:forceOpenInventory(source, 'player', targetPlayer)
    AddLog(source, 'mri_Qadmin', 'inventory', 'info', ('Inventário: admin abriu inventário de %s'):format(GetPlayerName(targetPlayer) or targetPlayer), GetTargetData(targetPlayer))
end)

-- Open Stash [ox side]
RegisterNetEvent('mri_Qadmin:server:OpenStash', function(data)
    if not CheckPerms(source, 'qadmin.action.open_stash') then return end
    exports.ox_inventory:forceOpenInventory(source, 'stash', data)
    AddLog(source, 'mri_Qadmin', 'inventory', 'info', ('Stash: admin abriu stash "%s"'):format(tostring(data)), { stash = tostring(data) })
end)

-- Open Trunk [ox side]
RegisterNetEvent('mri_Qadmin:server:OpenTrunk', function(actionData, vehiclePlate)
    if not CheckPerms(source, 'qadmin.action.open_trunk') then return end
    if not vehiclePlate then
        return QBCore.Functions.Notify(source, locale("no_plate"), 'error', 7500)
    end
    local plate = tostring(vehiclePlate)

    local success = exports.ox_inventory:forceOpenInventory(source, 'trunk', tostring('trunk'..plate))
    if not success then
        return QBCore.Functions.Notify(source, locale("trunk_not_found"), 'error', 7500)
    end
    AddLog(source, 'mri_Qadmin', 'inventory', 'info', ('Porta-malas: admin abriu porta-malas do veículo %s'):format(plate), { plate = plate })
end)

local MAX_ITEM_AMOUNT = 10000

-- Give Item
RegisterNetEvent('mri_Qadmin:server:GiveItem', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.give_item') then return end
    if not RateLimit(source, 'give_item', 500) then return end

    local target = GetValue(selectedData, "Player")
    local item = GetValue(selectedData, "Item")
    local amount = tonumber(GetValue(selectedData, "Amount"))
    local Player = QBCore.Functions.GetPlayer(tonumber(target))

    if type(item) ~= 'string' or item == '' then return end
    if not amount or amount <= 0 then
        return QBCore.Functions.Notify(source, "Quantidade inválida.", 'error', 5000)
    end
    if amount > MAX_ITEM_AMOUNT then amount = MAX_ITEM_AMOUNT end
    if not Player then
        return QBCore.Functions.Notify(source, locale("notifications.not_online"), 'error', 7500)
    end

    local playerName = Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname
    Player.Functions.AddItem(item, amount)
    QBCore.Functions.Notify(source, locale("notifications.give_item", amount .. " " .. item, playerName), "success", 7500)
    local giveItemData = GetTargetData(tonumber(target))
    giveItemData.item = item
    giveItemData.amount = amount
    AddLog(source, 'mri_Qadmin', 'inventory', 'info', ('Dar item: %dx %s dado a %s'):format(amount, item, playerName), giveItemData)
end)

-- Give Item to All
RegisterNetEvent('mri_Qadmin:server:GiveItemAll', function(actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.give_item_all') then return end
    if not RateLimit(source, 'give_item_all', 5000) then
        return QBCore.Functions.Notify(source, 'Aguarde antes de repetir essa ação.', 'error', 3000)
    end

    local item = GetValue(selectedData, "Item")
    local amount = tonumber(GetValue(selectedData, "Amount"))
    local players = QBCore.Functions.GetPlayers()

    if type(item) ~= 'string' or item == '' then return end
    if not amount or amount <= 0 then
        return QBCore.Functions.Notify(source, "Quantidade inválida.", 'error', 5000)
    end
    if amount > MAX_ITEM_AMOUNT then amount = MAX_ITEM_AMOUNT end

    for _, id in pairs(players) do
        local Player = QBCore.Functions.GetPlayer(id)
        if Player then
            Player.Functions.AddItem(item, amount)
        end
    end
    QBCore.Functions.Notify(source, locale("notifications.give_item_all", amount .. " " .. item), "success", 7500)
    AddLog(source, 'mri_Qadmin', 'inventory', 'warn', ('Dar item a todos: %dx %s dado a todos os jogadores'):format(amount, item), { item = item, amount = amount })
end)
