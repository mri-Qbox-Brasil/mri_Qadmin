local watchersCount = 0
local isThreadRunning = false

-- Mapping of standard GTA V controls to labels for the keyboard visualizer
-- This list covers common keys used in gameplay.
local monitoredControls = {
    -- Movement
    {id = 32,  label = "W"},
    {id = 34,  label = "A"},
    {id = 33,  label = "S"},
    {id = 35,  label = "D"},

    -- Actions
    {id = 22,  label = "SPACE"},
    {id = 21,  label = "SHIFT"},
    {id = 36,  label = "CTRL"},
    {id = 19,  label = "ALT"},
    {id = 37,  label = "TAB"},
    {id = 44,  label = "Q"},
    {id = 38,  label = "E"},
    {id = 47,  label = "G"},
    {id = 74,  label = "H"},
    {id = 311, label = "K"},
    {id = 182, label = "L"},
    {id = 244, label = "M"},
    {id = 245, label = "T"},
    {id = 246, label = "Y"},
    {id = 20,  label = "Z"},
    {id = 48,  label = "Z"}, -- Sometimes Z is 48
    {id = 73,  label = "X"},
    {id = 170, label = "F3"},
    {id = 166, label = "F5"},
    {id = 167, label = "F6"},
    {id = 168, label = "F7"},
    {id = 288, label = "F1"},
    {id = 289, label = "F2"},
    {id = 171, label = "F10"},

    -- Numbers
    {id = 157, label = "1"},
    {id = 158, label = "2"},
    {id = 159, label = "3"},
    {id = 160, label = "4"},
    {id = 161, label = "5"},
    {id = 162, label = "6"},
    {id = 163, label = "7"},
    {id = 164, label = "8"},
    {id = 165, label = "9"},
    {id = 156, label = "0"},

    -- UI / Misc
    {id = 177, label = "BACK"},
    {id = 18,  label = "ENTER"},
    {id = 322, label = "ESC"},

    -- Mouse
    {id = 24,  label = "LMB"},
    {id = 25,  label = "RMB"},
}

local function TableCompare(t1, t2)
    if #t1 ~= #t2 then return false end
    for i = 1, #t1 do
        if t1[i] ~= t2[i] then return false end
    end
    return true
end

local function StartKeyCapture()
    watchersCount = watchersCount + 1
    if isThreadRunning then return end
    isThreadRunning = true

    CreateThread(function()
        local lastKeys = {}
        while watchersCount > 0 do
            local currentKeys = {}
            for _, control in ipairs(monitoredControls) do
                if IsControlPressed(0, control.id) or IsDisabledControlPressed(0, control.id) then
                    table.insert(currentKeys, control.label)
                end
            end

            if not TableCompare(currentKeys, lastKeys) then
                TriggerServerEvent('mri_Qadmin:server:UpdatePressedKeys', currentKeys)
                lastKeys = currentKeys
            end
            Wait(100)
        end
        isThreadRunning = false
    end)
end

local function StopKeyCapture()
    watchersCount = watchersCount - 1
    if watchersCount < 0 then watchersCount = 0 end
end

-- Hook into existing WebRTC events: start/stop capture when someone watches us
RegisterNetEvent('mri_Qadmin:client:StartWebRTC', function(requester)
    StartKeyCapture()
end)

RegisterNetEvent('mri_Qadmin:client:StopWebRTC', function()
    StopKeyCapture()
end)

-- Hook into NUI events for self-view support: start/stop capture when we watch ourselves
RegisterNUICallback('StartWatchingPlayer', function(data, cb)
    local targetId = tonumber(data.targetId)
    if targetId == GetPlayerServerId(PlayerId()) then
        StartKeyCapture()
    end
    TriggerServerEvent('mri_Qadmin:server:StartWatchingPlayer', data.targetId)
    cb('ok')
end)

RegisterNUICallback('StopWatchingPlayer', function(data, cb)
    local targetId = tonumber(data.targetId)
    if targetId == GetPlayerServerId(PlayerId()) then
        StopKeyCapture()
    end
    TriggerServerEvent('mri_Qadmin:server:StopWatchingPlayer', data.targetId)
    cb('ok')
end)

-- NUI Relay: Forward keys received from server to the frontend
RegisterNetEvent('mri_Qadmin:client:ReceivePlayerKeys', function(targetId, keys)
    SendNUIMessage({
        action = 'ReceivePlayerKeys',
        data = {
            id = targetId,
            keys = keys
        }
    })
end)
