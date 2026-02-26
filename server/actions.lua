local QBCore = exports['qb-core']:GetCoreObject()

-- Expose function globally so we can trigger it in settings.lua
function GetAllDynamicActions()
    return {
        Actions = Config.Actions or {},
        PlayerActions = Config.PlayerActions or {},
        OtherActions = Config.OtherActions or {}
    }
end

local function LoadActions()
    print('^2[mri_Qadmin] Iniciando o carregamento de Actions do DB...^7')

    -- Initialize Config tables if not done
    Config.Actions = Config.Actions or {}
    Config.PlayerActions = Config.PlayerActions or {}
    Config.OtherActions = Config.OtherActions or {}

    -- 0. Ensure Table Exists
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS mri_qadmin_actions (
            id VARCHAR(50) PRIMARY KEY,
            category VARCHAR(20) NOT NULL,
            data LONGTEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ]])

    -- 1. Automagically Seed/Synchronize Default Actions
    local resName = GetCurrentResourceName()
    local seedFile = 'server/default_actions.lua'
    local fileContent = LoadResourceFile(resName, seedFile)

    if fileContent then
        if fileContent:sub(1, 3) == "\239\187\191" then fileContent = fileContent:sub(4) end
        local func, err = load(fileContent)

        if func then
            local defaults = func()
            local parameters = {}

            local function extractInserts(categoryName, actionsTable)
                if not actionsTable then return end
                for id, data in pairs(actionsTable) do
                    local jsonString = json.encode(data)
                    parameters[#parameters + 1] = {id, categoryName, jsonString}
                end
            end

            extractInserts('Actions', defaults.Actions)
            extractInserts('PlayerActions', defaults.PlayerActions)
            extractInserts('OtherActions', defaults.OtherActions)

            if #parameters > 0 then
                -- Bulk Insert
                MySQL.insert.await('INSERT IGNORE INTO mri_qadmin_actions (`id`, `category`, `data`) VALUES ?', {parameters})
                print(('^2[mri_Qadmin] Sincronização Automágica concluída: %d ações padrão plantadas no banco.^7'):format(#parameters))

                -- Rename the file via native Lua file os system
                local basePath = GetResourcePath(resName)
                if basePath then
                    local oldPath = basePath .. '/' .. seedFile
                    local newPath = basePath .. '/server/default_actions_seeded.lua.bkp'
                    os.rename(oldPath, newPath)
                    print('^3[mri_Qadmin] Arquivo "default_actions.lua" renomeado para ".bkp" para não rodar novamente.^7')
                end
            else
                print('^3[mri_Qadmin] default_actions.lua não retornou nenhuma action para sincronizar.^7')
            end
        else
            print('^1[mri_Qadmin] Erro ao compilar default_actions.lua: ' .. tostring(err) .. '^7')
        end
    end

    -- 2. Load the actual state from DB into memory
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
        print(('^2[mri_Qadmin] Actions carregadas do DB para a memória: %s^7'):format(#dbActions))
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
