-- Freeze Player
local frozenState = {}
RegisterNetEvent('mri_Qadmin:server:FreezePlayer', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.freeze_player') then return end
    local src = source

    local target = tonumber(selectedData["Player"] and selectedData["Player"].value)
    if not CheckTargetable(src, target) then return end

    local ped = GetPlayerPed(target)
    local Player = QBCore.Functions.GetPlayer(target)
    if Player == nil then return QBCore.Functions.Notify(src, locale("notifications.not_online"), 'error', 7500) end

    local key = Player.PlayerData.citizenid
    local playerName = Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname
    if not frozenState[key] then
        frozenState[key] = true
        FreezeEntityPosition(ped, true)
        QBCore.Functions.Notify(src,
            locale("notifications.Frozen", playerName .. " | " .. Player.PlayerData.citizenid), 'Success', 7500)
        AddLog(src, 'mri_Qadmin', 'players', 'warn', ('Congelar: %s foi congelado'):format(playerName), { target_src = target, target_name = playerName, target_citizenid = Player.PlayerData.citizenid })
    else
        frozenState[key] = nil
        FreezeEntityPosition(ped, false)
        QBCore.Functions.Notify(src,
            locale("notifications.deFrozen", playerName .. " | " .. Player.PlayerData.citizenid), 'Success', 7500)
        AddLog(src, 'mri_Qadmin', 'players', 'info', ('Descongelar: %s foi descongelado'):format(playerName), { target_src = target, target_name = playerName, target_citizenid = Player.PlayerData.citizenid })
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
        locale("notifications.playerdrunk", playerName .. " | " .. Player.PlayerData.citizenid), 'Success', 7500)
    AddLog(src, 'mri_Qadmin', 'players', 'warn', ('Bêbado: efeito de embriaguez aplicado em %s'):format(playerName), { target_src = target, target_name = playerName, target_citizenid = Player.PlayerData.citizenid })
end)
