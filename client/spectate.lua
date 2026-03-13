local spectateInfo = { toggled = false, target = 0, targetPed = 0 }
local oldPos = nil
local buttonsScaleform = nil

local function CreateInstructionalButtons(buttons)
    local scaleform = RequestScaleformMovie("instructional_buttons")
    while not HasScaleformMovieLoaded(scaleform) do Wait(0) end

    BeginScaleformMovieMethod(scaleform, "CLEAR_ALL")
    EndScaleformMovieMethod()

    BeginScaleformMovieMethod(scaleform, "SET_DATA_SLOT_EMPTY")
    EndScaleformMovieMethod()

    for i, btn in ipairs(buttons) do
        BeginScaleformMovieMethod(scaleform, "SET_DATA_SLOT")
        ScaleformMovieMethodAddParamInt(i - 1)
        ScaleformMovieMethodAddParamPlayerNameString(GetControlInstructionalButton(0, btn.control, true))
        ScaleformMovieMethodAddParamPlayerNameString(btn.label)
        EndScaleformMovieMethod()
    end

    BeginScaleformMovieMethod(scaleform, "DRAW_INSTRUCTIONAL_BUTTONS")
    EndScaleformMovieMethod()

    return scaleform
end

RegisterNetEvent('mri_Qadmin:requestSpectate', function(target, _)
    oldPos = GetEntityCoords(cache.ped)
    spectateInfo = {
        toggled = true,
        target = target,
        targetPed = 0
    }

    -- Immediate Safety & Invisibility
    SetEntityVisible(cache.ped, false, 0)
    SetEntityInvincible(cache.ped, true)
    FreezeEntityPosition(cache.ped, true)

    buttonsScaleform = CreateInstructionalButtons({
        { control = 177, label = locale('spectate_exit') }
    })
end)

RegisterNetEvent('mri_Qadmin:cancelSpectate', function()
    if NetworkIsInSpectatorMode() then
        NetworkSetInSpectatorMode(false, -1)
    end

    SetEntityVisible(cache.ped, true, 0)
    SetEntityInvincible(cache.ped, false)
    FreezeEntityPosition(cache.ped, false)

    if buttonsScaleform then
        SetScaleformMovieAsNoLongerNeeded(buttonsScaleform)
        buttonsScaleform = nil
    end

    spectateInfo = { toggled = false, target = 0, targetPed = 0 }

    if oldPos then
        RequestCollisionAtCoord(oldPos.x, oldPos.y, oldPos.z)
        SetEntityCoords(cache.ped, oldPos.x, oldPos.y, oldPos.z, false, false, false, false)
    end
    oldPos = nil;
end)

CreateThread(function()
    while true do
        Wait(0) -- Fast check for keybinds
        if spectateInfo['toggled'] then
            if buttonsScaleform then
                DrawScaleformMovieFullscreen(buttonsScaleform, 255, 255, 255, 255, 0)
            end

            -- KEYBIND: Backspace to exit
            if IsControlJustPressed(0, 177) then
                TriggerEvent('mri_Qadmin:cancelSpectate')
            end

            -- Only sync entity every 100ms
            if GetGameTimer() % 100 < 10 then
                local targetId = GetPlayerFromServerId(spectateInfo.target)
                local targetPed = targetId ~= -1 and GetPlayerPed(targetId) or 0

                if targetPed ~= 0 and DoesEntityExist(targetPed) then
                    if not NetworkIsInSpectatorMode() then
                        RequestCollisionAtCoord(GetEntityCoords(targetPed))
                        NetworkSetInSpectatorMode(true, targetPed)
                    end
                else
                    -- Target not in scope, request teleport help from server
                    TriggerServerEvent('mri_Qadmin:spectate:teleport', spectateInfo['target'])

                    -- Wait a bit for sync
                    local timeout = 50
                    while spectateInfo['toggled'] and timeout > 0 do
                        Wait(100)
                        targetId = GetPlayerFromServerId(spectateInfo.target)
                        targetPed = targetId ~= -1 and GetPlayerPed(targetId) or 0
                        if targetPed ~= 0 and DoesEntityExist(targetPed) then
                            break
                        end
                        timeout = timeout - 1
                    end

                    if timeout <= 0 and spectateInfo['toggled'] then
                        QBCore.Functions.Notify("Falha ao sincronizar com o alvo. Tente novamente.", "error")
                        TriggerEvent('mri_Qadmin:cancelSpectate')
                    end
                end
            end
        else
            Wait(500)
        end
    end
end)
