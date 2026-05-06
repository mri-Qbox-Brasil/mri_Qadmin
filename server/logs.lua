-- ─────────────────────────────────────────────────────────────────────────────
-- mri_Qadmin — Admin Logs System
-- ─────────────────────────────────────────────────────────────────────────────

local QUEUE_FILE    = 'server/logs_queue.json'
local SETTINGS_FILE = 'server/logs_settings.json'
local MAX_EMBEDS    = 10
local MAX_CHARS     = 5800
local MAX_BUFFER    = 500

local logQueues = {}
local logBuffer = {}

-- ─── Settings persistence ─────────────────────────────────────────────────────

local function LoadLogSettings()
    local ok, raw = pcall(LoadResourceFile, GetCurrentResourceName(), SETTINGS_FILE)
    if not ok or not raw then
        SaveLogSettings()
        return
    end
    local data = json.decode(raw)
    if not data then return end
    if data.Webhooks        then Config.Logs.Webhooks        = data.Webhooks        end
    if data.Categories      then Config.Logs.Categories      = data.Categories      end
    if data.ForwardEvent    then Config.Logs.ForwardEvent    = data.ForwardEvent    end
    if data.DBEnabled ~= nil then Config.Logs.DBEnabled      = data.DBEnabled       end
    if data.MaxMemory       then Config.Logs.MaxMemory       = data.MaxMemory       end
    if data.ResourceEntries then Config.Logs.ResourceEntries = data.ResourceEntries end
    if data.ResourceMode    then Config.Logs.ResourceMode    = data.ResourceMode    end
end

local function SaveLogSettings()
    SaveResourceFile(GetCurrentResourceName(), SETTINGS_FILE, json.encode({
        Webhooks        = Config.Logs.Webhooks,
        Categories      = Config.Logs.Categories,
        ForwardEvent    = Config.Logs.ForwardEvent,
        DBEnabled       = Config.Logs.DBEnabled,
        MaxMemory       = Config.Logs.MaxMemory,
        ResourceEntries = Config.Logs.ResourceEntries,
        ResourceMode    = Config.Logs.ResourceMode,
    }, { indent = true }), -1)
end

LoadLogSettings()

-- ─── Helpers ─────────────────────────────────────────────────────────────────

local function GetAdminData(src)
    if not src or src <= 0 then
        return { name = 'System', citizenid = nil, src = 0 }
    end
    local ok, Player = pcall(function() return QBCore.Functions.GetPlayer(src) end)
    if ok and Player and Player.PlayerData.charinfo then
        local c = Player.PlayerData.charinfo
        local name = ('%s %s'):format(c.firstname or '', c.lastname or ''):match('^%s*(.-)%s*$')
        return {
            name      = (name ~= '' and name) or GetPlayerName(src) or ('Player#%d'):format(src),
            citizenid = Player.PlayerData.citizenid,
            src       = src,
        }
    end
    return {
        name      = GetPlayerName(src) or ('Player#%d'):format(src),
        citizenid = nil,
        src       = src,
    }
end

local function GetTargetData(targetSrc)
    if not targetSrc then return {} end
    local tsrc = tonumber(targetSrc)
    if not tsrc or tsrc <= 0 then return {} end
    local ok, p = pcall(function() return QBCore.Functions.GetPlayer(tsrc) end)
    if ok and p and p.PlayerData.charinfo then
        local c = p.PlayerData.charinfo
        local name = ('%s %s'):format(c.firstname or '', c.lastname or ''):match('^%s*(.-)%s*$')
        return {
            target_src       = tsrc,
            target_name      = (name ~= '' and name) or GetPlayerName(tsrc) or ('Player#%d'):format(tsrc),
            target_citizenid = p.PlayerData.citizenid,
        }
    end
    return {
        target_src  = tsrc,
        target_name = GetPlayerName(tsrc) or ('Player#%d'):format(tsrc),
    }
end
_G.GetTargetData = GetTargetData

local LEVEL_COLORS = {
    info    = 3447003,
    success = 5763719,
    warn    = 16776960,
    error   = 15548997,
}

local CATEGORY_EMOJIS = {
    players     = '👤',
    bans        = '🔨',
    inventory   = '🎒',
    vehicles    = '🚗',
    money       = '💰',
    server      = '⚙️',
    permissions = '🛡️',
    chat        = '💬',
    actions     = '⚡',
    system      = '🖥️',
}

local function BuildPriority()
    local p = {}
    local cats = (Config.Logs and Config.Logs.Categories) or {}
    for i, cat in ipairs(cats) do
        p[cat.id] = i
    end
    return p
end

-- ─── Queue persistence ───────────────────────────────────────────────────────

local function SaveQueues()
    local data = {}
    for webhook, q in pairs(logQueues) do
        data[webhook] = q.logs
    end
    SaveResourceFile(GetCurrentResourceName(), QUEUE_FILE, json.encode(data), -1)
end

local function LoadQueues()
    local content = LoadResourceFile(GetCurrentResourceName(), QUEUE_FILE)
    if not content then return {} end
    local ok, data = pcall(json.decode, content)
    if not ok or type(data) ~= 'table' then return {} end
    return data
end

-- ─── Discord queue processor ─────────────────────────────────────────────────

local function GetRetryDelay(errorCount)
    return math.min(5000 * (2 ^ (errorCount - 1)), 300000)
end

local function SendQueue(webhook)
    local q = logQueues[webhook]
    if not q or #q.logs == 0 then
        if q then q.isSending = false; q.errorCount = 0 end
        return
    end

    q.isSending = true

    local priority = BuildPriority()
    table.sort(q.logs, function(a, b)
        return (priority[a.category] or 999) < (priority[b.category] or 999)
    end)

    local payload = { username = 'mri_Qadmin Logs', embeds = {} }
    local totalChars = 0

    while #q.logs > 0 and #payload.embeds < MAX_EMBEDS do
        local log   = q.logs[1]
        local emoji = CATEGORY_EMOJIS[log.category] or '📄'
        local adminInfo = log.admin or 'System'
        if log.admin_citizenid then
            adminInfo = adminInfo .. '\n`' .. log.admin_citizenid .. '`'
        end

        local embed = {
            title  = ('%s [%s] %s'):format(emoji, (log.category or 'system'):upper(), log.message or ''),
            color  = LEVEL_COLORS[log.level] or LEVEL_COLORS.info,
            fields = {
                { name = 'Resource', value = '`' .. (log.resource or 'unknown') .. '`', inline = true },
                { name = 'Level',    value = '`' .. (log.level    or 'info')    .. '`', inline = true },
                { name = 'Admin',    value = adminInfo,                                  inline = true },
            },
            footer    = { text = 'mri_Qadmin • ' .. (log.category or 'system') },
            timestamp = os.date('!%Y-%m-%dT%H:%M:%SZ', log.created_at),
        }

        if log.data then
            if log.data.target_name or log.data.target_citizenid then
                local targetInfo = log.data.target_name or 'Unknown'
                if log.data.target_citizenid then
                    targetInfo = targetInfo .. '\n`' .. log.data.target_citizenid .. '`'
                end
                table.insert(embed.fields, { name = 'Alvo', value = targetInfo, inline = true })
            end

            local dataClean = {}
            for k, v in pairs(log.data) do
                if k ~= 'target_src' and k ~= 'target_name' and k ~= 'target_citizenid' then
                    dataClean[k] = v
                end
            end
            if next(dataClean) ~= nil then
                local encoded = json.encode(dataClean)
                if #encoded <= 900 then
                    table.insert(embed.fields, { name = 'Data', value = '```json\n' .. encoded .. '\n```', inline = false })
                end
            end
        end

        local size = #embed.title
        if totalChars + size > MAX_CHARS then break end

        table.insert(payload.embeds, embed)
        totalChars = totalChars + size
        table.remove(q.logs, 1)
    end

    SaveQueues()

    PerformHttpRequest(webhook, function(statusCode, _, headers)
        if statusCode == 429 then
            local retryAfter = (headers and headers['retry-after']) and
                math.floor(tonumber(headers['retry-after']) * 1000) or 1000
            SetTimeout(retryAfter, function() SendQueue(webhook) end)
        elseif statusCode >= 200 and statusCode < 300 then
            q.errorCount = 0
            SaveQueues()
            SetTimeout(500, function() SendQueue(webhook) end)
        else
            q.errorCount = (q.errorCount or 0) + 1
            SetTimeout(GetRetryDelay(q.errorCount), function() SendQueue(webhook) end)
        end
    end, 'POST', json.encode(payload), { ['Content-Type'] = 'application/json' })
end

local function EnqueueDiscord(log)
    local cfg = Config.Logs
    if not cfg or not cfg.Webhooks then return end
    local webhook = cfg.Webhooks[log.category] or cfg.Webhooks.Fallback
    if not webhook or webhook == '' then return end

    if not logQueues[webhook] then
        logQueues[webhook] = { logs = {}, isSending = false, errorCount = 0 }
    end

    table.insert(logQueues[webhook].logs, log)
    SaveQueues()

    if not logQueues[webhook].isSending then
        SendQueue(webhook)
    end
end

-- ─── Broadcast to admins only ────────────────────────────────────────────────

local function BroadcastLogToAdmins(log)
    local players = GetPlayers()
    for _, playerId in ipairs(players) do
        local pid = tonumber(playerId)
        if pid and IsPlayerAceAllowed(pid, 'qadmin.page.logs') then
            TriggerClientEvent('mri_Qadmin:client:NewLog', pid, log)
        end
    end
end

-- ─── Core function ────────────────────────────────────────────────────────────

function AddLog(src, resource, category, level, message, data)
    local adminData = GetAdminData(src)
    local enrichedData = data or {}

    -- Auto-resolve target info from target_src when name/citizenid are missing
    if enrichedData.target_src and (not enrichedData.target_name or not enrichedData.target_citizenid) then
        local resolved = GetTargetData(enrichedData.target_src)
        if not enrichedData.target_name      then enrichedData.target_name      = resolved.target_name      end
        if not enrichedData.target_citizenid then enrichedData.target_citizenid = resolved.target_citizenid end
    end

    local log = {
        resource        = resource or GetCurrentResourceName(),
        category        = category or 'system',
        level           = level    or 'info',
        message         = message  or '',
        data            = enrichedData,
        admin           = adminData.name,
        admin_src       = adminData.src > 0 and adminData.src or nil,
        admin_citizenid = adminData.citizenid,
        created_at      = os.time(),
    }

    -- In-memory buffer (newest first, always stored regardless of filters)
    table.insert(logBuffer, 1, log)
    if #logBuffer > MAX_BUFFER then table.remove(logBuffer) end

    local cfg = Config.Logs

    -- Resolve per-category settings
    local catCfg = nil
    for _, cat in ipairs((cfg and cfg.Categories) or {}) do
        if cat.id == log.category then catCfg = cat; break end
    end

    -- Resolve per-resource entry
    local resCfg = nil
    for _, re in ipairs((cfg and cfg.ResourceEntries) or {}) do
        if re.name == log.resource then resCfg = re; break end
    end

    -- Disabled category: suppress all destinations
    if catCfg and catCfg.disabled == true then
        BroadcastLogToAdmins(log)
        return
    end

    -- Whitelist mode: resources not listed are fully blocked
    local resMode = (cfg and cfg.ResourceMode) or 'blacklist'
    if resMode == 'whitelist' and resCfg == nil then
        BroadcastLogToAdmins(log)
        return
    end

    -- AND logic: both category and resource entry must allow the destination
    local catDb      = catCfg == nil or catCfg.db ~= false
    local catDiscord = catCfg ~= nil and catCfg.discord == true
    local catRelay   = catCfg ~= nil and catCfg.relay == true

    local resDb      = resCfg == nil or resCfg.db ~= false
    local resDiscord = resCfg == nil or resCfg.discord ~= false
    local resRelay   = resCfg == nil or resCfg.relay ~= false

    local saveDb      = (cfg and cfg.DBEnabled ~= false) and catDb and resDb
    local sendDiscord = catDiscord and resDiscord
    local doRelay     = catRelay and resRelay

    -- DB (non-blocking) → push to panel after insert confirms ID
    if saveDb then
        MySQL.insert(
            'INSERT INTO mri_qadmin_logs (resource, category, level, message, data, admin, admin_src, admin_citizenid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            { log.resource, log.category, log.level, log.message, json.encode(log.data), log.admin, log.admin_src, log.admin_citizenid },
            function(id)
                log.id = id
                BroadcastLogToAdmins(log)
            end
        )
    else
        BroadcastLogToAdmins(log)
    end

    -- Discord queue (only if both category and resource entry allow it)
    if sendDiscord then
        EnqueueDiscord(log)
    end

    -- Forward relay event (only if both category and resource entry allow it)
    local forwardEvent = cfg and cfg.ForwardEvent
    if doRelay and forwardEvent and forwardEvent ~= '' then
        TriggerEvent(forwardEvent, log)
    end
end

_G.AddLog = AddLog

-- ─── External interface ───────────────────────────────────────────────────────

-- Other resources can call: exports['mri_Qadmin']:AddLog(resource, category, level, message, data[, source])
exports('AddLog', function(resource, category, level, message, data, source)
    AddLog(tonumber(source) or 0, resource, category, level, message, data)
end)

-- Other resources can trigger: TriggerEvent('mri_Qadmin:server:AddLog', resource, category, level, message, data[, source])
AddEventHandler('mri_Qadmin:server:AddLog', function(resource, category, level, message, data, source)
    AddLog(tonumber(source) or 0, resource, category, level, message, data)
end)

local function NormalizeLogText(value)
    if value == nil then return nil end
    local text = tostring(value):gsub('^%s+', ''):gsub('%s+$', '')
    if text == '' then return nil end
    return text
end

local function InferLegacyCategory(title, message)
    local haystack = ((title or '') .. ' ' .. (message or '')):lower()

    if haystack:find('ban') then return 'bans' end
    if haystack:find('money') or haystack:find('cash') or haystack:find('bank') then return 'money' end
    if haystack:find('veh') or haystack:find('car') then return 'vehicles' end
    if haystack:find('inv') or haystack:find('item') then return 'inventory' end
    if haystack:find('perm') or haystack:find('group') or haystack:find('role') then return 'permissions' end
    if haystack:find('player') then return 'players' end

    return 'actions'
end

local function ExtractLegacyAction(title, message)
    for _, candidate in ipairs({ title, message }) do
        local text = NormalizeLogText(candidate)
        if text then
            local action = text:match('[Aa]ction%s*[Uu]sed:%s*([%w_%-%.]+)')
            if action then return action end

            action = text:match('[Uu]sed:%s*([%w_%-%.]+)')
            if action then return action end
        end
    end
end

RegisterNetEvent('qb-log:server:CreateLog', function(name, title, color, message, tagEveryone, imageUrl)
    local resource = NormalizeLogText(name) or 'qb-log'
    local cleanTitle = NormalizeLogText(title)
    local cleanMessage = NormalizeLogText(message)
    local level = 'info'
    local category = InferLegacyCategory(cleanTitle, cleanMessage)
    local action = ExtractLegacyAction(cleanTitle, cleanMessage)

    local finalMessage = cleanMessage or cleanTitle or 'Legacy qb-log event'
    if cleanTitle and cleanMessage and cleanTitle ~= cleanMessage then
        finalMessage = ('%s | %s'):format(cleanTitle, cleanMessage)
    end

    AddLog(0, resource, category, level, finalMessage, {
        action = action,
        legacy = {
            title = cleanTitle,
            color = color,
            tagEveryone = tagEveryone,
            imageUrl = imageUrl,
        }
    })
end)

-- ─── Panel callback: fetch logs ───────────────────────────────────────────────

lib.callback.register('mri_Qadmin:callback:GetLogs', function(src, filters)
    if not CheckPerms(src, 'qadmin.page.logs') then
        return { logs = {}, total = 0 }
    end

    local page   = (filters and filters.page)  or 1
    local limit  = (filters and filters.limit) or 100
    local offset = (page - 1) * limit

    local conds, params = {}, {}

    if filters then
        if filters.categories and type(filters.categories) == 'table' and #filters.categories > 0 then
            local ph = {}
            for _, cat in ipairs(filters.categories) do ph[#ph+1] = '?'; params[#params+1] = cat end
            conds[#conds+1] = 'category IN (' .. table.concat(ph, ', ') .. ')'
        end
        if filters.levels and type(filters.levels) == 'table' and #filters.levels > 0 then
            local ph = {}
            for _, lvl in ipairs(filters.levels) do ph[#ph+1] = '?'; params[#params+1] = lvl end
            conds[#conds+1] = 'level IN (' .. table.concat(ph, ', ') .. ')'
        end
        if filters.resource and filters.resource ~= '' then
            conds[#conds+1] = 'resource LIKE ?'
            params[#params+1] = '%' .. filters.resource .. '%'
        end
        if filters.search and filters.search ~= '' then
            conds[#conds+1] = '(message LIKE ? OR admin LIKE ?)'
            params[#params+1] = '%' .. filters.search .. '%'
            params[#params+1] = '%' .. filters.search .. '%'
        end
    end

    local where = #conds > 0 and ('WHERE ' .. table.concat(conds, ' AND ')) or ''

    -- Count (without LIMIT/OFFSET)
    local countParams = {}
    for _, v in ipairs(params) do countParams[#countParams+1] = v end
    local total = MySQL.scalar.await('SELECT COUNT(*) FROM mri_qadmin_logs ' .. where, countParams)

    -- Data
    local dataParams = {}
    for _, v in ipairs(params) do dataParams[#dataParams+1] = v end
    dataParams[#dataParams+1] = limit
    dataParams[#dataParams+1] = offset
    local logs = MySQL.query.await(
        'SELECT * FROM mri_qadmin_logs ' .. where .. ' ORDER BY id DESC LIMIT ? OFFSET ?',
        dataParams
    )

    if logs then
        for _, log in ipairs(logs) do
            if log.data then
                log.data = json.decode(log.data) or {}
            end
        end
    end

    return { logs = logs or {}, total = total or 0 }
end)

-- ─── Startup: restore undelivered queue ──────────────────────────────────────

CreateThread(function()
    local loaded = LoadQueues()
    for webhook, logs in pairs(loaded) do
        if #logs > 0 then
            logQueues[webhook] = { logs = logs, isSending = false, errorCount = 0 }
            SendQueue(webhook)
        end
    end
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        SaveQueues()
        SaveLogSettings()
    end
end)

-- ─── Settings callbacks ───────────────────────────────────────────────────────

lib.callback.register('mri_Qadmin:callback:GetLogSettings', function(source)
    if not CheckPerms(source, 'qadmin.page.logs') then return nil end
    local cats = Config.Logs.Categories or {}
    local result = {}
    for _, cat in ipairs(cats) do
        result[#result + 1] = {
            id       = cat.id,
            label    = cat.label,
            webhook  = (Config.Logs.Webhooks and Config.Logs.Webhooks[cat.id]) or '',
            db       = cat.db ~= false,
            discord  = cat.discord == true,
            relay    = cat.relay == true,
            disabled = cat.disabled == true,
        }
    end
    if #result == 0 then result = json.array end
    local entries = {}
    for _, re in ipairs(Config.Logs.ResourceEntries or {}) do
        entries[#entries + 1] = {
            name    = re.name,
            db      = re.db ~= false,
            discord = re.discord ~= false,
            relay   = re.relay ~= false,
        }
    end
    if #entries == 0 then entries = json.array end
    return {
        categories      = result,
        fallbackWebhook = Config.Logs.Webhooks.Fallback or '',
        dbEnabled       = Config.Logs.DBEnabled ~= false,
        maxMemory       = Config.Logs.MaxMemory or 500,
        forwardEvent    = Config.Logs.ForwardEvent or '',
        resourceEntries = entries,
        resourceMode    = Config.Logs.ResourceMode or 'blacklist',
    }
end)

lib.callback.register('mri_Qadmin:callback:SaveLogSettings', function(source, data)
    if not CheckPerms(source, 'qadmin.logs.settings') then return false end
    if not data then return false end

    local newCats = {}
    for _, cat in ipairs(data.categories or {}) do
        if cat.id and cat.label then
            newCats[#newCats + 1] = {
                id       = cat.id,
                label    = cat.label,
                db       = cat.db ~= false,
                discord  = cat.discord == true,
                relay    = cat.relay == true,
                disabled = cat.disabled == true,
            }
            Config.Logs.Webhooks[cat.id] = (cat.webhook and cat.webhook ~= '') and cat.webhook or nil
        end
    end
    Config.Logs.Categories = newCats

    Config.Logs.Webhooks.Fallback = data.fallbackWebhook or ''
    Config.Logs.ForwardEvent      = data.forwardEvent or ''
    Config.Logs.DBEnabled         = data.dbEnabled ~= false
    if data.maxMemory and data.maxMemory > 0 then
        Config.Logs.MaxMemory = data.maxMemory
    end

    local newEntries = {}
    for _, re in ipairs(data.resourceEntries or {}) do
        if re.name and re.name ~= '' then
            newEntries[#newEntries + 1] = {
                name    = re.name,
                db      = re.db ~= false,
                discord = re.discord ~= false,
                relay   = re.relay ~= false,
            }
        end
    end
    Config.Logs.ResourceEntries = newEntries
    if data.resourceMode == 'whitelist' or data.resourceMode == 'blacklist' then
        Config.Logs.ResourceMode = data.resourceMode
    end

    SaveLogSettings()
    AddLog(source, 'mri_Qadmin', 'system', 'info', 'Configurações de logs atualizadas', {})
    return true
end)
