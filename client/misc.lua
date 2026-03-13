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
    exports.qbx_core:Notify(message, 'success')
end

RegisterNetEvent('mri_Qadmin:client:CopyCoords', function(type)
    CopyCoords(type)
end)

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

RegisterNetEvent('mri_Qadmin:client:SetAmmoAdmin', function()
    local weapon = GetSelectedPedWeapon(cache.ped)
    local ammo = 999
    if weapon ~= nil then
        SetPedAmmo(cache.ped, weapon, ammo)
        QBCore.Functions.Notify(locale("set_weapon_ammo", tostring(ammo)), 'success')
    else
        QBCore.Functions.Notify(locale("no_weapon"), 'error')
    end
end)

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
-- noclip command moved to server-side

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

