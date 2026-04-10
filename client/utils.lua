-- luacheck: globals MenuVisible
MenuVisible = false


--- @param bool boolean
function ToggleUI(bool)
    MenuVisible = bool
	SetNuiFocus(bool, bool)
	SendNUIMessage({
		action = "setVisible",
		data = bool
	})
end

function IsMenuVisible()
    return MenuVisible
end

function OpenUI()
    ToggleUI(true)
end


--- @param perms table
function CheckPerms(perms)
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
	TriggerServerEvent("qb-log:server:CreateLog", "mri_Qadmin", title, "red", message)
    Debug("[mri_Qadmin LOG] " .. title .. ": " .. message)
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
