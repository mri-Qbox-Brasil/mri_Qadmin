-- luacheck: globals MenuVisible
-- Toggles Invincibility

local visible = true
RegisterNetEvent('mri_Qadmin:client:ToggleInvisible', function(data)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end
    visible = not visible

    SetEntityVisible(cache.ped, visible, 0)
    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'players', 'info', visible and 'Invisibilidade: desativada' or 'Invisibilidade: ativada', {})
end)

-- God Mode
local godmode = false
RegisterNetEvent('mri_Qadmin:client:ToggleGodmode', function(data)
    if godmode then
        godmode = false
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'players', 'info', 'God mode: desativado', {})
    else
        if not data then return end
        local actionData = CheckDataFromKey(data)
        if not actionData or not CheckPerms(actionData.perms) then return end
        godmode = true
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'players', 'info', 'God mode: ativado', {})
    end

    if godmode then

        QBCore.Functions.Notify(locale("notifications.godmode", "Ativado"), 'primary')
        while godmode do
            Wait(0)
            SetPlayerInvincible(cache.playerId, true)
        end
        SetPlayerInvincible(cache.playerId, false)
        QBCore.Functions.Notify(locale("notifications.godmode", "Desativado"), 'primary')
    end
end)

-- Kill Player
RegisterNetEvent('mri_Qadmin:client:KillPlayer', function(data, selectedData)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end
    local player = selectedData["Player"].value
    SetEntityHealth(cache.ped, 0)
    QBCore.Functions.Notify(locale("notifications.kill_player", player), 'success')
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
local function CopyCoords(dataType)
    local coords = GetEntityCoords(cache.ped)
    local heading = GetEntityHeading(cache.ped)
    local formats = { vector2 = "%.2f, %.2f", vector3 = "%.2f, %.2f, %.2f", vector4 = "%.2f, %.2f, %.2f, %.2f", heading =
    "%.2f" }
    local format = formats[dataType]

    local clipboardText = ""
    local message = locale('success.coords_copied')
    if dataType == "vector2" then
        clipboardText = string.format(format, coords.x, coords.y)
    elseif dataType == "vector3" then
        clipboardText = string.format(format, coords.x, coords.y, coords.z)
    elseif dataType == "vector4" then
        clipboardText = string.format(format, coords.x, coords.y, coords.z, heading)
    elseif dataType == "heading" then
        clipboardText = string.format(format, heading)
        message = locale('success.heading_copied')
    end

    lib.setClipboard(clipboardText)
    QBCore.Functions.Notify(message, 'success')
end

RegisterNetEvent('mri_Qadmin:client:CopyCoords', function(type)
    if not CheckPerms("qadmin.action." .. type) then return end
    CopyCoords(type)
end)

local infiniteAmmoOn = false
RegisterNetEvent('mri_Qadmin:client:setInfiniteAmmo', function(data)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end
    infiniteAmmoOn = not infiniteAmmoOn

    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'players', 'info',
        'Munição infinita: ' .. (infiniteAmmoOn and 'ativada' or 'desativada'), {})

    if not infiniteAmmoOn then return end

    if cache.weapon and GetAmmoInPedWeapon(cache.ped, cache.weapon) < 6 then
        SetAmmoInClip(cache.ped, cache.weapon, 10)
        Wait(50)
    end

    while infiniteAmmoOn do
        if cache.weapon then
            SetPedInfiniteAmmo(cache.ped, true, cache.weapon)
            RefillAmmoInstantly(cache.ped)
        end
        Wait(250)
    end

    if cache.weapon then
        SetPedInfiniteAmmo(cache.ped, false, cache.weapon)
    end
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

    -- Loop ended (toggled off): clear the overlay.
    SendNUIMessage({
        action = "showCoordsMenu",
        data = {
            show = false
        }
    })
end

RegisterNetEvent('mri_Qadmin:client:ToggleCoords', function(data)
    if showCoords then
        showCoords = false
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'actions', 'info', 'Coordenadas: exibição desativada', {})
    else
        if not data then return end
        local actionData = CheckDataFromKey(data)
        if not actionData or not CheckPerms(actionData.perms) then return end
        showCoords = true
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'actions', 'info', 'Coordenadas: exibição ativada', {})
    end

    if showCoords then

        CreateThread(showCoordsMenu)
    end
end)

-- Set Ammo
RegisterNetEvent('mri_Qadmin:client:SetAmmo', function(data, selectedData)
    local actionData = CheckDataFromKey(data)
    if not actionData or not CheckPerms(actionData.perms) then return end

    local ammo = selectedData["Ammo Ammount"].value
    local weapon = GetSelectedPedWeapon(cache.ped)

    if weapon ~= nil then
        SetPedAmmo(cache.ped, weapon, ammo)
        QBCore.Functions.Notify(locale("notifications.set_weapon_ammo", tostring(ammo)), 'success')
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'players', 'info', ('Munição: definida para %s'):format(ammo), {})
    else
        QBCore.Functions.Notify(locale("notifications.no_weapon"), 'error')
    end
end)

RegisterNetEvent('mri_Qadmin:client:SetAmmoAdmin', function()
    if not CheckPerms("qadmin.action.set_ammo") then return end
    local weapon = GetSelectedPedWeapon(cache.ped)
    local ammo = 999
    if weapon ~= nil then
        SetPedAmmo(cache.ped, weapon, ammo)
        QBCore.Functions.Notify(locale("notifications.set_weapon_ammo", tostring(ammo)), 'success')
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'players', 'info', 'Munição: 999 definido via comando /setammo', {})
    else
        QBCore.Functions.Notify(locale("notifications.no_weapon"), 'error')
    end
end)

--Toggle Dev
local ToggleDev = false

RegisterNetEvent('mri_Qadmin:client:ToggleDev', function(dataKey)
    -- If already on, allow turning off without dataKey/perm check
    if ToggleDev then
        ToggleDev = false
    else
        -- If turning on, require valid dataKey and permissions
        if not dataKey then return end
        local data = CheckDataFromKey(dataKey)
        if not data or not CheckPerms(data.perms) then return end
        ToggleDev = true
    end

    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'actions', 'info', ToggleDev and 'Dev mode: ativado' or 'Dev mode: desativado', {})

    TriggerEvent("qb-admin:client:ToggleDevmode")              -- toggle dev mode (ps-hud/qb-hud)
    TriggerEvent('mri_Qadmin:client:ToggleCoords', dataKey)  -- toggle Coords
    TriggerEvent('mri_Qadmin:client:ToggleGodmode', dataKey) -- Godmode

    -- Drive laser/scanner to DevMode's desired state instead of blindly
    -- toggling, so an independent user toggle is never inverted.
    local resource = GetCurrentResourceName()
    if exports[resource]:IsLaserActive() ~= ToggleDev then
        TriggerEvent('mri_Qadmin:client:ToggleLaser')        -- force Laser to match DevMode
    end
    if exports[resource]:IsScannerActive() ~= ToggleDev then
        TriggerEvent('mri_Qadmin:client:ToggleNearbyScanner') -- force Nearby Scanner to match DevMode
    end


    QBCore.Functions.Notify(locale("notifications.toggle_dev"), 'success')
end)

-- Deactivate DevMode on BACKSPACE if menu is closed
CreateThread(function()
    while true do
        if ToggleDev and not MenuVisible then
            if IsControlJustReleased(0, 177) or IsDisabledControlJustReleased(0, 177) then
                TriggerEvent('mri_Qadmin:client:ToggleDev')
                Wait(500) -- Simple debounce
            end
            Wait(0)
        else
            Wait(500)
        end
    end
end)




-- Key Bindings
local toogleAdmin = lib.addKeybind({
    name = 'mri:toogleAdmin',
    description = locale("commands.admin_desc"),
    defaultKey = Config.AdminKey,
    onPressed = function(_)
        ExecuteCommand('adm')
    end
})

--noclip
-- noclip command moved to server-side

local toogleNoclip = lib.addKeybind({
    name = 'mri:toogleNoclip',
    description = locale("commands.noclip_desc"),
    defaultKey = Config.NoclipKey,
    onPressed = function(_)
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

