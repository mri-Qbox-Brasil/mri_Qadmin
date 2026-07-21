local spectating = {}

RegisterNetEvent('mri_Qadmin:server:SpectateTarget', function(data, selectedData)
    if not CheckPerms(source, 'qadmin.action.spectate_player') then return end
    local player = tonumber(GetValue(selectedData, "Player"))
    local type = "1"
    if spectating[source] then type = "0" end

    if player and not CheckTargetable(source, player) then return end

    if player and player ~= source then
        CheckRoutingbucket(source, player)
        TriggerEvent('mri_Qadmin:spectate', tonumber(player), type == "1", source, data.perms)
        local action = type == "1" and "iniciou" or "encerrou"
        AddLog(source, 'mri_Qadmin', 'players', 'info', ('Espectador: admin %s espectação do jogador %s'):format(action, GetPlayerName(tonumber(player)) or player), { target = player })
    else
        TriggerClientEvent('QBCore:Notify', source, "Jogador inválido.", 'error')
    end
end)

AddEventHandler('mri_Qadmin:spectate', function(target, on, source, perms)
    local data = {}
    data.perms = perms
    if not on then
        TriggerClientEvent('mri_Qadmin:cancelSpectate', source)
        spectating[source] = false
        FreezeEntityPosition(GetPlayerPed(source), false)
        TriggerClientEvent('mri_Qadmin:client:toggleNames', source, data)
    elseif on then
        TriggerClientEvent('mri_Qadmin:requestSpectate', source, target, GetPlayerName(target))
        spectating[source] = true
        TriggerClientEvent('mri_Qadmin:client:toggleNames', source, data)
    end
end)

RegisterNetEvent('mri_Qadmin:spectate:teleport', function(target)
    local src = source
    if not CheckPerms(src, 'qadmin.action.spectate_player') then return end
    if not spectating[src] then return end
    local ped = GetPlayerPed(target)
    if DoesEntityExist(ped) then
        local targetCoords = GetEntityCoords(ped)
        SetEntityCoords(GetPlayerPed(src), targetCoords.x, targetCoords.y, targetCoords.z - 10)
        FreezeEntityPosition(GetPlayerPed(src), true)
    end
end)
