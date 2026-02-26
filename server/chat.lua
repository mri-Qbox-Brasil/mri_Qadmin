local messages = {}

local function notifyPlayers()
    local players = QBCore.Functions.GetPlayers()

    for i = 1, #players, 1 do
        local player = players[i]
        if QBCore.Functions.IsOptin(player) then
            QBCore.Functions.Notify(player, locale("new_staffchat", "inform", 7500))
        end
    end
end

RegisterNetEvent("onResourceStart", function(resourceName)
    if GetCurrentResourceName() == resourceName then
        messages = MySQL.query.await("SELECT * FROM mri_qadmin_chat", {}) or {}
    end
end)

RegisterNetEvent("mri_Qadmin:server:sendMessage", function(message, citizenid, fullname)
    local src = source
    -- Allow if admin OR has specific staffchat permission
    if not IsPlayerAceAllowed(src, 'qadmin.page.staffchat') then
        return QBCore.Functions.Notify(src, "Sem permissão para usar o chat.", "error")
    end

    local player = QBCore.Functions.GetPlayer(src)
    if player then
        -- Gather all identifiers for this player
        local identifiers = {}
        local num = GetNumPlayerIdentifiers(src)
        for i = 0, num-1 do
            table.insert(identifiers, GetPlayerIdentifier(src, i))
        end
        -- Also add standard QBCore license if not present
        if player.PlayerData.license then
            table.insert(identifiers, player.PlayerData.license)
            table.insert(identifiers, 'license:' .. player.PlayerData.license)
        end

        local placeholders = string.rep('?,', #identifiers):sub(1, -2)

        -- Query to find description from ANY of the player's identifiers
        local query = ('SELECT a.description FROM mri_qadmin_principals p JOIN mri_qadmin_aces a ON a.principal = p.parent WHERE p.child IN (%s) AND a.description IS NOT NULL AND a.description != "" LIMIT 1'):format(placeholders)

        local rows = MySQL.query.await(query, identifiers)

        if rows and #rows > 0 then
             fullname = ('%s (%s)'):format(fullname, rows[1].description)
        else
             -- Fallback: Permissions fallback
             -- Fetch all Ace definitions that have a description
             local aces = MySQL.query.await('SELECT principal, object, description FROM mri_qadmin_aces WHERE description IS NOT NULL AND description != ""')

             local candidates = {}

             for _, ace in ipairs(aces) do
                 -- Check if the player has the SPECIFIC permission object granted to this group
                 -- e.g. If group.admin has 'qadmin.page.dashboard', and player has it, they match.
                 if IsPlayerAceAllowed(src, ace.object) then
                     table.insert(candidates, { principal = ace.principal, description = ace.description })
                 end
             end

             if #candidates > 0 then
                 -- Priority sorting: god > admin > mod > others
                 local function getPriority(principal)
                     if principal:find('god') then return 100 end
                     if principal:find('admin') then return 90 end
                     if principal:find('mod') then return 80 end
                     if principal:find('support') then return 70 end
                     if principal:find('apprentice') then return 60 end
                     return 0
                 end

                 table.sort(candidates, function(a,b) return getPriority(a.principal) > getPriority(b.principal) end)

                 -- Use top one
                 local best = candidates[1]
                 Debug(('[mri_Qadmin] Chat Fallback: Matched %s via object check. Desc: %s'):format(best.principal, best.description))
                 fullname = ('%s (%s)'):format(fullname, best.description)
             end
        end
    end

    local createdAt = os.time() * 1000

    notifyPlayers()

    messages[#messages + 1] = { message = message, citizenid = citizenid, fullname = fullname, createdAt = createdAt }

    MySQL.insert.await("INSERT INTO mri_qadmin_chat (message, citizenid, fullname) VALUES (?, ?, ?)", {
        message,
        citizenid,
        fullname
    })
end)

lib.callback.register("mri_Qadmin:callback:GetMessages", function(source)
    if not IsPlayerAceAllowed(source, 'qadmin.page.staffchat') then return {} end
    return messages
end)
