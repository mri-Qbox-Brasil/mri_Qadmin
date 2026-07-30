
-- ─────────────────────────────────────────────────────────────────────────────
-- Memo do COUNT da paginação.
--
-- A UI pagina a lista de jogadores em sequência (página 1, 2, 3...) para montar
-- a tabela completa. Cada página refazia o mesmo COUNT(*) sobre `players` — num
-- servidor com 10k personagens, dezenas de full scans idênticos em poucos
-- segundos, só para recalcular um total que não mudou.
--
-- TTL curto de propósito: cobre a duração de uma varredura de paginação e nada
-- além disso. A chave inclui a quantidade de jogadores online porque ela muda o
-- WHERE (os online são excluídos do COUNT do banco e contados à parte).
-- ─────────────────────────────────────────────────────────────────────────────
local COUNT_CACHE_TTL = 10000
local countCache = {}

local function getCachedDbCount(cacheKey, runQuery)
    local now = GetGameTimer()
    local hit = countCache[cacheKey]
    if hit and (now - hit.at) < COUNT_CACHE_TTL then
        return hit.value
    end

    local value = runQuery()
    countCache[cacheKey] = { value = value, at = now }

    -- Buscas distintas criam chaves distintas; limpa as vencidas para a tabela
    -- não crescer sem limite com termos de busca digitados pelos admins.
    for key, entry in pairs(countCache) do
        if (now - entry.at) >= COUNT_CACHE_TTL then
            countCache[key] = nil
        end
    end

    return value
end

local function getPlayers(page, pageSize, search)
    page = math.max(1, tonumber(page) or 1)
    pageSize = math.max(1, tonumber(pageSize) or 20)
    local offset = (page - 1) * pageSize

    local GetPlayers = QBCore.Functions.GetQBPlayers()

    local allJobs
    if GetResourceState('qbx_core') == 'started' then
        allJobs = exports.qbx_core:GetJobs()
    else
        allJobs = QBCore.Shared.Jobs
    end

    local allGangs
    if GetResourceState('qbx_core') == 'started' then
        allGangs = exports.qbx_core:GetGangs()
    else
        allGangs = QBCore.Shared.Gangs
    end

    -- Process Online Players First (Optimized: Filter first, process details only for current page)
    local filteredOnlineIds = {}
    local lowerSearch = search and string.lower(search) or nil
    local searchId = tonumber(search)

    for k, v in pairs(GetPlayers) do
        local playerData = v.PlayerData
        if playerData and playerData.charinfo then
            local charinfo = playerData.charinfo
            local name = (charinfo.firstname or "N/A") .. ' ' .. (charinfo.lastname or "")
            local citizenid = playerData.citizenid or "N/A"
            local license = QBCore.Functions.GetIdentifier(k, 'license')

            local match = true
            if lowerSearch and lowerSearch ~= "" then
                local nameMatch = string.find(string.lower(name), lowerSearch, 1, true)
                local licenseMatch = license and string.find(string.lower(license), lowerSearch, 1, true)
                local cidMatch = citizenid and string.find(string.lower(citizenid), lowerSearch, 1, true)
                local idMatch = searchId and (k == searchId)

                if not (nameMatch or licenseMatch or cidMatch or idMatch) then
                    match = false
                end
            end

            if match then
                filteredOnlineIds[#filteredOnlineIds + 1] = k
            end
        end
    end

    -- Sort online player IDs
    table.sort(filteredOnlineIds)

    local totalOnline = #filteredOnlineIds
    local resultPlayers = {}

    -- Fill from Online Players (Only process detailed data for the current page)
    local onlineStartIndex = offset + 1
    local onlineEndIndex = offset + pageSize

    for i = onlineStartIndex, math.min(onlineEndIndex, totalOnline) do
        local k = filteredOnlineIds[i]
        local v = GetPlayers[k]
        local playerData = v.PlayerData
        local charinfo = playerData.charinfo

        resultPlayers[#resultPlayers + 1] = {
            id = k,
            name = (charinfo.firstname or "N/A") .. ' ' .. (charinfo.lastname or ""),
            birthdate = charinfo.birthdate or "N/A",
            phone = charinfo.phone or "N/A",
            bucket = GetPlayerRoutingBucket(k),
            ping = GetPlayerPing(k),
            cid = playerData.citizenid or "N/A",
            citizenid = playerData.citizenid or "N/A",
            license = QBCore.Functions.GetIdentifier(k, 'license'),
            license2 = QBCore.Functions.GetIdentifier(k, 'license2'),
            discord = QBCore.Functions.GetIdentifier(k, 'discord'),
            steam = QBCore.Functions.GetIdentifier(k, 'steam'),
            fivem = QBCore.Functions.GetIdentifier(k, 'fivem'),
            ip = QBCore.Functions.GetIdentifier(k, 'ip'),
            job = playerData.job,
            gang = playerData.gang,
            money = (function()
                local m = {}
                if playerData.money then
                    for mk, mv in pairs(playerData.money) do
                        table.insert(m, { name = mk, amount = mv })
                    end
                end
                return m
            end)(),
            health = GetEntityHealth(GetPlayerPed(k)),
            armor = GetPedArmour(GetPlayerPed(k)),
            vehicles = {},
            metadata = playerData.metadata or {},
            charinfo = charinfo,
            last_loggedout = playerData.lastLoggedOut,
            online = true
        }
    end

    -- Calculate how many slots left for DB players
    local slotsRemaining = pageSize - #resultPlayers
    local totalRecords

    -- DB Offset: If we fully consumed online players, we advance into DB
    local dbOffset = math.max(0, offset - totalOnline)

    -- Build Online Exclusion List (Strictly using citizenid string)
    local onlineCids = {}
    for _, k in ipairs(filteredOnlineIds) do
        local p = GetPlayers[k]
        if p and p.PlayerData and p.PlayerData.citizenid then
            onlineCids[#onlineCids + 1] = p.PlayerData.citizenid
        end
    end

    -- 1. Get Total Record Count (Online + Filtered DB)
    local countQuery = "SELECT COUNT(*) as count FROM players"
    local queryParams = {}
    local whereClause = ""

    -- Sanitiza search para evitar LIKE wildcard abuse (DoS via full scan)
    local cleanSearch = SanitizeLikeSearch(search, 64)
    if cleanSearch ~= "" then
        -- Nome distinto do `lowerSearch` do escopo de fora (busca literal em memória):
        -- este é o padrão LIKE, já sanitizado, e só ele vai para o SQL.
        local likePattern = "%" .. string.lower(cleanSearch) .. "%"
        whereClause = " WHERE (LOWER(charinfo) LIKE ? OR LOWER(citizenid) LIKE ? OR LOWER(license) LIKE ?)"
        queryParams = { likePattern, likePattern, likePattern }

        if #onlineCids > 0 then
            whereClause = whereClause .. " AND citizenid NOT IN (?)"
            queryParams[#queryParams + 1] = onlineCids
        end
    elseif #onlineCids > 0 then
        whereClause = " WHERE citizenid NOT IN (?)"
        queryParams = { onlineCids }
    end

    local dbCount = getCachedDbCount(('%s|%d'):format(cleanSearch, #onlineCids), function()
        return MySQL.scalar.await(countQuery .. whereClause, queryParams)
    end)
    totalRecords = totalOnline + (dbCount or 0)

    -- 2. Fetch DB Page results if needed
    if slotsRemaining > 0 then
        local selectQuery = "SELECT * FROM players" .. whereClause .. " LIMIT ? OFFSET ?"
        local selectParams = { table.unpack(queryParams) }
        selectParams[#selectParams + 1] = slotsRemaining
        selectParams[#selectParams + 1] = dbOffset

        local dbResults = MySQL.query.await(selectQuery, selectParams)
        if dbResults then
            for _, player in ipairs(dbResults) do
                local charinfo = json.decode(player.charinfo) or {}
                local jobinfo = json.decode(player.job) or {}
                local ganginfo = json.decode(player.gang) or {}
                local moneyinfo = player.money and json.decode(player.money) or {}

                local job_obj = { label = "Unemployed", grade = { name = "Unemployed", level = 0 } }
                if jobinfo.name and allJobs[jobinfo.name] then
                    local gradeName = "Desconhecido"
                    local gradeLevel = jobinfo.grade
                    if type(jobinfo.grade) == "table" then
                        gradeName = jobinfo.grade.name
                        gradeLevel = jobinfo.grade.level
                    else
                        local gradeKey = tostring(jobinfo.grade)
                        local gradeData = allJobs[jobinfo.name].grades[gradeKey]
                        if gradeData then gradeName = gradeData.name end
                    end
                    job_obj = {
                        label = allJobs[jobinfo.name].label,
                        name = jobinfo.name,
                        grade = { name = gradeName, level = gradeLevel }
                    }
                end

                local gang_obj = { label = "No Gang", grade = { name = "None", level = 0 } }
                if ganginfo.name and allGangs[ganginfo.name] then
                    local gradeName = "Desconhecido"
                    local gradeLevel = ganginfo.grade
                    if type(ganginfo.grade) == "table" then
                        gradeName = ganginfo.grade.name
                        gradeLevel = ganginfo.grade.level
                    else
                        local gradeKey = tostring(ganginfo.grade)
                        local gradeData = allGangs[ganginfo.name].grades[gradeKey]
                        if gradeData then gradeName = gradeData.name end
                    end
                    gang_obj = {
                        label = allGangs[ganginfo.name].label,
                        name = ganginfo.name,
                        grade = { name = gradeName, level = gradeLevel }
                    }
                end

                resultPlayers[#resultPlayers + 1] = {
                    id = nil,
                    bucket = nil,
                    ping = nil,
                    name = (charinfo.firstname or "N/A") .. ' ' .. (charinfo.lastname or ""),
                    license = player.license,
                    job = job_obj,
                    gang = gang_obj,
                    money = (function()
                        local m = {}
                        for k, v in pairs(moneyinfo) do
                            table.insert(m, { name = k, amount = v })
                        end
                        return m
                    end)(),
                    phone = charinfo.phone or "Desconhecido",
                    birthdate = charinfo.birthdate or "Desconhecido",
                    vehicles = {},
                    metadata = player.metadata and json.decode(player.metadata) or {},
                    charinfo = charinfo,
                    citizenid = player.citizenid or "N/A",
                    cid = player.citizenid or "N/A",
                    last_loggedout = player.last_logged_out,
                    online = false
                }
            end
        end
    end

    -- 3. Populate Vehicles for the results (Batch query)
    if #resultPlayers > 0 then
        local targetCids = {}
        local cidMap = {}
        for i, p in ipairs(resultPlayers) do
            if p.citizenid and p.citizenid ~= "N/A" then
                targetCids[#targetCids + 1] = p.citizenid
                cidMap[p.citizenid] = i
            end
            p.vehicles = {}
        end

        if #targetCids > 0 then
            local vResults = MySQL.query.await('SELECT * FROM player_vehicles WHERE citizenid IN (?)', { targetCids })
            if vResults then
                for _, v in ipairs(vResults) do
                    local pIndex = cidMap[v.citizenid]
                    if pIndex then
                        local vData = QBCore.Shared.Vehicles[v.vehicle] or {
                            name = ("Desconhecido (%s)"):format(v.vehicle or "N/A"),
                            brand = "N/A",
                            model = v.vehicle or "N/A"
                        }
                        table.insert(resultPlayers[pIndex].vehicles, {
                            cid = v.citizenid,
                            label = vData.name,
                            brand = vData.brand,
                            model = vData.model,
                            plate = v.plate,
                            fuel = v.fuel,
                            engine = v.engine,
                            body = v.body
                        })
                    end
                end
            end
        end
    end

    -- 4. Batch ban lookup for all players
    if #resultPlayers > 0 then
        local targetLicenses = {}
        local licenseToIdx = {}
        for i, p in ipairs(resultPlayers) do
            local lic = p.license
            if lic and lic ~= 'N/A' then
                targetLicenses[#targetLicenses + 1] = lic
                licenseToIdx[lic] = i
                local alt
                if lic:find('^license2:') then
                    alt = lic:gsub('^license2:', 'license:')
                elseif lic:find('^license:') then
                    alt = lic:gsub('^license:', 'license2:')
                end
                if alt then
                    targetLicenses[#targetLicenses + 1] = alt
                    if not licenseToIdx[alt] then licenseToIdx[alt] = i end
                end
            end
        end

        if #targetLicenses > 0 then
            local banRows = MySQL.query.await('SELECT id, license, reason, expire, bannedby FROM bans WHERE license IN (?)', { targetLicenses })
            if banRows then
                for _, b in ipairs(banRows) do
                    local idx = licenseToIdx[b.license]
                    if idx and not resultPlayers[idx].ban then
                        resultPlayers[idx].ban = {
                            id = b.id,
                            reason = b.reason or '',
                            expire = b.expire,
                            bannedby = b.bannedby or '',
                            isPermanent = b.expire == 2147483647
                        }
                    end
                end
            end
        end
    end

    return {
        data = resultPlayers,
        total = totalRecords,
        pages = math.ceil(totalRecords / pageSize)
    }
end

_G.getPlayers = getPlayers

lib.callback.register('mri_Qadmin:callback:GetPlayers', function(src, page, limit, search)
    if not CheckPerms(src, 'qadmin.page.players') then return { players = {}, total = 0 } end
    return getPlayers(page, limit, search)
end)

RegisterNetEvent('mri_Qadmin:server:SetJob', function(_actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.set_job') then
        return
    end
    local src = source

    local playerId = GetValue(selectedData, "Player")
    local Job = GetValue(selectedData, "Job")
    local Grade = tonumber(GetValue(selectedData, "Grade"))

    if type(Job) ~= 'string' or Job == '' then
        return TriggerClientEvent('QBCore:Notify', src, 'Job inválido.', 'error')
    end
    if not Grade or Grade < 0 or Grade > 100 then
        return TriggerClientEvent('QBCore:Notify', src, 'Grade inválido.', 'error')
    end
    Grade = math.floor(Grade)

    local Player = QBCore.Functions.GetPlayer(tonumber(playerId))
    if Player then
        -- Hierarquia: protege apenas alvos online (offline por citizenid não é resolvível).
        if not CheckTargetable(src, Player.PlayerData.source) then return end
    else
        Player = QBCore.Functions.GetOfflinePlayerByCitizenId(playerId)
        if not Player then
            TriggerClientEvent('QBCore:Notify', src, 'Jogador offline não encontrado.', 'error')
            return
        end
    end
    local name, citizenid, jobInfo, grade

    local JOBS
    if GetResourceState('qbx_core') == 'started' then JOBS = exports.qbx_core:GetJobs() else JOBS = QBCore.Shared.Jobs end
    jobInfo = JOBS[Job]
    if not jobInfo then
        TriggerClientEvent('QBCore:Notify', src, 'Trabalho inválido.', 'error')
        return
    end

    for searchgrade, gradeinfo in pairs(jobInfo["grades"]) do
        if tonumber(searchgrade) == tonumber(Grade) then
            grade = gradeinfo
            break
        end
    end

    if not grade then
        TriggerClientEvent('QBCore:Notify', src, 'Cargo inválido.', 'error')
        return
    end

    if Player then
        name = Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname
        citizenid = Player.PlayerData.citizenid

        if GetResourceState('qbx_core') == 'started' then
            exports.qbx_core:SetJob(tostring(citizenid), tostring(Job), tonumber(Grade))
        else
            Player.Functions.SetJob(tostring(Job), tonumber(Grade))
            Player.Functions.Save()
        end

        if Config.RenewedPhone then
            exports['qb-phone']:hireUser(tostring(Job), citizenid, tonumber(Grade))
        end

        QBCore.Functions.Notify(src, locale("notifications.jobset", name, Job, grade.name), 'success', 5000)
        AddLog(src, 'mri_Qadmin', 'players', 'info', ('Cargo: %s recebeu cargo %s (%s)'):format(name, Job, grade.name), { target_name = name, target_citizenid = citizenid, target_src = Player.PlayerData.source, job = Job, grade = Grade })
        TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
    end
end)

-- Set Gang
RegisterNetEvent('mri_Qadmin:server:SetGang', function(_actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.set_gang') then
        return
    end
    local src = source

    local playerId = GetValue(selectedData, "Player")
    local Gang = GetValue(selectedData, "Gang")
    local Grade = tonumber(GetValue(selectedData, "Grade"))

    if type(Gang) ~= 'string' or Gang == '' then
        return TriggerClientEvent('QBCore:Notify', src, 'Gang inválido.', 'error')
    end
    if not Grade or Grade < 0 or Grade > 100 then
        return TriggerClientEvent('QBCore:Notify', src, 'Grade inválido.', 'error')
    end
    Grade = math.floor(Grade)

    local Player = QBCore.Functions.GetPlayer(tonumber(playerId))
    if Player then
        -- Hierarquia: protege apenas alvos online (offline por citizenid não é resolvível).
        if not CheckTargetable(src, Player.PlayerData.source) then return end
    else
        Player = QBCore.Functions.GetOfflinePlayerByCitizenId(playerId)
        if not Player then
            TriggerClientEvent('QBCore:Notify', src, 'Jogador offline não encontrado.', 'error')
            return
        end
    end
    local name, citizenid, GangInfo, grade

    local GANGS
    if GetResourceState('qbx_core') == 'started' then GANGS = exports.qbx_core:GetGangs() else GANGS = QBCore.Shared.Gangs end
    GangInfo = GANGS[Gang]
    if not GangInfo then
        TriggerClientEvent('QBCore:Notify', src, 'Gangue inválida.', 'error')
        return
    end

    for searchgrade, gradeinfo in pairs(GangInfo["grades"]) do
        if tonumber(searchgrade) == tonumber(Grade) then
            grade = gradeinfo
            break
        end
    end

    if not grade then
        TriggerClientEvent('QBCore:Notify', src, 'Cargo inválido.', 'error')
        return
    end

    if Player then
        name = Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname
        citizenid = Player.PlayerData.citizenid

        if GetResourceState('qbx_core') == 'started' then
            exports.qbx_core:SetGang(tostring(citizenid), tostring(Gang), tonumber(Grade))
        else
            Player.Functions.SetGang(tostring(Gang), tonumber(Grade))
            Player.Functions.Save()
        end

        QBCore.Functions.Notify(src, locale("notifications.gangset", name, Gang, grade.name), 'success', 5000)
        AddLog(src, 'mri_Qadmin', 'players', 'info', ('Gangue: %s recebeu gangue %s (%s)'):format(name, Gang, grade.name), { target_name = name, target_citizenid = citizenid, target_src = Player.PlayerData.source, gang = Gang, grade = Grade })
        TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
    end
end)

-- Set Perms
-- SECURITY: ranks que escalam para god/admin do QBCore só podem ser atribuídos
-- por quem tem qadmin.master, senão um admin de tier médio promoveria players
-- ao god QBCore (que auto-sincroniza para o grupo "god" do Qadmin via
-- QBCoreAutoSync).
local ELEVATED_QBCORE_RANKS = { god = true, admin = true, superadmin = true }
RegisterNetEvent("mri_Qadmin:server:SetPerms", function(dataKey, selectedData)
    if not CheckPerms(source, 'qadmin.page.permissions') then return end
    local src = source
    local rank = GetValue(selectedData, "Permissions")
    local targetId = tonumber(GetValue(selectedData, "Player"))
    if not CheckTargetable(src, targetId) then return end
    local tPlayer = QBCore.Functions.GetPlayer(targetId)

    if not tPlayer then
        QBCore.Functions.Notify(src, locale("notifications.not_online"), "error", 5000)
        return
    end

    rank = tostring(rank or ''):lower()
    if rank == '' then
        QBCore.Functions.Notify(src, "Rank inválido.", "error", 5000)
        return
    end

    if ELEVATED_QBCORE_RANKS[rank] and not HasPerms(src, 'qadmin.master') then
        QBCore.Functions.Notify(src, "Apenas Master Admins podem atribuir o rank '" .. rank .. "'.", "error", 5000)
        AddLog(src, 'mri_Qadmin', 'players', 'error', ('Tentativa de escalada: %s tentou atribuir rank "%s"'):format(GetPlayerName(src), rank), { target = targetId, rank = rank })
        return
    end

    local name = tPlayer.PlayerData.charinfo.firstname .. ' ' .. tPlayer.PlayerData.charinfo.lastname

    QBCore.Functions.AddPermission(tPlayer.PlayerData.source, rank)
    QBCore.Functions.Notify(tPlayer.PlayerData.source, locale("notifications.player_perms", name, rank), 'success', 5000)
    local permLogData = GetTargetData(tonumber(targetId))
    permLogData.rank = rank
    AddLog(src, 'mri_Qadmin', 'players', 'warn', ('Permissão: %s recebeu permissão %s'):format(name, rank), permLogData)
end)

-- Remove Stress
RegisterNetEvent("mri_Qadmin:server:RemoveStress", function(dataKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.remove_stress') then return end
    local src = source
    local playerOpt = GetValue(selectedData, 'Player (Optional)')
    local targetId = playerOpt and tonumber(playerOpt) or src
    if not CheckTargetable(src, tonumber(targetId)) then return end
    local tPlayer = QBCore.Functions.GetPlayer(tonumber(targetId))

    if not tPlayer then
        QBCore.Functions.Notify(src, locale("notifications.not_online"), "error", 5000)
        return
    end

    TriggerClientEvent('mri_Qadmin:client:removeStress', targetId)

    QBCore.Functions.Notify(tPlayer.PlayerData.source, locale("notifications.removed_stress_player"), 'success', 5000)
    AddLog(src, 'mri_Qadmin', 'players', 'info', ('Stress removido de %s %s'):format(tPlayer.PlayerData.charinfo.firstname, tPlayer.PlayerData.charinfo.lastname), GetTargetData(tonumber(targetId)))
end)

-- Set Vital (Unified event for Health, Armor, Hunger, Thirst, Stress)
RegisterNetEvent("mri_Qadmin:server:SetVital", function(targetId, vital, value)
    -- Health usa revive perm (curar vida); demais vitals usam set_vital
    local requiredPerm = vital == 'health' and 'qadmin.action.revive' or 'qadmin.action.set_vital'
    if not CheckPerms(source, requiredPerm) then return end
    local src = source
    if not CheckTargetable(src, tonumber(targetId)) then return end
    local tPlayer = QBCore.Functions.GetPlayer(tonumber(targetId))

    if not tPlayer then
        QBCore.Functions.Notify(src, locale("notifications.not_online"), "error", 5000)
        return
    end

    local numValue = tonumber(value)
    if not numValue then
        QBCore.Functions.Notify(src, "Valor de vital inválido.", "error", 5000)
        return
    end

    -- Clamp ranges para evitar valores absurdos / negativos
    local VITAL_RANGES = {
        health = { min = 0, max = 200 },
        armor  = { min = 0, max = 100 },
        hunger = { min = 0, max = 100 },
        thirst = { min = 0, max = 100 },
        stress = { min = 0, max = 100 },
    }
    local range = VITAL_RANGES[vital]
    if not range then
        QBCore.Functions.Notify(src, "Vital desconhecido: " .. tostring(vital), "error", 5000)
        return
    end
    if numValue < range.min then numValue = range.min end
    if numValue > range.max then numValue = range.max end
    value = numValue

    local ped = GetPlayerPed(tonumber(targetId))
    if vital == "health" then
        TriggerClientEvent("mri_Qadmin:client:SetHealth", tonumber(targetId), numValue)
    elseif vital == "armor" then
        SetPedArmour(ped, numValue)
    elseif vital == "hunger" or vital == "thirst" or vital == "stress" then
        tPlayer.Functions.SetMetaData(vital, numValue)
    end

    local targetName = tPlayer.PlayerData.charinfo.firstname .. ' ' .. tPlayer.PlayerData.charinfo.lastname
    local vitalLogData = GetTargetData(tonumber(targetId))
    vitalLogData.vital = vital
    vitalLogData.value = value
    AddLog(src, 'mri_Qadmin', 'players', 'info', ('Vital: %s de %s definido para %s'):format(vital, targetName, value), vitalLogData)

    -- Broadcast update immediate to admins only
    local admins = GetAdminPlayers()
    for _, adminId in ipairs(admins) do
        TriggerClientEvent('mri_Qadmin:client:UpdatePlayerVitals', adminId, {
            id = tonumber(targetId),
            health = (vital == "health") and tonumber(value) or GetEntityHealth(ped),
            armor = (vital == "armor") and tonumber(value) or GetPedArmour(ped),
            metadata = tPlayer.PlayerData.metadata
        })
    end

    -- Notify staff
    QBCore.Functions.Notify(src, locale("vitals.set_success"):format(vital, value, targetId), "success")
end)

-- Helper to broadcast vitals/metadata updates to all admins
local function broadcastVitalsUpdate(playerId)
    local player = QBCore.Functions.GetPlayer(playerId)
    if not player then return end

    local ped = GetPlayerPed(playerId)
    local admins = GetAdminPlayers()
    for _, adminId in ipairs(admins) do
        TriggerClientEvent('mri_Qadmin:client:UpdatePlayerVitals', adminId, {
            id = playerId,
            health = GetEntityHealth(ped),
            armor = GetPedArmour(ped),
            metadata = player.PlayerData.metadata
        })
    end
end

-- Sync Vitals from Client (e.g., from HUD events)
RegisterNetEvent("mri_Qadmin:server:SyncVitals", function(vitals)
    local src = source
    if not CheckPerms(src, 'qadmin.open') then return end

    local player = QBCore.Functions.GetPlayer(src)
    if not player then return end

    -- This is now a simple broadcast bridge for admins.
    -- Dynamic data (health/armor) is fetched from ped for security.

    local metadataClone = {}
    for k, v in pairs(player.PlayerData.metadata) do
        metadataClone[k] = v
    end
    for k, v in pairs(vitals) do
        metadataClone[k] = tonumber(v)
    end

    local admins = GetAdminPlayers()
    for _, adminId in ipairs(admins) do
        TriggerClientEvent('mri_Qadmin:client:UpdatePlayerVitals', adminId, {
            id = src,
            health = GetEntityHealth(GetPlayerPed(src)),
            armor = GetPedArmour(GetPlayerPed(src)),
            metadata = metadataClone
        })
    end
end)

-- Sync Death Status from Client
RegisterNetEvent('mri_Qadmin:server:SyncDeathStatus', function(isDead)
    local src = source
    if not RateLimit(src, 'sync_death', 500) then return end
    -- Espelha o gate isAdminPlayer do client (client/main.lua): só quem tem
    -- acesso ao painel sincroniza status de morte. Sem isto, qualquer client
    -- não-admin dispara o net event direto e forja/limpa o próprio isdead.
    if not HasPerms(src, 'qadmin.open') then return end
    local player = QBCore.Functions.GetPlayer(src)
    if not player then return end

    -- Coerce para boolean — qualquer outra coisa é rejeitada.
    if type(isDead) ~= 'boolean' then return end

    -- Sync to metadata for standard QBCore compatibility
    player.Functions.SetMetaData("isdead", isDead)
end)

-- Real-time Metadata Sync
AddEventHandler('QBCore:Server:SetMetaData', function(source, meta, value)
    local src = source
    if meta == 'hunger' or meta == 'thirst' or meta == 'stress' or meta == 'isdead' then
        Debug('debug', ('[mri_Qadmin] SetMetaData detectado para ID: %s'):format(tostring(src)))
        broadcastVitalsUpdate(src)
    end
end)

-- StateBag handlers for universal death status coverage
local function GetPlayerFromBagName(bagName)
    local playerHandle = bagName:gsub('player:', '')
    return tonumber(playerHandle)
end

AddStateBagChangeHandler("dead", nil, function(bagName, _, _, _, _)
    local playerId = GetPlayerFromBagName(bagName)
    if not playerId then return end
    broadcastVitalsUpdate(playerId)
end)

AddStateBagChangeHandler("isdead", nil, function(bagName, _, _, _, _)
    local playerId = GetPlayerFromBagName(bagName)
    if not playerId then return end
    broadcastVitalsUpdate(playerId)
end)
