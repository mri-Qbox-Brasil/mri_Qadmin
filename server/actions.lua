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
    Debug('^2[mri_Qadmin] Iniciando o carregamento de Actions...^7')

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
            Debug(('^2[mri_Qadmin] Ações padrão carregadas do arquivo: %s^7'):format(seedFile))
        else
            print('^1[mri_Qadmin] Erro ao compilar default_actions.lua: ' .. tostring(err) .. '^7')
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
        Debug(('^2[mri_Qadmin] Overrides de Actions carregados do DB: %s^7'):format(#dbActions))
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
    if not IsPlayerAceAllowed(source, 'qadmin.open') then return {} end
    return GetAllDynamicActions()
end)

-- Endpoint to Save or Create an action
RegisterNetEvent('mri_Qadmin:server:SaveAction', function(id, category, data)
    local src = source
    if not IsPlayerAceAllowed(src, 'qadmin.page.settings') then return end

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

    Debug(('[mri_Qadmin] Action %s atualizada/criada por %s (Cat: %s)'):format(id, GetPlayerName(src), category))

    -- Broadcast update to everyone
    TriggerClientEvent('mri_Qadmin:client:UpdateActions', -1, GetAllDynamicActions())
    QBCore.Functions.Notify(src, 'Ação salva e sincronizada!', 'success')
end)

-- Endpoint to Delete an action
RegisterNetEvent('mri_Qadmin:server:DeleteAction', function(id, category)
    local src = source
    if not IsPlayerAceAllowed(src, 'qadmin.page.settings') then return end

    MySQL.query.await('DELETE FROM mri_qadmin_actions WHERE id = ?', {id})

    -- Delete from memory
    if category == 'Actions' then Config.Actions[id] = nil
    elseif category == 'PlayerActions' then Config.PlayerActions[id] = nil
    elseif category == 'OtherActions' then Config.OtherActions[id] = nil
    end

    Debug(('[mri_Qadmin] Action %s deletada por %s'):format(id, GetPlayerName(src)))

    -- Broadcast update to everyone
    TriggerClientEvent('mri_Qadmin:client:UpdateActions', -1, GetAllDynamicActions())
    QBCore.Functions.Notify(src, 'Ação deletada com sucesso!', 'success')
end)
