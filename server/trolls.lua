-- Freeze Player
local frozen = false
RegisterNetEvent('mri_Qadmin:server:FreezePlayer', function(actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.freeze_player') then return end
    local src = source

    local target = selectedData["Player"].value

    local ped = GetPlayerPed(target)
    local Player = QBCore.Functions.GetPlayer(target)

    if not frozen then
        frozen = true
        FreezeEntityPosition(ped, true)
        QBCore.Functions.Notify(src,
            locale("Frozen",
                Player.PlayerData.charinfo.firstname ..
                " " .. Player.PlayerData.charinfo.lastname .. " | " .. Player.PlayerData.citizenid), 'Success', 7500)
    else
        frozen = false
        FreezeEntityPosition(ped, false)
        QBCore.Functions.Notify(src,
            locale("deFrozen",
                Player.PlayerData.charinfo.firstname ..
                " " .. Player.PlayerData.charinfo.lastname .. " | " .. Player.PlayerData.citizenid), 'Success', 7500)
    end
    if Player == nil then return QBCore.Functions.Notify(src, locale("not_online"), 'error', 7500) end
end)

-- Drunk Player
RegisterNetEvent('mri_Qadmin:server:DrunkPlayer', function(actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.drunk_player') then return end

    local src = source
    local target = selectedData["Player"].value
    local targetPed = GetPlayerPed(target)
    local Player = QBCore.Functions.GetPlayer(target)

    if not Player then
        return QBCore.Functions.Notify(src, locale("not_online"), 'error', 7500)
    end

    TriggerClientEvent('mri_Qadmin:client:InitiateDrunkEffect', target)
    QBCore.Functions.Notify(src,
        locale("playerdrunk",
            Player.PlayerData.charinfo.firstname ..
            " " .. Player.PlayerData.charinfo.lastname .. " | " .. Player.PlayerData.citizenid), 'Success', 7500)
end)
