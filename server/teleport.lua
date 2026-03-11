local previousPositions = {}

-- Teleport To Player
RegisterNetEvent('mri_Qadmin:server:TeleportToPlayer', function(actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.teleport_to_player') then return end

    local src = source
    local player = selectedData["Player"].value
    local targetPed = GetPlayerPed(player)
    local coords = GetEntityCoords(targetPed)

    CheckRoutingbucket(src, player)
    TriggerClientEvent('mri_Qadmin:client:TeleportToPlayer', src, coords)
end)

-- Bring Player
RegisterNetEvent('mri_Qadmin:server:BringPlayer', function(actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.bring_player') then return end

    local src = source
    local targetId = selectedData["Player"].value
    -- BRING PLAYER LOGIC
    local targetPed = GetPlayerPed(targetId)
    local adminPed = GetPlayerPed(src)

    -- Admin Coords (Destination)
    local adminCoords = GetEntityCoords(adminPed)
    Debug(('[mri_Qadmin] DEBUG BringPlayer: Admin Coords (Src: %s): %s'):format(src, adminCoords))

    -- Safety: If Admin Coords are invalid (0,0,0), try fetching via QBCore or bail out to prevent voiding the player
    if adminCoords.x == 0 and adminCoords.y == 0 and adminCoords.z == 0 then
         local pAdmin = QBCore.Functions.GetPlayer(src)
         if pAdmin and pAdmin.PlayerData.position then
             Debug('[mri_Qadmin] Admin Entity Coords Invalid (0,0,0). Using QBCore Cached for Admin.')
             adminCoords = pAdmin.PlayerData.position
         else
             Debug('[mri_Qadmin] CRITICAL: Cannot determine Admin position. Aborting Bring to prevent sending player to void.')
             TriggerClientEvent('QBCore:Notify', src, 'Erro crítico: Sua posição é inválida (0,0,0). Mova-se um pouco.', 'error')
             return
         end
    end

    -- Target Coords (For saving "Return" position)
    local rawCoords = GetEntityCoords(targetPed)

    -- Fallback safety for SAVING position
    if rawCoords.x == 0 and rawCoords.y == 0 and rawCoords.z == 0 then
        local tPlayer = QBCore.Functions.GetPlayer(tonumber(targetId))
        if tPlayer then
            Debug(('[mri_Qadmin] BringPlayer: Target Entity Coords invalid (0,0,0). Using QBCore cached coords for ID %s'):format(targetId))
            rawCoords = tPlayer.PlayerData.position
        else
            Debug(('[mri_Qadmin] BringPlayer WARNING: Could not find QBCore player for ID %s to fix coords'):format(targetId))
        end
    else
        Debug(('[mri_Qadmin] BringPlayer: Saving Previous ID %s: %s'):format(targetId, rawCoords))
    end

    previousPositions[targetId] = rawCoords

    CheckRoutingbucket(targetId, src)

    -- Execute Teleport
    Debug(('[mri_Qadmin] Teleporting ID %s to %s'):format(targetId, adminCoords))
    SetEntityCoords(targetPed, adminCoords.x, adminCoords.y, adminCoords.z)
end)

-- Send Player Back
RegisterNetEvent('mri_Qadmin:server:SendPlayerBack', function(actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.teleport_back') then return end

    local targetId = selectedData["Player"].value
    local lastPos = previousPositions[targetId]

    if lastPos then
        local targetPed = GetPlayerPed(targetId)
        Debug(('[mri_Qadmin] SendPlayerBack: Sending ID %s to %s'):format(targetId, lastPos))

        -- Fix: SetEntityCoords expects x, y, z explicitly, not a vector object
        SetEntityCoords(targetPed, lastPos.x, lastPos.y, lastPos.z)

        TriggerClientEvent('QBCore:Notify', source, 'Jogador enviado de volta com sucesso.', 'success')

        previousPositions[targetId] = nil -- limpa após usar
    else
        Debug(('[mri_Qadmin] SendPlayerBack: No saved position for ID %s'):format(targetId))
        TriggerClientEvent('QBCore:Notify', source, 'Nenhuma posição salva para este jogador.', 'error')
    end
end)
