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
            if not (string.find(string.lower(name), lowerSearch) or
                    string.find(string.lower(license or ""), lowerSearch) or
                    string.find(string.lower(cid), lowerSearch) or
                    string.find(idStr, lowerSearch)) then
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
                money = playerData.money.cash,
                bank = playerData.money.bank,
                crypto = playerData.money.crypto,
                vehicles = {}, -- Load vehicles only if needed? For basic list we might not need them? Existing code loaded them. We'll skip for list view performance, load deep on detail?
                -- Existing code loaded vehicles for ALL players. It's expensive (N+1).
                -- Optimization: Return empty vehicles here, and load them on specific "GetPlayerDetails" or just skip for list.
                -- User plan didn't explicitly remove vehicles, but "fetch specific data... only for ~20 players".
                -- We will fetch vehicles for the 20 players we RETURN.
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

            -- exclude online from DB count?
            -- "NOT IN" with 2000 IDs is bad.
            -- Since online is small subset of 7000, usually we can just ignore duplication or handle it?
            -- existing code filtered duplicates.
            -- We can assume `online = true` implies they exist in DB, so DB search WILL find them.
            -- So DB count includes online players.
            -- We need to subtract online matches from DB count to get "Offline DB Count"?
            -- Correct logic: `Total = Online Matches + (DB Matches - Online Matches that are in DB)`
            -- This is too complex for a count query.
            -- Simplified: `Total = DB Matches`. We assume everyone is in DB.
            -- But we want to show Online FIRST.
            -- If we just query DB, we get everyone.
            -- If we paginate DB, we get mixed online/offline.
            -- We want Online First.
            -- Approach:
            -- 1. Get All Online (Filtered).
            -- 2. Query DB (Filtered), but EXCLUDE the specific CIDs we found online.
            -- This ensures Total = #Online + #OfflineDB.

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
                    cash = moneyinfo.cash or 0,
                    crypto = moneyinfo.crypto or 0,
                    bank = moneyinfo.bank or 0,
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
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then
        return
    end
    local src = source

    local playerId, Job, Grade = selectedData["Player"].value, selectedData["Job"].value, selectedData["Grade"].value
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
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then
        return
    end
    local src = source

    local playerId, Gang, Grade = selectedData["Player"].value, selectedData["Gang"].value, selectedData["Grade"].value
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
RegisterNetEvent("mri_Qadmin:server:SetPerms", function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(source, data.perms) then return end
    local src = source
    local rank = selectedData["Permissions"].value
    local targetId = selectedData["Player"].value
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
RegisterNetEvent("mri_Qadmin:server:RemoveStress", function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(source, data.perms) then return end
    local src = source
    local targetId = selectedData['Player (Optional)'] and tonumber(selectedData['Player (Optional)'].value) or src
    local tPlayer = QBCore.Functions.GetPlayer(tonumber(targetId))

    if not tPlayer then
        QBCore.Functions.Notify(src, locale("not_online"), "error", 5000)
        return
    end

    TriggerClientEvent('mri_Qadmin:client:removeStress', targetId)

    QBCore.Functions.Notify(tPlayer.PlayerData.source, locale("removed_stress_player"), 'success', 5000)
end)
