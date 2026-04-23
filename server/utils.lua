local QBCore = exports['qb-core']:GetCoreObject()

local function noPerms(source)
    QBCore.Functions.Notify(source, locale('notifications.no_perms') or "Permissões insuficientes.", 'error')
end

local function formatNodes(perms)
    if type(perms) == 'string' then
        return perms
    elseif type(perms) == 'table' then
        return table.concat(perms, ', ')
    end
    return tostring(perms or "nil")
end

--- @param perms string | table
function HasPerms(source, perms)
    if not perms then return false end

    local function checkNode(node)
        if not node then return false end

        -- Primary check against the source directly
        if IsPlayerAceAllowed(source, node) then return true end

        -- Fallback: Check explicitly against identifiers (solves native FiveM cache lag)
        local num = GetNumPlayerIdentifiers(source)
        for i = 0, num - 1 do
            local id = GetPlayerIdentifier(source, i)
            if IsPrincipalAceAllowed('identifier.' .. id, node) or IsPrincipalAceAllowed(id, node) then
                return true
            end
        end

        -- Extended principals check (Character, Job, Gang)
        local Player = QBCore.Functions.GetPlayer(source)
        if Player then
            local citizenid = Player.PlayerData.citizenid
            local job = Player.PlayerData.job.name
            local jobGrade = Player.PlayerData.job.grade.level or Player.PlayerData.job.grade
            local gang = Player.PlayerData.gang and Player.PlayerData.gang.name
            local gangGrade = Player.PlayerData.gang and (Player.PlayerData.gang.grade.level or Player.PlayerData.gang.grade)

            -- Check Character Principal
            if IsPrincipalAceAllowed('char:' .. citizenid, node) then return true end

            -- Check Job & Grade Principals
            if job and job ~= "unemployed" then
                if IsPrincipalAceAllowed('job.' .. job, node) then return true end
                if IsPrincipalAceAllowed(('job.%s.%s'):format(job, jobGrade), node) then return true end
            end

            -- Check Gang & Grade Principals
            if gang and gang ~= "none" then
                if IsPrincipalAceAllowed('gang.' .. gang, node) then return true end
                if IsPrincipalAceAllowed(('gang.%s.%s'):format(gang, gangGrade), node) then return true end
            end
        end

        return false
    end

    -- Master Bypass
    if checkNode('qadmin.master') then
        return true
    end

    -- NEW: Automatic Open Panel Permission
    -- If you are in ANY group, you can open the panel.
    if perms == "qadmin.open" then
        local Player = QBCore.Functions.GetPlayer(source)
        if Player then
            local citizenid = Player.PlayerData.citizenid
            local exists = MySQL.single.await('SELECT count(*) as count FROM mri_qadmin_character_groups WHERE citizenid = ?', {citizenid})
            if exists and exists.count > 0 then return true end
        end
    end

    -- Check Native ACEs
    if type(perms) == 'string' then
        if checkNode(perms) then return true end

        -- Fallback: if checking 'qadmin.commands', also check 'qadmin.page.commands'
        if not string.find(perms, 'qadmin.page.') then
            local nodeName = perms:gsub('qadmin.', '')
            if checkNode('qadmin.page.' .. nodeName) then return true end
        end
    elseif type(perms) == 'table' then
        for _, p in pairs(perms) do
            if checkNode(p) then return true end
            if type(p) == 'string' and not string.find(p, 'qadmin.page.') then
                local nodeName = p:gsub('qadmin.', '')
                if checkNode('qadmin.page.' .. nodeName) then return true end
            end
        end
    end

    return false
end

--- @param perms string | table
function CheckPerms(source, perms)
    local allowed = HasPerms(source, perms)

    -- Silent some common/noisy logs
    if perms and perms ~= "qadmin.open" then
        local nodeStr = formatNodes(perms) or "nil"
        Debug(('[DEBUG] CheckPerms Source: %s, Nodes: %s | Result: %s'):format(tostring(source), nodeStr, tostring(allowed)))
    end

    if perms == "qadmin.open" and not allowed then
        print('^1--- PERMISSION CRITICAL FAILURE: qadmin.open ---^7')
        print('^3Source:^7', source)
        print('^3Identifiers:^7')
        local ids = GetNumPlayerIdentifiers(source)
        for i = 0, ids - 1 do
            print('  -', GetPlayerIdentifier(source, i))
        end
        local Player = QBCore.Functions.GetPlayer(source)
        if Player then
            print('^3CitizenID:^7', Player.PlayerData.citizenid)
            print('^3QBCore Job:^7', Player.PlayerData.job.name)
            print('^3QBCore Grade:^7', Player.PlayerData.job.grade.level)
        else
            print('^1[!] QBCore Player object NOT FOUND for source ' .. tostring(source) .. '^7')
        end
        print('^3Direct ACE Test (group.admin):^7', IsPrincipalAceAllowed('group.admin', 'qadmin.open'))
        print('^1----------------------------------------------^7')
    end

    if not allowed then
        noPerms(source)
    end

    return allowed
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

function GeneratePlate()
    local plate = string.upper(lib.string.random('AA AA 000')) -- Example format
    if CheckAlreadyPlate(plate) then
        return GeneratePlate()
    end
    return plate
end

lib.callback.register('mri_Qadmin:callback:CheckPerms', function(source, perms)
    print('^3[mri_Qadmin] CheckPerms Source: ' .. tostring(source) .. ', Nodes: ' .. tostring(perms) .. '^7')
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
    QBCore.Functions.Notify(source, locale("notifications.bucket_set", targetBucket), 'error', 7500)
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

--- @param id string
--- @return string | nil
function NormalizeIdentifier(id)
    if not id or id == "" then return nil end
    local str = tostring(id)
    -- Remove duplicated license prefix (e.g., license:license2: -> license2:)
    if string.find(str, "license:license2:") then
        str = string.gsub(str, "license:license2:", "license2:")
    end
    -- Support for license:license: (accidental double prefixing)
    if string.find(str, "license:license:") then
        str = string.gsub(str, "license:license:", "license:")
    end
    -- Remove 'identifier.' prefix if present (we want the "raw" but prefixed identifier for the DB)
    str = string.gsub(str, "identifier%.", "")
    return str
end

--- @param id string
--- @return string | nil
function NormalizePrincipal(id)
    local str = NormalizeIdentifier(id)
    if not str then return nil end

    -- If it's a license, steam, discord, etc (contains : but not group., job., gang. or char:),
    -- and doesn't already have 'identifier.' prefix, add it for FiveM native ACE compatibility.
    if string.find(str, ":") and not string.find(str, "char:") and not string.find(str, "group%.") and not string.find(str, "job%.") and not string.find(str, "gang%.") then
        return "identifier." .. str
    end
    return str
end

--- Retorna uma lista de IDs de jogadores (source) que possuem permissão administrativa
--- @return table
function GetAdminPlayers()
    local admins = {}
    local players = QBCore.Functions.GetPlayers()
    for _, src in ipairs(players) do
        if HasPerms(src, 'qadmin.open') then
            admins[#admins + 1] = src
        end
    end
    return admins
end
