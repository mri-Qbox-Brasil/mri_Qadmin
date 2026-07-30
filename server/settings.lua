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

-- Núcleo da aplicação de cor: banco -> Config -> convar -> broadcast. SEM gate
-- de permissão — quem chama é responsável por ter gateado.
--
-- Dois callers: `setColor` (painel do Qadmin, gate `qadmin.page.settings`) e os
-- exports SetSuiteAccent/SetSuiteBackground (painel /uiconfig do ox_lib, gate
-- ACE `command.uiconfig` que já rodou lá).
--
-- Ordem importa: `Config[key] = color` vem ANTES do SetConvarReplicated, senão
-- o AddConvarChangeListener lá embaixo não reconhece o eco e regrava no banco.
local function applyColor(key, color)
    -- Crud.create tem 5 placeholders (INSERT value/type + ON DUPLICATE value/type).
    -- Precisa passar os 5, senão os ? do UPDATE viram null -> "Column 'value' cannot be null".
    MySQL.insert.await(Crud.create, { key, color, 'string', color, 'string' })
    Config[key] = color

    if key == 'accent_color' then
        SetConvarReplicated('mri:color', color)
        TriggerClientEvent('mri_Qadmin:client:accentColorChanged', -1, color)
        -- Rede de segurança pra servidores que já tinham um override salvo no
        -- config.json antes do write-through existir. Depois da primeira
        -- limpeza vira no-op (o clearColorOverride do ox_lib é idempotente),
        -- porque sob write-through o campo lá fica sempre ''.
        if GetResourceState('ox_lib') == 'started' then
            pcall(function() exports['ox_lib']:ClearAccentOverride() end)
        end
    elseif key == 'background_color' then
        SetConvarReplicated('mri:backgroundColor', color)
        TriggerClientEvent('mri_Qadmin:client:backgroundColorChanged', -1, color)
        if GetResourceState('ox_lib') == 'started' then
            pcall(function() exports['ox_lib']:ClearBackgroundOverride() end)
        end
    end
end

-- Write-through vindo do painel /uiconfig do ox_lib. Server->server, sem
-- source de player: o gate ACE `command.uiconfig` já rodou no saveUiConfig de
-- lá. Retorna false em hex malformado pro ox_lib não gravar lixo no json.
--
-- Não chama de volta o ox_lib: applyColor faz ClearAccentOverride, que é
-- idempotente e no-op aqui (o campo já vem '' do write-through), então o
-- caminho morre em vez de virar ping-pong.
local function setSuiteColor(key, color)
    color = tostring(color or ''):upper()
    if color ~= '' and not isValidHex(color) then return false end
    if color == Config[key] then return true end

    applyColor(key, color)
    Debug('info', ('%s alterado pelo painel /uiconfig do ox_lib: %s'):format(
        key, color == '' and 'padrão' or color))
    return true
end

exports('SetSuiteAccent', function(hex) return setSuiteColor('accent_color', hex) end)
exports('SetSuiteBackground', function(hex) return setSuiteColor('background_color', hex) end)

local function setColor(src, key, color)
    if not CheckPerms(src, 'qadmin.page.settings') then return end

    color = tostring(color or ''):upper()

    if color ~= '' and not isValidHex(color) then
        RejectSetting(src, locale('settings.errors.invalid_color', color))
        return
    end

    local oldColor = Config[key]
    applyColor(key, color)

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

-- Persistência das cores vindas de FORA do painel: `setr mri:color` no console,
-- txAdmin, outro resource. Sem isto a mudança aplicava ao vivo mas evaporava no
-- restart seguinte — `mri_Qadmin:db:ready` faz LoadSettings() e reescreve a
-- convar a partir do banco, revertendo a cor sem aviso.
--
-- O guard `color == Config[key]` é o que impede disparo circular, não uma
-- otimização. O caminho é:
--
--   setColor  →  Config[key] = X  →  SetConvarReplicated  →  ESTE listener
--
-- Como Config[key] já vale X quando o listener roda, o eco do próprio painel
-- morre aqui. Sem o guard, toda aplicação pelo painel geraria uma segunda
-- gravação no banco e um segundo broadcast pros clients (o listener antigo
-- fazia exatamente esse broadcast duplicado).
--
-- Nada aqui chama SetConvarReplicated — se chamasse, o ciclo seria infinito.
local function persistConvarColor(key, color)
    if color == Config[key] then return end

    local oldColor = Config[key]
    -- Config atualizado ANTES da gravação, de forma síncrona: é ele que corta o
    -- eco, então precisa já valer na próxima passagem pelo listener — não pode
    -- depender do retorno do banco.
    Config[key] = color

    -- CreateThread porque MySQL.await exige coroutine e o callback de
    -- AddConvarChangeListener não garante uma.
    CreateThread(function()
        MySQL.insert.await(Crud.create, { key, color, 'string', color, 'string' })
        Debug('info', ('%s alterado por fora do painel: %s -> %s (persistido)'):format(
            key, tostring(oldColor), color == '' and 'padrão' or color))
    end)

    return true
end

AddConvarChangeListener('mri:color', function(name)
    if name ~= 'mri:color' then return end
    local color = GetConvar('mri:color', DEFAULT_ACCENT)
    if not isValidHex(color) then return end
    if not persistConvarColor('accent_color', color) then return end

    TriggerClientEvent('mri_Qadmin:client:accentColorChanged', -1, color)
end)

-- `mri:backgroundColor` não tinha listener nenhum: mudança pelo console não
-- propagava nem ao vivo. Diferente do accent, '' é válido aqui (= volta pro
-- padrão do CSS), então só rejeitamos hex malformado.
AddConvarChangeListener('mri:backgroundColor', function(name)
    if name ~= 'mri:backgroundColor' then return end
    local color = GetConvar('mri:backgroundColor', '')
    if color ~= '' and not isValidHex(color) then return end
    if not persistConvarColor('background_color', color) then return end

    TriggerClientEvent('mri_Qadmin:client:backgroundColorChanged', -1, color)
end)

RegisterNetEvent('mri_Qadmin:server:SetGlobalBackgroundColor', function(color)
    local src = source
    setColor(src, 'background_color', color)
end)

RegisterNetEvent('mri_Qadmin:server:SetGlobalAccentColor', function(color)
    local src = source
    setColor(src, 'accent_color', color)
end)
