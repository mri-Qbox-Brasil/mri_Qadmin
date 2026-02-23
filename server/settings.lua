local QBCore = exports['qb-core']:GetCoreObject()

local function LoadSettings()
    print('^2[mri_Qadmin] Iniciando o sincronizador de configuracoes com DB...^7')

    -- We avoid loading specific wall configs into the global server Config
    local dbSettings = MySQL.query.await('SELECT * FROM mri_qadmin_settings WHERE `name` NOT LIKE "wall_%"')
    local loadedKeys = {}

    -- Update Config with values from DB
    if dbSettings then
        for _, row in ipairs(dbSettings) do
            local key = row.name
            local val = row.value
            local t = row.type

            -- Cast appropriately
            if t == 'number' then val = tonumber(val)
            elseif t == 'boolean' then val = (val == 'true')
            end

            Config[key] = val
            loadedKeys[key] = true
        end
        print(('^2[mri_Qadmin] Configuracoes carregadas do DB: %s^7'):format(#dbSettings))
    end

    local seedCount = 0
    -- Seed missing primitive Configs to DB
    for k, v in pairs(Config) do
        local t = type(v)
        if (t == 'string' or t == 'number' or t == 'boolean') and not loadedKeys[k] then
            -- Avoid accidentally sending 'wall_' prefixes here if they were globally initialized
            if type(k) == 'string' and not string.find(k, "wall_") then
                pcall(function()
                    MySQL.insert.await('INSERT INTO mri_qadmin_settings (`name`, `value`, `type`) VALUES (?, ?, ?)', {k, tostring(v), t})
                end)
                print(('^3[mri_Qadmin] Semeando (Seed) config default p/ DB: %s = %s^7'):format(k, tostring(v)))
                seedCount = seedCount + 1
            end
        end
    end

    print(('^2[mri_Qadmin] Sincronizacao de Settings concluida. Total Semeado: %s^7'):format(seedCount))
end

-- Helper to extract only primitive settings for client sync
function GetPrimitiveSettings()
    local payload = {}
    for k, v in pairs(Config) do
        local t = type(v)
        if (t == 'string' or t == 'number' or t == 'boolean') and type(k) == 'string' and not string.find(k, "wall_") then
            payload[k] = v
        end
    end
    return payload
end

-- Load settings on startup
AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        LoadSettings()
    end
end)

-- API for NUI to read settings (only primitive ones)
lib.callback.register('mri_Qadmin:callback:GetSettings', function(source)
    if not IsPlayerAceAllowed(source, 'qadmin.page.settings') then return {} end
    return GetPrimitiveSettings()
end)

-- API for NUI to update settings
RegisterNetEvent('mri_Qadmin:server:UpdateSetting', function(key, value)
    local src = source
    if not IsPlayerAceAllowed(src, 'qadmin.page.settings') then return end

    local t = type(value)

    -- Update Database
    MySQL.insert.await([[
        INSERT INTO mri_qadmin_settings (`name`, `value`, `type`)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE `value` = ?, `type` = ?
    ]], {key, tostring(value), t, tostring(value), t})

    -- Update Server Config in memory
    Config[key] = value

    Debug(('[mri_Qadmin] Setting Updated by %s: %s = %s'):format(GetPlayerName(src), key, tostring(value)))

    -- Broadcast to ALL clients to update their local Config table
    TriggerClientEvent('mri_Qadmin:client:UpdateSettings', -1, GetPrimitiveSettings())
    QBCore.Functions.Notify(src, 'Configuração salva e sincronizada!', 'success')
end)

-- Send settings to client when they fully load
AddEventHandler('mri_Qadmin:server:PlayerPermissionsReady', function(src)
    TriggerClientEvent('mri_Qadmin:client:UpdateSettings', src, GetPrimitiveSettings())
end)
