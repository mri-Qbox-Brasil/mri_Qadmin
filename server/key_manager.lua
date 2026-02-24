-- Manages the relay of pressed keys from a spectated player to the admins watching them.

local viewers = {} -- targetId -> {adminSource1, adminSource2, ...}

-- When an admin starts watching a player's screen
RegisterNetEvent('mri_Qadmin:server:StartWatchingPlayer', function(targetId)
    local adminSrc = source
    local target = tonumber(targetId)
    if not target then return end

    if not viewers[target] then
        viewers[target] = {}
    end

    -- Check if already watching
    local found = false
    for _, src in ipairs(viewers[target]) do
        if src == adminSrc then
            found = true
            break
        end
    end

    if not found then
        table.insert(viewers[target], adminSrc)
    end
end)

-- When an admin stops watching
RegisterNetEvent('mri_Qadmin:server:StopWatchingPlayer', function(targetId)
    local adminSrc = source
    local target = tonumber(targetId)
    if not target or not viewers[target] then return end

    for i, src in ipairs(viewers[target]) do
        if src == adminSrc then
            table.remove(viewers[target], i)
            break
        end
    end

    if #viewers[target] == 0 then
        viewers[target] = nil
    end
end)

-- Receive key updates from the player and relay to viewers
RegisterNetEvent('mri_Qadmin:server:UpdatePressedKeys', function(keys)
    local playerSrc = source
    if viewers[playerSrc] then
        for _, adminSrc in ipairs(viewers[playerSrc]) do
            TriggerClientEvent('mri_Qadmin:client:ReceivePlayerKeys', adminSrc, playerSrc, keys)
        end
    end
end)

-- Cleanup when admin disconnects
AddEventHandler('playerDropped', function()
    local src = source
    -- Remove from all viewing lists
    for targetId, adminList in pairs(viewers) do
        for i, adminSrc in ipairs(adminList) do
            if adminSrc == src then
                table.remove(adminList, i)
                break
            end
        end
        if #adminList == 0 then
            viewers[targetId] = nil
        end
    end

    -- If the player who dropped was being watched, clean up (optional)
    if viewers[src] then
        viewers[src] = nil
    end
end)
