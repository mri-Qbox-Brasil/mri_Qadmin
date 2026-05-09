-- ─── Normalizers ──────────────────────────────────────────────────────────────

local function normalizeVehicle(v)
    if not v then return nil end
    return {
        model      = v.model or '',
        plate      = v.plate or '',
        label      = v.label,
        expiration = v.expiration or v.expire_at or v.expiry or 0,
    }
end

local function normalizeRank(r)
    if not r then return nil end
    return {
        id             = r.id or r.name or '',
        label          = r.label or '',
        color          = r.color or '#ffffff',
        salary         = r.salary or 0,
        salaryType     = r.salaryType or r.salary_type or 'cash',
        inventoryLimit = r.inventoryLimit or r.inventory_limit or r.max_weight or 0,
        createdAt      = r.createdAt or r.created_at,
    }
end

local function normalizeVipPlayer(p)
    if not p then return nil end
    local vehicles = {}
    for _, v in ipairs(p.vehicles or {}) do
        vehicles[#vehicles + 1] = normalizeVehicle(v)
    end
    return {
        citizenid      = p.citizenid or '',
        name           = p.name or p.charname or '',
        rankId         = p.rankId or p.rank_id or p.rank or '',
        expiration     = p.expiration or p.expire_at or p.expiry or 0,
        salary         = p.salary or 0,
        salaryType     = p.salaryType or p.salary_type or 'cash',
        inventoryLimit = p.inventoryLimit or p.inventory_limit or p.max_weight or 0,
        vehicles       = vehicles,
        online         = p.online or false,
        createdAt      = p.createdAt or p.created_at,
    }
end

-- ─── Ranks ────────────────────────────────────────────────────────────────────

lib.callback.register('mri_Qadmin:vip:getRanks', function(source)
    if not CheckPerms(source, 'qadmin.page.vip') then return {} end
    local raw = exports['mri_Qbox']:getRanks() or {}
    local result = {}
    for _, r in ipairs(raw) do
        result[#result + 1] = normalizeRank(r)
    end
    return result
end)

lib.callback.register('mri_Qadmin:vip:createRank', function(source, data)
    if not CheckPerms(source, 'qadmin.action.manage_vip') then return { status = 'error' } end
    local ok = exports['mri_Qbox']:createRank(data)
    return { status = ok ~= false and 'ok' or 'error' }
end)

lib.callback.register('mri_Qadmin:vip:updateRank', function(source, data)
    if not CheckPerms(source, 'qadmin.action.manage_vip') then return { status = 'error' } end
    local ok = exports['mri_Qbox']:updateRank(data)
    return { status = ok ~= false and 'ok' or 'error' }
end)

lib.callback.register('mri_Qadmin:vip:deleteRank', function(source, data)
    if not CheckPerms(source, 'qadmin.action.manage_vip') then return { status = 'error' } end
    -- deleteRank espera { id = '...' }
    local ok = exports['mri_Qbox']:deleteRank(data)
    return { status = ok ~= false and 'ok' or 'error' }
end)

-- ─── Players ──────────────────────────────────────────────────────────────────

lib.callback.register('mri_Qadmin:vip:getVipPlayers', function(source)
    if not CheckPerms(source, 'qadmin.page.vip') then return {} end
    -- getVipPlayers retorna { vip = [...], onlineVip = n, offlineVip = n }
    local raw = exports['mri_Qbox']:getVipPlayers() or {}
    local players = (type(raw) == 'table' and raw.vip) or raw
    local result = {}
    for _, p in ipairs(players or {}) do
        result[#result + 1] = normalizeVipPlayer(p)
    end
    return result
end)

lib.callback.register('mri_Qadmin:vip:addVipPlayer', function(source, data)
    if not CheckPerms(source, 'qadmin.action.manage_vip') then
        return { status = 'error', msg = 'no_perms' }
    end

    if data.method == 'source' and data.source then
        local target = exports['qbx_core']:GetPlayer(tonumber(data.source))
        if not target then return { status = 'error', msg = 'player_not_found' } end
        data.citizenid = target.PlayerData.citizenid
    end

    if not data.citizenid or data.citizenid == '' then
        return { status = 'error', msg = 'no_citizenid' }
    end

    -- addVip espera: { rankId, citizenID (maiúsculo), dataExpiracao }
    local ok = exports['mri_Qbox']:addVip({
        rankId        = data.rankId,
        citizenID     = data.citizenid,
        dataExpiracao = data.expiration,
    })
    return { status = ok ~= false and 'ok' or 'error' }
end)

lib.callback.register('mri_Qadmin:vip:removeVipPlayer', function(source, data)
    if not CheckPerms(source, 'qadmin.action.manage_vip') then
        return { status = 'error' }
    end
    -- removeVipPlayer espera: { citizenID (maiúsculo) }
    local ok = exports['mri_Qbox']:removeVipPlayer({
        citizenID = data.citizenid,
    })
    return { status = ok ~= false and 'ok' or 'error' }
end)

lib.callback.register('mri_Qadmin:vip:updateVipPlayer', function(source, data)
    if not CheckPerms(source, 'qadmin.action.manage_vip') then
        return { status = 'error' }
    end
    -- updateVipPlayer espera: { rankId, citizenID (maiúsculo), dataExpiracao }
    local ok = exports['mri_Qbox']:updateVipPlayer({
        rankId        = data.rankId,
        citizenID     = data.citizenid,
        dataExpiracao = data.expiration,
    })
    return { status = ok ~= false and 'ok' or 'error' }
end)
