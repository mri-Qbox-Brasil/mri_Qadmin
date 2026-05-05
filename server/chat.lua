local messages = {}
local playerRoles = {} -- citizenid -> role string | false (false = no role, avoids re-querying)

local function notifyPlayers(src)
    local players = QBCore.Functions.GetPlayers()
    for i = 1, #players do
        local p = players[i]
        if p ~= src and IsPlayerAceAllowed(p, 'qadmin.page.staffchat') then
            QBCore.Functions.Notify(p, locale("notifications.new_staffchat"), "inform", 7500)
        end
    end
end

local function getPlayerRole(citizenid)
    if playerRoles[citizenid] ~= nil then
        return playerRoles[citizenid] or nil
    end

    local rows = MySQL.query.await(
        'SELECT g.id, g.label FROM mri_qadmin_character_groups cg JOIN mri_qadmin_groups g ON g.id = cg.group_id WHERE cg.citizenid = ?',
        { citizenid }
    )

    if rows and #rows > 0 then
        if #rows > 1 then
            local function getPriority(id)
                if id:find('god') then return 100 end
                if id:find('admin') then return 90 end
                if id:find('mod') then return 80 end
                if id:find('support') then return 70 end
                if id:find('apprentice') then return 60 end
                return 0
            end
            table.sort(rows, function(a, b) return getPriority(a.id) > getPriority(b.id) end)
        end
        playerRoles[citizenid] = rows[1].label
        return rows[1].label
    end

    playerRoles[citizenid] = false
    return nil
end

AddEventHandler('playerDropped', function()
    local src = source
    local player = QBCore.Functions.GetPlayer(src)
    if player and player.PlayerData.citizenid then
        playerRoles[player.PlayerData.citizenid] = nil
    end
end)

RegisterNetEvent("mri_Qadmin:server:sendMessage", function(message, _unused, mentions)
    local src = source
    if not IsPlayerAceAllowed(src, 'qadmin.page.staffchat') then
        return QBCore.Functions.Notify(src, "Sem permissão para usar o chat.", "error")
    end

    local player = QBCore.Functions.GetPlayer(src)
    if not player then return end

    local citizenid = player.PlayerData.citizenid
    local fullname = player.PlayerData.charinfo.firstname .. " " .. player.PlayerData.charinfo.lastname
    local role = getPlayerRole(citizenid)
    local createdAt = os.time() * 1000

    local newMsg = { message = message, citizenid = citizenid, fullname = fullname, role = role, createdAt = createdAt }
    messages[#messages + 1] = newMsg

    MySQL.insert.await('INSERT INTO mri_qadmin_chat (message, citizenid, fullname, role) VALUES (?, ?, ?, ?)', {
        message, citizenid, fullname, role
    })
    AddLog(src, 'mri_Qadmin', 'chat', 'info', ('[Staff Chat] %s: %s'):format(fullname, message), { citizenid = citizenid, role = role })

    notifyPlayers(src)

    -- Build mention set for O(1) lookup
    local mentionSet = {}
    if type(mentions) == 'table' then
        for _, cid in ipairs(mentions) do mentionSet[cid] = true end
    end
    local hasMentions = next(mentionSet) ~= nil

    local players = QBCore.Functions.GetPlayers()
    for i = 1, #players do
        local p = players[i]

        if IsPlayerAceAllowed(p, 'qadmin.page.staffchat') then
            TriggerClientEvent('mri_Qadmin:client:newMessage', p, newMsg)
        end

        if hasMentions and p ~= src then
            local mp = QBCore.Functions.GetPlayer(p)
            if mp and mentionSet[mp.PlayerData.citizenid] then
                TriggerClientEvent('mri_Qadmin:client:mentioned', p, fullname)
            end
        end
    end
end)

lib.callback.register('mri_Qadmin:callback:GetStaffPlayers', function(source)
    if not IsPlayerAceAllowed(source, 'qadmin.page.staffchat') then return {} end
    local staff = {}
    local players = QBCore.Functions.GetPlayers()
    for _, p in ipairs(players) do
        if IsPlayerAceAllowed(p, 'qadmin.page.staffchat') then
            local player = QBCore.Functions.GetPlayer(p)
            if player then
                local ci = player.PlayerData.charinfo
                staff[#staff + 1] = {
                    citizenid = player.PlayerData.citizenid,
                    name = ci.firstname .. ' ' .. ci.lastname
                }
            end
        end
    end
    return staff
end)

lib.callback.register("mri_Qadmin:callback:GetMessages", function(source)
    if not IsPlayerAceAllowed(source, 'qadmin.page.staffchat') then return {} end
    return messages
end)

RegisterNetEvent('mri_Qadmin:db:ready', function()
    messages = MySQL.query.await("SELECT * FROM mri_qadmin_chat", {}) or {}
end)
