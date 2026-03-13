-- Global configuration for Luacheck
-- Documentation: https://luacheck.readthedocs.io/en/stable/config.html

-- Standard libraries and FiveM/QBCore globals
globals = {
    -- FiveM / CitizenFX
    "Citizen", "GetHashKey", "Wait", "CreateThread", "SetTimeout",
    "RegisterNetEvent", "TriggerEvent", "TriggerClientEvent", "TriggerServerEvent",
    "AddEventHandler", "RegisterNUICallback", "SendNUIMessage", "exports",
    "GetConvar", "GetConvarInt", "GetResourceState", "GetParentResourceName",
    "GetNumResources", "GetResourceInfo", "IsAceAllowed",
    "GlobalState", "Entity", "Player", "LocalPlayer", "lib",

    -- Commonly used natives (some samples, luacheck usually doesn't have a full native list)
    "GetPlayerPed", "GetEntityCoords", "GetEntityHeading", "GetEntityHealth", "GetPedArmour",
    "SetEntityCoords", "SetEntityHeading", "GetPlayerRoutingBucket", "GetPlayerPing",
    "NetworkIsPlayerActive", "NetworkIsPlayerConnected", "json", "MySQL", "allJobs", "allGangs",

    -- QBCore / Framework specific
    "QBCore", "Config", "locale", "_U", "Debug", "CheckPerms", "CheckDataFromKey", "GetValue"
}

-- Global ignores
ignore = {
    "611", -- line contains only whitespace
    "631", -- line is too long
}

-- Files to exclude
exclude_files = {
    "web/**",
    ".git/**",
    "node_modules/**"
}

-- Path specific configurations
files["server/*.lua"] = {
    globals = { "MySQL" }
}

-- Allow unused arguments if they start with underscore
unused_args = true
ignore = {
    "212", -- unused argument, unless it starts with underscore
}
