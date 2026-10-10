local messages = {}
local playerRoles = {} -- citizenid -> role string | false (false = no role, avoids re-querying)

local function notifyPlayers(src)
    local players = QBCore.Functions.GetPlayers()
    for i = 1, #players do
        local p = players[i]
        if p ~= src and HasPerms(p, 'qadmin.page.staffchat') then
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

local MAX_MESSAGE_LEN = 1000

-- KVP, not Config: every primitive Config key is broadcast to all staff, and the URL is a secret.
local WEBHOOK_KVP = 'staffchat_webhook'
local WEBHOOK_PATTERN = '^https://[%w%.]*discord%.com/api/webhooks/%d+/[%w_%-]+$'
local WEBHOOK_PATTERN_LEGACY = '^https://[%w%.]*discordapp%.com/api/webhooks/%d+/[%w_%-]+$'

local function getWebhook()
    return GetResourceKvpString(WEBHOOK_KVP) or ''
end

local function isValidWebhook(url)
    return type(url) == 'string' and (url:match(WEBHOOK_PATTERN) ~= nil or url:match(WEBHOOK_PATTERN_LEGACY) ~= nil)
end

-- Discord refuses webhook names containing these words.
local function safeUsername(name)
    name = tostring(name or ''):gsub('[Dd][Ii][Ss][Cc][Oo][Rr][Dd]', 'D1scord'):gsub('[Cc][Ll][Yy][Dd][Ee]', 'Cl yde')
    if name == '' then name = 'Staff' end
    return name:sub(1, 80)
end

local function discordIdOf(src)
    local id = GetPlayerIdentifierByType(src, 'discord')
    return id and id:gsub('^discord:', '') or nil
end

---@param url string
---@param payload table
---@param cb? fun(ok: boolean, status: integer)
local function postWebhook(url, payload, cb)
    -- allowed_mentions empty: the <@id> renders the linked account without pinging anyone.
    payload.allowed_mentions = { parse = {} }
    PerformHttpRequest(url, function(status)
        if cb then cb(status >= 200 and status < 300, status) end
        if status == 429 then Debug('error', '[staffchat] webhook do Discord limitou o envio (429)') end
    end, 'POST', json.encode(payload), { ['Content-Type'] = 'application/json' })
end

local function relayToDiscord(src, fullname, role, message)
    local url = getWebhook()
    if url == '' then return end
    local discordId = discordIdOf(src)
    local content = discordId and ('<@%s> %s'):format(discordId, message) or message
    postWebhook(url, {
        username = safeUsername(role and ('%s · %s'):format(fullname, role) or fullname),
        content = content:sub(1, 2000),
    })
end
local MAX_MENTIONS = 20
local CHAT_MIN_INTERVAL_MS = 750

RegisterNetEvent("mri_Qadmin:server:sendMessage", function(message, _unused, mentions)
    local src = source
    -- CheckPerms já notifica (localizado, e respeitando QBNotify/InternalNotify).
    -- Antes eram strings PT hardcoded via QBCore.Functions.Notify direto.
    if not CheckPerms(src, 'qadmin.page.staffchat') then return end
    if not CheckPerms(src, 'qadmin.action.staff_chat_send') then return end
    if not RateLimit(src, 'chat_send', CHAT_MIN_INTERVAL_MS) then return end

    -- Sanitizar inputs do client
    if type(message) ~= 'string' or message == '' then return end
    if #message > MAX_MESSAGE_LEN then message = message:sub(1, MAX_MESSAGE_LEN) end

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
    relayToDiscord(src, fullname, role, message)

    -- Build mention set for O(1) lookup. Cap em MAX_MENTIONS para evitar
    -- payloads gigantes que forçariam loop em todos os players.
    local mentionSet = {}
    local mentionCount = 0
    if type(mentions) == 'table' then
        for _, cid in ipairs(mentions) do
            if mentionCount >= MAX_MENTIONS then break end
            if type(cid) == 'string' and #cid > 0 and #cid <= 64 then
                mentionSet[cid] = true
                mentionCount = mentionCount + 1
            end
        end
    end
    local hasMentions = next(mentionSet) ~= nil

    local players = QBCore.Functions.GetPlayers()
    for i = 1, #players do
        local p = players[i]

        if HasPerms(p, 'qadmin.page.staffchat') then
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
    if not HasPerms(source, 'qadmin.page.staffchat') then return {} end
    local staff = {}
    local players = QBCore.Functions.GetPlayers()
    for _, p in ipairs(players) do
        if HasPerms(p, 'qadmin.page.staffchat') then
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

lib.callback.register('mri_Qadmin:callback:GetStaffChatWebhook', function(source)
    if not CheckPerms(source, 'qadmin.action.manage_settings') then return nil end
    return { url = getWebhook() }
end)

---@return { ok: boolean, reason?: string }
lib.callback.register('mri_Qadmin:callback:SaveStaffChatWebhook', function(source, url)
    if not CheckPerms(source, 'qadmin.action.manage_settings') then return { ok = false, reason = 'no_permission' } end
    url = type(url) == 'string' and url:gsub('^%s+', ''):gsub('%s+$', '') or ''
    if url ~= '' and not isValidWebhook(url) then return { ok = false, reason = 'invalid_url' } end
    if url == '' then DeleteResourceKvp(WEBHOOK_KVP) else SetResourceKvp(WEBHOOK_KVP, url) end
    AddLog(source, 'mri_Qadmin', 'chat', 'info', url == '' and '[Staff Chat] webhook do Discord removida' or '[Staff Chat] webhook do Discord configurada', {})
    return { ok = true }
end)

---@return { ok: boolean, status?: integer, reason?: string }
lib.callback.register('mri_Qadmin:callback:TestStaffChatWebhook', function(source)
    if not CheckPerms(source, 'qadmin.action.manage_settings') then return { ok = false, reason = 'no_permission' } end
    local url = getWebhook()
    if url == '' then return { ok = false, reason = 'not_set' } end
    local result = promise.new()
    local player = QBCore.Functions.GetPlayer(source)
    local name = player and (player.PlayerData.charinfo.firstname .. ' ' .. player.PlayerData.charinfo.lastname) or GetPlayerName(source)
    postWebhook(url, { username = safeUsername(name), content = locale('staffchat.webhook.test_message') }, function(ok, status)
        result:resolve({ ok = ok, status = status })
    end)
    return Citizen.Await(result)
end)

lib.callback.register("mri_Qadmin:callback:GetMessages", function(source)
    if not HasPerms(source, 'qadmin.page.staffchat') then return {} end
    return messages
end)

AddEventHandler('mri_Qadmin:db:ready', function()
    messages = MySQL.query.await("SELECT * FROM mri_qadmin_chat", {}) or {}
end)
