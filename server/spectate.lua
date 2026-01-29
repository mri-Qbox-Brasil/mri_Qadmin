local spectating = {}

RegisterNetEvent('mri_Qadmin:server:SpectateTarget', function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(source, data.perms) then return end
    local player = GetValue(selectedData, "Player")
    local type = "1"
    if spectating[source] then type = "0" end

    if player and player ~= source then
        CheckRoutingbucket(source, player)
        TriggerEvent('mri_Qadmin:spectate', tonumber(player), type == "1", source, data.perms)
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
    local source = source
    local ped = GetPlayerPed(target)
    if DoesEntityExist(ped) then
        local targetCoords = GetEntityCoords(ped)
        SetEntityCoords(GetPlayerPed(source), targetCoords.x, targetCoords.y, targetCoords.z - 10)
        FreezeEntityPosition(GetPlayerPed(source), true)
    end
end)
