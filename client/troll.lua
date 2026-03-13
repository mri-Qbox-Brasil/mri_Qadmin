-- Set on fire
RegisterNetEvent('mri_Qadmin:client:SetOnFire', function(time)
    if not time then time = 10 end
    local timer = time * 1000
    StartEntityFire(cache.serverId)
    Wait(timer)
    StopEntityFire(cache.serverId)
end)

-- Explode player
RegisterNetEvent('mri_Qadmin:client:ExplodePlayer', function(damage)
    local coords = GetEntityCoords(cache.serverId)
    if damage == nil then damage = "nodamage" end
    if damage == "nodamage" then
        AddExplosion(coords.x, coords.y, coords.z, 'EXPLOSION_TANKER', 2.0, true, false, 2.0)
    else
        AddExplosion(coords.x, coords.y, coords.z, 2, 0.9, 1, 0, 1065353216, 0)
    end
end)

-- Play Sound
RegisterNetEvent('mri_Qadmin:client:PlaySound', function(data, selectedData)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end
    local player = selectedData["Player"].value
    local sound = selectedData["Sound"].value

    TriggerServerEvent("InteractSound_SV:PlayOnOne", player, sound, 0.30)
end)

-- Play SoundFrontEnd
RegisterNetEvent('mri_Qadmin:client:PlayHUDSound', function(type)
    if type == 'success' then
        PlaySoundFrontend(-1, 'OK', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true)
    elseif type == 'error' then
        PlaySoundFrontend(-1, 'ERROR', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true)
    end
end)


-- Drunk Player
RegisterNetEvent('mri_Qadmin:client:InitiateDrunkEffect', function()
    local playerPed = cache.ped
    lib.requestAnimSet("MOVE_M@DRUNK@VERYDRUNK")
    Wait(650)
    SetPedMotionBlur(playerPed, true)
    SetPedMovementClipset(playerPed, "MOVE_M@DRUNK@VERYDRUNK", true)
    SetPedIsDrunk(playerPed, true)
    ShakeGameplayCam("DRUNK_SHAKE", 2.0)
    Wait(30000) -- Time To Be Drunk
    SetPedMoveRateOverride(playerPed, 1.0)
    SetRunSprintMultiplierForPlayer(playerPed, 1.0)
    SetPedIsDrunk(playerPed, false)
    SetPedMotionBlur(playerPed, false)
    ResetPedMovementClipset(playerPed)
    ShakeGameplayCam("DRUNK_SHAKE", 0.0)
    SetTimecycleModifierStrength(0.0)
end)
