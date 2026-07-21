local DEFAULT_ACCENT = '#00E699'
local HEX_PATTERN = '^#%x%x%x%x%x%x$'

local Crud = {
    create = "INSERT INTO mri_qadmin_settings (`name`, `value`, `type`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value` = ?, `type` = ?",
    read = 'SELECT * FROM mri_qadmin_settings WHERE `name` NOT LIKE "wall_%"'
}

local function isValidHex(value)
    return type(value) == 'string' and value:match(HEX_PATTERN) ~= nil
end

--- Rejeita uma alteração de setting avisando o admin e devolvendo o estado real.
--- Necessário porque a NUI atualiza de forma otimista (Settings.tsx aplica o valor no
--- estado antes da resposta) e o client responde cb('ok') incondicionalmente. Sem isto,
--- um valor recusado continuava na tela como se tivesse sido salvo.
--- Reenviar GetPrimitiveSettings() só para este src faz a UI voltar ao valor real —
--- o front já escuta 'updateSettings' (App.tsx) e sobrescreve o estado.
local function RejectSetting(src, message)
    Debug('error', ('UpdateSetting: %s'):format(message))
    Notify(src, message, 'error')
    TriggerClientEvent('mri_Qadmin:client:UpdateSettings', src, GetPrimitiveSettings())
end

local function LoadSettings()
    Debug("debug", locale('settings.logs.initializing'))

    local dbSettings = MySQL.query.await(Crud.read)
    local loadedKeys = {}

    if dbSettings then
        for _, row in ipairs(dbSettings) do
            local key = row.name
            local val = row.value
            local t = row.type

            if t == 'number' then val = tonumber(val)
            elseif t == 'boolean' then val = (val == 'true')
            end

            Config[key] = val
            loadedKeys[key] = true
        end
        Debug("debug", locale('settings.logs.loaded', #dbSettings))
    end

    local seedCount = 0
    for k, v in pairs(Config) do
        local t = type(v)
        if (t == 'string' or t == 'number' or t == 'boolean') and not loadedKeys[k] then
            if type(k) == 'string' and not string.find(k, "wall_") then
                pcall(function()
                    MySQL.insert.await(Crud.create, {k, tostring(v), t, tostring(v), t})
                end)
                Debug("debug", locale('settings.logs.seeded', k, tostring(v)))
                seedCount = seedCount + 1
            end
        end
    end

    Debug("debug", locale('settings.logs.synced', seedCount))
    SetConvarReplicated('ox:printlevel:mri_Qadmin', Config.Logs.PrintLevel or 'info')
end

local function setColor(src, key, color)
    if not CheckPerms(src, 'qadmin.page.settings') then return end

    color = tostring(color or ''):upper()

    if color ~= '' and not isValidHex(color) then
        RejectSetting(src, locale('settings.errors.invalid_color', color))
        return
    end

    local oldColor = Config[key]
    -- Crud.create tem 5 placeholders (INSERT value/type + ON DUPLICATE value/type).
    -- Precisa passar os 5, senão os ? do UPDATE viram null -> "Column 'value' cannot be null".
    MySQL.insert.await(Crud.create, { key, color, 'string', color, 'string' })
    Config[key] = color

    if key == 'accent_color' then
        SetConvarReplicated('mri:color', color)
        TriggerClientEvent('mri_Qadmin:client:accentColorChanged', -1, color)
    elseif key == 'background_color' then
        SetConvarReplicated('mri:backgroundColor', color)
        TriggerClientEvent('mri_Qadmin:client:backgroundColorChanged', -1, color)
    end

    local message = locale('settings.color_changed', locale(("settings.%s"):format(key)), color == '' and locale('common.default') or color)

    Debug("debug", message)
    Notify(src, message, 'success')
    AddLog(src, 'mri_Qadmin', 'server', 'debug', message, { key = key, oldVal = oldColor, newVal = color })
end

lib.callback.register('mri_Qadmin:callback:GetSettings', function(source)
    if not CheckPerms(source, 'qadmin.page.settings') then return nil end
    return GetPrimitiveSettings()
end)

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

-- Chaves de cor devem passar obrigatoriamente por setColor (validação de hex + convar).
local COLOR_KEYS = { accent_color = true, background_color = true }

RegisterNetEvent('mri_Qadmin:server:UpdateSetting', function(key, value)
    local src = source
    if not CheckPerms(src, 'qadmin.page.settings') then return end

    -- Rejeita chaves inválidas: precisa ser string e já existir em Config.
    if type(key) ~= 'string' or string.find(key, "wall_") then
        RejectSetting(src, locale('settings.errors.invalid_key', tostring(key)))
        return
    end

    -- Cores têm um fluxo próprio (setColor) — não permitir bypass da validação de hex.
    if COLOR_KEYS[key] then
        setColor(src, key, value)
        return
    end

    local oldVal = Config[key]
    local oldType = type(oldVal)

    -- Só aceita chaves já existentes que sejam escalares (não sobrescrever subsistemas/tabelas).
    if oldType == 'nil' then
        RejectSetting(src, locale('settings.errors.invalid_key', key))
        return
    end
    if oldType ~= 'string' and oldType ~= 'number' and oldType ~= 'boolean' then
        RejectSetting(src, locale('settings.errors.invalid_key', key))
        return
    end

    -- O tipo do novo valor precisa bater com o existente.
    local t = type(value)
    if t ~= oldType then
        RejectSetting(src, locale('settings.errors.invalid_type', key, oldType, t))
        return
    end

    MySQL.insert.await(Crud.create, {key, tostring(value), t, tostring(value), t})
    Config[key] = value

    local message = locale('settings.logs.updated', key, tostring(oldVal), tostring(value), GetPlayerName(src))

    TriggerClientEvent('mri_Qadmin:client:UpdateSettings', -1, GetPrimitiveSettings())
    Debug("debug", message)
    Notify(src, 'Configuração salva e sincronizada!', 'success')
    AddLog(src, 'mri_Qadmin', 'server', 'debug', message, { key = key, oldVal = oldVal, newVal = value })
end)

AddEventHandler('mri_Qadmin:server:PlayerPermissionsReady', function(src)
    TriggerClientEvent('mri_Qadmin:client:UpdateSettings', src, GetPrimitiveSettings())
end)

AddEventHandler('mri_Qadmin:db:ready', function()
    LoadSettings()
    SetConvarReplicated('mri:color', isValidHex(Config.accent_color) and Config.accent_color or DEFAULT_ACCENT)
    SetConvarReplicated('mri:backgroundColor', isValidHex(Config.background_color) and Config.background_color or '')
end)

AddConvarChangeListener('mri:color', function()
    local color = GetConvar('mri:color', DEFAULT_ACCENT)
    if not isValidHex(color) then return end
    TriggerClientEvent('mri_Qadmin:client:accentColorChanged', -1, color)
end)

RegisterNetEvent('mri_Qadmin:server:SetGlobalBackgroundColor', function(color)
    local src = source
    setColor(src, 'background_color', color)
end)

RegisterNetEvent('mri_Qadmin:server:SetGlobalAccentColor', function(color)
    local src = source
    setColor(src, 'accent_color', color)
end)
