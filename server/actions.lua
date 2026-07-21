local QBCore = exports['qb-core']:GetCoreObject()

-- Expose function globally so we can trigger it in settings.lua
local function GetAllDynamicActions()
    return {
        Actions = Config.Actions or {},
        PlayerActions = Config.PlayerActions or {},
        OtherActions = Config.OtherActions or {}
    }
end
_G.GetAllDynamicActions = GetAllDynamicActions

local function LoadActions()
    Debug('debug', 'Iniciando o carregamento de Actions...')

    -- Initialize Config tables
    Config.Actions = {}
    Config.PlayerActions = {}
    Config.OtherActions = {}

    -- 0. Ensure Table Exists
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS mri_qadmin_actions (
            id VARCHAR(50) PRIMARY KEY,
            category VARCHAR(20) NOT NULL,
            data LONGTEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ]])

    -- 1. Load Defaults from file
    local resName = GetCurrentResourceName()
    local seedFile = 'data/default_actions.lua'
    local fileContent = LoadResourceFile(resName, seedFile)

    if fileContent then
        if fileContent:sub(1, 3) == "\239\187\191" then fileContent = fileContent:sub(4) end
        local func, err = load(fileContent)

        if func then
            local defaults = func()
            if defaults.Actions then for k, v in pairs(defaults.Actions) do Config.Actions[k] = v end end
            if defaults.PlayerActions then for k, v in pairs(defaults.PlayerActions) do Config.PlayerActions[k] = v end end
            if defaults.OtherActions then for k, v in pairs(defaults.OtherActions) do Config.OtherActions[k] = v end end
            Debug('debug', ('Ações padrão carregadas do arquivo: %s'):format(seedFile))
        else
            Debug('error', ('Erro ao compilar default_actions.lua: %s'):format(tostring(err)))
        end
    end

    -- 2. Load the actual state from DB into memory (Overrides)
    local dbActions = MySQL.query.await('SELECT * FROM mri_qadmin_actions')

    if dbActions and #dbActions > 0 then
        for _, row in ipairs(dbActions) do
            local id = row.id
            local category = row.category
            local data = json.decode(row.data)

            if category == 'Actions' then
                Config.Actions[id] = data
            elseif category == 'PlayerActions' then
                Config.PlayerActions[id] = data
            elseif category == 'OtherActions' then
                Config.OtherActions[id] = data
            end
        end
        Debug('debug', ('Overrides de Actions carregados do DB: %s'):format(#dbActions))
    end
end

-- Load settings on startup
AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        LoadActions()
    end
end)

-- API Callbacks for NUI (CRUD operations for future UI tab)
lib.callback.register('mri_Qadmin:callback:GetActions', function(source)
    if not HasPerms(source, 'qadmin.open') then return {} end
    return GetAllDynamicActions()
end)

-- SECURITY: limita o `event` salvo em uma action a prefixos seguros, para que
-- admin com qadmin.action.manage_actions não consiga forjar uma action que
-- dispare server events arbitrários (ex.: txAdmin) através de outros admins.
local ALLOWED_EVENT_PREFIXES = { 'mri_Qadmin:', 'mri_wall:' }
local ALLOWED_CATEGORIES = { Actions = true, PlayerActions = true, OtherActions = true }
local ALLOWED_ACTION_TYPES = { client = true, server = true, command = true }

local function eventIsAllowed(ev)
    if type(ev) ~= 'string' or ev == '' then return false end
    for _, prefix in ipairs(ALLOWED_EVENT_PREFIXES) do
        if ev:sub(1, #prefix) == prefix then return true end
    end
    return false
end

local function validateActionPayload(data)
    if type(data) ~= 'table' then return false, 'payload inválido' end
    if data.event and not eventIsAllowed(data.event) then
        return false, 'event fora do whitelist: ' .. tostring(data.event)
    end
    if data.type and not ALLOWED_ACTION_TYPES[data.type] then
        return false, 'type inválido: ' .. tostring(data.type)
    end
    if data.dropdown and type(data.dropdown) == 'table' then
        for _, entry in pairs(data.dropdown) do
            if type(entry) == 'table' and entry.event and not eventIsAllowed(entry.event) then
                return false, 'dropdown.event fora do whitelist: ' .. tostring(entry.event)
            end
            if type(entry) == 'table' and entry.type and not ALLOWED_ACTION_TYPES[entry.type] then
                return false, 'dropdown.type inválido: ' .. tostring(entry.type)
            end
        end
    end
    return true
end

-- Endpoint to Save or Create an action
RegisterNetEvent('mri_Qadmin:server:SaveAction', function(id, category, data)
    local src = source
    if not CheckPerms(src, 'qadmin.action.manage_actions') then return end

    if type(id) ~= 'string' or id == '' or #id > 64 then
        return QBCore.Functions.Notify(src, 'ID de ação inválido.', 'error')
    end
    if not ALLOWED_CATEGORIES[category] then
        return QBCore.Functions.Notify(src, 'Categoria inválida.', 'error')
    end
    local ok, err = validateActionPayload(data)
    if not ok then
        AddLog(src, 'mri_Qadmin', 'server', 'error', ('Action rejeitada: %s'):format(err), { id = id, category = category })
        return QBCore.Functions.Notify(src, 'Ação rejeitada: ' .. err, 'error')
    end

    local jsonString = json.encode(data)

    MySQL.insert.await([[
        INSERT INTO mri_qadmin_actions (`id`, `category`, `data`)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE `category` = ?, `data` = ?
    ]], {id, category, jsonString, category, jsonString})

    -- Update memory
    if category == 'Actions' then Config.Actions[id] = data
    elseif category == 'PlayerActions' then Config.PlayerActions[id] = data
    elseif category == 'OtherActions' then Config.OtherActions[id] = data
    end

    Debug('debug', ('Action %s atualizada/criada por %s (Cat: %s)'):format(id, GetPlayerName(src), category))
    AddLog(src, 'mri_Qadmin', 'server', 'info', ('Ação salva: %s (%s)'):format(id, category), { id = id, category = category })

    -- Broadcast update to admins only
    local admins = GetAdminPlayers()
    local actionsData = GetAllDynamicActions()
    for _, adminId in ipairs(admins) do
        TriggerClientEvent('mri_Qadmin:client:UpdateActions', adminId, actionsData)
    end
    QBCore.Functions.Notify(src, 'Ação salva e sincronizada!', 'success')
end)

-- Endpoint to Delete an action
RegisterNetEvent('mri_Qadmin:server:DeleteAction', function(id, category)
    local src = source
    if not CheckPerms(src, 'qadmin.action.manage_actions') then return end

    if type(id) ~= 'string' or id == '' or #id > 64 then
        return QBCore.Functions.Notify(src, 'ID de ação inválido.', 'error')
    end
    if not ALLOWED_CATEGORIES[category] then
        return QBCore.Functions.Notify(src, 'Categoria inválida.', 'error')
    end

    MySQL.query.await('DELETE FROM mri_qadmin_actions WHERE id = ?', {id})

    -- Delete from memory
    if category == 'Actions' then Config.Actions[id] = nil
    elseif category == 'PlayerActions' then Config.PlayerActions[id] = nil
    elseif category == 'OtherActions' then Config.OtherActions[id] = nil
    end

    Debug('debug', ('Action %s deletada por %s'):format(id, GetPlayerName(src)))
    AddLog(src, 'mri_Qadmin', 'server', 'warn', ('Ação deletada: %s (%s)'):format(id, category), { id = id, category = category })

    -- Broadcast update to admins only
    local admins = GetAdminPlayers()
    local actionsData = GetAllDynamicActions()
    for _, adminId in ipairs(admins) do
        TriggerClientEvent('mri_Qadmin:client:UpdateActions', adminId, actionsData)
    end
    QBCore.Functions.Notify(src, 'Ação deletada com sucesso!', 'success')
end)
