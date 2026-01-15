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

local function getPlayers()
    local players = {}
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

    for k, v in pairs(GetPlayers) do
        local playerData = v.PlayerData
        local vehicles = getVehicles(playerData.citizenid)

        players[#players + 1] = {
            id = k,
            name = playerData.charinfo.firstname .. ' ' .. playerData.charinfo.lastname,
            birthdate = playerData.charinfo.birthdate,
            phone = playerData.charinfo.phone,
            cid = playerData.citizenid,
            license = QBCore.Functions.GetIdentifier(k, 'license'),
            license2 = QBCore.Functions.GetIdentifier(k, 'license2'),
            discord = QBCore.Functions.GetIdentifier(k, 'discord'),
            steam = QBCore.Functions.GetIdentifier(k, 'steam'),
            fivem = QBCore.Functions.GetIdentifier(k, 'fivem'),
            ip = QBCore.Functions.GetIdentifier(k, 'ip'),
            job = playerData.job,
            gang = playerData.gang,
            money = playerData.money,
            vehicles = vehicles,
            metadata = playerData.metadata,
            last_loggedout = playerData.lastLoggedOut,
            ping = GetPlayerPing(k),
            online = true
        }
    end

    local result = MySQL.Sync.fetchAll("SELECT * FROM players")
    for _, player in ipairs(result) do
        local isOnline = false

        for _, onlinePlayer in ipairs(players) do
            if onlinePlayer.cid == player.citizenid then
                isOnline = true
                break
            end
        end

        if not isOnline then
            local vehicles = getVehicles(player.citizenid)

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

            players[#players + 1] = {
                id = nil,
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
                vehicles = vehicles,
                metadata = player.metadata,
                last_loggedout = player.last_logged_out,
                online = false
            }
        end
    end

    table.sort(players, function(a, b)
        if a.online == b.online then
            return a.name < b.name
        end
        return a.online and not b.online
    end)

    return players
end

lib.callback.register('mri_Qadmin:callback:GetPlayers', function(source)
    return getPlayers()
end)

RegisterNetEvent('mri_Qadmin:server:SetJob', function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(source, data.perms) then return end
    local src = source

    local playerId, Job, Grade = selectedData["Player"].value, selectedData["Job"].value, selectedData["Grade"].value
    local Player = QBCore.Functions.GetPlayer(tonumber(playerId))
    if not Player then
        print(playerId)
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
    end
end)


-- Set Gang
RegisterNetEvent('mri_Qadmin:server:SetGang', function(data, selectedData)
    local data = CheckDataFromKey(data)
    if not data or not CheckPerms(source, data.perms) then return end
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
