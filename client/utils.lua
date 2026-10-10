-- luacheck: globals MenuVisible PanelMode
MenuVisible = false
-- 'full' is the tablet; 'dock' is the narrow side panel you can walk with.
PanelMode = GetResourceKvpString('panel_mode') == 'dock' and 'dock' or 'full'

local dockCursor = true
local dockTyping = false
local dockGuard = false

-- Mouse and attack still reach the game under keep-input: the camera would spin with the cursor.
local DOCK_BLOCKED_CONTROLS = { 1, 2, 24, 25, 37, 68, 69, 70, 91, 92, 106, 140, 141, 142, 257, 263, 264, 199, 200, 14, 15, 16, 17 }

local function startDockGuard()
	if dockGuard then return end
	dockGuard = true
	CreateThread(function()
		while MenuVisible and PanelMode == 'dock' do
			if dockCursor and not dockTyping then
				for i = 1, #DOCK_BLOCKED_CONTROLS do
					DisableControlAction(0, DOCK_BLOCKED_CONTROLS[i], true)
				end
				DisablePlayerFiring(cache.playerId, true)
			end
			Wait(0)
		end
		dockGuard = false
	end)
end

local function applyFocus()
	if not MenuVisible then
		SetNuiFocus(false, false)
		SetNuiFocusKeepInput(false)
		return
	end
	if PanelMode == 'dock' then
		SetNuiFocus(dockCursor, dockCursor)
		SetNuiFocusKeepInput(dockCursor and not dockTyping)
		startDockGuard()
	else
		SetNuiFocus(true, true)
		SetNuiFocusKeepInput(false)
	end
	SendNUIMessage({ action = 'dockCursor', data = dockCursor })
end

--- @param bool boolean
function ToggleUI(bool)
    MenuVisible = bool
	dockCursor = true
	dockTyping = false
	applyFocus()
	SendNUIMessage({
		action = "setVisible",
		data = bool
	})
end

--- Dock only: frees the mouse for the game while the panel stays on screen.
function ToggleDockCursor()
	if not MenuVisible or PanelMode ~= 'dock' then return false end
	dockCursor = not dockCursor
	applyFocus()
	return true
end

RegisterNUICallback('getPanelMode', function(_, cb)
	cb(PanelMode)
end)

RegisterNUICallback('setPanelMode', function(data, cb)
	PanelMode = (type(data) == 'table' and data.mode == 'dock') and 'dock' or 'full'
	SetResourceKvp('panel_mode', PanelMode)
	dockCursor = true
	dockTyping = false
	applyFocus()
	cb(PanelMode)
end)

-- Typing in the dock must not walk the ped.
RegisterNUICallback('setTyping', function(data, cb)
	dockTyping = type(data) == 'table' and data.typing == true
	if MenuVisible and PanelMode == 'dock' then applyFocus() end
	cb('ok')
end)

function IsMenuVisible()
    return MenuVisible
end

function OpenUI()
    ToggleUI(true)
end


--- @param perms table
function CheckPerms(perms)
    Debug('debug', 'CheckPerms: ' .. tostring(perms))
	return lib.callback.await('mri_Qadmin:callback:CheckPerms', false, perms)
end

function CheckDataFromKey(key)
	local actions = Config.Actions[key]
	if actions then
		local data = nil

		if actions.event then
			data = actions
		end

		if actions.dropdown then
			for _, v in pairs(actions.dropdown) do
				if v.event then
					local new = v
					new.perms = actions.perms
					data = new
					break
				end
			end
		end

		return data
	end

	local playerActions = Config.PlayerActions[key]
	if playerActions then
		return playerActions
	end

	local otherActions = Config.OtherActions[key]
	if otherActions then
		return otherActions
	end
end

--- @param title string
--- @param message string
function Log(title, message)
    Debug('debug', title .. ": " .. message)
end

--- @param x number
--- @param y number
--- @param z number
--- @return boolean found, number z
function GetGroundSafe(x, y, z)
    -- Try Raycast first (reliable)
    local rayCast = StartShapeTestRay(x, y, z + 5.0, x, y, z - 500.0, 4294967295, cache.ped, 0)
    local retval, hit, endCoords

    for _ = 1, 50 do
        retval, hit, endCoords = GetShapeTestResult(rayCast)
        if retval ~= 1 then break end
        Wait(0)
    end

    if hit == 1 then
        return true, endCoords.z
    end

    -- Fallback to native (with pcall safety)
    local success, resFound, resZ = pcall(function()
        return GetGroundZFor_3dCoord(x + 0.0, y + 0.0, z + 0.0, false)
    end)

    if success then
        return resFound, resZ
    end

    return false, z
end
