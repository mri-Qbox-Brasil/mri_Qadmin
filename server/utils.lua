local function noPerms(source)
    QBCore.Functions.Notify(source, locale('no_perms') or "Permissões insuficientes.", 'error')
end

--- @param perms string | table
function CheckPerms(source, perms)
    local isMaster = IsPlayerAceAllowed(source, 'qadmin.master')
    Debug(('[DEBUG] CheckPerms Source: %s | Master: %s'):format(source, tostring(isMaster)))

    -- Master Bypass
    if isMaster then return true end

    -- Check Native ACEs (Granular)
    if type(perms) == 'string' then
        local allowed = IsPlayerAceAllowed(source, perms)
        Debug(('[DEBUG] Checking String Ace [%s]: %s'):format(perms, tostring(allowed)))
        if allowed then return true end
    elseif type(perms) == 'table' then
        for _, p in pairs(perms) do
            local allowed = IsPlayerAceAllowed(source, p)
            -- print(('[DEBUG] Checking Table Ace [%s]: %s'):format(p, tostring(allowed)))
            if allowed then return true end
        end
    end

    -- Fail
    Debug('[DEBUG] CheckPerms FAILED')
    return noPerms(source)
end

--- Check if a player (any identifier) belongs to a specific principal (group)
--- @param source number The player source ID
--- @param principal string The principal to check (e.g., 'group.admin')
--- @return boolean
function IsPlayerInPrincipal(source, principal)
    local num = GetNumPlayerIdentifiers(source)
    for i = 0, num - 1 do
        local id = GetPlayerIdentifier(source, i)
        -- Check direct identifier mapping or identifier.id mapping
        if IsPrincipalAceAllowed(id, principal) or IsPrincipalAceAllowed('identifier.' .. id, principal) then
            return true
        end
    end
    return false
end

--- Extract value from selectedData safely (handles both {value = x} and x)
function GetValue(data, key)
    if not data or not key or not data[key] then return nil end
    if type(data[key]) == "table" then
        return data[key].value
    end
    return data[key]
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

---@param plate string
---@return boolean
function CheckAlreadyPlate(plate)
    local vPlate = QBCore.Shared.Trim(plate)
    local result = MySQL.single.await("SELECT plate FROM player_vehicles WHERE plate = ?", { vPlate })
    if result and result.plate then return true end
    return false
end

lib.callback.register('mri_Qadmin:callback:CheckPerms', function(source, perms)
    return CheckPerms(source, perms)
end)

lib.callback.register('mri_Qadmin:callback:CheckAlreadyPlate', function(_, vPlate)
    return CheckAlreadyPlate(vPlate)
end)

--- @param source number
--- @param target number
function CheckRoutingbucket(source, target)
    local sourceBucket = GetPlayerRoutingBucket(source)
    local targetBucket = GetPlayerRoutingBucket(target)

    if sourceBucket == targetBucket then return end

    SetPlayerRoutingBucket(source, targetBucket)
    QBCore.Functions.Notify(source, locale("bucket_set", targetBucket), 'error', 7500)
end
