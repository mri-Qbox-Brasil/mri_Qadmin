local previousPositions = {}

-- Teleport To Player
RegisterNetEvent('mri_Qadmin:server:TeleportToPlayer', function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(source, data.perms) then return end

    local src = source
    local player = selectedData["Player"].value
    local targetPed = GetPlayerPed(player)
    local coords = GetEntityCoords(targetPed)

    CheckRoutingbucket(src, player)
    TriggerClientEvent('mri_Qadmin:client:TeleportToPlayer', src, coords)
end)

-- Bring Player
RegisterNetEvent('mri_Qadmin:server:BringPlayer', function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(source, data.perms) then return end

    local src = source
    local targetId = selectedData["Player"].value
    local targetPed = GetPlayerPed(targetId)
    local adminPed = GetPlayerPed(src)
    local adminCoords = GetEntityCoords(adminPed)

    -- salvar posição anterior
    previousPositions[targetId] = GetEntityCoords(targetPed)

    CheckRoutingbucket(targetId, src)
    SetEntityCoords(targetPed, adminCoords)
end)

-- Send Player Back
RegisterNetEvent('mri_Qadmin:server:SendPlayerBack', function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(source, data.perms) then return end

    local targetId = selectedData["Player"].value
    local lastPos = previousPositions[targetId]

    if lastPos then
        local targetPed = GetPlayerPed(targetId)
        SetEntityCoords(targetPed, lastPos)
        TriggerClientEvent('QBCore:Notify', source, 'Jogador enviado de volta com sucesso.', 'success')

        previousPositions[targetId] = nil -- limpa após usar
    else
        TriggerClientEvent('QBCore:Notify', source, 'Nenhuma posição salva para este jogador.', 'error')
    end
end)
