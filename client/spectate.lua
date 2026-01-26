local oldPos = nil
local spectateInfo = {
    toggled = false,
    target = 0,
    targetPed = 0
}

RegisterNetEvent('mri_Qadmin:requestSpectate', function(targetPed, target, name)
    oldPos = GetEntityCoords(cache.ped)
    spectateInfo = {
        toggled = true,
        target = target,
        targetPed = targetPed
    }
end)

RegisterNetEvent('mri_Qadmin:cancelSpectate', function()
    if NetworkIsInSpectatorMode() then
        NetworkSetInSpectatorMode(false, spectateInfo['targetPed'])
    end
    SetEntityVisible(cache.ped, true, 0)
    spectateInfo = { toggled = false, target = 0, targetPed = 0 }
    
    if oldPos then
        print(('[mri_Qadmin] Spectate: Restoring Position: %s'):format(oldPos))
        RequestCollisionAtCoord(oldPos.x, oldPos.y, oldPos.z)
        SetEntityCoords(cache.ped, oldPos.x, oldPos.y, oldPos.z, false, false, false, false)
    else
        print('[mri_Qadmin] Spectate WARNING: No oldPos saved to restore!')
    end
    oldPos = nil;
end)

CreateThread(function()
    while true do
        Wait(0)
        if spectateInfo['toggled'] then
            local targetPed = NetworkGetEntityFromNetworkId(spectateInfo.targetPed)
            if DoesEntityExist(targetPed) then
                SetEntityVisible(cache.ped, false, 0)
                if not NetworkIsInSpectatorMode() then
                    RequestCollisionAtCoord(GetEntityCoords(targetPed))
                    NetworkSetInSpectatorMode(true, targetPed)
                end
            else
                TriggerServerEvent('mri_Qadmin:spectate:teleport', spectateInfo['target'])
                while not DoesEntityExist(NetworkGetEntityFromNetworkId(spectateInfo.targetPed)) do Wait(100) end
            end
        else
            Wait(500)
        end
    end
end)
