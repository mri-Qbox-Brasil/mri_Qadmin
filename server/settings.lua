local QBCore = exports['qb-core']:GetCoreObject()

local DEFAULT_ACCENT = '#00E699'
local HEX_PATTERN = '^#%x%x%x%x%x%x$'

local function isValidHex(value)
    return type(value) == 'string' and value:match(HEX_PATTERN) ~= nil
end

-- Reaplica a convar replicada `mri:color` a partir do que está persistido no DB.
-- Roda no boot pra que players carreguem com a cor certa antes da primeira NUI render.
local function applyAccentConvar()
    local color = isValidHex(Config.accent_color) and Config.accent_color or DEFAULT_ACCENT
    Config.accent_color = color
    -- API Lua nativa equivalente a `setr mri:color "#hex"` — mais robusta que
    -- ExecuteCommand (sem parsing de string, sem questão de aspas).
    SetConvarReplicated('mri:color', color)
    print(('^2[mri_Qadmin] Convar mri:color aplicada: %s^7'):format(color))
end

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
local function GetPrimitiveSettings()
    local payload = {}
    for k, v in pairs(Config) do
        local t = type(v)
        if (t == 'string' or t == 'number' or t == 'boolean') and type(k) == 'string' and not string.find(k, "wall_") then
            payload[k] = v
        end
    end
    return payload
end
_G.GetPrimitiveSettings = GetPrimitiveSettings

-- API for NUI to read settings (only primitive ones)
lib.callback.register('mri_Qadmin:callback:GetSettings', function(source)
    if not CheckPerms(source, 'qadmin.page.settings') then return nil end
    return GetPrimitiveSettings()
end)

-- API for NUI to update settings
RegisterNetEvent('mri_Qadmin:server:UpdateSetting', function(key, value)
    local src = source
    if not HasPerms(src, 'qadmin.page.settings') then return end

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
    AddLog(src, 'mri_Qadmin', 'server', 'info', ('Configuração: %s definida como %s'):format(key, tostring(value)), { key = key, value = value })
end)

-- Send settings to client when they fully load
AddEventHandler('mri_Qadmin:server:PlayerPermissionsReady', function(src)
    TriggerClientEvent('mri_Qadmin:client:UpdateSettings', src, GetPrimitiveSettings())
end)

local function applyBackgroundConvar()
    local color = Config.background_color or ''
    SetConvarReplicated('mri:backgroundColor', color)
end

RegisterNetEvent('mri_Qadmin:db:ready', function()
    LoadSettings()
    applyAccentConvar()
    applyBackgroundConvar()
end)

-- Broadcast em runtime quando a convar `mri:color` muda (admin via UI ou
-- console). Mesmo padrão do mri_Qmultichar/mri_Qspawn — a suite MRI
-- compartilha a cor de destaque.
AddConvarChangeListener('mri:color', function(name)
    if name ~= 'mri:color' then return end
    local color = GetConvar('mri:color', DEFAULT_ACCENT)
    if not isValidHex(color) then return end
    TriggerClientEvent('mri_Qadmin:client:accentColorChanged', -1, color)
end)

-- Define a cor de fundo global do painel. Persiste no DB e faz broadcast
-- direto (sem convar — fundo é exclusivo do Qadmin UI).
RegisterNetEvent('mri_Qadmin:server:SetGlobalBackgroundColor', function(color)
    local src = source
    if not HasPerms(src, 'qadmin.page.settings') then return end

    color = tostring(color or ''):upper()

    if color ~= '' and not isValidHex(color) then
        QBCore.Functions.Notify(src, 'Cor inválida (esperado #RRGGBB).', 'error')
        return
    end

    MySQL.insert.await([[
        INSERT INTO mri_qadmin_settings (`name`, `value`, `type`)
        VALUES (?, ?, 'string')
        ON DUPLICATE KEY UPDATE `value` = ?, `type` = 'string'
    ]], { 'background_color', color, color })

    Config.background_color = color

    SetConvarReplicated('mri:backgroundColor', color)
    TriggerClientEvent('mri_Qadmin:client:backgroundColorChanged', -1, color)

    QBCore.Functions.Notify(src, color == '' and 'Cor de fundo restaurada ao padrão.' or ('Cor de fundo global definida: %s'):format(color), 'success')
    AddLog(src, 'mri_Qadmin', 'server', 'info',
        ('Cor de fundo alterada para %s'):format(color == '' and 'padrão' or color),
        { color = color })
end)

-- Define a cor de destaque global da suite MRI.
RegisterNetEvent('mri_Qadmin:server:SetGlobalAccentColor', function(color)
    local src = source
    if not HasPerms(src, 'qadmin.page.settings') then return end

    if not isValidHex(color) then
        QBCore.Functions.Notify(src, 'Cor inválida (esperado #RRGGBB).', 'error')
        return
    end

    color = color:upper()

    SetConvarReplicated('mri:color', color)

    MySQL.insert.await([[
        INSERT INTO mri_qadmin_settings (`name`, `value`, `type`)
        VALUES (?, ?, 'string')
        ON DUPLICATE KEY UPDATE `value` = ?, `type` = 'string'
    ]], { 'accent_color', color, color })

    Config.accent_color = color

    -- Não chamamos TriggerClientEvent manualmente: SetConvarReplicated acima já
    -- dispara o AddConvarChangeListener (definido logo abaixo neste arquivo),
    -- que faz o broadcast. Disparar aqui também causaria duplicidade.

    QBCore.Functions.Notify(src, ('Cor global de destaque definida: %s'):format(color), 'success')
    AddLog(src, 'mri_Qadmin', 'server', 'info',
        ('Cor global de destaque alterada para %s'):format(color),
        { color = color })
end)