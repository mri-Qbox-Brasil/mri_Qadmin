local function getGroups()
    local jobs, gangs = {}, {}

    local allJobs
    if GetResourceState('qbx_core') == 'started' then allJobs = exports.qbx_core:GetJobs() else allJobs = QBCore.Shared.Jobs end

    local allGangs
    if GetResourceState('qbx_core') == 'started' then allGangs = exports.qbx_core:GetGangs() else allGangs = QBCore.Shared.Gangs end

    local function addMember(groupTable, groupData, playerData, online)
        local member = {
            id = playerData.source or playerData.citizenid or "N/A",
            name = (playerData.charinfo and playerData.charinfo.firstname or "N/A") .. ' ' .. (playerData.charinfo and playerData.charinfo.lastname or ""),
            cid = playerData.citizenid or "N/A",
            job = groupData.name,
            grade = groupData.grade,
            online = online
        }
        table.insert(groupTable, member)
    end

    for k, v in pairs(allJobs) do
        jobs[k] = {
            name = k,
            label = v.label,
            members = {}
        }
    end

    for k, v in pairs(allGangs) do
        gangs[k] = {
            name = k,
            label = v.label,
            members = {}
        }
    end

    local onlinePlayers = QBCore.Functions.GetQBPlayers()
    for _, player in pairs(onlinePlayers) do
        local playerData = player.PlayerData

        if jobs[playerData.job.name] then
            addMember(jobs[playerData.job.name].members, playerData.job, playerData, true)
        end

        if gangs[playerData.gang.name] then
            addMember(gangs[playerData.gang.name].members, playerData.gang, playerData, true)
        end
    end

    local result = MySQL.Sync.fetchAll("SELECT * FROM players")
    for _, player in ipairs(result) do
        local isOnline = false
        for _, onlinePlayer in pairs(onlinePlayers) do
            if onlinePlayer.PlayerData.citizenid == player.citizenid then
                isOnline = true
                break
            end
        end

        if not isOnline then
            local charinfo = json.decode(player.charinfo) or {}
            local jobinfo = json.decode(player.job) or {}
            local ganginfo = json.decode(player.gang) or {}

            if jobinfo.name and jobinfo.name ~= "" then
                if not jobs[jobinfo.name] then
                    jobs[jobinfo.name] = {
                        name = jobinfo.name.. " - UNDEFINED",
                        label = jobinfo.label,
                        members = {}
                    }
                end
                addMember(jobs[jobinfo.name].members, jobinfo, { charinfo = charinfo, citizenid = player.citizenid }, false)
            end

            if ganginfo.name and ganginfo.name ~= "" then
                if not gangs[ganginfo.name] then
                    gangs[ganginfo.name] = {
                        name = ganginfo.name.. " - UNDEFINED",
                        label = ganginfo.label,
                        members = {}
                    }
                end
                addMember(gangs[ganginfo.name].members, ganginfo, { charinfo = charinfo, citizenid = player.citizenid }, false)
            end
        end
    end

    local jobsList, gangsList = {}, {}
    for _, job in pairs(jobs) do table.insert(jobsList, job) end
    for _, gang in pairs(gangs) do table.insert(gangsList, gang) end

    local function sortMembers(group)
        table.sort(group.members, function(a, b)
            if a.online == b.online then
                return a.name < b.name
            end
            return a.online and not b.online
        end)
    end

    for _, job in ipairs(jobsList) do sortMembers(job) end
    for _, gang in ipairs(gangsList) do sortMembers(gang) end

    return { jobs = jobsList, gangs = gangsList }
end

lib.callback.register('mri_Qadmin:callback:GetGroupsData', function(source)
    return getGroups()
end)
