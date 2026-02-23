QBCore = exports['qb-core']:GetCoreObject()
PlayerData = {}

-- Functions
local function setupMenu()
	Wait(500)
	PlayerData = QBCore.Functions.GetPlayerData()
	local resources = lib.callback.await('mri_Qadmin:callback:GetResources', false)
	local server = lib.callback.await('mri_Qadmin:callback:GetServerInfo', false)
    local permissions = lib.callback.await('mri_Qadmin:callback:GetMyPermissions', false)
    local actions = lib.callback.await('mri_Qadmin:callback:GetActions', false)

    if actions and type(actions) == 'table' then
        Config.Actions = actions.Actions or Config.Actions
        Config.PlayerActions = actions.PlayerActions or Config.PlayerActions
        Config.OtherActions = actions.OtherActions or Config.OtherActions
    end

	GetData()
	SendNUIMessage({
		action = "setupUI",
		data = {
			actions = Config.Actions,
			playerActions = Config.PlayerActions,
			otherActions = Config.OtherActions,
			resources = resources,
			playerData = PlayerData,
			server = server,
			vehicleImages = Config.VehicleImages,
            permissions = permissions,
            supportedLanguages = Config.SupportedLanguages,
            webrtcUrl = Config.WebRTCUrl,
            signalingProvider = Config.SignalingProvider,
            descriptions = Config.Descriptions,
            settingOptions = Config.Options
		}
	})
end

RegisterNUICallback('getServerInfo', function(_, cb)
    local serverInfo = lib.callback.await('mri_Qadmin:callback:GetServerInfo', false)
    if not serverInfo then
        Debug("Erro: Nenhum dado recebido do servidor.")
        cb({ error = "Erro ao carregar informações do servidor." })
        return
    end
    cb(serverInfo)
end)

-- Provide translations to the frontend when requested (frontend calls this on mount)
RegisterNUICallback('getTranslations', function(data, cb)
	local locale = (data and data.locale) or GetConvar('ox_locale', 'pt-br')
	local path = ('locales/%s.json'):format(locale)
	local raw = LoadResourceFile(GetCurrentResourceName(), path)
	if raw then
		local ok, tbl = pcall(json.decode, raw)
		if ok and tbl then
			cb({ translations = tbl, locale = locale })
			return
		end
	end
	cb(nil)
end)

RegisterNUICallback("mri_Qadmin:callback:GetBans", function(data, cb)
    local bans = lib.callback.await('mri_Qadmin:callback:GetBans', false)
    cb(bans)
end)

RegisterNUICallback("sendNUI", function(data, cb)
    SetNuiFocus(false, false)
    SendNUIMessage(data)
    cb("ok")
end)

-- Event Handlers
AddEventHandler("QBCore:Client:OnPlayerLoaded", function()
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

local actionCooldowns = {}

RegisterNUICallback("clickButton", function(nuiData, cb)
    local selectedData = nuiData.selectedData
	local actionKey = nuiData.data

    -- Cooldown check
    local now = GetGameTimer()
    if actionCooldowns[actionKey] and (now - actionCooldowns[actionKey] < 500) then
        Debug(("Ignorando clique duplicado para: %s"):format(actionKey))
        cb("ok")
        return
    end
    actionCooldowns[actionKey] = now

    Debug("Button clicked:", json.encode(nuiData))
	local actionData = CheckDataFromKey(actionKey)
	if not actionData or not CheckPerms(actionData.perms) then
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
    local success = lib.callback.await("mri_Qadmin:server:UpdateVehicleStock", false, "update_vehicle_stock", data.selectedData)
    cb({ status = success and "ok" or "error" })
end)

-- Open UI Event
RegisterNetEvent('mri_Qadmin:client:OpenUI', function()
	local locale = GetConvar('ox_locale', 'pt-br')
	local path = ('locales/%s.json'):format(locale)
	local raw = LoadResourceFile(GetCurrentResourceName(), path)
	if raw then
		local ok, tbl = pcall(json.decode, raw)
		if ok and tbl then
			SendNUIMessage({ action = 'setTranslations', data = { translations = tbl, locale = locale } })
		end
	end
	ToggleUI(true)
	-- resend translations shortly after opening UI in case the NUI wasn't ready yet
	CreateThread(function()
		Wait(120)
		if raw then
			local ok2, tbl2 = pcall(json.decode, raw)
			if ok2 and tbl2 then
				SendNUIMessage({ action = 'setTranslations', data = { translations = tbl2, locale = locale } })
			end
		end
	end)
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
RegisterNUICallback("getGroupsData", function(data, cb)
	local groups = lib.callback.await('mri_Qadmin:callback:GetGroupsData', false)
	cb(groups)
end)

-- Get Player Coords
RegisterNUICallback("GetPlayerCoords", function(data, cb)
    local coords = lib.callback.await('mri_Qadmin:callback:GetPlayerCoords', false, data.targetIds)
    cb(coords)
end)

RegisterNUICallback("GetAllPlayerCoords", function(data, cb)
    local coords = lib.callback.await('mri_Qadmin:callback:GetAllPlayerCoords', false)
    cb(coords)
end)

RegisterNUICallback("GetPlayerScreen", function(data, cb)
    local res = lib.callback.await('mri_Qadmin:callback:GetPlayerScreen', false, data.targetId)
    cb(res)
end)

RegisterNUICallback("SignalRegister", function(data, cb)
    -- No-op: identity is tracked by server ID, not a registration table
    cb({ status = "ok" })
end)

RegisterNUICallback("Signal", function(data, cb)
    -- Relay signaling message to targetId via server
    TriggerServerEvent('mri_Qadmin:server:Signal', data)
    cb({ status = "ok" })
end)

RegisterNUICallback("StopPlayerScreen", function(data, cb)
    -- Tell the target player to stop streaming
    TriggerServerEvent('mri_Qadmin:server:StopPlayerScreen', data.targetId)
    cb({ status = "ok" })
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
RegisterNUICallback("CFCreateSession", function(_, cb)
    local res = lib.callback.await('mri_Qadmin:callback:CFCreateSession', false)
    cb(res)
end)

RegisterNUICallback("CFPublishTracks", function(data, cb)
    local res = lib.callback.await('mri_Qadmin:callback:CFPublishTracks', false, data)
    cb(res)
end)

RegisterNUICallback("CFSubscribe", function(data, cb)
    local res = lib.callback.await('mri_Qadmin:callback:CFSubscribe', false, data)
    cb(res)
end)

RegisterNUICallback("CFRenegotiate", function(data, cb)
    local res = lib.callback.await('mri_Qadmin:callback:CFRenegotiate', false, data)
    cb(res)
end)

-- P2 announces its CF track to the admin viewer
RegisterNUICallback("CFAnnounceTrack", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:CFAnnounceTrack', data)
    cb({ status = "ok" })
end)

RegisterNUICallback("getSelfId", function(_, cb)
    cb(GetPlayerServerId(PlayerId()))
end)

-- ExecuteCommand
RegisterNetEvent('mri_Qadmin:client:ExecuteCommand', function(data)
	ExecuteCommand(data)
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

RegisterNetEvent('mri_Qadmin:client:ForceReloadPermissions', function()
    local perms = lib.callback.await('mri_Qadmin:callback:GetMyPermissions', false)
    SendNUIMessage({
        action = "updatePermissions",
        data = perms or {}
    })
    SendNUIMessage({
        action = "refreshPermissionsLists"
    })
    -- Optional: Notify usually not needed for silent sync, but if user explicitly asked
    -- TriggerEvent('QBCore:Notify', 'Permissions synchronized', 'primary', 2000)
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

RegisterNetEvent('hud:client:UpdateNeeds', function(newHunger, newThirst)
    Debug("HUD UpdateNeeds:", newHunger, newThirst)
    TriggerServerEvent('mri_Qadmin:server:SyncVitals', { hunger = newHunger, thirst = newThirst })
end)

RegisterNetEvent('hud:client:UpdateStress', function(newStress)
    Debug("HUD UpdateStress:", newStress)
    TriggerServerEvent('mri_Qadmin:server:SyncVitals', { stress = newStress })
end)

RegisterNetEvent("ars_ambulancejob:updateDeathStatus", function(death)
    TriggerServerEvent('mri_Qadmin:server:SyncDeathStatus', death.isDead)
end)

RegisterNUICallback("getData", function(data, cb)
    local results = GetCoreData()
    cb(results)
end)

-- Permissions Callbacks Matcher
RegisterNUICallback("mri_Qadmin:callback:GetMyPermissions", function(data, cb)
    local perms = lib.callback.await('mri_Qadmin:callback:GetMyPermissions', false)
    cb(perms or {})
end)

RegisterNUICallback("mri_Qadmin:callback:GetPrincipals", function(data, cb)
    local principals = lib.callback.await('mri_Qadmin:callback:GetPrincipals', false)
    cb(principals or {})
end)

RegisterNUICallback("mri_Qadmin:callback:GetAces", function(data, cb)
    local aces = lib.callback.await('mri_Qadmin:callback:GetAces', false)
    cb(aces or {})
end)

RegisterNUICallback("seed_pages", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:SeedAces')
    cb('ok')
end)

RegisterNUICallback("toggle_ace", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:ToggleAce', data.id)
    cb('ok')
end)

RegisterNUICallback("add_principal", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:AddPrincipal', data.child, data.parent, data.description)
    cb('ok')
end)

RegisterNUICallback("remove_principal", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:RemovePrincipal', data.id)
    cb('ok')
end)

RegisterNUICallback("add_ace", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:AddAce', data.principal, data.object, data.allow, data.description)
    cb('ok')
end)

RegisterNUICallback("remove_ace", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:RemoveAce', data.id)
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:server:SetVital", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:SetVital', data.targetId, data.vital, data.value)
    cb('ok')
end)

RegisterNUICallback("getSettings", function(data, cb)
    local settings = lib.callback.await('mri_Qadmin:callback:GetSettings', false)
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
