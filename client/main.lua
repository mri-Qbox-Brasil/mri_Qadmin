QBCore = exports['qb-core']:GetCoreObject()
PlayerData = {}

-- Functions
local function setupMenu()
	Wait(500)
	PlayerData = QBCore.Functions.GetPlayerData()
	local resources = lib.callback.await('mri_Qadmin:callback:GetResources', false)
	local server = lib.callback.await('mri_Qadmin:callback:GetServerInfo', false)
    local permissions = lib.callback.await('mri_Qadmin:callback:GetMyPermissions', false)
	GetData()
	SendNUIMessage({
		action = "setupUI",
		data = {
			actions = Config.Actions,
			resources = resources,
			playerData = PlayerData,
			server = server,
			vehicleImages = Config.VehicleImages,
            permissions = permissions
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
RegisterNUICallback('getTranslations', function(_, cb)
	local locale = GetConvar('ox_locale', 'pt-br')
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

RegisterNUICallback("clickButton", function(data, cb)
    local selectedData = data.selectedData
	local key = data.data

    -- Cooldown check
    local now = GetGameTimer()
    if actionCooldowns[key] and (now - actionCooldowns[key] < 500) then
        Debug(("Ignorando clique duplicado para: %s"):format(key))
        cb("ok")
        return
    end
    actionCooldowns[key] = now

    Debug("Button clicked:", json.encode(data))
	local data = CheckDataFromKey(key)
	if not data or not CheckPerms(data.perms) then
		cb("ok")
		return
	end

	if data.type == "client" then
		TriggerEvent(data.event, key, selectedData)
	elseif data.type == "server" then
		TriggerServerEvent(data.event, key, selectedData)
	elseif data.type == "command" then
		ExecuteCommand(data.event)
	end

	Log("Action Used: " .. key,
            PlayerData.name ..
            " (" ..
            PlayerData.citizenid ..
            ") - Used: " .. key .. (selectedData and (" with args: " .. json.encode(selectedData)) or ""))
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
    TriggerServerEvent('mri_Qadmin:server:SeedPageAces')
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
