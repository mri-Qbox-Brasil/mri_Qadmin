local Cache = {}

function GetCoreData()
    Debug('debug', ('GetCoreData called. Using consolidated cache.'))

    return {
        items = Cache.items or {},
        vehicles = Cache.vehicles or {},
        commands = Cache.commands or {},
        resources = Cache.resources or {},
        jobs = Cache.groups and Cache.groups.jobs or {},
        gangs = Cache.groups and Cache.groups.gangs or {},
        pedlist = Cache.peds or {},
        locations = Cache.locations or {},
        actions = Config.Actions,
        playerActions = Config.PlayerActions,
        otherActions = Cache.otherActions or Config.OtherActions,
        permissionDefinitions = Cache.permissionDefinitions or {},
        categoryDefinitions = Cache.categoryDefinitions or {},
        vehicleImages = Config.VehicleImages,
        webrtcUrl = Config.WebRTCUrl,
        players = Cache.players and Cache.players.data or {},
        playersTotal = Cache.players and Cache.players.total or 0,
        playersPages = Cache.players and Cache.players.pages or 1,
    }
end

-- ox resolves item images on the client (client.image, inventory:imagepath); the server list has neither.
function WithItemImages(items)
    if type(items) ~= 'table' or GetResourceState('ox_inventory') ~= 'started' then return items end
    local oxItems = exports.ox_inventory:Items() or {}
    local imagePath = GetConvar('inventory:imagepath', 'nui://ox_inventory/web/images')
    for _, item in ipairs(items) do
        local data = oxItems[item.item]
        item.image = data and data.client and data.client.image or ('%s/%s.png'):format(imagePath, item.item)
    end
    return items
end

function SetDataCache(data)
    for k, v in pairs(data) do
        Cache[k] = v
    end
end
_G.SetDataCache = SetDataCache

function HasInitialData()
    return Cache.permissionDefinitions ~= nil and #Cache.permissionDefinitions > 0
end

function GetData()
    local data = GetCoreData()
    SendNUIMessage({
        action = "data",
        data = data,
    })
end
