std = "lua54"
max_line_length = false

-- Ignora: argumento não utilizado, variável de loop não utilizada
ignore = { "212", "213" }

globals = {
    -- FiveM runtime
    "Citizen", "exports", "vector2", "vector3", "vector4",

    -- Eventos
    "AddEventHandler", "RegisterNetEvent", "TriggerEvent",
    "TriggerServerEvent", "TriggerClientEvent", "TriggerLatentClientEvent",

    -- Comandos e permissões
    "RegisterCommand", "ExecuteCommand", "IsPlayerAceAllowed",

    -- Players / entidades
    "GetPlayerName", "GetPlayerPed", "GetPlayerPing",
    "GetPlayerIdentifier", "GetPlayerIdentifiers", "GetPlayers",
    "NetworkGetNetworkIdFromEntity", "NetworkGetEntityFromNetworkId",
    "GetEntityCoords",

    -- Timers
    "SetTimeout", "Wait",

    -- Callbacks (ox_lib)
    "lib", "locale",

    -- MySQL (oxmysql)
    "MySQL",

    -- QBCore
    "QBCore",

    -- Globals de estado (client)
    "PlayerData", "LocalPlayer",

    -- Cache de dados (client)
    "Cache",
}
