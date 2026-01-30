-- Toggles Invincibility
local visible = true
RegisterNetEvent('mri_Qadmin:client:ToggleInvisible', function(data)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(data.perms) then return end
    visible = not visible

    SetEntityVisible(cache.ped, visible, 0)
end)

-- God Mode
local godmode = false
RegisterNetEvent('mri_Qadmin:client:ToggleGodmode', function(data)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(data.perms) then return end
    godmode = not godmode

    if godmode then
        QBCore.Functions.Notify(locale("godmode", "Ativado"), 'primary')
        while godmode do
            Wait(0)
            SetPlayerInvincible(cache.playerId, true)
        end
        SetPlayerInvincible(cache.playerId, false)
        QBCore.Functions.Notify(locale("godmode", "Desativado"), 'primary')
    end
end)

-- Kill Player
RegisterNetEvent('mri_Qadmin:client:KillPlayer', function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(data.perms) then return end
    local player = selectedData["Player"].value
    SetEntityHealth(cache.ped, 0)
    QBCore.Functions.Notify(locale("kill_player", player), 'success')
end)

RegisterNetEvent('mri_Qadmin:client:ForceKill', function()
    SetEntityHealth(PlayerPedId(), 0)
end)

-- Cuff/Uncuff
RegisterNetEvent('mri_Qadmin:client:ToggleCuffs', function(player)
    local target = GetPlayerServerId(player)
    TriggerEvent("police:client:GetCuffed", target)
end)

-- Copy Coordinates
local function CopyCoords(data)
    local coords = GetEntityCoords(cache.ped)
    local heading = GetEntityHeading(cache.ped)
    local formats = { vector2 = "%.2f, %.2f", vector3 = "%.2f, %.2f, %.2f", vector4 = "%.2f, %.2f, %.2f, %.2f", heading =
    "%.2f" }
    local format = formats[data]

    local clipboardText = ""
    if data == "vector2" then
        clipboardText = string.format(format, coords.x, coords.y)
    elseif data == "vector3" then
        clipboardText = string.format(format, coords.x, coords.y, coords.z)
    elseif data == "vector4" then
        clipboardText = string.format(format, coords.x, coords.y, coords.z, heading)
    elseif data == "heading" then
        clipboardText = string.format(format, heading)
    end

    lib.setClipboard(clipboardText)
end

RegisterCommand("vector2", function()
    if not CheckPerms('mod') then return end
    CopyCoords("vector2")
end, false)

RegisterCommand("vector3", function()
    if not CheckPerms('mod') then return end
    CopyCoords("vector3")
end, false)

RegisterCommand("vector4", function()
    if not CheckPerms('mod') then return end
    CopyCoords("vector4")
end, false)

RegisterCommand("heading", function()
    if not CheckPerms('mod') then return end
    CopyCoords("heading")
end, false)

-- Infinite Ammo
local InfiniteAmmo = false
RegisterNetEvent('mri_Qadmin:client:setInfiniteAmmo', function(data)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(data.perms) then return end
    InfiniteAmmo = not InfiniteAmmo

    if GetAmmoInPedWeapon(cache.ped, cache.weapon) < 6 then
        SetAmmoInClip(cache.ped, cache.weapon, 10)
        Wait(50)
    end

    while InfiniteAmmo do
        SetPedInfiniteAmmo(cache.ped, true, cache.weapon)
        RefillAmmoInstantly(cache.ped)
        Wait(250)
    end

    SetPedInfiniteAmmo(cache.ped, false, cache.weapon)
end)

-- Toggle coords
local showCoords = false
local function showCoordsMenu()
    while showCoords do
        Wait(50)
        local coords = GetEntityCoords(PlayerPedId())
        local heading = GetEntityHeading(PlayerPedId())
        SendNUIMessage({
            action = "showCoordsMenu",
            data = {
                show = showCoords,
                x = QBCore.Shared.Round(coords.x, 2),
                y = QBCore.Shared.Round(coords.y, 2),
                z = QBCore.Shared.Round(coords.z, 2),
                heading = QBCore.Shared.Round(heading, 2)
            }
        })
    end
end

RegisterNetEvent('mri_Qadmin:client:ToggleCoords', function(data)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(data.perms) then return end

    showCoords = not showCoords

    if showCoords then
        CreateThread(showCoordsMenu)
    end
end)

-- Set Ammo
RegisterNetEvent('mri_Qadmin:client:SetAmmo', function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(data.perms) then return end

    local ammo = selectedData["Ammo Ammount"].value
    local weapon = GetSelectedPedWeapon(cache.ped)

    if weapon ~= nil then
        SetPedAmmo(cache.ped, weapon, ammo)
        QBCore.Functions.Notify(locale("set_weapon_ammo", tostring(ammo)), 'success')
    else
        QBCore.Functions.Notify(locale("no_weapon"), 'error')
    end
end)

RegisterCommand("setammo", function(source)
    if not CheckPerms('mod') then return end
    local weapon = GetSelectedPedWeapon(cache.ped)
    local ammo = 999
    if weapon ~= nil then
        SetPedAmmo(cache.ped, weapon, ammo)
        QBCore.Functions.Notify(locale("set_weapon_ammo", tostring(ammo)), 'success')
    else
        QBCore.Functions.Notify(locale("no_weapon"), 'error')
    end
end, false)

--Toggle Dev
local ToggleDev = false

RegisterNetEvent('mri_Qadmin:client:ToggleDev', function(dataKey)
    local data = CheckDataFromKey(dataKey)
    if not data or not CheckPerms(data.perms) then return end

    ToggleDev = not ToggleDev

    TriggerEvent("qb-admin:client:ToggleDevmode")              -- toggle dev mode (ps-hud/qb-hud)
    TriggerEvent('mri_Qadmin:client:ToggleCoords', dataKey)  -- toggle Coords
    TriggerEvent('mri_Qadmin:client:ToggleGodmode', dataKey) -- Godmode

    QBCore.Functions.Notify(locale("toggle_dev"), 'success')
end)

-- Key Bindings
local toogleAdmin = lib.addKeybind({
    name = 'mri:toogleAdmin',
    description = locale("command_admin_desc"),
    defaultKey = Config.AdminKey,
    onPressed = function(self)
        ExecuteCommand('adm')
    end
})

--noclip
RegisterCommand('nc', function()
    TriggerEvent(Config.Actions["noclip"].event)
end, false)

local toogleNoclip = lib.addKeybind({
    name = 'mri:toogleNoclip',
    description = locale("command_noclip_desc"),
    defaultKey = Config.NoclipKey,
    onPressed = function(self)
        ExecuteCommand('nc')
    end
})

if Config.Keybindings then
    toogleAdmin:disable(false)
    toogleNoclip:disable(false)
else
    toogleAdmin:disable(true)
    toogleNoclip:disable(true)
end

-- Set Ped
RegisterNetEvent("mri_Qadmin:client:setPed", function(pedModels)
    lib.requestModel(pedModels, 1500)
    SetPlayerModel(cache.playerId, pedModels)
    SetPedDefaultComponentVariation(cache.ped)
    SetModelAsNoLongerNeeded(pedModels)
end)

-- Capture Screen
RegisterNetEvent('mri_Qadmin:client:CaptureScreen', function(requester)
    print('[DEBUG] CaptureScreen Event Received. Requester:', requester)
    print('[DEBUG] Config.LiveVideoMethod:', Config.LiveVideoMethod)

    if Config.LiveVideoMethod == "webrtc" then
        TriggerEvent('mri_Qadmin:client:StartWebRTC', requester)
        return
    end

    exports['screenshot-basic']:requestScreenshot({
        encoding = 'jpg',
        quality = 0.2
    }, function(data)
        if not data then return end

        -- Chunking Logic
        local chunkSize = 8 * 1024 -- 8KB chunks (Safe for reliable)
        local dataLen = string.len(data)
        local totalChunks = math.ceil(dataLen / chunkSize)
        local captureId = math.random(100000, 999999)

        for i = 1, totalChunks do
            local start = ((i - 1) * chunkSize) + 1
            local finish = math.min(i * chunkSize, dataLen)
            local chunk = string.sub(data, start, finish)

            TriggerServerEvent('mri_Qadmin:server:ReceiveScreenChunk', requester, {
                captureId = captureId,
                current = i,
                total = totalChunks,
                data = chunk
            })
            Wait(50) -- Throttle to prevent reliable overflow
        end
    end)
end)

-- WebRTC Streaming State
local isWebRTCStreaming = false

-- Stub for WebRTC
RegisterNetEvent('mri_Qadmin:client:StartWebRTC', function(requester)
    print('[DEBUG] StartWebRTC Event Received. Requester:', requester)

    if isWebRTCStreaming then return end -- Already streaming
    isWebRTCStreaming = true

    print('[WebRTC] Starting Stream for:', requester)

    -- Initialize NUI WebRTC (Handshake)
    SendNUIMessage({
        action = 'StartWebRTC',
        data = {
            targetId = requester,
            selfId = cache.playerId
        }
    })

    -- Start Capture Loop
    Citizen.CreateThread(function()
        local lastFrame = 0
        while isWebRTCStreaming do
            -- Limit FPS to ~8-10 to prevent crash/lag
            local time = GetGameTimer()
            if time - lastFrame > 150 then
                 lastFrame = time
                 exports['screenshot-basic']:requestScreenshot({
                    encoding = 'jpg',
                    quality = 0.15
                }, function(data)
                    if not isWebRTCStreaming then return end
                    SendNUIMessage({
                        action = 'StreamFrame',
                        data = { data = data }
                    })
                end)
            end
            Wait(50)
        end
    end)
end)

RegisterNetEvent('mri_Qadmin:client:StopWebRTC', function()
    isWebRTCStreaming = false
    SendNUIMessage({ action = 'StopWebRTC' })
end)

RegisterNetEvent('mri_Qadmin:client:ReceiveScreenChunk', function(data)
    -- data = { id: source, captureId, current, total, data }
    SendNUIMessage({
        action = 'ReceiveScreenChunk',
        data = data
    })
end)
