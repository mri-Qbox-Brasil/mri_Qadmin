local QBCore = exports['qb-core']:GetCoreObject()

local function noPerms(source)
    -- Notify() em vez de QBCore.Functions.Notify direto: o wrapper respeita
    -- Config.QBNotify/InternalNotify. Chamando o QBCore direto, um servidor com
    -- QBNotify = false deixava a negação completamente muda.
    -- RateLimit: a tecla do painel (Config.AdminKey) é registrada para TODOS os
    -- jogadores, então um player qualquer pode disparar negações em sequência.
    if not RateLimit(source, 'no_perms_notify', 3000) then return end
    Notify(source, locale('notifications.no_perms') or 'Permissões insuficientes.', 'error')
end

local function formatNodes(perms)
    if type(perms) == 'string' then
        return perms
    elseif type(perms) == 'table' then
        return table.concat(perms, ', ')
    end
    return tostring(perms or "nil")
end

-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRATO (SECURITY_AUDIT D1) — as duas funções não são intercambiáveis:
--
--   HasPerms   → predicado SILENCIOSO. Retorna bool e não fala com o jogador.
--                Use para filtrar/moldar dados: loops sobre players, visibilidade
--                de plugins, o que entra no payload do data_sync, listas.
--
--   CheckPerms → GATE de ação iniciada pelo jogador. Faz o mesmo teste, e ao negar
--                NOTIFICA o jogador. Use em todo ponto de entrada acionado por ele:
--                comandos, net events e callbacks de mutação.
--
-- A regra prática: se a negação significa "o jogador tentou fazer algo e não pôde",
-- é CheckPerms. Se significa "isto não aparece para ele", é HasPerms. Trocar as duas
-- gera os dois defeitos que já aconteceram: ação que falha em silêncio (/adm) e
-- notificação espúria ao abrir o painel (GetCommandsList).
--
-- Exceção documentada: callbacks que devolvem `false, "Acesso Negado."` para a NUI
-- (SaveGroup, DeleteGroup, UpdateGroupPermissions, UpdateCharacterGroups) já entregam
-- o erro pela resposta — usam HasPerms de propósito, para não notificar em dobro.
-- ─────────────────────────────────────────────────────────────────────────────

--- Predicado silencioso. Não notifica. Ver contrato acima.
--- @param perms string | table
function HasPerms(source, perms)
    Debug('debug', ('HasPerms Source: %s, Nodes: %s'):format(tostring(source), formatNodes(perms)))
    if not perms then return false end

    local function checkNode(node)
        if not node then return false end

        -- Primary check against the source directly
        if IsPlayerAceAllowed(source, node) then return true end

        -- Fallback: Check explicitly against identifiers (solves native FiveM cache lag)
        local num = GetNumPlayerIdentifiers(source)
        for i = 0, num - 1 do
            local id = GetPlayerIdentifier(source, i)
            if IsPrincipalAceAllowed('identifier.' .. id, node) or IsPrincipalAceAllowed(id, node) then
                return true
            end
        end

        -- Extended principals check (Character, Job, Gang)
        local Player = QBCore.Functions.GetPlayer(source)
        if Player then
            local citizenid = Player.PlayerData.citizenid
            local job = Player.PlayerData.job.name
            local jobGrade = Player.PlayerData.job.grade.level or Player.PlayerData.job.grade
            local gang = Player.PlayerData.gang and Player.PlayerData.gang.name
            local gangGrade = Player.PlayerData.gang and (Player.PlayerData.gang.grade.level or Player.PlayerData.gang.grade)

            -- Check Character Principal
            if IsPrincipalAceAllowed('char:' .. citizenid, node) then return true end

            -- Check Job & Grade Principals
            if job and job ~= "unemployed" then
                if IsPrincipalAceAllowed('job.' .. job, node) then return true end
                if IsPrincipalAceAllowed(('job.%s.%s'):format(job, jobGrade), node) then return true end
            end

            -- Check Gang & Grade Principals
            if gang and gang ~= "none" then
                if IsPrincipalAceAllowed('gang.' .. gang, node) then return true end
                if IsPrincipalAceAllowed(('gang.%s.%s'):format(gang, gangGrade), node) then return true end
            end
        end

        return false
    end

    -- Master Bypass
    if checkNode('qadmin.master') then
        return true
    end

    -- Automatic Open Panel Permission: membership of ANY managed group grants
    -- qadmin.open. This is resolved natively through the principal chain
    -- (identifier -> char:<citizenid> -> mri.group.<id>, which holds the
    -- qadmin.open ACE), so no extra DB query is needed here — checkNode below
    -- already returns true for group members.

    -- Check Native ACEs — checagem explícita, sem fallback implícito
    -- qadmin.X -> qadmin.page.X (que conflatava permissão de ação com de página).
    -- Quem quiser aceitar mais de um nó deve passar uma tabela explicitamente.
    if type(perms) == 'string' then
        if checkNode(perms) then return true end
    elseif type(perms) == 'table' then
        for _, p in pairs(perms) do
            if checkNode(p) then return true end
        end
    end

    return false
end

--- Gate de ação do jogador: checa e NOTIFICA ao negar. Ver contrato acima.
--- @param perms string | table
function CheckPerms(source, perms)
    local allowed = HasPerms(source, perms)

    Debug('debug', ('CheckPerms Source: %s, Nodes: %s | Result: %s')
        :format(tostring(source), formatNodes(perms), tostring(allowed)))

    if not allowed then
        -- O dump de diagnóstico que existia aqui (identifiers, citizenid, job do
        -- jogador) foi removido: vazava PII no console a cada negação e, agora que
        -- /adm notifica, qualquer player apertando a tecla do painel o dispararia.
        -- Para investigar permissão de alguém, use `mri_qadmin.debugperms <id>`.
        noPerms(source)
    end

    return allowed
end

--- Check if a player (any identifier) belongs to a specific principal (group)
--- @param source number The player source ID
--- @param principal string The principal to check (e.g., 'group.admin')
--- @return boolean
function IsPlayerInPrincipal(source, principal)
    local num = GetNumPlayerIdentifiers(source)
    for i = 0, num - 1 do
        local id = GetPlayerIdentifier(source, i)
        -- Check direct identifier mapping or identifier.id mapping
        if IsPrincipalAceAllowed(id, principal) or IsPrincipalAceAllowed('identifier.' .. id, principal) then
            return true
        end
    end
    return false
end

--- Extract value from selectedData safely (handles both {value = x} and x)
function GetValue(data, key)
    if not data or not key or not data[key] then return nil end
    if type(data[key]) == "table" then
        return data[key].value
    end
    return data[key]
end

function CheckDataFromKey(key)
    local actions = Config.Actions[key]
    if actions then
        local data = nil

        if actions.event then
            data = actions
        end

        if actions.dropdown then
            for _, v in pairs(actions.dropdown) do
                if v.event then
                    local new = v
                    new.perms = actions.perms
                    data = new
                    break
                end
            end
        end

        return data
    end

    local playerActions = Config.PlayerActions[key]
    if playerActions then
        return playerActions
    end

    local otherActions = Config.OtherActions[key]
    if otherActions then
        return otherActions
    end
end

---@param plate string
---@return boolean
function CheckAlreadyPlate(plate)
    local vPlate = QBCore.Shared.Trim(plate)
    local result = MySQL.single.await("SELECT plate FROM player_vehicles WHERE plate = ?", { vPlate })
    if result and result.plate then return true end
    return false
end

function GeneratePlate()
    local plate = string.upper(lib.string.random('AA AA 000')) -- Example format
    if CheckAlreadyPlate(plate) then
        return GeneratePlate()
    end
    return plate
end

lib.callback.register('mri_Qadmin:callback:CheckPerms', function(source, perms)
    Debug('debug', ('HasPerms Source: %s, Nodes: %s'):format(tostring(source), formatNodes(perms)))
    return HasPerms(source, perms)
end)

lib.callback.register('mri_Qadmin:callback:CheckAlreadyPlate', function(_, vPlate)
    Debug('debug', ('CheckAlreadyPlate Plate: %s'):format(vPlate))
    return CheckAlreadyPlate(vPlate)
end)

--- @param source number
--- @param target number
function CheckRoutingbucket(source, target)
    local sourceBucket = GetPlayerRoutingBucket(source)
    local targetBucket = GetPlayerRoutingBucket(target)

    if sourceBucket == targetBucket then return end

    SetPlayerRoutingBucket(source, targetBucket)
    QBCore.Functions.Notify(source, locale("notifications.bucket_set", targetBucket), 'error', 7500)
end

--- Convert "R, G, B" string to "#RRGGBB" hex
--- @param rgbStr string
--- @return string | nil
function RGBToHex(rgbStr)
    if not rgbStr or type(rgbStr) ~= "string" then return nil end
    local r, g, b = rgbStr:match("(%d+),%s*(%d+),%s*(%d+)")
    if not r or not g or not b then return nil end
    return string.format("#%02x%02x%02x", tonumber(r), tonumber(g), tonumber(b))
end

--- @param id string
--- @return string | nil
function NormalizeIdentifier(id)
    if not id or id == "" then return nil end
    local str = tostring(id)
    -- Remove duplicated license prefix (e.g., license:license2: -> license2:)
    if string.find(str, "license:license2:") then
        str = string.gsub(str, "license:license2:", "license2:")
    end
    -- Support for license:license: (accidental double prefixing)
    if string.find(str, "license:license:") then
        str = string.gsub(str, "license:license:", "license:")
    end
    -- Remove 'identifier.' prefix if present (we want the "raw" but prefixed identifier for the DB)
    str = string.gsub(str, "identifier%.", "")
    return str
end

--- @param id string
--- @return string | nil
function NormalizePrincipal(id)
    local str = NormalizeIdentifier(id)
    if not str then return nil end

    -- If it's a license, steam, discord, etc (contains : but not group., job., gang. or char:),
    -- and doesn't already have 'identifier.' prefix, add it for FiveM native ACE compatibility.
    if string.find(str, ":") and not string.find(str, "char:") and not string.find(str, "group%.") and not string.find(str, "job%.") and not string.find(str, "gang%.") then
        return "identifier." .. str
    end
    return str
end

--- Retorna uma lista de IDs de jogadores (source) que possuem permissão administrativa
--- @return table
function GetAdminPlayers()
    local admins = {}
    local players = QBCore.Functions.GetPlayers()
    for _, src in ipairs(players) do
        if HasPerms(src, 'qadmin.open') then
            admins[#admins + 1] = src
        end
    end
    return admins
end

--- Garante que `source` pode aplicar ação destrutiva em `target`.
--- Regra: ninguém abaixo de master pode tocar em um master. Self-target
--- também é permitido livremente (admin pode kickar a si mesmo, por ex.).
--- @param source number admin que está agindo
--- @param target number player alvo da ação
--- @return boolean allowed, string|nil reason
function CanTargetPlayer(source, target)
    if not target or target == 0 then return false, "target inválido" end
    if source == target then return true end
    -- Master pode mirar qualquer um
    if HasPerms(source, 'qadmin.master') then return true end
    -- Não-master não pode mirar master
    if HasPerms(target, 'qadmin.master') then
        return false, "Alvo é Master Admin — apenas outro Master pode aplicar essa ação."
    end
    return true
end

--- Helper: notifica e retorna false se o alvo não pode ser atingido.
--- Encapsula o pattern repetido nos NetEvents.
function CheckTargetable(source, target)
    local ok, reason = CanTargetPlayer(source, target)
    if not ok then
        QBCore.Functions.Notify(source, reason or "Acesso negado.", "error", 5000)
        AddLog(source, 'mri_Qadmin', 'security', 'warn', ('Hierarquia: %s tentou ação em %s mas foi bloqueado (%s)'):format(GetPlayerName(source) or source, GetPlayerName(target) or target, reason or ''), { actor = source, target = target })
        return false
    end
    return true
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Rate limiting: protege contra admin malicioso ou client comprometido
-- chamando events sensíveis em loop. Uso: RateLimit(source, "key", minIntervalMs)
-- Retorna true se passou, false se bloqueado.
-- ─────────────────────────────────────────────────────────────────────────────
local rateBuckets = {} -- [src] = { [key] = lastMs }

function RateLimit(src, key, minIntervalMs)
    if not src or src <= 0 then return true end
    local now = GetGameTimer()
    local bucket = rateBuckets[src]
    if not bucket then
        bucket = {}
        rateBuckets[src] = bucket
    end
    local last = bucket[key]
    if last and (now - last) < minIntervalMs then
        return false
    end
    bucket[key] = now
    return true
end

AddEventHandler('playerDropped', function()
    rateBuckets[source] = nil
end)

--- Escapa wildcards LIKE (%, _, \) e remove caracteres não-imprimíveis.
--- Use sempre que interpolar `search` do client em `LIKE '%...%'`.
--- Também aplica cap de tamanho para limitar full-scans.
--- @param search string|nil
--- @param maxLen number|nil default 64
--- @return string
function SanitizeLikeSearch(search, maxLen)
    if type(search) ~= 'string' or search == '' then return '' end
    maxLen = maxLen or 64
    if #search > maxLen then search = search:sub(1, maxLen) end
    -- Remove ASCII control chars
    search = search:gsub('[%c]', '')
    -- Escapa LIKE wildcards (em MySQL: % _ \)
    search = search:gsub('\\', '\\\\')
    search = search:gsub('%%', '\\%%')
    search = search:gsub('_', '\\_')
    return search
end
