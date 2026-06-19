QBCore = exports['qb-core']:GetCoreObject()
PlayerData = {}
local isAdminPlayer = false

-- Functions
local function setupMenu()
	Wait(500)
    Debug('Initiating consolidated setupMenu (Latent)...')

	PlayerData = QBCore.Functions.GetPlayerData()

    TriggerServerEvent('mri_Qadmin:server:GetInitialData')
end

RegisterNetEvent('mri_Qadmin:client:ReceiveInitialData', function(initialData)
    if initialData then
        -- Update Config with settings from DB
        if initialData.settings then
            for k, v in pairs(initialData.settings) do
                Config[k] = v
            end
        end

        -- Update Actions
        if initialData.actions then
            Config.Actions = initialData.actions.Actions or Config.Actions
            Config.PlayerActions = initialData.actions.PlayerActions or Config.PlayerActions
            Config.OtherActions = initialData.actions.OtherActions or Config.OtherActions
        end

        -- Update local cache in client/data.lua
        SetDataCache(initialData)
        Debug('^2[mri_Qadmin] Initial data received via Latent Event and cached.^7')

        -- Automatically notify NUI that fresh data (items, vehicles, etc) is ready
        GetData()

        local perms = initialData and initialData.permissions or {}
        isAdminPlayer = #perms > 0

        SendNUIMessage({
            action = "setupUI",
            data = {
                actions = Config.Actions,
                playerActions = Config.PlayerActions,
                otherActions = Config.OtherActions,
                resources = initialData and initialData.resources or {},
                playerData = PlayerData,
                server = initialData and initialData.serverInfo or {},
                vehicleImages = Config.VehicleImages,
                permissions = perms,
                permissionDefinitions = initialData and initialData.permissionDefinitions or {},
                categoryDefinitions = initialData and initialData.categoryDefinitions or {},
                supportedLanguages = Config.SupportedLanguages,
                webrtcUrl = Config.WebRTCUrl,
                signalingProvider = Config.SignalingProvider,
                descriptions = Config.Descriptions,
                settingOptions = Config.Options,
                inventory = Config.Inventory,
                selfId = GetPlayerServerId(PlayerId()),
                accentColor = GetConvar('mri:color', '#00E699'),
                backgroundColor = Config.background_color or '',
                qboxEnabled = initialData and initialData.qboxEnabled or false,
                resourceVersion = initialData and initialData.resourceVersion or nil,
                updateInfo = initialData and initialData.updateInfo or nil
            }
        })
    else
        Debug('^1[ERROR] Failed to fetch initial data from server!^7')
    end
end)

RegisterNUICallback('getServerInfo', function(_, cb)
    local serverInfo = lib.callback.await('mri_Qadmin:callback:GetServerInfo')
    if not serverInfo then
        Debug("Erro: Nenhum dado recebido do servidor.")
        cb({ error = "Erro ao carregar informações do servidor." })
        return
    end
    cb(serverInfo)
end)

local translationCache = {}

local function GetTranslations(locale)
    locale = locale or GetConvar('ox_locale', 'pt-br')
    if translationCache[locale] then return translationCache[locale], locale end

    local path = ('locales/%s.json'):format(locale)
    local raw = LoadResourceFile(GetCurrentResourceName(), path)
    if raw then
        local ok, tbl = pcall(json.decode, raw)
        if ok and tbl then
            translationCache[locale] = tbl
            return tbl, locale
        end
    end
    return nil, locale
end

-- Forward new log entries to the NUI panel in real-time
RegisterNetEvent('mri_Qadmin:client:NewLog', function(log)
    SendNUIMessage({ action = 'newLog', data = log })
end)

-- Provide translations to the frontend when requested (frontend calls this on mount)
RegisterNUICallback('getTranslations', function(data, cb)
    local tbl, locale = GetTranslations(data and data.locale)
    if tbl then
        cb({ translations = tbl, locale = locale })
    else
        cb(nil)
    end
end)

RegisterNUICallback("mri_Qadmin:callback:GetBans", function(_data, cb)
    local bans = lib.callback.await('mri_Qadmin:callback:GetBans')
    cb(bans)
end)

RegisterNUICallback("sendNUI", function(data, cb)
    SetNuiFocus(false, false)
    SendNUIMessage(data)
    cb("ok")
end)

-- Bridge da cor global de destaque entre NUI ↔ servidor.
-- NUI dispara via sendNui('mri_Qadmin:server:SetGlobalAccentColor', { color }).
RegisterNUICallback("mri_Qadmin:server:SetGlobalAccentColor", function(data, cb)
    if type(data) == 'table' and type(data.color) == 'string' then
        TriggerServerEvent('mri_Qadmin:server:SetGlobalAccentColor', data.color)
    end
    cb('ok')
end)

RegisterNetEvent('mri_Qadmin:client:accentColorChanged', function(newColor)
    SendNUIMessage({ action = 'updateAccentColor', accentColor = newColor })
end)

-- Bridge da cor global de fundo entre NUI ↔ servidor.
RegisterNUICallback("mri_Qadmin:server:SetGlobalBackgroundColor", function(data, cb)
    if type(data) == 'table' and type(data.color) == 'string' then
        TriggerServerEvent('mri_Qadmin:server:SetGlobalBackgroundColor', data.color)
    end
    cb('ok')
end)

RegisterNetEvent('mri_Qadmin:client:backgroundColorChanged', function(newColor)
    SendNUIMessage({ action = 'updateBackgroundColor', backgroundColor = newColor or '' })
end)

RegisterNUICallback("setClipboard", function(data, cb)
    lib.setClipboard(data.value)
    cb("ok")
end)

-- Event Handlers
AddEventHandler("QBCore:Client:OnPlayerLoaded", function()
	setupMenu()
end)

RegisterNetEvent("mri_Qadmin:server:Reload", function()
	setupMenu()
end)

AddEventHandler("onResourceStart", function(resourceName)
	if (GetCurrentResourceName() == resourceName) then
		setupMenu()
	end
end)

-- NUICallbacks
RegisterNUICallback("hideUI", function(_, cb)
	ToggleUI(false)
	cb({ status = "ok" })
end)

RegisterNUICallback("getData", function(_, cb)
    cb(GetCoreData())
end)

local actionCooldowns = {}

-- SECURITY: clickButton só dispara eventos que passem por estas regras de
-- whitelist. Defesa em profundidade — o servidor já checa perm em cada
-- handler, mas evitamos que a NUI (potencialmente comprometida) chame
-- TriggerServerEvent para qualquer namespace.
local ALLOWED_EVENT_PREFIXES = { 'mri_Qadmin:', 'mri_wall:', 'hospital:client:Revive', 'qbx_medical:client:revive', 'QBCore:Client:Revive' }
local ALLOWED_ACTION_TYPES = { client = true, server = true, command = true }
local ALLOWED_COMMAND_NAMES = {
    -- comandos client conhecidos que o painel pode disparar
    adm = true, nc = true, vector2 = true, vec2 = true,
    vector3 = true, vec3 = true, vector4 = true, vec4 = true,
    heading = true, setammo = true,
}

local function eventIsAllowed(ev)
    if type(ev) ~= 'string' or ev == '' then return false end
    for _, prefix in ipairs(ALLOWED_EVENT_PREFIXES) do
        if ev:sub(1, #prefix) == prefix then return true end
    end
    return false
end

local function commandIsAllowed(cmd)
    if type(cmd) ~= 'string' or cmd == '' then return false end
    -- Extrai apenas o nome do comando (primeira palavra)
    local name = cmd:match('^(%S+)')
    return name and ALLOWED_COMMAND_NAMES[name] or false
end

RegisterNUICallback("clickButton", function(nuiData, cb)
    local selectedData = nuiData.selectedData
	local action = nuiData.data
    local actionKey = type(action) == "string" and action or (action and action.event or "unknown")

    -- Cooldown check
    local now = GetGameTimer()
    if actionCooldowns[actionKey] and (now - actionCooldowns[actionKey] < 500) then
        Debug(("Ignorando clique duplicado para: %s"):format(actionKey))
        cb("ok")
        return
    end
    actionCooldowns[actionKey] = now

    Debug("Button clicked:", json.encode(nuiData))

    -- Sempre preferir resolução por chave em Config.* (fonte de verdade do
    -- servidor). Só cair de volta no payload da NUI se ele for self-contained
    -- E passar pelo whitelist.
    local actionData
    if type(action) == "string" then
        actionData = CheckDataFromKey(action)
    elseif type(action) == "table" then
        -- Se a NUI mandou um payload table, tenta resolver pela chave conhecida
        -- (action.id ou action.event); se não houver, aceita o payload mas
        -- exige que `event` esteja no whitelist.
        if action.id then actionData = CheckDataFromKey(action.id) end
        if not actionData then actionData = action end
    end

    if not actionData then cb("ok"); return end

    if not ALLOWED_ACTION_TYPES[actionData.type] then
        Debug(("[clickButton] type inválido rejeitado: %s"):format(tostring(actionData.type)))
        cb("ok"); return
    end

    if actionData.type == "command" then
        if not commandIsAllowed(actionData.event) then
            Debug(("[clickButton] command fora do whitelist: %s"):format(tostring(actionData.event)))
            cb("ok"); return
        end
    else
        if not eventIsAllowed(actionData.event) then
            Debug(("[clickButton] event fora do whitelist: %s"):format(tostring(actionData.event)))
            cb("ok"); return
        end
    end

	if not CheckPerms(actionData.perms) then
		cb("ok")
		return
	end

	if actionData.type == "client" then
		TriggerEvent(actionData.event, actionKey, selectedData)
	elseif actionData.type == "server" then
		TriggerServerEvent(actionData.event, actionKey, selectedData)
	elseif actionData.type == "command" then
		ExecuteCommand(actionData.event)
	end

	Log("Action Used: " .. actionKey,
            PlayerData.name ..
            " (" ..
            PlayerData.citizenid ..
            ") - Used: " .. actionKey .. (selectedData and (" with args: " .. json.encode(selectedData)) or ""))
	TriggerEvent('mri_Qadmin:client:PlayHUDSound', 'success')
	cb({ status = "ok" })
end)

RegisterNUICallback("update_vehicle_stock", function(data, cb)
    local success = lib.callback.await("mri_Qadmin:server:UpdateVehicleStock", "update_vehicle_stock", data.selectedData)
    cb({ status = success and "ok" or "error" })
end)

-- Open UI Event
RegisterNetEvent('mri_Qadmin:client:OpenUI', function()
    print('^3[mri_Qadmin] Tentativa de abrir painel iniciada...^7')

    local hasPerm = CheckPerms("qadmin.open")
    print('^3[mri_Qadmin] Check qadmin.open: ' .. tostring(hasPerm) .. '^7')

    if not hasPerm then
        print('^1[mri_Qadmin] Acesso negado pela verificação de qadmin.open!^7')
        return
    end

    local tbl, locale = GetTranslations()
    if tbl then
        print('^2[mri_Qadmin] Traduções carregadas: ' .. locale .. '^7')
        SendNUIMessage({ action = 'setTranslations', data = { translations = tbl, locale = locale } })
    else
        print('^1[mri_Qadmin] AVISO: Falha ao carregar traduções, procedendo sem elas.^7')
    end

    print('^2[mri_Qadmin] Chamando ToggleUI(true)...^7')
    ToggleUI(true)

    -- resend translations shortly after opening UI
    if tbl then
        CreateThread(function()
            Wait(150)
            SendNUIMessage({ action = 'setTranslations', data = { translations = tbl, locale = locale } })
        end)
    end
end)

-- Close UI Event
RegisterNetEvent('mri_Qadmin:client:CloseUI', function()
	ToggleUI(false)
end)

-- Change resource state
RegisterNUICallback("setResourceState", function(data, cb)
	local resources = lib.callback.await('mri_Qadmin:callback:ChangeResourceState', false, data)
	cb(resources)
end)

-- Get players
RegisterNUICallback("getPlayers", function(data, cb)
	local players = lib.callback.await('mri_Qadmin:callback:GetPlayers', false, data.page, data.limit, data.search)
	cb(players)
end)

-- Get Groups
RegisterNUICallback("getGroupsData", function(_, cb)
    local groups = lib.callback.await('mri_Qadmin:callback:GetGroupsData')
    cb(groups or {})
end)

-- Get Player Coords
RegisterNUICallback("GetPlayerCoords", function(data, cb)
    local coords = lib.callback.await('mri_Qadmin:callback:GetPlayerCoords', false, data.targetIds)
    cb(coords)
end)

RegisterNUICallback("GetAllPlayerCoords", function(_, cb)
    local coords = lib.callback.await('mri_Qadmin:callback:GetAllPlayerCoords')
    cb(coords)
end)


RegisterNUICallback("GetPlayerVitals", function(data, cb)
    local res = lib.callback.await('mri_Qadmin:callback:GetPlayerVitals', false, data.targetId)
    cb(res)
end)

RegisterNUICallback("SetPlayerVital", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:SetVital', data.targetId, data.vital, data.value)
    cb({ status = "ok" })
end)

-- ── Cloudflare Realtime SFU ──────────────────────────────────────────────────

RegisterNUICallback("getSelfId", function(_, cb)
    cb(GetPlayerServerId(PlayerId()))
end)

-- ExecuteCommand
RegisterNetEvent('mri_Qadmin:client:ExecuteCommand', function(data)
	ExecuteCommand(data)
end)

RegisterNetEvent('mri_Qadmin:client:SetHealth', function(health)
    local ped = PlayerPedId()
    SetEntityHealth(ped, tonumber(health))
end)

RegisterNUICallback("executeCommand", function(data, cb)
	local command = data.command
	local args = data.args
	ExecuteCommand(command, args)
	cb({ status = "ok", command = command })
end)

RegisterNetEvent('mri_Qadmin:client:RefreshBans', function()
    SendNUIMessage({ action = 'refreshBans' })
end)

RegisterNetEvent('mri_Qadmin:client:RefreshPlayers', function()
    SendNUIMessage({ action = 'refreshPlayers' })
end)

RegisterNetEvent('mri_Qadmin:client:UpdateResourceState', function(data)
    SendNUIMessage({ action = 'updateResourceState', data = data })
end)

RegisterNetEvent('mri_Qadmin:client:ForceReloadPermissions', function(permDefs, catDefs)
    local perms = lib.callback.await('mri_Qadmin:callback:GetMyPermissions')
    isAdminPlayer = perms and #perms > 0 or false
    SendNUIMessage({
        action = "updatePermissions",
        data = perms or {}
    })
    SendNUIMessage({
        action = "refreshPermissionsLists"
    })

    -- Fresh definitions from BroadcastPermissionUpdate (plugin registered after initial load)
    if permDefs then
        SetDataCache({ permissionDefinitions = permDefs, categoryDefinitions = catDefs or {} })
        SendNUIMessage({
            action = "setupUI",
            data = { permissionDefinitions = permDefs, categoryDefinitions = catDefs or {} }
        })
    end

    if isAdminPlayer and not HasInitialData() then
        TriggerServerEvent('mri_Qadmin:server:GetInitialData')
    end
end)

RegisterNetEvent('mri_Qadmin:client:UpdateSettings', function(newSettings)
    if type(newSettings) == 'table' then
        for k, v in pairs(newSettings) do
            Config[k] = v
        end
        Debug('[mri_Qadmin] Client Config updated dynamically from server')

        SendNUIMessage({
            action = "updateSettings",
            data = newSettings
        })
    end
end)

RegisterNetEvent('mri_Qadmin:client:UpdateActions', function(newActions)
    if type(newActions) == 'table' then
        Config.Actions = newActions.Actions or Config.Actions
        Config.PlayerActions = newActions.PlayerActions or Config.PlayerActions
        Config.OtherActions = newActions.OtherActions or Config.OtherActions

        Debug('[mri_Qadmin] Client Actions updated dynamically from server')

        SendNUIMessage({
            action = "updateActions",
            data = newActions
        })
    end
end)

RegisterNetEvent('mri_Qadmin:client:UpdatePlayerVitals', function(data)
    Debug("Recebido UpdatePlayerVitals para ID: " .. tostring(data.id))
    SendNUIMessage({
        action = 'UpdatePlayerVitals',
        data = data
    })
end)

RegisterNetEvent('mri_Qadmin:client:UpdatePlayerMoney', function(data)
    Debug("Recebido UpdatePlayerMoney para ID: " .. tostring(data.id))
    SendNUIMessage({
        action = 'UpdatePlayerMoney',
        data = data
    })
end)

RegisterNetEvent('hud:client:UpdateNeeds', function(newHunger, newThirst)
    if not isAdminPlayer then return end
    TriggerServerEvent('mri_Qadmin:server:SyncVitals', { hunger = newHunger, thirst = newThirst })
end)

RegisterNetEvent('hud:client:UpdateStress', function(newStress)
    if not isAdminPlayer then return end
    TriggerServerEvent('mri_Qadmin:server:SyncVitals', { stress = newStress })
end)

RegisterNetEvent("ars_ambulancejob:updateDeathStatus", function(death)
    if not isAdminPlayer then return end
    TriggerServerEvent('mri_Qadmin:server:SyncDeathStatus', death.isDead)
end)

RegisterNUICallback("getData", function(_, cb)
    local results = GetCoreData()
    cb(results)
end)

-- Permissions Callbacks Matcher
RegisterNUICallback("mri_Qadmin:callback:GetMyPermissions", function(_, cb)
    local perms = lib.callback.await('mri_Qadmin:callback:GetMyPermissions')
    cb(perms or {})
end)

RegisterNUICallback("mri_Qadmin:callback:GetPrincipals", function(_, cb)
    local principals = lib.callback.await('mri_Qadmin:callback:GetPrincipals')
    cb(principals or {})
end)

RegisterNUICallback("mri_Qadmin:callback:GetAces", function(_, cb)
    local aces = lib.callback.await('mri_Qadmin:callback:GetAces')
    cb(aces or {})
end)

RegisterNUICallback("seed_pages", function(_, cb)
    TriggerServerEvent('mri_Qadmin:server:SeedAces')
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:callback:GetGroups", function(_, cb)
    local groups = lib.callback.await('mri_Qadmin:callback:GetGroups')
    cb(groups or {})
end)

RegisterNUICallback("mri_Qadmin:server:SaveGroup", function(data, cb)
    local success, errorMsg = lib.callback.await('mri_Qadmin:server:SaveGroup', false, data.id, data.label, data.description)
    cb({ status = success and "ok" or "error", message = errorMsg })
end)

RegisterNUICallback("mri_Qadmin:server:DeleteGroup", function(data, cb)
    local success, errorMsg = lib.callback.await('mri_Qadmin:server:DeleteGroup', false, data.id)
    cb({ status = success and "ok" or "error", message = errorMsg })
end)

RegisterNUICallback("mri_Qadmin:server:UpdateGroupPermissions", function(data, cb)
    local success, errorMsg = lib.callback.await('mri_Qadmin:server:UpdateGroupPermissions', false, data.id, data.permissions, data.linkedPrincipals or {})
    cb({ status = success and "ok" or "error", message = errorMsg })
end)

RegisterNUICallback("mri_Qadmin:callback:GetCharacterGroups", function(data, cb)
    local groups = lib.callback.await('mri_Qadmin:callback:GetCharacterGroups', false, data.citizenid)
    cb(groups or {})
end)

RegisterNUICallback("mri_Qadmin:server:UpdateCharacterGroups", function(data, cb)
    local success, errorMsg = lib.callback.await('mri_Qadmin:server:UpdateCharacterGroups', false, data.citizenid, data.groups)
    cb({ status = success and "ok" or "error", message = errorMsg })
end)

RegisterNUICallback("mri_Qadmin:server:SetVital", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:SetVital', data.targetId, data.vital, data.value)
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:server:GiveVehicle", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:GiveVehicle', data)
    cb('ok')
end)

RegisterNUICallback("getSettings", function(_, cb)
    local settings = lib.callback.await('mri_Qadmin:callback:GetSettings')
    cb(settings or {})
end)

RegisterNUICallback("updateSetting", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:UpdateSetting', data.key, data.value)
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:server:SaveAction", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:SaveAction', data.id, data.category, data.data)
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:server:DeleteAction", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:DeleteAction', data.id, data.category)
    cb('ok')
end)

-- Dashboard self-action callbacks
RegisterNUICallback("mri_Qadmin:server:ReviveSelf", function(_, cb)
    if not CheckPerms('qadmin.action.revive_self') then cb('denied'); return end
    TriggerServerEvent('mri_Qadmin:server:ReviveSelf')
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:server:ClearChat", function(_, cb)
    if not CheckPerms('qadmin.action.clear_chat') then cb('denied'); return end
    TriggerServerEvent('mri_Qadmin:server:ClearChat')
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:server:GotoWaypoint", function(_, cb)
    if not CheckPerms('qadmin.action.goto_waypoint') then cb('denied'); return end
    local wp = GetFirstBlipInfoId(8)
    if DoesBlipExist(wp) then
        local coords = GetBlipCoords(wp)
        local z = coords.z
        local found, groundZ = GetGroundZFor_3dCoord(coords.x, coords.y, coords.z, true)
        if found then z = groundZ end
        SetEntityCoords(cache.ped, coords.x, coords.y, z + 0.5, false, false, false, false)
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'players', 'info', ('Teleporte: admin foi para waypoint (%.1f, %.1f)'):format(coords.x, coords.y), {})
    else
        QBCore.Functions.Notify(locale('notifications.no_waypoint') or 'Nenhum waypoint definido.', 'error')
    end
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:server:FixVehicle", function(_, cb)
    if not CheckPerms('qadmin.action.fix_self_vehicle') then cb('denied'); return end
    local veh = GetVehiclePedIsIn(cache.ped, false)
    if veh ~= 0 then
        SetVehicleFixed(veh)
        SetVehicleDeformationFixed(veh)
        SetVehicleEngineHealth(veh, 1000.0)
        SetVehicleBodyHealth(veh, 1000.0)
        SetVehiclePetrolTankHealth(veh, 1000.0)
        TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'vehicles', 'info', 'Veículo: admin reparou o próprio veículo', {})
    else
        QBCore.Functions.Notify(locale('notifications.not_in_vehicle') or 'Você não está em um veículo.', 'error')
    end
    cb('ok')
end)

-- Vehicle Type Sync Thread
CreateThread(function()
    local lastVeh = 0
    local lastType = nil

    while true do
        local ped = PlayerPedId()
        local veh = GetVehiclePedIsIn(ped, false)

        if veh ~= 0 then
            if veh ~= lastVeh then
                local vt = GetVehicleType(veh)
                local vClass = GetVehicleClass(veh)
                local currentType = 'car'

                if vt == 'heli' then currentType = 'heli'
                elseif vt == 'plane' then currentType = 'plane'
                elseif vt == 'boat' then currentType = 'boat'
                elseif vt == 'bike' then
                    if vClass == 13 then currentType = 'bike' -- Bicycle
                    else currentType = 'motorcycle' end -- Motorcycle
                end

                if currentType ~= lastType then
                    Entity(ped).state:set('vehicleType', currentType, true)
                    lastType = currentType
                end
                lastVeh = veh
            end
            Wait(2000)
        else
            if lastVeh ~= 0 then
                Entity(ped).state:set('vehicleType', nil, true)
                lastVeh = 0
                lastType = nil
            end
            Wait(5000)
        end
    end
end)
