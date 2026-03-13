local function getVehicles(cid)
    local result = MySQL.query.await(
        'SELECT vehicle, plate, fuel, engine, body FROM player_vehicles WHERE citizenid = ?', { cid }
    )
    local vehicles = {}

    for k, v in pairs(result) do
        local vehicleData = QBCore.Shared.Vehicles[v.vehicle]

        if not vehicleData then
            vehicleData = {
                name = ("Veículo Desconhecido (%s)"):format(v.vehicle or "N/A"),
                brand = "N/A",
                model = v.vehicle or "N/A"
            }
        end

        vehicles[#vehicles + 1] = {
            id = k,
            cid = cid,
            label = vehicleData.name,
            brand = vehicleData.brand,
            model = vehicleData.model,
            plate = v.plate,
            fuel = v.fuel,
            engine = v.engine,
            body = v.body
        }
    end

    return vehicles
end

local function getPlayers(page, pageSize, search)
    page = math.max(1, tonumber(page) or 1)
    pageSize = math.max(1, tonumber(pageSize) or 20)
    local offset = (page - 1) * pageSize

    local onlinePlayers = {}
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

    -- Process Online Players First
    for k, v in pairs(GetPlayers) do
        local playerData = v.PlayerData
        local name = playerData.charinfo.firstname .. ' ' .. playerData.charinfo.lastname
        local license = QBCore.Functions.GetIdentifier(k, 'license')
        local cid = playerData.citizenid
        local idStr = tostring(k)

        -- Filter Online Players if search is active
        local match = true
        if search and search ~= "" then
            local lowerSearch = string.lower(search)
            local searchId = tonumber(search)

            local nameMatch = string.find(string.lower(name), lowerSearch, 1, true)
            local licenseMatch = license and string.find(string.lower(license), lowerSearch, 1, true)
            local cidMatch = cid and string.find(string.lower(cid), lowerSearch, 1, true)
            local idMatch = searchId and (k == searchId)

            if not (nameMatch or licenseMatch or cidMatch or idMatch) then
                match = false
            end
        end

        if match then
            onlinePlayers[#onlinePlayers + 1] = {
                id = k,
                name = name,
                birthdate = playerData.charinfo.birthdate,
                phone = playerData.charinfo.phone,
                bucket = GetPlayerRoutingBucket(k),
                ping = GetPlayerPing(k),
                cid = cid,
                license = license,
                license2 = QBCore.Functions.GetIdentifier(k, 'license2'),
                discord = QBCore.Functions.GetIdentifier(k, 'discord'),
                steam = QBCore.Functions.GetIdentifier(k, 'steam'),
                fivem = QBCore.Functions.GetIdentifier(k, 'fivem'),
                ip = QBCore.Functions.GetIdentifier(k, 'ip'),
                job = playerData.job,
                gang = playerData.gang,
                money = (function()
                    local m = {}
                    for k, v in pairs(playerData.money) do
                        table.insert(m, { name = k, amount = v })
                    end
                    return m
                end)(),
                health = GetEntityHealth(GetPlayerPed(k)),
                armor = GetPedArmour(GetPlayerPed(k)),
                vehicles = {},
                metadata = playerData.metadata,
                last_loggedout = playerData.lastLoggedOut,
                online = true
            }
        end
    end

    -- Sort online players by ID (or name?)
    table.sort(onlinePlayers, function(a, b) return a.id < b.id end)

    local totalOnline = #onlinePlayers
    local resultPlayers = {}

    -- Fill from Online Players
    local onlineStartIndex = offset + 1
    local onlineEndIndex = offset + pageSize

    for i = onlineStartIndex, math.min(onlineEndIndex, totalOnline) do
        resultPlayers[#resultPlayers + 1] = onlinePlayers[i]
    end

    -- Calculate how many slots left for DB players
    local slotsRemaining = pageSize - #resultPlayers
    local totalRecords = totalOnline -- Will add DB count

    -- If we still need players and aren't search-constrained to online only (unless we want to search DB too)
    -- We ALWAYS search DB if we want full results.

    -- DB Offset: If we fully consumed online players, we advance into DB
    -- If page starts after online players, offset is (page_start - totalOnline)
    -- If page overlaps, offset is 0 for DB (and we take LIMIT slotsRemaining)

    local dbOffset = math.max(0, offset - totalOnline)
    local dbModels = {}

    if slotsRemaining > 0 or (totalOnline < offset) then
        -- Count DB matches
        local countQuery = "SELECT COUNT(*) as count FROM players"
        local queryParams = {}
        local whereClause = ""

        if search and search ~= "" then
            local lowerSearch = "%" .. string.lower(search) .. "%"
            whereClause = " WHERE (LOWER(charinfo) LIKE ? OR LOWER(citizenid) LIKE ? OR LOWER(license) LIKE ?)"
            queryParams = { lowerSearch, lowerSearch, lowerSearch }

            -- Deduplication Logic:
            -- Since online players already exist in the DB, we exclude their CitizenIDs
            -- from the query to avoid duplicates and ensure Online players show first.
            -- Performance Note: "NOT IN" with very large ID sets can be slow on some SQL engines.

            if #onlinePlayers > 0 then
                local cids = {}
                for _, p in ipairs(onlinePlayers) do
                    cids[#cids + 1] = "'" .. p.cid .. "'"
                end
                whereClause = whereClause .. " AND citizenid NOT IN (" .. table.concat(cids, ",") .. ")"
            end
        else
            if #onlinePlayers > 0 then
                 local cids = {}
                for _, p in ipairs(onlinePlayers) do
                    cids[#cids + 1] = "'" .. p.cid .. "'"
                end
                 whereClause = " WHERE citizenid NOT IN (" .. table.concat(cids, ",") .. ")"
            end
        end

        local dbCount = MySQL.scalar.await(countQuery .. whereClause, queryParams)
        totalRecords = totalOnline + (dbCount or 0)

        if slotsRemaining > 0 then
            local selectQuery = "SELECT * FROM players" .. whereClause .. " LIMIT ? OFFSET ?"
            local selectParams = { table.unpack(queryParams) }
            selectParams[#selectParams + 1] = slotsRemaining
            selectParams[#selectParams + 1] = dbOffset

            local dbResults = MySQL.query.await(selectQuery, selectParams)

            for _, player in ipairs(dbResults) do
                 -- Process DB Player
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
                    cid = player.citizenid,
                    license = player.license,
                    discord = nil,
                    steam = nil,
                    job = job_obj,
                    gang = gang_obj,
                    dob = charinfo.birthdate or "Desconhecido",
                    money = (function()
                        local m = {}
                        for k, v in pairs(moneyinfo) do
                            table.insert(m, { name = k, amount = v })
                        end
                        return m
                    end)(),
                    phone = charinfo.phone or "Desconhecido",
                    vehicles = {}, -- Load later
                    metadata = player.metadata,
                    last_loggedout = player.last_logged_out,
                    online = false
                }
            end
        end
    else
        -- Just count total records if we didn't query
        -- We still need the count from DB to show correct pagination total
        -- Repeat the count query logic or optimize?
        -- For now, let's just run the count query always if we didn't run the select.
        -- Actually, we can skip this if we know we are way past bounds, but we need Total for UI.
         local countQuery = "SELECT COUNT(*) as count FROM players"
         local queryParams = {}
         local whereClause = ""
          if search and search ~= "" then
            local lowerSearch = "%" .. string.lower(search) .. "%"
            whereClause = " WHERE (LOWER(charinfo) LIKE ? OR LOWER(citizenid) LIKE ? OR LOWER(license) LIKE ?)"
            queryParams = { lowerSearch, lowerSearch, lowerSearch }
             if #onlinePlayers > 0 then
                local cids = {}
                for _, p in ipairs(onlinePlayers) do
                    cids[#cids + 1] = "'" .. p.cid .. "'"
                end
                whereClause = whereClause .. " AND citizenid NOT IN (" .. table.concat(cids, ",") .. ")"
            end
        else
            if #onlinePlayers > 0 then
                 local cids = {}
                for _, p in ipairs(onlinePlayers) do
                    cids[#cids + 1] = "'" .. p.cid .. "'"
                end
                 whereClause = " WHERE citizenid NOT IN (" .. table.concat(cids, ",") .. ")"
            end
        end
        local dbCount = MySQL.scalar.await(countQuery .. whereClause, queryParams)
        totalRecords = totalOnline + (dbCount or 0)
    end

    -- Populate Vehicles for the RESULT only (20 players)
    if #resultPlayers > 0 then
        local cids = {}
        local cidMap = {}
        for i, p in ipairs(resultPlayers) do
            cids[#cids + 1] = p.cid
            cidMap[p.cid] = i
            p.vehicles = {} -- Initialize
        end

        -- Batch query for all vehicles of these 20 players
        local vResults = MySQL.query.await('SELECT * FROM player_vehicles WHERE citizenid IN (?)', { cids })
        if vResults then
            for _, v in ipairs(vResults) do
                local pIndex = cidMap[v.citizenid]
                if pIndex then
                    local vehicleData = QBCore.Shared.Vehicles[v.vehicle] or {
                        name = ("Veículo Desconhecido (%s)"):format(v.vehicle or "N/A"),
                        brand = "N/A",
                        model = v.vehicle or "N/A"
                    }

                    table.insert(resultPlayers[pIndex].vehicles, {
                        cid = v.citizenid,
                        label = vehicleData.name,
                        brand = vehicleData.brand,
                        model = vehicleData.model,
                        plate = v.plate,
                        fuel = v.fuel,
                        engine = v.engine,
                        body = v.body
                    })
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

lib.callback.register('mri_Qadmin:callback:GetPlayers', function(source, page, limit, search)
    return getPlayers(page, limit, search)
end)

RegisterNetEvent('mri_Qadmin:server:SetJob', function(actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.set_job') then
        return
    end
    local src = source

    local playerId = GetValue(selectedData, "Player")
    local Job = GetValue(selectedData, "Job")
    local Grade = GetValue(selectedData, "Grade")

    local Player = QBCore.Functions.GetPlayer(tonumber(playerId))
    if not Player then
        Debug(playerId)
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

    for searchgrade, info in pairs(jobInfo["grades"]) do
        if tonumber(searchgrade) == tonumber(Grade) then
            grade = info
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

        QBCore.Functions.Notify(src, locale("jobset", name, Job, grade.name), 'success', 5000)
        TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
    end
end)

-- Set Gang
RegisterNetEvent('mri_Qadmin:server:SetGang', function(actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.set_gang') then
        return
    end
    local src = source

    local playerId = GetValue(selectedData, "Player")
    local Gang = GetValue(selectedData, "Gang")
    local Grade = GetValue(selectedData, "Grade")

    local Player = QBCore.Functions.GetPlayer(tonumber(playerId))
    if not Player then
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

    for searchgrade, info in pairs(GangInfo["grades"]) do
        if tonumber(searchgrade) == tonumber(Grade) then
            grade = info
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

        QBCore.Functions.Notify(src, locale("gangset", name, Gang, grade.name), 'success', 5000)
        TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
    end
end)

-- Set Perms
RegisterNetEvent("mri_Qadmin:server:SetPerms", function(dataKey, selectedData)
    local actionData = CheckDataFromKey(dataKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end
    local src = source
    local rank = GetValue(selectedData, "Permissions")
    local targetId = GetValue(selectedData, "Player")
    local tPlayer = QBCore.Functions.GetPlayer(tonumber(targetId))

    if not tPlayer then
        QBCore.Functions.Notify(src, locale("not_online"), "error", 5000)
        return
    end

    local name = tPlayer.PlayerData.charinfo.firstname .. ' ' .. tPlayer.PlayerData.charinfo.lastname

    QBCore.Functions.AddPermission(tPlayer.PlayerData.source, tostring(rank))
    QBCore.Functions.Notify(tPlayer.PlayerData.source, locale("player_perms", name, rank), 'success', 5000)
end)

-- Remove Stress
RegisterNetEvent("mri_Qadmin:server:RemoveStress", function(dataKey, selectedData)
    local actionData = CheckDataFromKey(dataKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end
    local src = source
    local playerOpt = GetValue(selectedData, 'Player (Optional)')
    local targetId = playerOpt and tonumber(playerOpt) or src
    local tPlayer = QBCore.Functions.GetPlayer(tonumber(targetId))

    if not tPlayer then
        QBCore.Functions.Notify(src, locale("not_online"), "error", 5000)
        return
    end

    TriggerClientEvent('mri_Qadmin:client:removeStress', targetId)

    QBCore.Functions.Notify(tPlayer.PlayerData.source, locale("removed_stress_player"), 'success', 5000)
end)

-- Set Vital (Unified event for Health, Armor, Hunger, Thirst, Stress)
RegisterNetEvent("mri_Qadmin:server:SetVital", function(targetId, vital, value)
    if not CheckPerms(source, 'qadmin.action.revive') then return end
    local src = source
    local tPlayer = QBCore.Functions.GetPlayer(tonumber(targetId))

    if not tPlayer then
        QBCore.Functions.Notify(src, locale("not_online"), "error", 5000)
        return
    end

    local ped = GetPlayerPed(tonumber(targetId))
    if vital == "health" then
        TriggerClientEvent("mri_Qadmin:client:SetHealth", tonumber(targetId), tonumber(value))
    elseif vital == "armor" then
        SetPedArmour(ped, tonumber(value))
    elseif vital == "hunger" or vital == "thirst" or vital == "stress" then
        tPlayer.Functions.SetMetaData(vital, tonumber(value))
    end

    -- Broadcast update immediate
    local ped = GetPlayerPed(tonumber(targetId))
    TriggerClientEvent('mri_Qadmin:client:UpdatePlayerVitals', -1, {
        id = tonumber(targetId),
        health = (vital == "health") and tonumber(value) or GetEntityHealth(ped),
        armor = (vital == "armor") and tonumber(value) or GetPedArmour(ped),
        metadata = tPlayer.PlayerData.metadata
    })

    -- Notify staff
    QBCore.Functions.Notify(src, locale("vitals_set_success"):format(vital, value, targetId), "success")
end)

-- Helper to broadcast vitals/metadata updates to all admins
local function broadcastVitalsUpdate(playerId)
    local player = QBCore.Functions.GetPlayer(playerId)
    if not player then return end

    local ped = GetPlayerPed(playerId)
    TriggerClientEvent('mri_Qadmin:client:UpdatePlayerVitals', -1, {
        id = playerId,
        health = GetEntityHealth(ped),
        armor = GetPedArmour(ped),
        metadata = player.PlayerData.metadata
    })
end

-- Sync Vitals from Client (e.g., from HUD events)
RegisterNetEvent("mri_Qadmin:server:SyncVitals", function(vitals)
    local src = source
    local player = QBCore.Functions.GetPlayer(src)
    if not player then return end

    -- This is now a simple broadcast bridge. We do NOT call SetMetaData here
    -- to avoid infinite HUD update loops and persistent data overwrites.
    -- Direct changes are only made via 'mri_Qadmin:server:SetVital' (buttons).

    local metadataClone = {}
    for k, v in pairs(player.PlayerData.metadata) do
        metadataClone[k] = v
    end
    for k, v in pairs(vitals) do
        metadataClone[k] = tonumber(v)
    end

    TriggerClientEvent('mri_Qadmin:client:UpdatePlayerVitals', -1, {
        id = src,
        health = GetEntityHealth(GetPlayerPed(src)),
        armor = GetPedArmour(GetPlayerPed(src)),
        metadata = metadataClone
    })
end)

-- Sync Death Status from Client
RegisterNetEvent('mri_Qadmin:server:SyncDeathStatus', function(isDead)
    local src = source
    local player = QBCore.Functions.GetPlayer(src)
    if not player then return end

    -- Sync to metadata for standard QBCore compatibility
    player.Functions.SetMetaData("isdead", isDead)
end)

-- Real-time Metadata Sync
AddEventHandler('QBCore:Server:SetMetaData', function(source, meta, value)
    local src = source
    if meta == 'hunger' or meta == 'thirst' or meta == 'stress' or meta == 'isdead' then
        Debug("SetMetaData detectado para ID: " .. tostring(src), meta, value)
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
