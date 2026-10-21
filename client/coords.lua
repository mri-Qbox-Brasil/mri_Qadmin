-- luacheck: globals MenuVisible ToggleUI CloseCoordsTool
-- /cds: live coordinates in every format with one-click copy, plus aiming to mark points in the world.

local ObjectList = require 'data.object'

local open = false
local aiming = false
local AIM_DISTANCE = 300.0
local AIM_FLAGS = 1 | 2 | 4 | 8 | 16 | 256
local ENTITY_TYPES = { 'ped', 'vehicle', 'object' }
-- Mouse look, attacks, weapon wheel and pause: the cursor stays on the panel while the ped walks.
local PANEL_BLOCKED = { 1, 2, 24, 25, 37, 68, 69, 70, 91, 92, 106, 140, 141, 142, 257, 263, 264, 199, 200, 14, 15, 16, 17 }
local AIM_BLOCKED = { 14, 15, 16, 17, 24, 25, 37, 44, 140, 141, 142, 199, 200 }
local KEY = { mark = 38, shoot = 24, back = 177, cancel = 200 }
local MARK_COLOR = { 0, 230, 153 }

local function setEscBusy(busy)
    if LocalPlayer.state.escBusy ~= busy then LocalPlayer.state:set('escBusy', busy, false) end
end

local function vec(c, h)
    return { x = c.x, y = c.y, z = c.z, h = h }
end

local function entityInfo(entity)
    if not entity or entity == 0 or not DoesEntityExist(entity) then return nil end
    local kind = ENTITY_TYPES[GetEntityType(entity)]
    if not kind then return nil end
    local model = GetEntityModel(entity)
    local name
    if kind == 'vehicle' then
        name = GetDisplayNameFromVehicleModel(model):lower()
    elseif kind == 'object' then
        name = ObjectList[model]
    end
    local info = vec(GetEntityCoords(entity), GetEntityHeading(entity))
    info.type = kind
    info.hash = model
    info.name = name
    if kind == 'ped' and IsPedAPlayer(entity) then
        info.player = GetPlayerServerId(NetworkGetPlayerIndexFromPed(entity))
    end
    return info
end

local function placeLabel(c)
    local streetHash = GetStreetNameAtCoord(c.x, c.y, c.z)
    local street = GetStreetNameFromHashKey(streetHash)
    local zone = GetLabelText(GetNameOfZone(c.x, c.y, c.z))
    if zone == 'NULL' then zone = nil end
    return street ~= '' and street or nil, zone
end

local function snapshot()
    local ped = cache.ped
    local c = GetEntityCoords(ped)
    local me = vec(c, GetEntityHeading(ped))
    me.groundZ = c.z - GetEntityHeightAboveGround(ped)
    local street, zone = placeLabel(c)
    local camC, camR = GetFinalRenderedCamCoord(), GetFinalRenderedCamRot(2)
    local data = {
        me = me,
        street = street,
        zone = zone,
        interior = GetInteriorFromEntity(ped),
        camera = { x = camC.x, y = camC.y, z = camC.z, rx = camR.x, ry = camR.y, rz = camR.z, fov = GetFinalRenderedCamFov() },
    }
    if cache.vehicle then
        data.vehicle = entityInfo(cache.vehicle)
        if data.vehicle then data.vehicle.plate = GetVehicleNumberPlateText(cache.vehicle):gsub('^%s*(.-)%s*$', '%1') end
    end
    return data
end

local function startFeed()
    CreateThread(function()
        while open do
            if not aiming then SendNUIMessage({ action = 'coordsData', data = snapshot() }) end
            Wait(150)
        end
    end)
end

local function startPanelGuard()
    CreateThread(function()
        while open do
            if not aiming then
                for i = 1, #PANEL_BLOCKED do DisableControlAction(0, PANEL_BLOCKED[i], true) end
                DisablePlayerFiring(cache.playerId, true)
            end
            Wait(0)
        end
    end)
end

local function setPanelFocus()
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(true)
end

-- Marked point faces the admin, so an NPC dropped there looks at whoever placed it.
local function markPoint(hit)
    local me = GetEntityCoords(cache.ped)
    local point = vec(hit.coords, GetHeadingFromVector_2d(me.x - hit.coords.x, me.y - hit.coords.y))
    point.entity = hit.entity and entityInfo(hit.entity) or nil
    SendNUIMessage({ action = 'coordsMark', data = point })
    PlaySoundFrontend(-1, 'SELECT', 'HUD_FRONTEND_DEFAULT_SOUNDSET', false)
end

local function stopAim()
    if not aiming then return end
    aiming = false
    SendNUIMessage({ action = 'coordsAim', data = false })
    if open then setPanelFocus() end
end

-- The ox_lib raycast waits a frame, so it runs apart and the draw loop keeps every frame.
local function startAim()
    if aiming or not open then return end
    aiming = true
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    local aim = {}
    CreateThread(function()
        while aiming do
            local hit, entity, coords = lib.raycast.fromCamera(AIM_FLAGS, 4, AIM_DISTANCE)
            aim.coords = hit and coords or nil
            aim.entity = hit and entity ~= 0 and entity or nil
        end
    end)
    CreateThread(function()
        local nextSend = 0
        while aiming do
            for i = 1, #AIM_BLOCKED do DisableControlAction(0, AIM_BLOCKED[i], true) end
            DisablePlayerFiring(cache.playerId, true)
            local point = aim.coords
            if point then
                local me = GetEntityCoords(cache.ped)
                DrawLine(me.x, me.y, me.z, point.x, point.y, point.z, MARK_COLOR[1], MARK_COLOR[2], MARK_COLOR[3], 160)
                DrawMarker(28, point.x, point.y, point.z, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.1, 0.1, MARK_COLOR[1], MARK_COLOR[2], MARK_COLOR[3], 220, false, false, 2, false, nil, nil, false)
            end
            local now = GetGameTimer()
            if now >= nextSend then
                nextSend = now + 100
                SendNUIMessage({ action = 'coordsAim', data = { point = point and vec(point) or nil, entity = aim.entity and entityInfo(aim.entity) or nil } })
            end
            if point and (IsDisabledControlJustPressed(0, KEY.mark) or IsDisabledControlJustPressed(0, KEY.shoot)) then
                markPoint({ coords = point, entity = aim.entity })
            elseif IsDisabledControlJustPressed(0, KEY.back) or IsDisabledControlJustPressed(0, KEY.cancel) then
                stopAim()
            end
            Wait(0)
        end
    end)
end

local function openTool()
    if open then return end
    if MenuVisible then ToggleUI(false) end
    open = true
    setEscBusy(true)
    setPanelFocus()
    SendNUIMessage({ action = 'coordsTool', data = true })
    SendNUIMessage({ action = 'coordsData', data = snapshot() })
    startFeed()
    startPanelGuard()
end

function CloseCoordsTool()
    if not open then return end
    stopAim()
    open = false
    setEscBusy(false)
    SendNUIMessage({ action = 'coordsTool', data = false })
    if not MenuVisible then
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
    end
end

RegisterNetEvent('mri_Qadmin:client:OpenCoordsTool', openTool)

RegisterNUICallback('coordsClose', function(_, cb)
    CloseCoordsTool()
    cb('ok')
end)

RegisterNUICallback('coordsAim', function(_, cb)
    startAim()
    cb('ok')
end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() or not open then return end
    setEscBusy(false)
end)
