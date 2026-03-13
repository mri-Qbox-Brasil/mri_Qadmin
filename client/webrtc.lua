-- WebRTC and Screen Streaming Client-side Logic

local isWebRTCStreaming = false

-- ── Client Events ────────────────────────────────────────────────────────────

RegisterNetEvent('mri_Qadmin:client:StartWebRTC', function(requester)
    print('[WebRTC] Starting Stream for requester:', requester)
    isWebRTCStreaming = true

    SendNUIMessage({
        action = 'StartWebRTC',
        data = {
            targetId = requester,
            selfId = GetPlayerServerId(PlayerId())
        }
    })
end)

RegisterNetEvent('mri_Qadmin:client:StopWebRTC', function(viewerId)
    isWebRTCStreaming = false
    SendNUIMessage({
        action = 'StopWebRTC',
        data = { viewerId = viewerId }
    })
end)

-- FiveM Native signaling relay — final hop: deliver signal message to the NUI
RegisterNetEvent('mri_Qadmin:client:DeliverSignal', function(msg)
    SendNUIMessage({ action = 'Signal', data = msg })
end)

-- CF SFU: relay publisher track info to the subscriber NUI
RegisterNetEvent('mri_Qadmin:client:CFTrackReady', function(trackInfo)
    SendNUIMessage({ action = 'CFTrackReady', data = trackInfo })
end)

-- ── NUI Callbacks ────────────────────────────────────────────────────────────

RegisterNUICallback("GetPlayerScreen", function(data, cb)
    local res = lib.callback.await('mri_Qadmin:callback:GetPlayerScreen', false, data.targetId, data.viewerId)
    cb(res)
end)

RegisterNUICallback("SignalRegister", function(data, cb)
    -- No-op: identity is tracked by server ID, not a registration table
    cb({ status = "ok" })
end)

RegisterNUICallback("Signal", function(data, cb)
    -- Relay signaling message to targetId via server
    TriggerServerEvent('mri_Qadmin:server:Signal', data)
    cb({ status = "ok" })
end)

RegisterNUICallback("StopPlayerScreen", function(data, cb)
    -- Tell the target player to stop streaming
    TriggerServerEvent('mri_Qadmin:server:StopPlayerScreen', data.targetId, data.viewerId)
    cb({ status = "ok" })
end)

-- ── Cloudflare Realtime SFU NUI Callbacks ────────────────────────────────────

RegisterNUICallback("CFCreateSession", function(_, cb)
    local res = lib.callback.await('mri_Qadmin:callback:CFCreateSession', false)
    cb(res)
end)

RegisterNUICallback("CFPublishTracks", function(data, cb)
    local res = lib.callback.await('mri_Qadmin:callback:CFPublishTracks', false, data)
    cb(res)
end)

RegisterNUICallback("CFSubscribe", function(data, cb)
    local res = lib.callback.await('mri_Qadmin:callback:CFSubscribe', false, data)
    cb(res)
end)

RegisterNUICallback("CFRenegotiate", function(data, cb)
    local res = lib.callback.await('mri_Qadmin:callback:CFRenegotiate', false, data)
    cb(res)
end)

-- P2 announces its CF track to the admin viewer
RegisterNUICallback("CFAnnounceTrack", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:CFAnnounceTrack', data)
    cb({ status = "ok" })
end)
