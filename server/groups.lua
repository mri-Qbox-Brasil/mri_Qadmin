-- `players` can hold tens of thousands of rows: never load it whole, count in SQL and page members.

local MEMBERS_PAGE_SIZE = 50
local SEARCH_LIMIT = 100

local GROUP_FIELDS = { job = 'job', gang = 'gang' }

local BOSSMENU_RESOURCE = 'mri_Qbossmenu'

-- CAST keeps the GROUP BY temp table in memory: the raw JSON value is LONGTEXT and spills to disk.
local COUNTS_SQL = [[
    SELECT
        CAST(JSON_UNQUOTE(JSON_EXTRACT(job, '$.name')) AS CHAR(64)) AS job_name,
        CAST(JSON_UNQUOTE(JSON_EXTRACT(gang, '$.name')) AS CHAR(64)) AS gang_name,
        COUNT(*) AS total
    FROM players%s
    GROUP BY job_name, gang_name
]]

local MEMBERS_SQL = [[
    SELECT citizenid, charinfo, %s AS group_info
    FROM players
    WHERE JSON_UNQUOTE(JSON_EXTRACT(%s, '$.name')) = ?%s
    ORDER BY citizenid
    LIMIT ? OFFSET ?
]]

local SEARCH_SQL = [[
    SELECT citizenid, charinfo, job, gang
    FROM players
    WHERE (LOWER(charinfo) LIKE ? OR LOWER(citizenid) LIKE ?)%s
    ORDER BY citizenid
    LIMIT ?
]]

local function getDefinitions()
    if GetResourceState('qbx_core') == 'started' then
        return exports.qbx_core:GetJobs() or {}, exports.qbx_core:GetGangs() or {}
    end
    return QBCore.Shared.Jobs or {}, QBCore.Shared.Gangs or {}
end

local function fullName(charinfo)
    charinfo = charinfo or {}
    return (charinfo.firstname or "N/A") .. ' ' .. (charinfo.lastname or "")
end

-- Optional extras from mri_Qbossmenu (logo, balance, hiring, playtime); nil when it is not running.
local function bossmenuExport(name, ...)
    if GetResourceState(BOSSMENU_RESOURCE) ~= 'started' then return nil end
    local args = table.pack(...)
    local ok, result = pcall(function()
        local resource = exports[BOSSMENU_RESOURCE]
        return resource[name](resource, table.unpack(args, 1, args.n))
    end)
    return ok and result or nil
end

local function decode(value)
    if type(value) ~= 'string' or value == '' then return {} end
    local ok, result = pcall(json.decode, value)
    return ok and type(result) == 'table' and result or {}
end

-- Online characters plus their citizenids, which the DB queries exclude.
local function getOnline()
    local players, cids = {}, {}
    for _, player in pairs(QBCore.Functions.GetQBPlayers()) do
        local playerData = player.PlayerData
        if playerData and playerData.citizenid then
            players[#players + 1] = playerData
            cids[#cids + 1] = playerData.citizenid
        end
    end
    return players, cids
end

local function matchesSearch(playerData, lowerSearch)
    return string.find(string.lower(fullName(playerData.charinfo)), lowerSearch, 1, true) ~= nil
        or string.find(string.lower(playerData.citizenid or ''), lowerSearch, 1, true) ~= nil
end

local function sortedList(groups)
    local list = {}
    for _, group in pairs(groups) do list[#list + 1] = group end
    table.sort(list, function(a, b) return (a.label or "") < (b.label or "") end)
    return list
end

local function buildGroups()
    local allJobs, allGangs = getDefinitions()
    local jobs, gangs = {}, {}

    for name, job in pairs(allJobs) do
        jobs[name] = { name = name, label = job.label, type = 'job', grades = job.grades or {} }
    end
    for name, gang in pairs(allGangs) do
        gangs[name] = { name = name, label = gang.label, type = 'gang', grades = gang.grades or {} }
    end

    return jobs, gangs
end

function GetGroupsCatalog()
    local jobs, gangs = buildGroups()
    return { jobs = sortedList(jobs), gangs = sortedList(gangs) }
end

-- Online members count from memory: their job may have changed since the last save.
function GetGroupsData()
    local jobs, gangs = buildGroups()
    for _, group in pairs(jobs) do group.memberCount, group.onlineCount = 0, 0 end
    for _, group in pairs(gangs) do group.memberCount, group.onlineCount = 0, 0 end

    local online, onlineCids = getOnline()
    for _, playerData in ipairs(online) do
        local job = playerData.job and jobs[playerData.job.name]
        if job then
            job.memberCount = job.memberCount + 1
            job.onlineCount = job.onlineCount + 1
        end
        local gang = playerData.gang and gangs[playerData.gang.name]
        if gang then
            gang.memberCount = gang.memberCount + 1
            gang.onlineCount = gang.onlineCount + 1
        end
    end

    local rows
    if #onlineCids > 0 then
        rows = MySQL.query.await(COUNTS_SQL:format(' WHERE citizenid NOT IN (?)'), { onlineCids })
    else
        rows = MySQL.query.await(COUNTS_SQL:format(''))
    end

    for _, row in ipairs(rows or {}) do
        local total = tonumber(row.total) or 0
        local job = row.job_name and jobs[row.job_name]
        if job then job.memberCount = job.memberCount + total end
        local gang = row.gang_name and gangs[row.gang_name]
        if gang then gang.memberCount = gang.memberCount + total end
    end

    local bossmenu = bossmenuExport('GetQadminGroupInfo')
    if bossmenu then
        for groupType, groups in pairs({ job = jobs, gang = gangs }) do
            for name, extra in pairs(bossmenu[groupType] or {}) do
                local group = groups[name]
                if group then
                    group.displayLabel = extra.displayLabel
                    group.logo = extra.logo
                    group.balance = extra.balance
                    group.hiring = extra.hiring == true
                end
            end
        end
    end

    return { jobs = sortedList(jobs), gangs = sortedList(gangs), bossmenuPlugin = bossmenu and bossmenu.pluginId or nil }
end

lib.callback.register('mri_Qadmin:callback:GetGroupsData', function(src)
    if not CheckPerms(src, 'qadmin.page.groups') then return { jobs = {}, gangs = {} } end
    return GetGroupsData()
end)

-- Online members all come on the first page, offline ones are paged from the DB.
lib.callback.register('mri_Qadmin:callback:GetGroupMembers', function(src, groupName, groupType, offset)
    local empty = { members = {}, hasMore = false, nextOffset = 0 }
    if not CheckPerms(src, 'qadmin.page.groups') then return empty end

    local field = GROUP_FIELDS[groupType]
    if not field or type(groupName) ~= 'string' or groupName == '' or #groupName > 64 then return empty end
    offset = math.max(0, math.floor(tonumber(offset) or 0))

    local members = {}
    local online, onlineCids = getOnline()
    if offset == 0 then
        for _, playerData in ipairs(online) do
            local group = playerData[field]
            if group and group.name == groupName then
                members[#members + 1] = {
                    id = playerData.source,
                    name = fullName(playerData.charinfo),
                    cid = playerData.citizenid,
                    grade = group.grade,
                    online = true,
                }
            end
        end
        table.sort(members, function(a, b) return a.name < b.name end)
    end

    local params = { groupName }
    local onlineClause = ''
    if #onlineCids > 0 then
        onlineClause = ' AND citizenid NOT IN (?)'
        params[#params + 1] = onlineCids
    end
    -- One extra row tells whether there is a next page without a COUNT over the table.
    params[#params + 1] = MEMBERS_PAGE_SIZE + 1
    params[#params + 1] = offset

    local rows = MySQL.query.await(MEMBERS_SQL:format(field, field, onlineClause), params) or {}
    local hasMore = #rows > MEMBERS_PAGE_SIZE

    for i = 1, math.min(#rows, MEMBERS_PAGE_SIZE) do
        local row = rows[i]
        members[#members + 1] = {
            id = row.citizenid,
            name = fullName(decode(row.charinfo)),
            cid = row.citizenid,
            grade = decode(row.group_info).grade,
            online = false,
        }
    end

    local cids = {}
    for i = 1, #members do cids[i] = members[i].cid end
    local playtime = bossmenuExport('GetQadminMemberPlaytime', groupName, groupType, cids)
    if playtime then
        for _, member in ipairs(members) do member.playTime = playtime[member.cid] or 0 end
    end

    return { members = members, hasMore = hasMore, nextOffset = offset + MEMBERS_PAGE_SIZE }
end)

-- Matches across every group, returned with their job and gang.
lib.callback.register('mri_Qadmin:callback:SearchGroupMembers', function(src, search)
    local empty = { members = {}, hasMore = false }
    if not CheckPerms(src, 'qadmin.page.groups') then return empty end

    local likeSearch = SanitizeLikeSearch(search, 64)
    if likeSearch == '' then return empty end
    local lowerSearch = string.lower(search)

    local members = {}
    local online, onlineCids = getOnline()
    for _, playerData in ipairs(online) do
        if matchesSearch(playerData, lowerSearch) then
            members[#members + 1] = {
                id = playerData.source,
                name = fullName(playerData.charinfo),
                cid = playerData.citizenid,
                online = true,
                job = playerData.job and { name = playerData.job.name, grade = playerData.job.grade },
                gang = playerData.gang and { name = playerData.gang.name, grade = playerData.gang.grade },
            }
        end
    end

    local pattern = '%' .. string.lower(likeSearch) .. '%'
    local params = { pattern, pattern }
    local onlineClause = ''
    if #onlineCids > 0 then
        onlineClause = ' AND citizenid NOT IN (?)'
        params[#params + 1] = onlineCids
    end
    params[#params + 1] = SEARCH_LIMIT + 1

    local rows = MySQL.query.await(SEARCH_SQL:format(onlineClause), params) or {}
    local hasMore = #rows > SEARCH_LIMIT

    for i = 1, math.min(#rows, SEARCH_LIMIT) do
        local row = rows[i]
        local job, gang = decode(row.job), decode(row.gang)
        members[#members + 1] = {
            id = row.citizenid,
            name = fullName(decode(row.charinfo)),
            cid = row.citizenid,
            online = false,
            job = { name = job.name, grade = job.grade },
            gang = { name = gang.name, grade = gang.grade },
        }
    end

    return { members = members, hasMore = hasMore }
end)
