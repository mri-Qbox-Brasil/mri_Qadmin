local ShowBlips = false
local ShowNames = false
local NetCheck1 = false
local NetCheck2 = false
local activeBlips = {}
local activeTags = {}
local currentPlayers = {}

-- Function to remove all names and Blips
local function removeNameAndBlips()
    for _, blip in ipairs(activeBlips) do
        if DoesBlipExist(blip) then
            RemoveBlip(blip)
        end
    end
    for _, tag in ipairs(activeTags) do
        SetMpGamerTagVisibility(tag, 0, false)
        SetMpGamerTagVisibility(tag, 2, false)
        SetMpGamerTagVisibility(tag, 4, false)
        SetMpGamerTagVisibility(tag, 6, false)
        RemoveMpGamerTag(tag)
    end
    activeBlips = {}
    activeTags = {}
end

-- Function to Toggle Blips and Names
local function ToggleBlipsAndNames(isBlips)
    if isBlips then
        ShowBlips = not ShowBlips
        NetCheck1 = ShowBlips
        local message = ShowBlips and "blips_activated" or "blips_deactivated"
        QBCore.Functions.Notify(locale(message), ShowBlips and "success" or "error")
    else
        ShowNames = not ShowNames
        NetCheck2 = ShowNames
        local message = ShowNames and "names_activated" or "names_deactivated"
        QBCore.Functions.Notify(locale(message), ShowNames and "success" or "error")
    end
    if not ShowNames or not ShowBlips then
        removeNameAndBlips()
    end
end

-- Main Function to Update Blips and Names
local function UpdateBlipsAndNames(players)
    local playerPed = PlayerPedId()
    local playerCoords = GetEntityCoords(playerPed, true)
    local blipSprites = { -- Sprite Per Vehicle Class
        [1] = 1,
        [8] = 226,
        [9] = 757,
        [10] = 477,
        [11] = 477,
        [12] = 67,
        [13] = 226,
        [14] = 427,
        [15] = 422,
        [16] = 423,
        [17] = 198,
        [18] = 56,
        [19] = 421,
        [20] = 477,
    }

    -- Rebuild the tracked handle set for this cycle so removeNameAndBlips()
    -- can later clean up ALL players, not just the last one.
    activeBlips = {}
    activeTags = {}

    for _, player in pairs(players) do
        local playerId = GetPlayerFromServerId(player.id)
        local ped = GetPlayerPed(playerId)
        local name = 'ID: ' .. player.id .. ' | ' .. player.name
        local blip = GetBlipFromEntity(ped)

        local tag = CreateFakeMpGamerTag(ped, name, false, false, "", false)
        SetMpGamerTagAlpha(tag, 0, 255)
        SetMpGamerTagAlpha(tag, 2, 255)
        SetMpGamerTagAlpha(tag, 4, 255)
        SetMpGamerTagAlpha(tag, 6, 255)
        SetMpGamerTagHealthBarColour(tag, 25)

        local isPlayerTalking = NetworkIsPlayerTalking(playerId)
        local isPlayerInvincible = GetPlayerInvincible(playerId)
        if ShowNames then
            SetMpGamerTagVisibility(tag, 0, true)
            SetMpGamerTagVisibility(tag, 2, true)
            SetMpGamerTagVisibility(tag, 4, isPlayerTalking)
            SetMpGamerTagVisibility(tag, 6, isPlayerInvincible)
        else
            SetMpGamerTagVisibility(tag, 0, false)
            SetMpGamerTagVisibility(tag, 2, false)
            SetMpGamerTagVisibility(tag, 4, false)
            SetMpGamerTagVisibility(tag, 6, false)
            RemoveMpGamerTag(tag)
        end

        if ShowBlips then
            if not DoesBlipExist(blip) then
                blip = AddBlipForEntity(ped)
                ShowHeadingIndicatorOnBlip(blip, true)
                SetBlipCategory(blip, 7)
            else
                local veh = GetVehiclePedIsIn(ped, false)
                local classveh = GetVehicleClass(veh)
                local modelveh = GetEntityModel(veh)
                if veh ~= 0 then
                    local blipSprite = blipSprites[classveh] or 225
                    if modelveh == 'besra' or modelveh == 'hydra' or modelveh == 'lazer' then
                        blipSprite = 424
                    end

                    SetBlipSprite(blip, blipSprite)
                    ShowHeadingIndicatorOnBlip(blip, false)

                    local passengers = GetVehicleNumberOfPassengers(veh)
                    if passengers then
                        if not IsVehicleSeatFree(veh, -1) then
                            passengers = passengers + 1
                        end
                        ShowNumberOnBlip(blip, passengers)
                    else
                        HideNumberOnBlip(blip)
                    end

                    SetBlipRotation(blip, math.ceil(GetEntityHeading(veh)))
                    SetBlipNameToPlayerName(blip, playerId)
                    SetBlipScale(blip, 0.85)

                    local distance = math.floor(Vdist(playerCoords.x, playerCoords.y, playerCoords.z,
                                GetEntityCoords(ped, true).x, GetEntityCoords(ped, true).y, GetEntityCoords(ped, true).z) /
                            -1) +
                        900
                    distance = math.max(0, math.min(255, distance))
                    SetBlipAlpha(blip, distance)
                else
                    HideNumberOnBlip(blip)
                    SetBlipSprite(blip, 1)
                    SetBlipNameToPlayerName(blip, playerId)
                    ShowHeadingIndicatorOnBlip(blip, true)
                end
            end
        end

        -- Track this player's handles for cleanup.
        activeTags[#activeTags + 1] = tag
        if blip and DoesBlipExist(blip) then
            activeBlips[#activeBlips + 1] = blip
        end
    end
end

local function preparePlayers()
    currentPlayers = {}
    Wait(100)
    local res = lib.callback.await('mri_Qadmin:callback:GetPlayers')
    currentPlayers = (res and res.data) or {}
end

-- Toggle Blips and Names events
RegisterNetEvent('mri_Qadmin:client:toggleBlips', function(actionKey)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(actionData.perms) then return end
    if not ShowBlips then preparePlayers() end
    ToggleBlipsAndNames(true)
end)

RegisterNetEvent('mri_Qadmin:client:toggleNames', function(actionKey)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(actionData.perms) then return end
    if not ShowNames then preparePlayers() end
    ToggleBlipsAndNames(false)
end)

-- SetJob
RegisterNetEvent('mri_Qadmin:client:SetJob', function(actionKey, selectedData)
    local data = CheckDataFromKey(actionKey)
    if not data or not CheckPerms(data.perms) then return end
    local playerId = selectedData["Player"].value
    if not playerId then return end
    if not selectedData["Job"] then return end
    TriggerServerEvent('mri_Qadmin:server:SetJob', actionKey, selectedData)
end)

RegisterNetEvent('mri_Qadmin:client:RefreshPlayers', function()
    SendNUIMessage({
        action = "RefreshPlayers"
    })
end)

-- Set Gang
RegisterNetEvent('mri_Qadmin:client:SetGang', function(actionKey, selectedData)
    local data = CheckDataFromKey(actionKey)
    if not data or not CheckPerms(data.perms) then return end
    local playerId = selectedData["Player"].value
    if not playerId then return end
    if not selectedData["Gang"] then return end
    TriggerServerEvent('mri_Qadmin:server:SetGang', actionKey, selectedData)
end)

-- Mute Player
RegisterNetEvent("mri_Qadmin:client:MutePlayer", function(actionKey, selectedData)
    local data = CheckDataFromKey(actionKey)
    if not data or not CheckPerms(data.perms) then return end
    local playerId = selectedData["Player"].value
    if not playerId then return end
    exports["pma-voice"]:toggleMutePlayer(playerId)
end)

-- Main loop to check for updates
CreateThread(function()
    while true do
        Wait(1000)
        if NetCheck1 or NetCheck2 then
            UpdateBlipsAndNames(currentPlayers)
        end
    end
end)

-- Remove Stress
RegisterNetEvent('mri_Qadmin:client:removeStress', function(_)
    TriggerServerEvent('hud:server:RelieveStress', 100)
end)