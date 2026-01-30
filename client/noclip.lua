local QBCore = exports['qb-core']:GetCoreObject()

-- Constants
local CAMERA_ROTATION_SPEED_X = 10.0
local CAMERA_ROTATION_SPEED_Y = 5.0
local MAX_SPEED = 16.0
local MIN_SPEED = 0.5

-- Variables
local noclip = false
local cam = nil
local ped = nil
local speed = 1.0

-- Disable controls
local function DisabledControls()
    HudWeaponWheelIgnoreSelection()
    DisableAllControlActions(0)
    DisableAllControlActions(1)
    DisableAllControlActions(2)

    EnableControlAction(0, 220, true) -- Mouse X
    EnableControlAction(0, 221, true) -- Mouse Y
    EnableControlAction(0, 245, true) -- Chat
    EnableControlAction(0, 200, true) -- ESC
    EnableControlAction(0, 199, true) -- P
end

-- Checks if a control is always pressed (pressed or disabled)
local function IsControlAlwaysPressed(inputGroup, control)
    return IsControlPressed(inputGroup, control) or IsDisabledControlPressed(inputGroup, control)
end

-- Setup the camera
local function SetupCam()
    local rotation = GetEntityRotation(ped)
    local coords = GetEntityCoords(ped)

    cam = CreateCameraWithParams("DEFAULT_SCRIPTED_CAMERA", coords.x, coords.y, coords.z, 0.0, 0.0, rotation.z, 75.0, true, 2)
    SetCamActive(cam, true)
    RenderScriptCams(true, true, 1000, false, false)
    AttachCamToEntity(cam, ped, 0.0, 0.0, 0.0, true)
end

-- Destroys the camera
local function DestroyNoclipCam()
    if not cam then return end
    SetGameplayCamRelativeHeading(0)
    RenderScriptCams(false, true, 1000, true, true)
    DetachEntity(ped, true, true)
    SetCamActive(cam, false)
    DestroyCam(cam, true)
    cam = nil
end

-- Updates the camera rotation based on mouse input
local function UpdateCameraRotation()
    if not cam then return end

    local rightAxisX = GetControlNormal(0, 220)
    local rightAxisY = GetControlNormal(0, 221)

    local rotation = GetCamRot(cam, 2)

    local newZ = rotation.z - (rightAxisX * CAMERA_ROTATION_SPEED_X)
    local newX = rotation.x - (rightAxisY * CAMERA_ROTATION_SPEED_Y)

    -- Clamp X rotation to avoid flipping
    newX = math.max(math.min(newX, 89.0), -89.0)

    SetCamRot(cam, newX, 0.0, newZ, 2)
    SetEntityHeading(ped, math.max(0, (newZ % 360)))
end

-- Toggles noclip behavior (visibility, collision)
local function ToggleBehavior(bool)
    local coords = GetEntityCoords(ped)
    local alpha = bool and 0 or 255

    RequestCollisionAtCoord(coords.x, coords.y, coords.z)
    FreezeEntityPosition(ped, bool)
    SetEntityCollision(ped, not bool, not bool)
    SetEntityVisible(ped, not bool, 0)
    SetEntityAlpha(ped, alpha, false)

    if not bool then
        ResetEntityAlpha(ped)
    end

    SetLocalPlayerVisibleLocally(true)
    SetEveryoneIgnorePlayer(ped, bool)
    SetPoliceIgnorePlayer(ped, bool)

    if bool then
        SetEntityInvincible(ped, true)
    else
        SetEntityInvincible(ped, false)
    end

    local vehicle = GetVehiclePedIsIn(ped, false)
    if vehicle ~= 0 then
        SetEntityAlpha(vehicle, alpha, false)
        if not bool then
            ResetEntityAlpha(vehicle)
        end
        FreezeEntityPosition(vehicle, bool)
        SetEntityCollision(vehicle, not bool, not bool)
        SetEntityVisible(vehicle, not bool, not bool)
    end
end

-- Teleport to ground safely
local function TeleportToGround()
    local coords = GetEntityCoords(ped)
    local found, z = GetGroundZFor_3dCoord(coords.x, coords.y, coords.z, false)

    if not found then
        -- Fallback to Raycast if native fails
        local rayCast = StartShapeTestRay(coords.x, coords.y, coords.z + 2.0, coords.x, coords.y, -1000.0, 4294967295, ped, 0)
        local retval, hit, hitCoords

        -- Wait for raycast result
        for i = 1, 100 do -- max 100 frames (~1.5s) timeout
            retval, hit, hitCoords = GetShapeTestResult(rayCast)
            if retval ~= 1 then break end
            Wait(0)
        end

        if hit == 1 then
            found = true
            z = hitCoords.z
        end
    end

    if found then
        SetEntityCoords(ped, coords.x, coords.y, z + 1.0, false, false, false, false)
    end
end

-- Stop noclip
local function StopNoclip()
    if noclip then return end
    TeleportToGround()
    ToggleBehavior(false)
    DestroyNoclipCam()
end

-- Handle speed controls
local function UpdateSpeed()
    if IsControlAlwaysPressed(2, 14) then -- Scroll Down (Weapon Wheel Next)
        speed = math.max(MIN_SPEED, speed - 0.5)
    elseif IsControlAlwaysPressed(2, 15) then -- Scroll Up (Weapon Wheel Prev)
        speed = math.min(MAX_SPEED, speed + 0.5)
    elseif IsDisabledControlJustReleased(0, 348) then -- Mouse Middle Click
        speed = 1.0
    end
end

-- Handle movement
local function UpdateMovement()
    if not cam then return end

    local forward = 0.0
    local right = 0.0
    local up = 0.0

    local multi = 1.0
    if IsControlAlwaysPressed(0, 21) then multi = 2.0 -- Shift
    elseif IsControlAlwaysPressed(0, 19) then multi = 4.0 -- Alt
    elseif IsControlAlwaysPressed(0, 36) then multi = 0.25 -- Ctrl
    end

    local moveSpeed = speed * multi

    -- Forward/Backward
    if IsControlAlwaysPressed(0, 32) then forward = moveSpeed -- W
    elseif IsControlAlwaysPressed(0, 33) then forward = -moveSpeed -- S
    end

    -- Left/Right
    if IsControlAlwaysPressed(0, 34) then right = -moveSpeed -- A
    elseif IsControlAlwaysPressed(0, 35) then right = moveSpeed -- D
    end

    -- Up/Down
    if IsControlAlwaysPressed(0, 44) then up = moveSpeed -- Q
    elseif IsControlAlwaysPressed(0, 46) then up = -moveSpeed -- E
    end

    if forward == 0.0 and right == 0.0 and up == 0.0 then return end

    local rot = GetCamRot(cam, 2)
    local forwardX = math.sin(-math.rad(rot.z)) * math.cos(math.rad(rot.x))
    local forwardY = math.cos(-math.rad(rot.z)) * math.cos(math.rad(rot.x))
    local forwardZ = math.sin(math.rad(rot.x))

    local rightX = math.cos(-math.rad(rot.z))
    local rightY = -math.sin(-math.rad(rot.z))
    local rightZ = 0.0

    local nextX = forward * forwardX + right * rightX
    local nextY = forward * forwardY + right * rightY
    local nextZ = forward * forwardZ + right * rightZ + up

    SetEntityCoordsNoOffset(ped,
        GetEntityCoords(ped).x + nextX,
        GetEntityCoords(ped).y + nextY,
        GetEntityCoords(ped).z + nextZ,
        true, true, true
    )
end

-- Toggle Noclip
local function ToggleNoclip()
    noclip = not noclip

    ped = cache.vehicle or cache.ped

    if noclip then
        SetupCam()
        ToggleBehavior(true)
        QBCore.Functions.Notify("Noclip Ativado", "success")

        CreateThread(function()
            while noclip do
                Wait(0)
                if not IsPauseMenuActive() then
                    DisabledControls()
                    UpdateCameraRotation()
                    UpdateSpeed()
                    UpdateMovement()
                end
            end
        end)
    else
        StopNoclip()
        QBCore.Functions.Notify("Noclip Desativado", "error")
    end
end

RegisterNetEvent('mri_Qadmin:client:ToggleNoClip', function()
    if not CheckPerms(Config.Actions["noclip"].perms) then return end
    ToggleNoclip()
end)
