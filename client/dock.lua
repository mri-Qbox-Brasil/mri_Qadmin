-- luacheck: globals MenuVisible PanelMode IsDockCursorFree
-- Field mode for the dock: own toggles, players nearby and the player in the crosshair.

local selfState = {}
local feedRunning = false
local aimedId = nil
local AIM_DISTANCE = 80.0
local AIM_FLAGS = 4 | 8

local function sendSelfState()
    SendNUIMessage({ action = 'selfState', data = selfState })
end

--- Toggle state the dock lights up (noclip, godmode, names...).
--- @param key string
--- @param value any
function SetSelfState(key, value)
    if selfState[key] == value then return end
    selfState[key] = value
    if MenuVisible then sendSelfState() end
end

local function playerFlags(serverId)
    local state = Player(serverId).state
    return state.qadminFrozen == true, (state.isCuffed or state.handcuffed or state.ishandcuffed) == true
end

local function scanNearby()
    local myCoords = GetEntityCoords(cache.ped)
    local list = {}
    for _, playerId in ipairs(GetActivePlayers()) do
        if playerId ~= cache.playerId then
            local ped = GetPlayerPed(playerId)
            local serverId = GetPlayerServerId(playerId)
            local frozen, cuffed = playerFlags(serverId)
            list[#list + 1] = {
                id = serverId,
                name = GetPlayerName(playerId),
                dist = math.floor(#(myCoords - GetEntityCoords(ped)) + 0.5),
                vehicle = IsPedInAnyVehicle(ped, false),
                dead = IsEntityDead(ped) or IsPedFatallyInjured(ped),
                talking = NetworkIsPlayerTalking(playerId),
                frozen = frozen,
                cuffed = cuffed,
            }
        end
    end
    table.sort(list, function(a, b) return a.dist < b.dist end)
    SendNUIMessage({ action = 'dockNearby', data = list })
end

-- Only while the game owns the mouse: that is when the camera points at someone.
local function scanAim()
    local hit, entity = lib.raycast.fromCamera(AIM_FLAGS, 4, AIM_DISTANCE)
    if not hit or entity == 0 or not IsEntityAPed(entity) or not IsPedAPlayer(entity) then return end
    local serverId = GetPlayerServerId(NetworkGetPlayerIndexFromPed(entity))
    if serverId and serverId > 0 and serverId ~= aimedId then
        aimedId = serverId
        SendNUIMessage({ action = 'dockAimed', data = serverId })
    end
end

function StartDockFeed()
    if feedRunning then return end
    feedRunning = true
    sendSelfState()
    CreateThread(function()
        local nextScan = 0
        while MenuVisible and PanelMode == 'dock' do
            local now = GetGameTimer()
            if now >= nextScan then
                scanNearby()
                nextScan = now + 1000
            end
            if IsDockCursorFree() then scanAim() end
            Wait(200)
        end
        feedRunning = false
    end)
end

RegisterNUICallback('getSelfState', function(_, cb)
    cb({ state = selfState, myId = cache.serverId, aimed = aimedId })
end)

RegisterNUICallback('clearAimed', function(_, cb)
    aimedId = nil
    cb('ok')
end)
