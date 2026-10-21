local spectating = {} -- [adminSrc] = targetSrc

RegisterNetEvent('mri_Qadmin:server:SpectateTarget', function(_, selectedData)
    local src = source
    if not CheckPerms(src, 'qadmin.action.spectate_player') then return end
    local player = tonumber(GetValue(selectedData, "Player"))

    if not player or player == src or not GetPlayerName(player) then
        return TriggerClientEvent('QBCore:Notify', src, locale('notifications.invalid_player'), 'error')
    end
    if not CheckTargetable(src, player) then return end

    -- Same target toggles off; another target switches without leaving spectate.
    if spectating[src] == player then
        spectating[src] = nil
        TriggerClientEvent('mri_Qadmin:cancelSpectate', src)
        AddLog(src, 'mri_Qadmin', 'players', 'info', locale('audit.spectate_stopped', GetPlayerName(player) or player), { target = player })
        return
    end

    spectating[src] = player
    CheckRoutingbucket(src, player)
    TriggerClientEvent('mri_Qadmin:requestSpectate', src, player, GetPlayerName(player))
    AddLog(src, 'mri_Qadmin', 'players', 'info', locale('audit.spectate_started', GetPlayerName(player) or player), { target = player })
end)

-- The client leaves spectate on its own (Backspace, target lost).
RegisterNetEvent('mri_Qadmin:server:SpectateEnded', function()
    spectating[source] = nil
end)

AddEventHandler('playerDropped', function()
    spectating[source] = nil
end)

RegisterNetEvent('mri_Qadmin:spectate:teleport', function(target)
    local src = source
    if not CheckPerms(src, 'qadmin.action.spectate_player') then return end
    if spectating[src] ~= tonumber(target) then return end
    local ped = GetPlayerPed(target)
    if DoesEntityExist(ped) then
        local targetCoords = GetEntityCoords(ped)
        SetEntityCoords(GetPlayerPed(src), targetCoords.x, targetCoords.y, targetCoords.z - 10)
        FreezeEntityPosition(GetPlayerPed(src), true)
    end
end)
