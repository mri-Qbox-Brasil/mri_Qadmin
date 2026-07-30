-- ─────────────────────────────────────────────────────────────────────────────
-- mri_Qadmin — Admin Logs System
-- ─────────────────────────────────────────────────────────────────────────────

local QUEUE_FILE    = 'server/logs_queue.json'
local FM_QUEUE_FILE = 'server/logs_fm_queue.json'
local SETTINGS_FILE = 'server/logs_settings.json'
local MAX_EMBEDS    = 10
local MAX_CHARS     = 5800
local MAX_BUFFER    = 500

-- Fivemanage
local FM_ENDPOINT   = 'https://api.fivemanage.com/api/v3/logs'
local FM_MAX_BATCH  = 50    -- log entries per POST (the API takes an array natively)
local FM_MAX_QUEUE  = 5000  -- backstop: a misconfigured token must not eat all memory
local FM_MAX_PAGE   = 100   -- hard limit of the query API
local FM_SCAN_PAGES = 5     -- páginas varridas quando o Lua filtra categoria + busca
local FM_CAT_PREFIX = 'qadmin_cat:'

local logBuffer   = {}
local fmLastError = nil

-- ─── Settings persistence ─────────────────────────────────────────────────────

local SaveLogSettings

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
    if data.Fivemanage then
        Config.Logs.Fivemanage = Config.Logs.Fivemanage or {}
        local fm = data.Fivemanage
        if fm.Token   ~= nil then Config.Logs.Fivemanage.Token   = fm.Token   end
        if fm.Enabled ~= nil then Config.Logs.Fivemanage.Enabled = fm.Enabled end
        if fm.Mirror  ~= nil then Config.Logs.Fivemanage.Mirror  = fm.Mirror  end
        if fm.Dataset ~= nil then Config.Logs.Fivemanage.Dataset = fm.Dataset end
    end
end

SaveLogSettings = function()
    SaveResourceFile(GetCurrentResourceName(), SETTINGS_FILE, json.encode({
        Webhooks        = Config.Logs.Webhooks,
        Categories      = Config.Logs.Categories,
        ForwardEvent    = Config.Logs.ForwardEvent,
        DBEnabled       = Config.Logs.DBEnabled,
        MaxMemory       = Config.Logs.MaxMemory,
        ResourceEntries = Config.Logs.ResourceEntries,
        ResourceMode    = Config.Logs.ResourceMode,
        Fivemanage      = Config.Logs.Fivemanage,
    }, { indent = true }), -1)
end

local loadOk, loadErr = pcall(LoadLogSettings)
if not loadOk then
    print(('[mri_Qadmin] WARN: falha ao carregar logs_settings.json: ' .. tostring(loadErr)))
end

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

-- ─── Delivery queues ─────────────────────────────────────────────────────────
-- Discord e Fivemanage precisam da mesma máquina: entrega at-least-once, fila
-- persistida entre restarts, envio em lote e backoff exponencial. O que muda é
-- só (a) como um lote vira payload, (b) para onde ele vai e (c) como a resposta
-- é classificada — e é isso, e só isso, que cada `spec` preenche.
--
-- Uma fila pode ter vários destinos ("targets"): o Discord tem um por webhook,
-- o Fivemanage tem um só. Por isso o arquivo em disco é sempre um mapa
-- `{ [target] = logs }`, o que também mantém o formato do logs_queue.json que
-- já existe em servidores rodando.

local function GetRetryDelay(errorCount)
    return math.min(5000 * (2 ^ (errorCount - 1)), 300000)
end

local function CreateDeliveryQueue(spec)
    local queue = { targets = {} }

    local function target(key)
        local t = queue.targets[key]
        if not t then
            t = { logs = {}, isSending = false, errorCount = 0 }
            queue.targets[key] = t
        end
        return t
    end

    function queue.save()
        local data = {}
        for key, t in pairs(queue.targets) do data[key] = t.logs end
        SaveResourceFile(GetCurrentResourceName(), spec.file, json.encode(data), -1)
    end

    function queue.send(key)
        local t = target(key)
        if spec.ready and not spec.ready() then
            t.isSending = false
            return
        end
        if #t.logs == 0 then
            t.isSending = false
            t.errorCount = 0
            return
        end

        t.isSending = true

        local payload, consumed = spec.build(t.logs, key)
        if not payload or not consumed or consumed <= 0 then
            t.isSending = false
            return
        end

        -- Os logs só saem da fila depois do 2xx: um crash entre o POST e a
        -- resposta reenvia o lote em vez de perdê-lo.
        queue.save()

        local url, headers = spec.target(key)
        PerformHttpRequest(url, function(statusCode, body, respHeaders)
            local action, detail, delay = spec.classify(statusCode, body, respHeaders)

            if action == 'ok' then
                for _ = 1, consumed do table.remove(t.logs, 1) end
                t.errorCount = 0
                queue.save()
                if spec.onSuccess then spec.onSuccess() end
                SetTimeout(delay or 500, function() queue.send(key) end)

            elseif action == 'permanent' then
                -- Nada que a gente reenvie conserta token errado ou dataset
                -- inexistente, e uma fila que só cresce é pior que log perdido.
                local dropped = #t.logs
                t.logs = {}
                t.isSending = false
                t.errorCount = 0
                queue.save()
                if spec.onPermanent then spec.onPermanent(detail, dropped) end

            else
                -- Um delay ditado pelo servidor (o retry-after do 429) não é
                -- falha nossa, então não conta para o backoff.
                if not delay then
                    t.errorCount = t.errorCount + 1
                    delay = GetRetryDelay(t.errorCount)
                end
                if spec.onRetry then spec.onRetry(detail, t.errorCount, #t.logs) end
                SetTimeout(delay, function() queue.send(key) end)
            end
        end, 'POST', json.encode(payload), headers)
    end

    function queue.push(key, log)
        local t = target(key)
        t.logs[#t.logs + 1] = log
        if spec.maxQueue and #t.logs > spec.maxQueue then
            table.remove(t.logs, 1)
            if spec.onOverflow then spec.onOverflow(spec.maxQueue) end
        end
        queue.save()
        if not t.isSending then queue.send(key) end
    end

    -- Reenvia o que ficou pendente de antes do restart.
    function queue.restore()
        local content = LoadResourceFile(GetCurrentResourceName(), spec.file)
        if not content then return end
        local ok, data = pcall(json.decode, content)
        if not ok or type(data) ~= 'table' then return end
        for key, logs in pairs(data) do
            if type(logs) == 'table' and #logs > 0 then
                queue.targets[key] = { logs = logs, isSending = false, errorCount = 0 }
                queue.send(key)
            end
        end
    end

    return queue
end

-- ─── Discord ─────────────────────────────────────────────────────────────────

local function BuildDiscordEmbed(log)
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

    return embed
end

local discordQueue = CreateDeliveryQueue({
    file = QUEUE_FILE,

    build = function(logs)
        -- A ordem de envio segue a prioridade das categorias (posição no array).
        local priority = BuildPriority()
        table.sort(logs, function(a, b)
            return (priority[a.category] or 999) < (priority[b.category] or 999)
        end)

        local payload = { username = 'mri_Qadmin Logs', embeds = {} }
        local totalChars, consumed = 0, 0

        for i = 1, #logs do
            if #payload.embeds >= MAX_EMBEDS then break end
            local embed = BuildDiscordEmbed(logs[i])
            local size = #embed.title
            if totalChars + size > MAX_CHARS then break end
            payload.embeds[#payload.embeds + 1] = embed
            totalChars = totalChars + size
            consumed = consumed + 1
        end

        return payload, consumed
    end,

    target = function(webhook)
        return webhook, { ['Content-Type'] = 'application/json' }
    end,

    classify = function(statusCode, _, headers)
        if statusCode == 429 then
            local retryAfter = (headers and headers['retry-after']) and
                math.floor(tonumber(headers['retry-after']) * 1000) or 1000
            return 'retry', 'rate limit', retryAfter
        end
        if statusCode >= 200 and statusCode < 300 then return 'ok' end
        return 'retry', ('HTTP %s'):format(tostring(statusCode))
    end,
})

local function EnqueueDiscord(log)
    local cfg = Config.Logs
    if not cfg or not cfg.Webhooks then return end
    local webhook = cfg.Webhooks[log.category] or cfg.Webhooks.Fallback
    if not webhook or webhook == '' then return end

    discordQueue.push(webhook, log)
end

-- ─── Fivemanage ──────────────────────────────────────────────────────────────

local function FivemanageCfg()
    return (Config.Logs and Config.Logs.Fivemanage) or {}
end

local function FivemanageReady()
    local fm = FivemanageCfg()
    return fm.Enabled == true and type(fm.Token) == 'string' and fm.Token ~= ''
end

-- Mirror mode is opt-in on top of an already-working ingestion: reading history
-- from Fivemanage only makes sense if we are actually sending logs there.
local function FivemanageMirror()
    return FivemanageReady() and FivemanageCfg().Mirror == true
end

local function FivemanageHeaders()
    local fm = FivemanageCfg()
    local headers = {
        ['Content-Type']  = 'application/json',
        ['Authorization'] = fm.Token,
    }
    if type(fm.Dataset) == 'string' and fm.Dataset ~= '' then
        headers['X-Fivemanage-Dataset'] = fm.Dataset
    end
    return headers
end

-- The category is not a first-class field in the Fivemanage API, so it travels
-- as a metadata value behind a sentinel prefix. Filtering then uses `q`, which
-- is a plain substring match — a bare category name like "bans" would also hit
-- any log whose message merely mentions it, hence the prefix.
local function BuildFivemanagePayload(log)
    local metadata = {}
    for k, v in pairs(log.data or {}) do
        if v ~= nil then metadata[k] = v end
    end
    metadata.qadmin_cat = FM_CAT_PREFIX .. (log.category or 'system')
    metadata.admin      = log.admin or 'System'
    if log.admin_citizenid then metadata.admin_citizenid = log.admin_citizenid end

    return {
        level    = log.level or 'info',
        message  = log.message or '',
        resource = log.resource or GetCurrentResourceName(),
        metadata = metadata,
    }
end

local fivemanageQueue = CreateDeliveryQueue({
    file     = FM_QUEUE_FILE,
    maxQueue = FM_MAX_QUEUE,
    ready    = FivemanageReady,

    build = function(logs)
        local batch = {}
        for i = 1, math.min(FM_MAX_BATCH, #logs) do
            batch[i] = BuildFivemanagePayload(logs[i])
        end
        return batch, #batch
    end,

    target = function()
        return FM_ENDPOINT, FivemanageHeaders()
    end,

    classify = function(statusCode, body)
        if statusCode >= 200 and statusCode < 300 then return 'ok' end
        if statusCode == 401 or statusCode == 403 then
            return 'permanent', ('HTTP %d — token invalido ou de tipo errado (use um token de Logs, nao de Media)'):format(statusCode)
        end
        if statusCode == 400 then
            return 'permanent', ('HTTP 400 — %s'):format(tostring(body):sub(1, 200))
        end
        -- Dataset inexistente chega aqui como 500, então o corpo da resposta
        -- vai junto: só "HTTP 500" manda o admin procurar no escuro.
        return 'retry', ('HTTP %s — %s'):format(tostring(statusCode), tostring(body):sub(1, 200))
    end,

    onSuccess = function()
        fmLastError = nil
    end,

    onPermanent = function(detail, dropped)
        fmLastError = detail
        print(('[mri_Qadmin] ERRO Fivemanage: %s — %d log(s) descartado(s). Corrija o token/dataset nas configuracoes de logs.'):format(detail, dropped))
    end,

    onRetry = function(detail, errorCount, pending)
        fmLastError = detail
        if errorCount == 1 or errorCount % 10 == 0 then
            print(('[mri_Qadmin] WARN Fivemanage: %s (tentativa %d, %d na fila)'):format(detail, errorCount, pending))
        end
    end,

    onOverflow = function(maxQueue)
        fmLastError = ('fila cheia (%d) — logs mais antigos descartados'):format(maxQueue)
    end,
})

local function EnqueueFivemanage(log)
    if not FivemanageReady() then return end
    fivemanageQueue.push('fivemanage', log)
end

-- ─── Fivemanage: leitura (modo espelho) ──────────────────────────────────────

local function UrlEncode(value)
    return (tostring(value):gsub('[^%w%-%._~]', function(char)
        return ('%%%02X'):format(string.byte(char))
    end))
end

local function FivemanageGet(params)
    local parts = {}
    for key, value in pairs(params) do
        if value ~= nil and value ~= '' then
            parts[#parts + 1] = key .. '=' .. UrlEncode(value)
        end
    end
    local url = FM_ENDPOINT .. (#parts > 0 and ('?' .. table.concat(parts, '&')) or '')

    local p = promise.new()
    PerformHttpRequest(url, function(statusCode, body)
        p:resolve({ status = statusCode, body = body })
    end, 'GET', '', FivemanageHeaders())

    local res = Citizen.Await(p)
    if res.status ~= 200 then
        return nil, ('HTTP %s — %s'):format(tostring(res.status), tostring(res.body):sub(1, 200))
    end

    local ok, decoded = pcall(json.decode, res.body)
    if not ok or type(decoded) ~= 'table' then
        return nil, 'resposta invalida da Fivemanage'
    end
    return decoded
end

-- Metadata volta sempre como string: um valor aninhado foi serializado na
-- ingestão e precisa ser desfeito para o painel montar o bloco Data como antes.
local function DecodeMaybeJson(value)
    if type(value) ~= 'string' then return value end
    local first = value:sub(1, 1)
    if first ~= '{' and first ~= '[' then return value end
    local ok, decoded = pcall(json.decode, value)
    if ok and decoded ~= nil then return decoded end
    return value
end

-- "2026-07-28T18:09:07.311+02:00" → epoch. O painel já entende epoch (é o que o
-- feed em tempo real manda), então converter aqui evita mexer no formato de lá.
local function ParseRfc3339(ts)
    if type(ts) ~= 'string' then return os.time() end
    local y, mo, d, h, mi, s = ts:match('^(%d%d%d%d)%-(%d%d)%-(%d%d)T(%d%d):(%d%d):(%d%d)')
    if not y then return os.time() end

    local stamp = os.time({
        year = tonumber(y), month = tonumber(mo), day  = tonumber(d),
        hour = tonumber(h), min   = tonumber(mi), sec  = tonumber(s),
        isdst = false,
    })
    -- os.time() lê a tabela como hora LOCAL do servidor; desfazemos isso para
    -- chegar em UTC e só então aplicamos o offset que veio no timestamp.
    local now = os.time()
    local localOffset = os.difftime(now, os.time(os.date('!*t', now)))
    local epoch = stamp + localOffset

    local sign, oh, om = ts:match('([%+%-])(%d%d):(%d%d)$')
    if sign then
        local offset = (tonumber(oh) * 3600) + (tonumber(om) * 60)
        epoch = epoch - (sign == '-' and -offset or offset)
    end
    return epoch
end

local function FivemanageToLog(entry)
    local metadata = entry.metadata or {}
    local data, category, admin, adminCid = {}, 'system', 'System', nil

    for key, value in pairs(metadata) do
        if key == 'qadmin_cat' then
            local id = tostring(value):sub(#FM_CAT_PREFIX + 1)
            if id ~= '' then category = id end
        elseif key == 'admin' then
            admin = tostring(value)
        elseif key == 'admin_citizenid' then
            adminCid = tostring(value)
        else
            data[key] = DecodeMaybeJson(value)
        end
    end

    return {
        id              = entry.traceId,
        resource        = entry.resource or 'unknown',
        category        = category,
        level           = entry.level or 'info',
        message         = entry.body or '',
        data            = data,
        admin           = admin,
        admin_citizenid = adminCid,
        created_at      = ParseRfc3339(entry.timestamp),
    }
end

local function FetchFivemanageLogs(filters, page, limit)
    filters = filters or {}

    local levels = ''
    if type(filters.levels) == 'table' and #filters.levels > 0 then
        levels = table.concat(filters.levels, ',')
    end

    local search = tostring(filters.search or ''):sub(1, 128)
    -- O filtro de resource aqui é EXATO: a API não faz busca parcial, diferente
    -- do LIKE do modo banco.
    local resource = tostring(filters.resource or ''):sub(1, 64)

    local category
    if type(filters.categories) == 'table' and filters.categories[1] then
        category = tostring(filters.categories[1])
    end

    local offset = (page - 1) * limit

    -- Caso simples: `q` está livre para um dos dois filtros, então a API resolve
    -- tudo e a paginação/total saem exatos.
    if not category or search == '' then
        local query = {
            level    = levels,
            resource = resource,
            q        = category and (FM_CAT_PREFIX .. category) or search,
            limit    = limit,
            offset   = offset,
            order    = 'desc',
        }
        local res, err = FivemanageGet(query)
        if not res then return nil, err end

        local logs = {}
        for _, entry in ipairs(res.data or {}) do
            logs[#logs + 1] = FivemanageToLog(entry)
        end
        return { logs = logs, total = (res.pagination and res.pagination.total) or #logs }
    end

    -- Categoria E busca ao mesmo tempo: `q` é um só, e um substring que casasse
    -- os dois não existe. A busca vai para a API (é o filtro mais restritivo na
    -- prática) e a categoria é aplicada aqui, varrendo páginas até acabar ou
    -- bater o teto — que é reportado, nunca silencioso.
    local collected = {}
    local apiOffset, pagesScanned, hasMore = 0, 0, true

    while hasMore and pagesScanned < FM_SCAN_PAGES do
        local res, err = FivemanageGet({
            level    = levels,
            resource = resource,
            q        = search,
            limit    = FM_MAX_PAGE,
            offset   = apiOffset,
            order    = 'desc',
        })
        if not res then return nil, err end

        for _, entry in ipairs(res.data or {}) do
            local log = FivemanageToLog(entry)
            if log.category == category then
                collected[#collected + 1] = log
            end
        end

        hasMore      = (res.pagination and res.pagination.hasMore) == true
        apiOffset    = apiOffset + FM_MAX_PAGE
        pagesScanned = pagesScanned + 1
    end

    local logs = {}
    for i = offset + 1, math.min(offset + limit, #collected) do
        logs[#logs + 1] = collected[i]
    end

    return { logs = logs, total = #collected, approx = hasMore }
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
    local catFm      = catCfg == nil or catCfg.fm ~= false

    local resDb      = resCfg == nil or resCfg.db ~= false
    local resDiscord = resCfg == nil or resCfg.discord ~= false
    local resRelay   = resCfg == nil or resCfg.relay ~= false
    local resFm      = resCfg == nil or resCfg.fm ~= false

    local saveDb      = (cfg and cfg.DBEnabled ~= false) and catDb and resDb
    local sendDiscord = catDiscord and resDiscord
    local doRelay     = catRelay and resRelay
    local sendFm      = catFm and resFm

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

    -- Fivemanage queue (only if both category and resource entry allow it)
    if sendFm then
        EnqueueFivemanage(log)
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
    -- Compat shim para qb-log. É um net event, logo alcançável por clients:
    -- (1) atribui ao source real (server-side = 0 = system; client = jogador),
    --     impedindo falsificação de logs "system";
    -- (2) rate-limit apenas para clients (src > 0) como backstop de spam/DoS.
    local src = source
    if src > 0 and not RateLimit(src, 'qb_log_create', 100) then return end

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

    Debug("debug", ("Name: %s, Title: %s, Color: %s, Message: %s, TagEveryone: %s, ImageUrl: %s"):format(name, title, color, message, tagEveryone, imageUrl))
    AddLog(src, resource, category, level, finalMessage, {
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

    local page   = math.floor(tonumber(filters and filters.page)  or 1)
    local limit  = math.floor(tonumber(filters and filters.limit) or 100)
    if page < 1 then page = 1 end
    if limit < 1 then limit = 1 elseif limit > 500 then limit = 500 end

    -- Modo espelho: o histórico vem da Fivemanage, não do banco.
    if FivemanageMirror() then
        -- O teto da API de query é 100 por página.
        local fmLimit = math.min(limit, FM_MAX_PAGE)
        local ok, result, err = pcall(FetchFivemanageLogs, filters, page, fmLimit)
        if not ok then
            return { logs = {}, total = 0, source = 'fivemanage', error = tostring(result):sub(1, 200) }
        end
        if not result then
            -- Devolver lista vazia aqui faria a falha passar por "sem logs".
            return { logs = {}, total = 0, source = 'fivemanage', error = err }
        end
        return {
            logs   = result.logs,
            total  = result.total,
            approx = result.approx == true,
            source = 'fivemanage',
        }
    end

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
            local res = SanitizeLikeSearch(filters.resource, 64)
            if res ~= '' then
                conds[#conds+1] = 'resource LIKE ?'
                params[#params+1] = '%' .. res .. '%'
            end
        end
        if filters.search and filters.search ~= '' then
            local s = SanitizeLikeSearch(filters.search, 128)
            if s ~= '' then
                conds[#conds+1] = '(message LIKE ? OR admin LIKE ?)'
                params[#params+1] = '%' .. s .. '%'
                params[#params+1] = '%' .. s .. '%'
            end
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

-- ─── Startup: restore undelivered queues ─────────────────────────────────────

CreateThread(function()
    discordQueue.restore()
    fivemanageQueue.restore()
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        discordQueue.save()
        fivemanageQueue.save()
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
            fm       = cat.fm ~= false,
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
            fm      = re.fm ~= false,
        }
    end
    if #entries == 0 then entries = json.array end
    local fm = FivemanageCfg()
    return {
        categories      = result,
        fallbackWebhook = Config.Logs.Webhooks.Fallback or '',
        dbEnabled       = Config.Logs.DBEnabled ~= false,
        maxMemory       = Config.Logs.MaxMemory or 500,
        forwardEvent    = Config.Logs.ForwardEvent or '',
        resourceEntries = entries,
        resourceMode    = Config.Logs.ResourceMode or 'blacklist',
        fivemanage      = {
            token   = fm.Token or '',
            enabled = fm.Enabled == true,
            mirror  = fm.Mirror == true,
            dataset = fm.Dataset or '',
            -- Última falha de entrega, para o painel não ficar mudo quando os
            -- logs param de chegar na Fivemanage.
            lastError = fmLastError or '',
        },
    }
end)

lib.callback.register('mri_Qadmin:callback:SaveLogSettings', function(source, data)
    if not CheckPerms(source, 'qadmin.action.manage_settings') then return false end
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
                fm       = cat.fm ~= false,
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
                fm      = re.fm ~= false,
            }
        end
    end
    Config.Logs.ResourceEntries = newEntries
    if data.resourceMode == 'whitelist' or data.resourceMode == 'blacklist' then
        Config.Logs.ResourceMode = data.resourceMode
    end

    if data.fivemanage then
        Config.Logs.Fivemanage = Config.Logs.Fivemanage or {}
        local fm = data.fivemanage
        if type(fm.token)   == 'string'  then Config.Logs.Fivemanage.Token   = fm.token   end
        if type(fm.dataset) == 'string'  then Config.Logs.Fivemanage.Dataset = fm.dataset end
        Config.Logs.Fivemanage.Enabled = fm.enabled == true
        Config.Logs.Fivemanage.Mirror  = fm.mirror  == true
    end

    SaveLogSettings()
    AddLog(source, 'mri_Qadmin', 'system', 'info', 'Configurações de logs atualizadas', {})
    return true
end)
