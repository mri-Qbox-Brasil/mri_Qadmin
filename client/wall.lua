local QBCore = exports['qb-core']:GetCoreObject()

local wall_users = {}
local wall = false
local walldistance = 500 -- OneSync Infinity Max Distance

-- Local Preferences (KVP)
local localWallSettings = {
    style = "classic",
    tracer = "bottom",
    skeleton = false,
    showJob = true,
    showGang = true,
    showVehicle = true,
    showWeapon = true,
    font = 4,
    showBackground = true
}

local function LoadLocalSettings()
    local kvp = GetResourceKvpString("mri_qadmin_wall_prefs")
    if kvp then
        local data = json.decode(kvp)
        if data then
            for k, v in pairs(data) do
                localWallSettings[k] = v
            end
        end
    end
end
LoadLocalSettings()

local function SaveLocalSettings()
    SetResourceKvp("mri_qadmin_wall_prefs", json.encode(localWallSettings))
end
-- Weapons data is now loaded from data/weapons.lua


RegisterNetEvent('mri_wall:updateWallUsers')
AddEventHandler('mri_wall:updateWallUsers', function(data)
    if wall then
        wall_users = data
    end
end)

-- The wall toggle event name is derived from GlobalState["mri_wall"], which is
-- populated by the wall resource. Right after a restart it may still be nil, so
-- wait for it (falling back to a known constant) before concatenating.
CreateThread(function()
    local wallResource = GlobalState["mri_wall"]
    local tries = 0
    while not wallResource and tries < 100 do
        Wait(100)
        wallResource = GlobalState["mri_wall"]
        tries = tries + 1
    end
    wallResource = wallResource or "mri_wall"

    local toggleEvent = wallResource .. ":toggleWall"
    RegisterNetEvent(toggleEvent)

    -- Initial fetch when wall is toggled
    AddEventHandler(toggleEvent, function(val)
        wall = val
        if wall then
            QBCore.Functions.Notify("Wall Ativado!", "success")
            -- Initial Fetch
            QBCore.Functions.TriggerCallback('mri_wall:getWallInfos', function(result)
                wall_users = result
            end)
        else
            QBCore.Functions.Notify("Wall Desativado!", "error")
            wall_users = {}
        end
    end)
end)

local function GetLineCountAndMaxLenght(text)
    local count = 0
    local maxLenght = 0
    for line in text:gmatch("([^\n]*)\n?") do
        count = count + 1
        local lenght = string.len(line)
        if lenght > maxLenght then maxLenght = lenght end
    end
    return count, maxLenght
end

function DrawText3D(data)
    if not data or not data.coords then return end

    local coords = data.coords
    local x, y, z
    if type(coords) == 'vector3' then
        x, y, z = coords.x, coords.y, coords.z
    elseif type(coords) == 'table' and coords.x then
        x, y, z = coords.x, coords.y, coords.z
    elseif type(coords) == 'table' and coords[1] then
        x, y, z = coords[1], coords[2], coords[3]
    end

    if not x or not y or not z then return end

    local text = data.text or ""
    local scale = data.scale or 0.28

    SetTextScale(scale, scale)
    SetTextFont(data.font or localWallSettings.font or 0)
    SetTextProportional(1)
    SetTextColour(data.r or 255, data.g or 255, data.b or 255, data.a or 255)
    SetTextEntry("STRING")
    SetTextCentre(true)

    for i = 1, #text, 99 do
        AddTextComponentString(string.sub(text, i, i + 98))
    end

    SetDrawOrigin(x, y, z, 0)
    DrawText(0.0, 0.0)

    if data.background ~= false then
        local count, length = GetLineCountAndMaxLenght(text)
        local padding = 0.005
        local lineHeight = 0.017 * (scale / 0.28)
        local w = (length * 0.0055 * (scale / 0.28)) + (padding * 4)
        local h = (count * lineHeight) + (padding * 2)
        local yOffset = (count * lineHeight) / 2

        -- Background
        DrawRect(0.0, yOffset, w, h, 0, 0, 0, data.bgAlpha or 150)

        -- Decorative Side Bar (Left)
        local barWidth = 0.0015 * (scale / 0.28)
        DrawRect(-(w/2) + (barWidth/2), yOffset, barWidth, h, data.br or 0, data.bg or 150, data.bb or 255, 255)
    end

    ClearDrawOrigin()
end

local function DrawModernESP(coords, info, color, dist)
    local scale = 1.0 - (dist / walldistance)
    if scale < 0.2 then scale = 0.2 end

    local zOffset = info.vehicle and 1.8 or 1.25
    local x, y, z = coords.x, coords.y, coords.z + zOffset
    local onScreen, _x, _y = World3dToScreen2d(x, y, z)

    if onScreen then
        -- Text Content
        local text = ("~w~[%s] %s | ~y~%dm"):format(info.id, info.name, math.floor(dist))
        if info.principals and info.principals ~= "" then text = text .. ("\n~y~[Princ: %s]"):format(info.principals) end
        if info.wallstats then text = text .. "\n~g~[WALL ON]" end
        if info.weapon and localWallSettings.showWeapon then text = text .. ("\n~s~%s"):format(info.weapon) end
        if info.job and localWallSettings.showJob then text = text .. ("\n~y~%s"):format(info.job) end
        if info.gang and localWallSettings.showGang then text = text .. ("\n~p~%s"):format(info.gang) end
        if info.vehicle and localWallSettings.showVehicle then text = text .. ("\n~o~%s"):format(info.vehicle) end

        local count, length = GetLineCountAndMaxLenght(text)

        -- Dimensions
        local textScale = 0.28 * scale
        local lineHeight = 0.017 * (textScale / 0.28)
        local padding = 0.005

        local width = (length * 0.0055 * (textScale / 0.28)) + (padding * 4)
        local barHeight = 0.012 * scale
        local textBlockHeight = count * lineHeight
        local height = textBlockHeight + (padding * 3) + barHeight

        -- Background (Centered at _y)
        DrawRect(_x, _y, width, height, 0, 0, 0, 180)

        -- Health Bar (relative to _y)
        local healthY = _y + (height / 2) - (padding) - (barHeight / 2)
        DrawRect(_x, healthY, width * 0.92, 0.005 * scale, 50, 0, 0, 200)
        local healthWidth = (width * 0.92) * (math.min(info.health, 200) / 200.0)
        DrawRect(_x - (width * 0.46) + (healthWidth / 2), healthY, healthWidth, 0.005 * scale, 0, 255, 0, 255)

        -- Armor Bar (If has any, simple overlap)
        if info.armour > 0 then
             local armourY = healthY + (0.004 * scale)
             local armorWidth = (width * 0.92) * (math.min(info.armour, 100) / 100.0)
             DrawRect(_x - (width * 0.46) + (armorWidth / 2), armourY, armorWidth, 0.003 * scale, 0, 150, 255, 255)
        end

        -- Render Text
        SetTextScale(textScale, textScale)
        SetTextFont(localWallSettings.font or 0)
        SetTextProportional(1)
        SetTextColour(255, 255, 255, 255)
        SetTextEntry("STRING")
        SetTextCentre(true)
        for i = 1, #text, 99 do
            AddTextComponentString(string.sub(text, i, i + 98))
        end
        -- Top of the rect is _y - height/2. Add padding for the first line.
        DrawText(_x, _y - (height / 2) + padding)
    end
end

local function DrawClassicESP(coords, info, color, dist)
    local zOffsetInfo = info.vehicle and 1.8 or 1.25
    local zOffsetExtra = info.vehicle and 1.4 or 0.85

    -- Main Info
    DrawText3D({
        coords = {coords.x, coords.y, coords.z + zOffsetInfo},
        text = info.infoText,
        background = localWallSettings.showBackground,
        r = 255, g = 255, b = 255, a = 255,
        br = color.r, bg = color.g, bb = color.b, -- Bar color
        scale = 0.28
    })

    -- Extra Info
    DrawText3D({
        coords = {coords.x, coords.y, coords.z + zOffsetExtra},
        text = info.extraText,
        background = localWallSettings.showBackground,
        r = 255, g = 255, b = 255, a = 255,
        br = color.r, bg = color.g, bb = color.b, -- Bar color
        scale = 0.24
    })
end

local function DrawSkeleton(ped, color)
    local bones = {
        {"head", "neck"},
        {"neck", "spine2"},
        {"spine2", "spine1"},
        {"spine1", "spine0"},
        {"spine0", "pelvis"},
        -- Braço Esquerdo
        {"spine2", "l_shoulder"},
        {"l_shoulder", "l_elbow"},
        {"l_elbow", "l_hand"},
        -- Braço Direito
        {"spine2", "r_shoulder"},
        {"r_shoulder", "r_elbow"},
        {"r_elbow", "r_hand"},
        -- Perna Esquerda
        {"pelvis", "l_thigh"},
        {"l_thigh", "l_knee"},
        -- Perna Direita
        {"pelvis", "r_thigh"},
        {"r_thigh", "r_knee"}
    }

    local boneIds = {
        head = 31086,
        neck = 39317,
        spine2 = 24843,
        spine1 = 24842,
        spine0 = 23553,
        pelvis = 11816,
        l_shoulder = 45509,
        l_elbow = 61163,
        l_hand = 18905,
        r_shoulder = 40269,
        r_elbow = 28252,
        r_hand = 57005,
        l_thigh = 58271,
        l_knee = 2108,
        l_foot = 14201,
        r_thigh = 51826,
        r_knee = 36864,
        r_foot = 52301
    }

    for _, bonePair in ipairs(bones) do
        local b1 = GetPedBoneCoords(ped, boneIds[bonePair[1]], 0.0, 0.0, 0.0)
        local b2 = GetPedBoneCoords(ped, boneIds[bonePair[2]], 0.0, 0.0, 0.0)
        DrawLine(b1.x, b1.y, b1.z, b2.x, b2.y, b2.z, color.r, color.g, color.b, 255)
    end
end


local playersData = {}

-- Pre-parse RGB strings into tables to avoid regex in draw loop
local function GetColor(str, default)
    if not str or str == "" then return default end
    local r, g, b = str:match("(%d+),%s*(%d+),%s*(%d+)")
    if r and g and b then
        return {r = tonumber(r), g = tonumber(g), b = tonumber(b)}
    end
    return default
end

Citizen.CreateThread(function()
    while true do
        local sleep = 1000
        if wall then
            sleep = 250 -- Lógica de atualização (4x por segundo)
            local activePlayers = GetActivePlayers()
            -- Ponto de vista: se o admin está de noclip, é a câmera scriptada; senão
            -- a gameplay cam. Sem isso a distância seria medida do ped enterrado a -180.
            local ncCam = GetNoclipCamCoord and GetNoclipCamCoord() or nil
            local cam = ncCam or GetGameplayCamCoord()
            local myId = PlayerId()

            for _, id in ipairs(activePlayers) do
                if NetworkIsPlayerActive(id) then
                    local src = GetPlayerServerId(id)
                    local srcStr = tostring(src)
                    local ped = GetPlayerPed(id)

                    -- Durante o noclip, pula a PRÓPRIA entrada do admin: o ped está
                    -- enterrado a -180, então o box apareceria no centro da tela,
                    -- "debaixo da terra". As entradas dos outros players seguem normais.
                    if ncCam and id == myId then
                        playersData[src] = nil
                    elseif ped ~= 0 and wall_users[srcStr] then
                        local coords = GetEntityCoords(ped, true)
                        local dist = #(coords - cam)

                        if dist <= walldistance then
                            local user = wall_users[srcStr]
                            local health = math.floor(GetEntityHealth(ped))
                            local armour = GetPedArmour(ped)
                            local weaponHash = GetSelectedPedWeapon(ped)
                            local ammo = GetAmmoInPedWeapon(ped, weaponHash)
                            local vehicle = GetVehiclePedIsIn(ped, false)
                            local vehicleName = vehicle ~= 0 and GetLabelText(GetDisplayNameFromVehicleModel(GetEntityModel(vehicle))) or nil
                            local model = GetEntityModel(ped)
                            local invisible = not IsEntityVisible(ped)

                            -- Build Text Strings Once
                            local infoText = ("~w~[%s] %s - ~w~%s\n~w~Health:~g~ %d ~w~| Armour:~b~ %d"):format(
                                user.citizenid or "N/A", src, user.name or "N/A", health, armour
                            )

                            local extraText = ""
                            if user.job and localWallSettings.showJob then extraText = extraText .. "\n~y~Job: ~w~" .. user.job end
                            if user.gang and localWallSettings.showGang then extraText = extraText .. "\n~p~Gang: ~w~" .. user.gang end
                            if vehicleName and localWallSettings.showVehicle then extraText = extraText .. "\n~o~Veíc: ~w~" .. vehicleName end
                            if invisible then extraText = extraText .. "\n~r~INVISÍVEL~w~" end
                            if model ~= 1885233650 and model ~= -1667301416 then
                                extraText = extraText .. "\n~w~Model: ~r~" .. model .. "~w~"
                            end
                            if user.wallstats then extraText = extraText .. "\n~w~[~g~WALL ON~w~]" end
                            if user.found_principals and user.found_principals ~= "" then
                                extraText = extraText .. "\n~w~[Princ: ~y~" .. user.found_principals .. "~w~]"
                            end
                            if Weapons[tostring(weaponHash)] and localWallSettings.showWeapon then
                                extraText = extraText .. ("\n~w~ %s"):format(Weapons[tostring(weaponHash)]:upper())
                            end

                            -- Determine Color (Pre-calculada)
                            local color
                            if invisible then
                                color = GetColor(user.inv_color, {r=255, g=255, b=0})
                            elseif health < 101 then
                                color = GetColor(user.dead_color, {r=255, g=0, b=0})
                            elseif user.group_color then
                                color = GetColor(user.group_color, {r=0, g=0, b=255})
                            else
                                color = GetColor(user.default_color, {r=0, g=0, b=255})
                            end

                            playersData[src] = {
                                ped = ped,
                                coords = coords,
                                infoText = infoText,
                                extraText = extraText,
                                color = color,
                                health = health,
                                armour = armour,
                                name = user.name or "N/A",
                                job = user.job,
                                gang = user.gang,
                                id = src,
                                weapon = (Weapons[tostring(weaponHash)] or "Unknown") .. " [" .. ammo .. "]",
                                vehicle = vehicleName,
                                forward = GetEntityForwardVector(ped),
                                principals = user.found_principals,
                                wallstats = user.wallstats,
                                dist = dist,
                                visible = true
                            }
                        else
                            playersData[src] = nil
                        end
                    else
                        playersData[src] = nil
                    end
                end
            end

            -- Cleanup disconnected players from cache
            for src, _ in pairs(playersData) do
                local playerIdx = GetPlayerFromServerId(src)
                if playerIdx == -1 then playersData[src] = nil end
            end
        else
            playersData = {}
        end
        Wait(sleep)
    end
end)

-- Rendering Thread (High frequency, low logic)
Citizen.CreateThread(function()
    while true do
        local sleep = 1000
        if wall then
            sleep = 0
            -- Durante o noclip o ped está enterrado a -180: a origem dos tracers
            -- tem que ser a câmera scriptada, não o ped (senão o tracer some no chão).
            local ncCam = GetNoclipCamCoord and GetNoclipCamCoord() or nil
            local myCoords = ncCam or GetEntityCoords(PlayerPedId(), true)

            for src, data in pairs(playersData) do
                if data.visible then
                    local targetPed = data.ped
                    local targetCoords = GetEntityCoords(targetPed, true)

                    if localWallSettings.style == "modern" then
                        DrawModernESP(targetCoords, data, data.color, data.dist)
                    else
                        DrawClassicESP(targetCoords, data, data.color, data.dist)
                    end

                    if localWallSettings.skeleton then
                        DrawSkeleton(targetPed, data.color)
                    end

                    -- Looking Direction Tracer (View Tracer)
                    local headCoords = GetPedBoneCoords(targetPed, 31086, 0.0, 0.0, 0.0)
                    headCoords = vector3(headCoords.x, headCoords.y, headCoords.z)
                    local forwardCoords = headCoords + (data.forward * 2.0)
                    DrawLine(headCoords.x, headCoords.y, headCoords.z, forwardCoords.x, forwardCoords.y, forwardCoords.z, 255, 255, 255, 255)

                    local c = data.color
                    local startCoords
                    if ncCam then
                        startCoords = ncCam -- de NC: o tracer sai de onde a câmera olha
                    elseif localWallSettings.tracer == "center" then
                        startCoords = GetGameplayCamCoord()
                    elseif localWallSettings.tracer == "top" then
                        startCoords = vector3(myCoords.x, myCoords.y, myCoords.z + 2.0)
                    else -- bottom
                        startCoords = myCoords
                    end

                    local tracerTarget = GetPedBoneCoords(targetPed, 11816, 0.0, 0.0, 0.0) -- Pelvis
                    DrawLine(tracerTarget.x, tracerTarget.y, tracerTarget.z, startCoords.x, startCoords.y, startCoords.z, c.r, c.g, c.b, 255)
                end
            end
        end
        Wait(sleep)
    end
end)

-----------------------------------------------------------------------------------------------------------------------------------------
-- NUI CALLBACKS
-----------------------------------------------------------------------------------------------------------------------------------------

RegisterNUICallback("mri_Qadmin:callback:GetWallSettings", function(_data, cb)
    local results = lib.callback.await('mri_Qadmin:callback:GetWallSettings', false)
    if results then
        results.localSettings = localWallSettings
    end
    cb(results or {})
end)

RegisterNUICallback("mri_Qadmin:callback:GetWallGroups", function(_data, cb)
    local groups = lib.callback.await('mri_Qadmin:callback:GetWallGroups', false)
    cb(groups or {})
end)

RegisterNUICallback("mri_Qadmin:client:SaveLocalWallSetting", function(data, cb)
    if data and data.key then
        local value = data.value
        -- Extract value if it's an object from MriSelectSearch
        if type(value) == 'table' then
            value = value.value
        end

        -- Convert to number if it's a numeric setting (like font or style if numeric)
        local numValue = tonumber(value)
        if numValue then
            value = numValue
        end

        localWallSettings[data.key] = value
        SaveLocalSettings()
        cb('ok')
    else
        cb('error')
    end
end)

RegisterNUICallback("mri_Qadmin:server:SaveWallSetting", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:SaveWallSetting', data.type, data.key, data.value)
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:server:DeleteWallPrincipalColor", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:DeleteWallPrincipalColor', data.principal)
    cb('ok')
end)