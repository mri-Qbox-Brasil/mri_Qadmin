-- WebRTC and Screen Streaming Server-side Logic
--
-- Session model: quando um admin pede a tela de um target via GetPlayerScreen,
-- registramos `pendingViewers[target][adminSrc] = expireAt`. Signal/Chunks só
-- são relayados entre pares (target -> admin) ou (admin -> target) que existam
-- nesse map. Isso impede um cliente malicioso de:
--   1. fingir ser o admin pedindo a stream
--   2. enviar chunks falsos para qualquer admin
--   3. relayar sinais WebRTC para outro player aleatório

local pendingViewers = {} -- [targetSrc] = { [adminSrc] = expireAt(timestamp) }
local SESSION_TTL = 60 * 30 -- 30 minutos é generoso, renovado a cada signal

local function registerSession(adminSrc, targetSrc)
    pendingViewers[targetSrc] = pendingViewers[targetSrc] or {}
    pendingViewers[targetSrc][adminSrc] = os.time() + SESSION_TTL
end

local function dropSession(adminSrc, targetSrc)
    if not pendingViewers[targetSrc] then return end
    pendingViewers[targetSrc][adminSrc] = nil
    if next(pendingViewers[targetSrc]) == nil then
        pendingViewers[targetSrc] = nil
    end
end

local function isSessionValid(adminSrc, targetSrc)
    local bucket = pendingViewers[targetSrc]
    if not bucket then return false end
    local expireAt = bucket[adminSrc]
    if not expireAt then return false end
    if os.time() > expireAt then
        bucket[adminSrc] = nil
        return false
    end
    return true
end

AddEventHandler('playerDropped', function()
    local src = source
    -- Limpa o player como target (suas streams ativas)
    pendingViewers[src] = nil
    -- Limpa o player como admin (sessions onde ele estava observando)
    for tgt, bucket in pairs(pendingViewers) do
        bucket[src] = nil
        if next(bucket) == nil then pendingViewers[tgt] = nil end
    end
end)

-- Request WebRTC streaming for a specific player
lib.callback.register('mri_Qadmin:callback:GetPlayerScreen', function(source, targetId, viewerId)
    if not CheckPerms(source, 'qadmin.page.livescreens') then return nil end
    local target = tonumber(targetId)
    if target and not CheckTargetable(source, target) then return { error = "target protegido" } end
    if target and target ~= 0 then
        registerSession(source, target)
        -- Default to source if no specialized viewerId provided
        local vid = viewerId or tostring(source)
        TriggerClientEvent('mri_Qadmin:client:StartWebRTC', target, vid)
        AddLog(source, 'mri_Qadmin', 'players', 'info', ('Tela ao vivo: admin iniciou visualização da tela de %s'):format(GetPlayerName(target) or target), GetTargetData(target))
        return { status = "ok" }
    end
    return { error = "invalid target" }
end)

-- Stop WebRTC streaming on the target player
RegisterServerEvent('mri_Qadmin:server:StopPlayerScreen', function(targetId, viewerId)
    local src = source
    if not CheckPerms(src, 'qadmin.page.livescreens') then return end
    local target = tonumber(targetId)
    if target and target ~= 0 then
        dropSession(src, target)
        TriggerClientEvent('mri_Qadmin:client:StopWebRTC', target, viewerId)
        AddLog(src, 'mri_Qadmin', 'players', 'info', ('Tela ao vivo: admin encerrou visualização da tela de %s'):format(GetPlayerName(target) or target), GetTargetData(target))
    end
end)

-- ── FiveM Native Signaling Relay ─────────────────────────────────────────────
-- Receives a signal message from one client and forwards it to the target.
-- The target is encoded in msg.targetId (e.g. "viewer-5" or "3").
-- SECURITY: aceita apenas se (sender, target) for um par registrado em
-- pendingViewers (em qualquer direção: admin->target ou target->admin).
RegisterServerEvent('mri_Qadmin:server:Signal', function(msg)
    local src = source
    if not msg or not msg.targetId then return end

    local targetIdStr = tostring(msg.targetId)
    local rawId = targetIdStr:match("viewer%-.+%-(%d+)%-%d+$") or targetIdStr:match("viewer%-(%d+)$") or targetIdStr:match("(%d+)$") or targetIdStr
    local target = tonumber(rawId)

    if not target or target == 0 then return end

    -- Direção 1: admin (src) está sinalizando para um target sendo observado
    -- Direção 2: target (src) está sinalizando de volta para um admin observador
    if not isSessionValid(src, target) and not isSessionValid(target, src) then
        Debug('debug', ('Signaling rejected: no active session for %s -> %s'):format(src, target))
        return
    end

    Debug('debug', ('Signaling: %s -> %s (Target: %s)'):format(msg.sourceId, msg.targetId, target))
    TriggerClientEvent('mri_Qadmin:client:DeliverSignal', target, msg)
end)

RegisterNetEvent('mri_Qadmin:server:ReceiveScreenChunk', function(requester, chunkData)
    local senderSrc = source
    local requesterSrc = tonumber(requester)
    if not requesterSrc then return end
    -- chunkData = { captureId, current, total, data }
    -- Sender é o player cuja tela foi pedida; requester é o admin que pediu.
    -- Só aceita se houver session admin(requester) -> target(sender).
    if not isSessionValid(requesterSrc, senderSrc) then
        return
    end
    if type(chunkData) ~= 'table' then return end
    TriggerClientEvent('mri_Qadmin:client:ReceiveScreenChunk', requesterSrc, {
         id = senderSrc,
         captureId = chunkData.captureId,
         current = chunkData.current,
         total = chunkData.total,
         data = chunkData.data
    })
end)

-- ── Cloudflare Realtime SFU API Proxy ────────────────────────────────────────
-- Secrets are read from server/server_secrets.json via LoadResourceFile so they
-- never appear in shared_scripts and work regardless of the Lua runtime isolation.
local _cfSecrets = nil
local function cfSecrets()
    if _cfSecrets then return _cfSecrets end
    local raw = LoadResourceFile(GetCurrentResourceName(), 'server/server_secrets.json')
    if not raw then
        Debug('debug', ('[CF SFU] ERROR: server/server_secrets.json not found!'))
        _cfSecrets = {}
    else
        local ok, data = pcall(json.decode, raw)
        _cfSecrets = (ok and data) or {}
        if not _cfSecrets.CloudflareAppId then
            print('[CF SFU] ERROR: server_secrets.json is missing CloudflareAppId')
        else
            print('[CF SFU] Secrets loaded OK. AppId:', _cfSecrets.CloudflareAppId:sub(1, 8) .. '...')
        end
    end
    return _cfSecrets
end

local CF_BASE = 'https://rtc.live.cloudflare.com/v1/apps/'

local function cfRequest(method, path, body)
    local s = cfSecrets()
    local appId     = s.CloudflareAppId     or ''
    local appSecret = s.CloudflareAppSecret or ''
    if appId == '' then return { error = 'CF credentials missing — check server/server_secrets.json' } end

    local p = promise.new()
    local url = CF_BASE .. appId .. path
    local headers = { ['Authorization'] = 'Bearer ' .. appSecret }
    local bodyStr = ''

    -- Only attach Content-Type + body when there is actual payload
    if body ~= nil and next(body) ~= nil then
        bodyStr = json.encode(body)
        headers['Content-Type'] = 'application/json'
    end

    Debug('debug', ('[CF SFU] --> %s %s (body: %d bytes)'):format(method, url, #bodyStr))
    PerformHttpRequest(url, function(code, responseBody, _)
        Debug('debug', ('[CF SFU] <-- %d  %s'):format(code, (responseBody or ''):sub(1, 400)))
        if code >= 200 and code < 300 then
            local ok, respData = pcall(json.decode, responseBody)
            if ok and respData then p:resolve(respData)
            else p:resolve({ raw = responseBody })
            end
        elseif code == 0 then
            p:resolve({ error = 'CF API: connection failed (code 0) — check server outbound HTTPS access' })
        else
            p:resolve({ error = ('CF API error %d: %s'):format(code, responseBody or '') })
        end
    end, method, bodyStr, headers)
    return Citizen.Await(p)
end

lib.callback.register('mri_Qadmin:callback:CFCreateSession', function(src)
    if not CheckPerms(src, 'qadmin.page.livescreens') then return nil end
    -- sessions/new expects NO body and NO Content-Type
    local ok, result = pcall(cfRequest, 'POST', '/sessions/new', nil)
    if not ok then
        print('[CF SFU] CFCreateSession exception:', result)
        return { error = 'CFCreateSession exception: ' .. tostring(result) }
    end
    return result
end)

lib.callback.register('mri_Qadmin:callback:CFPublishTracks', function(src, data)
    if not CheckPerms(src, 'qadmin.page.livescreens') then return nil end
    local ok, result = pcall(cfRequest, 'POST', ('/sessions/%s/tracks/new'):format(data.sessionId), {
        sessionDescription = data.offer,
        tracks = {{ location = 'local', mid = '0', trackName = 'screen' }},
    })
    if not ok then print('[CF SFU] CFPublishTracks exception:', result); return { error = tostring(result) } end
    return result
end)

lib.callback.register('mri_Qadmin:callback:CFSubscribe', function(src, data)
    if not CheckPerms(src, 'qadmin.page.livescreens') then return nil end
    local ok, result = pcall(cfRequest, 'POST', ('/sessions/%s/tracks/new'):format(data.mySessionId), {
        tracks = {{ location = 'remote', sessionId = data.publisherSessionId, trackName = data.trackName }},
    })
    if not ok then print('[CF SFU] CFSubscribe exception:', result); return { error = tostring(result) } end
    return result
end)

lib.callback.register('mri_Qadmin:callback:CFRenegotiate', function(src, data)
    if not CheckPerms(src, 'qadmin.page.livescreens') then return nil end
    return cfRequest('PUT', ('/sessions/%s/renegotiate'):format(data.sessionId), {
        sessionDescription = data.answer,
    })
end)

-- Relay publisher track info to the waiting admin viewer.
-- SECURITY: only relay if the (sender->admin) pair has an active session.
RegisterServerEvent('mri_Qadmin:server:CFAnnounceTrack', function(data)
    local senderSrc = source
    if type(data) ~= 'table' then return end
    local adminId = tonumber(data.adminId)
    if not adminId or adminId == 0 then return end
    if not isSessionValid(adminId, senderSrc) then return end

    TriggerClientEvent('mri_Qadmin:client:CFTrackReady', adminId, {
        sessionId = data.sessionId,
        trackName = data.trackName,
    })
end)
