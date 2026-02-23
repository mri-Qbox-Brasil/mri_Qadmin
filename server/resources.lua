local resources = {}
local resourceCache = {}

local function getResourceData(resourceName)
    if not resourceCache[resourceName] then
        resourceCache[resourceName] = {
            author = GetResourceMetadata(resourceName, "author"),
            version = GetResourceMetadata(resourceName, "version"),
            description = GetResourceMetadata(resourceName, "description"),
        }
    end

    local cache = resourceCache[resourceName]
    return {
        name = resourceName,
        author = cache.author,
        version = cache.version,
        description = cache.description,
        resourceState = GetResourceState(resourceName),
    }
end

local function refreshResources()
    local totalResources = GetNumResources()
    resources = {}
    for i = 0, totalResources - 1 do
        local resourceName = GetResourceByFindIndex(i)
        resources[#resources + 1] = getResourceData(resourceName)
    end
    return resources
end

-- Pre-populate cache on start
CreateThread(function()
    refreshResources()
end)

lib.callback.register('mri_Qadmin:callback:GetResources', function(source)
    return refreshResources()
end)


lib.callback.register('mri_Qadmin:callback:ChangeResourceState', function(source, data, perms)
    Debug(json.encode(data))
    if not CheckPerms(source, "qadmin.action.change_resource") then return end

    if data.state == "start" then
        StartResource(data.name)
        Debug("Started " .. data.name)
    elseif data.state == "stop" then
        StopResource(data.name)
        Debug("Stopped " .. data.name)
    elseif data.state == "restart" then
        StopResource(data.name)
        Wait(200)
        StartResource(data.name)
        Debug("Restarted " .. data.name)
    end

    if data.state == "check-updates" then
        local repo = ('mri-Qbox-Brasil/%s'):format(data.name)
        lib.versionCheck(repo)
        Debug("Version Checked ", repo, " for " .. data.name)
    end

    return refreshResources()
end)

AddEventHandler("onResourceStart", function(resourceName)
    local data = getResourceData(resourceName)
    TriggerClientEvent('mri_Qadmin:client:UpdateResourceState', -1, data)
end)

AddEventHandler("onResourceStop", function(resourceName)
    local data = getResourceData(resourceName)
    TriggerClientEvent('mri_Qadmin:client:UpdateResourceState', -1, data)
end)
