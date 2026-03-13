local watchersCount = 0
local isThreadRunning = false

local monitoredControls = {
    -- Alphanumeric & Actions
    {label = "W", ids = {32, 332}},
    {label = "A", ids = {34, 63, 133, 147, 266}},
    {label = "S", ids = {31, 33, 219, 268, 269}},
    {label = "D", ids = {30, 35, 218, 235, 267}},
    {label = "Q", ids = {44, 205, 313, 141, 264}},
    {label = "E", ids = {38, 46, 51, 54, 86, 103, 119, 153, 184, 206}},
    {label = "R", ids = {45, 80, 140, 263, 310}},
    {label = "T", ids = {245, 309}},
    {label = "Y", ids = {246}},
    {label = "U", ids = {303}},
    {label = "I", ids = {199}}, -- P is normally pause, let's use I for menu if needed, though docs say P
    {label = "P", ids = {199, 200}},
    {label = "F", ids = {23, 49, 75, 144, 145, 185, 251}},
    {label = "G", ids = {47, 58, 113, 183}},
    {label = "H", ids = {74, 101, 104, 304}},
    {label = "K", ids = {311}},
    {label = "L", ids = {182}},
    {label = "Z", ids = {20, 48}},
    {label = "X", ids = {73, 105, 118, 120, 154, 252, 323, 337, 345, 354, 357}},
    {label = "C", ids = {26, 79, 319}},
    {label = "V", ids = {0, 236, 320}},
    {label = "B", ids = {29, 305}},
    {label = "N", ids = {249, 306}},
    {label = "M", ids = {244, 301}},

    -- Top Row / Functions
    {label = "1", ids = {157}},
    {label = "2", ids = {158}},
    {label = "3", ids = {160}},
    {label = "4", ids = {164}},
    {label = "5", ids = {165}},
    {label = "6", ids = {159}},
    {label = "7", ids = {161}},
    {label = "8", ids = {162}},
    {label = "9", ids = {163}},
    {label = "0", ids = {156}},

    {label = "F1", ids = {288}},
    {label = "F2", ids = {289}},
    {label = "F3", ids = {170}},
    {label = "F5", ids = {166, 318, 327}},
    {label = "F6", ids = {167}},
    {label = "F7", ids = {168}},
    {label = "F8", ids = {169}},
    {label = "F9", ids = {56}},
    {label = "F10", ids = {57}},
    {label = "F11", ids = {344}},

    -- Modifiers
    {label = "SPACE", ids = {22, 55, 76, 102, 143, 179, 203, 216, 255, 298, 321, 353}},
    {label = "SHIFT", ids = {21, 61, 131, 155, 209, 254, 340, 352}},
    {label = "CTRL", ids = {36, 60, 62, 132, 210, 224, 280, 281, 326, 341, 343}},
    {label = "ALT", ids = {19}},
    {label = "TAB", ids = {37, 192, 204, 211, 349}},
    {label = "CAPS", ids = {171, 137, 217}},
    {label = "ENTER", ids = {18, 176, 191, 201, 215}},
    {label = "BACK", ids = {177, 194, 202, 297}},
    {label = "ESC", ids = {322}},

    -- Arrows
    {label = "UP", ids = {172, 188, 300, 232}},
    {label = "DOWN", ids = {173, 187, 299, 233}},
    {label = "LEFT", ids = {174, 189, 308, 234}},
    {label = "RIGHT", ids = {175, 190, 307, 235}},

    -- Mouse
    {label = "LMB", ids = {24, 69, 92, 106, 122, 135, 142, 229, 237, 257}},
    {label = "RMB", ids = {25, 68, 91, 114, 222, 225, 238}},

    -- Numpad
    {label = "NUM 8", ids = {111, 127}},
    {label = "NUM 5", ids = {110, 112, 126, 128}},
    {label = "NUM 4", ids = {108, 124}},
    {label = "NUM 6", ids = {107, 109, 123, 125}},
    {label = "NUM 7", ids = {117}},
    {label = "NUM 9", ids = {118}},
    {label = "NUM ENTER", ids = {201}},
    {label = "NUM +", ids = {97, 314}},
    {label = "NUM -", ids = {96, 315}},
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
                local pressed = false
                for _, id in ipairs(control.ids) do
                    if IsControlPressed(0, id) or IsDisabledControlPressed(0, id) then
                        pressed = true
                        break
                    end
                end

                if pressed then
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
RegisterNetEvent('mri_Qadmin:client:StartWebRTC', function(_)
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
