-- Manages the relay of pressed keys from a spectated player to the admins watching them.

local viewers = {} -- targetId -> {adminSource1, adminSource2, ...}

-- When an admin starts watching a player's screen
RegisterNetEvent('mri_Qadmin:server:StartWatchingPlayer', function(targetId)
    local adminSrc = source
    if not CheckPerms(adminSrc, 'qadmin.action.spectate_player') and not CheckPerms(adminSrc, 'qadmin.page.livescreens') then return end
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
        AddLog(adminSrc, 'mri_Qadmin', 'players', 'info', ('Tela ao vivo: admin começou a assistir a tela de %s'):format(GetPlayerName(target) or target), GetTargetData(target))
    end
end)

-- When an admin stops watching
RegisterNetEvent('mri_Qadmin:server:StopWatchingPlayer', function(targetId)
    local adminSrc = source
    local target = tonumber(targetId)
    if not target or not viewers[target] then return end
    -- Soft guard: só permite remover a si próprio do viewers list
    local isViewer = false
    for _, src in ipairs(viewers[target]) do
        if src == adminSrc then isViewer = true; break end
    end
    if not isViewer then return end

    local removed = false
    for i, src in ipairs(viewers[target]) do
        if src == adminSrc then
            table.remove(viewers[target], i)
            removed = true
            break
        end
    end

    if #viewers[target] == 0 then
        viewers[target] = nil
    end

    if removed then
        AddLog(adminSrc, 'mri_Qadmin', 'players', 'info', ('Tela ao vivo: admin parou de assistir a tela de %s'):format(GetPlayerName(target) or target), GetTargetData(target))
    end
end)

-- Receive key updates from the player and relay to viewers
RegisterNetEvent('mri_Qadmin:server:UpdatePressedKeys', function(keys)
    local playerSrc = source
    if not viewers[playerSrc] or #viewers[playerSrc] == 0 then return end

    -- Rate limit: aceitamos no máximo ~10 updates/s por player. Sem isso, um
    -- client malicioso poderia martelar TriggerClientEvent para todos os admins
    -- que estão observando.
    if not RateLimit(playerSrc, 'pressed_keys', 100) then return end

    -- Sanitiza o payload: array de strings curtas, cap em 20 entradas.
    if type(keys) ~= 'table' then return end
    local clean = {}
    for i = 1, math.min(#keys, 20) do
        local v = keys[i]
        if type(v) == 'string' and #v <= 32 then
            clean[#clean + 1] = v
        end
    end

    for _, adminSrc in ipairs(viewers[playerSrc]) do
        TriggerClientEvent('mri_Qadmin:client:ReceivePlayerKeys', adminSrc, playerSrc, clean)
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
