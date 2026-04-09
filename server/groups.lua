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
        jobs[k] = { name = k, label = v.label, type = 'job', members = {} }
    end

    for k, v in pairs(allGangs) do
        gangs[k] = { name = k, label = v.label, type = 'gang', members = {} }
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

    -- Optimized SQL: Only fetch required columns
    local result = MySQL.query.await("SELECT charinfo, citizenid, job, gang FROM players")
    if result then
        for _, player in ipairs(result) do
            local citizenid = player.citizenid
            -- Skip if already online
            local isOnline = false
            for _, onlinePlayer in pairs(onlinePlayers) do
                if onlinePlayer.PlayerData.citizenid == citizenid then
                    isOnline = true
                    break
                end
            end

            if not isOnline then
                local charinfo = json.decode(player.charinfo) or {}
                local jobinfo = json.decode(player.job) or {}
                local ganginfo = json.decode(player.gang) or {}

                if jobinfo.name and jobs[jobinfo.name] then
                    addMember(jobs[jobinfo.name].members, jobinfo, { charinfo = charinfo, citizenid = citizenid }, false)
                end
                if ganginfo.name and gangs[ganginfo.name] then
                    addMember(gangs[ganginfo.name].members, ganginfo, { charinfo = charinfo, citizenid = citizenid }, false)
                end
            end
        end
    end

    local jobsList, gangsList = {}, {}
    for _, job in pairs(jobs) do table.insert(jobsList, job) end
    for _, gang in pairs(gangs) do table.insert(gangsList, gang) end

    local function sortMembers(group)
        table.sort(group.members, function(a, b)
            if a.online == b.online then return (a.name or "") < (b.name or "") end
            return a.online and not b.online
        end)
    end

    for _, job in ipairs(jobsList) do sortMembers(job) end
    for _, gang in ipairs(gangsList) do sortMembers(gang) end

    table.sort(jobsList, function(a, b) return (a.label or "") < (b.label or "") end)
    table.sort(gangsList, function(a, b) return (a.label or "") < (b.label or "") end)

    return { jobs = jobsList, gangs = gangsList }
end
_G.GetGroupsData = getGroups

lib.callback.register('mri_Qadmin:callback:GetGroupsData', function(_source)
    return getGroups()
end)

lib.callback.register('mri_Qadmin:callback:GetGroupMembers', function(source, groupName, groupType)
-- ... keeping the other callback too just in case ...
    if not CheckPerms(source, 'qadmin.page.groups') then return {} end

    local members = {}
    local onlinePlayers = QBCore.Functions.GetQBPlayers()

    -- Process Online Players
    for _, player in pairs(onlinePlayers) do
        local playerData = player.PlayerData
        local targetGroup = (groupType == 'job') and playerData.job or playerData.gang

        if targetGroup.name == groupName then
            table.insert(members, {
                id = player.PlayerData.source,
                name = (playerData.charinfo.firstname or "N/A") .. ' ' .. (playerData.charinfo.lastname or ""),
                cid = playerData.citizenid,
                grade = targetGroup.grade,
                online = true
            })
        end
    end

    -- Process Offline Players from DB
    -- Note: This is still heavy if not indexed, but much better than fetching ALL players
    local field = (groupType == 'job') and 'job' or 'gang'
    local results = MySQL.query.await("SELECT charinfo, citizenid, " .. field .. " as group_info FROM players WHERE " .. field .. " LIKE ?", { '%' .. groupName .. '%' })

    if results then
        for _, player in ipairs(results) do
            local group_info = json.decode(player.group_info) or {}
            if group_info.name == groupName then
                -- Check if already added (online)
                local isOnline = false
                for _, m in ipairs(members) do
                    if m.cid == player.citizenid then isOnline = true break end
                end

                if not isOnline then
                    local charinfo = json.decode(player.charinfo) or {}
                    table.insert(members, {
                        id = player.citizenid,
                        name = (charinfo.firstname or "N/A") .. ' ' .. (charinfo.lastname or ""),
                        cid = player.citizenid,
                        grade = group_info.grade,
                        online = false
                    })
                end
            end
        end
    end

    table.sort(members, function(a, b)
        if a.online == b.online then return a.name < b.name end
        return a.online and not b.online
    end)

    return members
end)
