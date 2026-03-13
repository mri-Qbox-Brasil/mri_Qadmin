-- WebRTC and Screen Streaming Server-side Logic

-- Request WebRTC streaming for a specific player
lib.callback.register('mri_Qadmin:callback:GetPlayerScreen', function(source, targetId, viewerId)
    local target = tonumber(targetId)
    if target and target ~= 0 then
        -- Default to source if no specialized viewerId provided
        local vid = viewerId or tostring(source)
        TriggerClientEvent('mri_Qadmin:client:StartWebRTC', target, vid)
        return { status = "ok" }
    end
    return { error = "invalid target" }
end)

-- Stop WebRTC streaming on the target player
RegisterServerEvent('mri_Qadmin:server:StopPlayerScreen', function(targetId, viewerId)
    local target = tonumber(targetId)
    if target and target ~= 0 then
        TriggerClientEvent('mri_Qadmin:client:StopWebRTC', target, viewerId)
    end
end)

-- ── FiveM Native Signaling Relay ─────────────────────────────────────────────
-- Receives a signal message from one client and forwards it to the target.
-- The target is encoded in msg.targetId (e.g. "viewer-5" or "3").
RegisterServerEvent('mri_Qadmin:server:Signal', function(msg)
    if not msg or not msg.targetId then return end

    local targetIdStr = tostring(msg.targetId)
    local target = nil

    -- Resolve target by extracting the REQUESTER ID from the viewerId
    -- Format: "viewer-[TYPE]-[REQUESTER]-[TARGET]"
    -- Example: "viewer-list-2-1" -> Requester is 2
    local rawId = targetIdStr:match("viewer%-.+%-(%d+)%-%d+$") or targetIdStr:match("viewer%-(%d+)$") or targetIdStr:match("(%d+)$") or targetIdStr
    target = tonumber(rawId)

    if target and target ~= 0 then
        if Config.Debug then
            print(("[DEBUG] Signaling: %s -> %s (Target: %s)"):format(msg.sourceId, msg.targetId, target))
        end
        TriggerClientEvent('mri_Qadmin:client:DeliverSignal', target, msg)
    end
end)

RegisterNetEvent('mri_Qadmin:server:ReceiveScreenChunk', function(requester, chunkData)
    -- chunkData = { captureId, current, total, data }
    if requester then
        TriggerClientEvent('mri_Qadmin:client:ReceiveScreenChunk', requester, {
             id = source, -- The player who sent the screen
             captureId = chunkData.captureId,
             current = chunkData.current,
             total = chunkData.total,
             data = chunkData.data
        })
    end
end)

-- ── Cloudflare Realtime SFU API Proxy ────────────────────────────────────────
-- Secrets are read from server/server_secrets.json via LoadResourceFile so they
-- never appear in shared_scripts and work regardless of the Lua runtime isolation.
local _cfSecrets = nil
local function cfSecrets()
    if _cfSecrets then return _cfSecrets end
    local raw = LoadResourceFile(GetCurrentResourceName(), 'server/server_secrets.json')
    if not raw then
        print('[CF SFU] ERROR: server/server_secrets.json not found!')
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

    if Config.Debug then
        print(('[CF SFU] --> %s %s (body: %d bytes)'):format(method, url, #bodyStr))
    end
    PerformHttpRequest(url, function(code, responseBody, _h)
    if Config.Debug then
        print(('[CF SFU] <-- %d  %s'):format(code, (responseBody or ''):sub(1, 400)))
    end
        if code >= 200 and code < 300 then
            local ok, data = pcall(json.decode, responseBody)
            if ok and data then p:resolve(data)
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

lib.callback.register('mri_Qadmin:callback:CFCreateSession', function(_source)
    -- sessions/new expects NO body and NO Content-Type
    local ok, result = pcall(cfRequest, 'POST', '/sessions/new', nil)
    if not ok then
        print('[CF SFU] CFCreateSession exception:', result)
        return { error = 'CFCreateSession exception: ' .. tostring(result) }
    end
    return result
end)

lib.callback.register('mri_Qadmin:callback:CFPublishTracks', function(_source, data)
    local ok, result = pcall(cfRequest, 'POST', ('/sessions/%s/tracks/new'):format(data.sessionId), {
        sessionDescription = data.offer,
        tracks = {{ location = 'local', mid = '0', trackName = 'screen' }},
    })
    if not ok then print('[CF SFU] CFPublishTracks exception:', result); return { error = tostring(result) } end
    return result
end)

lib.callback.register('mri_Qadmin:callback:CFSubscribe', function(_source, data)
    local ok, result = pcall(cfRequest, 'POST', ('/sessions/%s/tracks/new'):format(data.mySessionId), {
        tracks = {{ location = 'remote', sessionId = data.publisherSessionId, trackName = data.trackName }},
    })
    if not ok then print('[CF SFU] CFSubscribe exception:', result); return { error = tostring(result) } end
    return result
end)

lib.callback.register('mri_Qadmin:callback:CFRenegotiate', function(_source, data)
    return cfRequest('PUT', ('/sessions/%s/renegotiate'):format(data.sessionId), {
        sessionDescription = data.answer,
    })
end)

-- Relay publisher track info to the waiting admin viewer
RegisterServerEvent('mri_Qadmin:server:CFAnnounceTrack', function(data)
    local adminId = tonumber(data.adminId)
    if adminId and adminId ~= 0 then
        TriggerClientEvent('mri_Qadmin:client:CFTrackReady', adminId, {
            sessionId = data.sessionId,
            trackName = data.trackName,
        })
    end
end)
