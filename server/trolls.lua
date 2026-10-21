-- Freeze Player
local frozenState = {}
RegisterNetEvent('mri_Qadmin:server:FreezePlayer', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.freeze_player') then return end
    local src = source

    local target = tonumber(selectedData["Player"] and selectedData["Player"].value)
    if not CheckTargetable(src, target) then return end

    local ped = GetPlayerPed(target)
    local xPlayer = QBCore.Functions.GetPlayer(target)
    if xPlayer == nil then return QBCore.Functions.Notify(src, locale("notifications.not_online"), 'error', 7500) end

    local key = xPlayer.PlayerData.citizenid
    local playerName = xPlayer.PlayerData.charinfo.firstname .. ' ' .. xPlayer.PlayerData.charinfo.lastname
    if not frozenState[key] then
        frozenState[key] = true
        FreezeEntityPosition(ped, true)
        Player(target).state:set('qadminFrozen', true, true)
        QBCore.Functions.Notify(src,
            locale("notifications.Frozen", playerName .. " | " .. key), 'success', 7500)
        AddLog(src, 'mri_Qadmin', 'players', 'warn', locale('audit.frozen', playerName), { target_src = target, target_name = playerName, target_citizenid = key })
    else
        frozenState[key] = nil
        FreezeEntityPosition(ped, false)
        Player(target).state:set('qadminFrozen', false, true)
        QBCore.Functions.Notify(src,
            locale("notifications.deFrozen", playerName .. " | " .. key), 'success', 7500)
        AddLog(src, 'mri_Qadmin', 'players', 'info', locale('audit.unfrozen', playerName), { target_src = target, target_name = playerName, target_citizenid = key })
    end
end)

-- Drunk Player
RegisterNetEvent('mri_Qadmin:server:DrunkPlayer', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.drunk_player') then return end

    local src = source
    local target = tonumber(selectedData["Player"] and selectedData["Player"].value)
    if not CheckTargetable(src, target) then return end
    local Player = QBCore.Functions.GetPlayer(target)

    if not Player then
        return QBCore.Functions.Notify(src, locale("notifications.not_online"), 'error', 7500)
    end

    local playerName = Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname
    TriggerClientEvent('mri_Qadmin:client:InitiateDrunkEffect', target)
    QBCore.Functions.Notify(src,
        locale("notifications.playerdrunk", playerName .. " | " .. Player.PlayerData.citizenid), 'success', 7500)
    AddLog(src, 'mri_Qadmin', 'players', 'warn', locale('audit.drunk', playerName), { target_src = target, target_name = playerName, target_citizenid = Player.PlayerData.citizenid })
end)
