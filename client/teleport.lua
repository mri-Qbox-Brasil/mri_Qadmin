local lastCoords

-- Nota: teleportar estando de noclip NÃO tira você do modo. O loop do noclip
-- (client/noclip.lua) detecta que o ped enterrado foi movido e leva a câmera
-- pro destino, re-enterrando o ped ali. Você teleporta e continua voando.
local function teleport(x, y, z)
    if cache.vehicle then
        return SetPedCoordsKeepVehicle(cache.ped, x, y, z)
    end

    SetEntityCoords(cache.ped, x, y, z, false, false, false, false)
end

-- Teleport to player
RegisterNetEvent('mri_Qadmin:client:TeleportToPlayer', function(coords)
    lastCoords = GetEntityCoords(cache.ped)
    SetPedCoordsKeepVehicle(cache.ped, coords.x, coords.y, coords.z)
end)

-- Teleport to coords
RegisterNetEvent('mri_Qadmin:client:TeleportToCoords', function(data, selectedData)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end

    local coordsData = selectedData["Coordenadas"]
    if not coordsData or not coordsData['value'] then return end

    local coordsStr = tostring(coordsData.value)
    local x, y, z, heading

    local matches = { coordsStr:match("^%s*(-?[%d%.]+),%s*(-?[%d%.]+),%s*(-?[%d%.]+),?%s*(-?[%d%.]*)%s*$") }

    if matches and #matches >= 3 then
        x, y, z, heading = tonumber(matches[1]), tonumber(matches[2]), tonumber(matches[3]), tonumber(matches[4] or 0)
    end

    if not x or not y or not z then return end

    lastCoords = GetEntityCoords(cache.ped)
    SetPedCoordsKeepVehicle(cache.ped, x, y, z)

    if heading and heading ~= 0 then
        SetEntityHeading(cache.ped, heading)
    end
end)

-- Teleport to Locaton
RegisterNetEvent('mri_Qadmin:client:TeleportToLocation', function(data, selectedData)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end
    local coords = selectedData["Location"].value

    lastCoords = GetEntityCoords(cache.ped)
    SetPedCoordsKeepVehicle(cache.ped, coords.x, coords.y, coords.z)
end)

-- Teleport to waypoint/marker. Era `type = "command"` apontando para o /tpm, que exige a
-- ACE `command.tpm` — independente do `qadmin.action.*` do painel, então um admin não-master
-- clicava e nada acontecia. Aqui a permissão do painel volta a mandar.
--
-- A colisão do destino é carregada ANTES de baixar o ped ao chão: sem isso o
-- GetGroundZ responde num mundo que ainda não existe e o admin cai no vazio.
RegisterNetEvent('mri_Qadmin:client:TeleportToMarker', function(data)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end

    local blip = GetFirstBlipInfoId(8) -- 8 = blip de waypoint
    if not DoesBlipExist(blip) then
        return QBCore.Functions.Notify(locale("notifications.no_waypoint"), 'error')
    end

    local coord = GetBlipInfoIdCoord(blip)
    local x, y = coord.x + 0.0, coord.y + 0.0

    local ped = cache.ped
    lastCoords = GetEntityCoords(ped)

    FreezeEntityPosition(ped, true)
    local found, groundZ = false, 0.0
    for _, h in ipairs({ 200.0, 300.0, 100.0, 400.0, 500.0, 50.0, 650.0, 800.0, 1000.0 }) do
        SetPedCoordsKeepVehicle(ped, x, y, h)
        local tries = 0
        while not HasCollisionLoadedAroundEntity(ped) and tries < 60 do
            RequestCollisionAtCoord(x, y, h)
            Wait(10)
            tries = tries + 1
        end
        local ok, z = GetGroundSafe(x, y, h)
        if ok and z and z > -100.0 then
            found, groundZ = true, z
            break
        end
        Wait(0)
    end
    FreezeEntityPosition(ped, false)

    if found then
        SetPedCoordsKeepVehicle(ped, x, y, groundZ + 1.0)
    else
        -- Sem chão detectado: cai por colisão a partir de uma altura segura.
        SetPedCoordsKeepVehicle(ped, x, y, 100.0)
    end

    QBCore.Functions.Notify(locale("notifications.teleported_waypoint"), 'success')
end)

-- Teleport back
RegisterNetEvent('mri_Qadmin:client:TeleportBack', function(data)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end

    if lastCoords then
        local coords = GetEntityCoords(cache.ped)
        teleport(lastCoords.x, lastCoords.y, lastCoords.z)
        lastCoords = coords
    end
end)
