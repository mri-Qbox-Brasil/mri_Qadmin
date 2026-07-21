local QBCore = exports['qb-core']:GetCoreObject()

-- Constants
local CAMERA_ROTATION_SPEED_X = 10.0
local CAMERA_ROTATION_SPEED_Y = 5.0
local MAX_SPEED = 16.0
local MIN_SPEED = 0.5
-- Profundidade em que o ped/veículo fica escondido durante o noclip. Bem abaixo
-- de qualquer geometria do mapa, então wallhack/ESP não pega o admin onde ele
-- está olhando — vê ele parado aqui embaixo, no ponto de entrada.
local STASH_Z = -180.0

-- Variables
local noclip = false
local cam = nil
local entity = nil        -- ped OU veículo escondido durante o noclip
local speed = 1.0
local savedCoords = nil
local savedHeading = nil

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

-- Cria a câmera livre na posição/rotação atual da entidade. NÃO é presa a
-- nenhuma entidade — quem se move é só a câmera (por isso nunca há overlap
-- de entidades e o engine não deleta nada).
local function SetupCam()
    local coords = GetEntityCoords(entity)
    local rot = GetEntityRotation(entity)

    cam = CreateCameraWithParams("DEFAULT_SCRIPTED_CAMERA", coords.x, coords.y, coords.z, rot.x, 0.0, rot.z, 75.0, true, 2)
    SetCamActive(cam, true)
    -- Corte instantâneo (sem ease): se interpolasse, o blend sairia da câmera de
    -- gameplay — que segue o ped enterrado logo depois — dando o efeito de "câmera
    -- embaixo da terra subindo".
    RenderScriptCams(true, false, 0, false, false)
end

-- Destroys the camera
local function DestroyNoclipCam()
    if not cam then return end
    -- Instantâneo também: a esta altura o ped já foi restaurado à superfície,
    -- então cortar direto pra câmera de gameplay não passa por baixo da terra.
    RenderScriptCams(false, false, 0, true, true)
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
end

-- Esconde o ped/veículo embaixo do mapa: congela, tira colisão, invisível,
-- invencível e ignorado por todos. O admin some do lugar onde a câmera vai olhar.
local function HideEntity()
    savedCoords = GetEntityCoords(entity)
    savedHeading = GetEntityHeading(entity)

    FreezeEntityPosition(entity, true)
    SetEntityCollision(entity, false, false)
    SetEntityVisible(entity, false, 0)
    SetEntityAlpha(entity, 0, false)
    SetEntityInvincible(entity, true)
    SetEveryoneIgnorePlayer(cache.playerId, true)
    SetPoliceIgnorePlayer(cache.playerId, true)

    -- Enterra a entidade no mesmo x/y, bem abaixo do mapa.
    SetEntityCoordsNoOffset(entity, savedCoords.x, savedCoords.y, STASH_Z, false, false, false)
end

-- Restaura a entidade no ponto onde a câmera parou (fly-and-land), com o chão.
local function RestoreEntity(destCoords)
    ClearFocus()

    local found, groundZ = GetGroundSafe(destCoords.x, destCoords.y, destCoords.z)
    local landZ = found and (groundZ + 1.0) or destCoords.z

    SetEntityCoordsNoOffset(entity, destCoords.x, destCoords.y, landZ, false, false, false)
    if savedHeading then SetEntityHeading(entity, savedHeading) end

    FreezeEntityPosition(entity, false)
    SetEntityCollision(entity, true, true)
    SetEntityVisible(entity, true, 0)
    ResetEntityAlpha(entity)
    SetEntityInvincible(entity, false)
    SetEveryoneIgnorePlayer(cache.playerId, false)
    SetPoliceIgnorePlayer(cache.playerId, false)
end

-- Redireciona a proximidade do pma-voice pra CÂMERA (não pro ped enterrado),
-- usando o export oficial `overrideProximityCheck`. Assim o admin ouve quem está
-- perto de onde a câmera olha, mesmo com o ped debaixo do mapa. O listener já
-- vira a câmera sozinho no pma-voice (ele detecta GetRenderingCam()).
local function EnableCameraVoice()
    if GetResourceState('pma-voice') ~= 'started' then return end
    pcall(function()
        exports['pma-voice']:overrideProximityCheck(function(ply)
            if not cam then return false end
            local tgtPed = GetPlayerPed(ply)
            if not tgtPed or tgtPed == 0 then return false end
            local prox = MumbleGetTalkerProximity()
            local range = GetConvar('voice_useNativeAudio', 'false') == 'true' and prox * 3.0 or prox
            local dist = #(GetCamCoord(cam) - GetEntityCoords(tgtPed))
            return dist < range, dist
        end)
    end)
end

local function DisableCameraVoice()
    if GetResourceState('pma-voice') ~= 'started' then return end
    pcall(function()
        exports['pma-voice']:resetProximityCheck()
    end)
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

-- Move a CÂMERA (não a entidade). Sem entidade física se mexendo, não há como
-- sobrepor duas entidades → o engine não deleta nada. O foco de streaming segue
-- a câmera pra o mundo carregar ao redor dela.
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

    local rot = GetCamRot(cam, 2)
    local forwardX = math.sin(-math.rad(rot.z)) * math.cos(math.rad(rot.x))
    local forwardY = math.cos(-math.rad(rot.z)) * math.cos(math.rad(rot.x))
    local forwardZ = math.sin(math.rad(rot.x))

    local rightX = math.cos(-math.rad(rot.z))
    local rightY = -math.sin(-math.rad(rot.z))

    local pos = GetCamCoord(cam)
    local nextX = pos.x + forward * forwardX + right * rightX
    local nextY = pos.y + forward * forwardY + right * rightY
    local nextZ = pos.z + forward * forwardZ + up

    SetCamCoord(cam, nextX, nextY, nextZ)

    -- Streaming segue a câmera (o ped continua enterrado, mas o mundo carrega aqui).
    SetFocusPosAndVel(nextX, nextY, nextZ, 0.0, 0.0, 0.0)
end

-- Toggle Noclip
local function ToggleNoclip()
    noclip = not noclip

    entity = cache.vehicle or cache.ped

    if noclip then
        SetupCam()
        HideEntity()
        EnableCameraVoice()
        local start = GetCamCoord(cam)
        SetFocusPosAndVel(start.x, start.y, start.z, 0.0, 0.0, 0.0)

        QBCore.Functions.Notify("Noclip Ativado", "success")
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'players', 'info', 'Noclip: ativado', {})

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
        -- Captura o destino ANTES de destruir a câmera, pra pousar o admin ali.
        local dest = cam and GetCamCoord(cam) or (savedCoords or GetEntityCoords(entity))
        DisableCameraVoice()
        RestoreEntity(dest)       -- ped volta pra superfície primeiro
        DestroyNoclipCam()        -- depois corta pra câmera de gameplay (já em cima)

        QBCore.Functions.Notify("Noclip Desativado", "error")
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'players', 'info', 'Noclip: desativado', {})
    end
end

RegisterNetEvent('mri_Qadmin:client:ToggleNoClip', function()
    if not CheckPerms("qadmin.action.noclip") then return end
    ToggleNoclip()
end)
