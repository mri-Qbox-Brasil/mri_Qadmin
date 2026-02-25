local function noPerms(source)
    QBCore.Functions.Notify(source, locale('no_perms') or "Permissões insuficientes.", 'error')
end

--- @param perms string | table
function CheckPerms(source, perms)
    local function checkNode(node)
        -- Primary check against the source directly
        if IsPlayerAceAllowed(source, node) then return true end

        -- Fallback: Check explicitly against identifiers (solves native FiveM cache lag after adding principal via console)
        local num = GetNumPlayerIdentifiers(source)
        for i = 0, num - 1 do
            local id = GetPlayerIdentifier(source, i)
            if IsPrincipalAceAllowed('identifier.' .. id, node) or IsPrincipalAceAllowed(id, node) then
                return true
            end
        end
        return false
    end

    -- Master Bypass
    if checkNode('qadmin.master') then
        Debug(('[DEBUG] CheckPerms Source: %s | Bypass Master (Allowed)'):format(source))
        return true
    end

    -- Check Native ACEs
    if type(perms) == 'string' then
        local allowed = checkNode(perms)
        Debug(('[DEBUG] Checking String Ace [%s] for %s: %s'):format(perms, source, tostring(allowed)))
        if allowed then return true end
    elseif type(perms) == 'table' then
        for _, p in pairs(perms) do
            local allowed = checkNode(p)
            Debug(('[DEBUG] Checking Table Ace [%s] for %s: %s'):format(p, source, tostring(allowed)))
            if allowed then return true end
        end
    end

    -- Fail
    Debug(('[DEBUG] CheckPerms FAILED for source %s'):format(source))
    noPerms(source)
    return false
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

--- Convert "R, G, B" string to "#RRGGBB" hex
--- @param rgbStr string
--- @return string | nil
function RGBToHex(rgbStr)
    if not rgbStr or type(rgbStr) ~= "string" then return nil end
    local r, g, b = rgbStr:match("(%d+),%s*(%d+),%s*(%d+)")
    if not r or not g or not b then return nil end
    return string.format("#%02x%02x%02x", tonumber(r), tonumber(g), tonumber(b))
end
