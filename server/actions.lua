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

    local dbActions = MySQL.query.await('SELECT * FROM mri_qadmin_actions')

    if dbActions and #dbActions > 0 then
        -- Load from DB
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
        print(('^2[mri_Qadmin] Actions carregadas do DB: %s^7'):format(#dbActions))
    else
        -- DB is empty, seed from default_actions.lua
        print('^3[mri_Qadmin] Banco de dados de Actions vazio. Semeando (Seed) ações padrão...^7')

        local fileContent = LoadResourceFile(GetCurrentResourceName(), 'server/default_actions.lua')
        if not fileContent then
            print('^1[mri_Qadmin] Erro: server/default_actions.lua não encontrado!^7')
            return
        end

        -- Strip UTF-8 BOM if present
        if fileContent:sub(1, 3) == "\239\187\191" then
            fileContent = fileContent:sub(4)
        end

        local func, err = load(fileContent)
        if not func then
            print('^1[mri_Qadmin] Erro ao compilar default_actions.lua: ' .. tostring(err) .. '^7')
            return
        end

        local defaults = func()

        local seedCount = 0
        local function insertActions(categoryName, actionsTable)
            if not actionsTable then return end
            for id, data in pairs(actionsTable) do
                local jsonString = json.encode(data)
                MySQL.insert.await('INSERT INTO mri_qadmin_actions (`id`, `category`, `data`) VALUES (?, ?, ?)', {id, categoryName, jsonString})

                -- Load into memory
                if categoryName == 'Actions' then Config.Actions[id] = data
                elseif categoryName == 'PlayerActions' then Config.PlayerActions[id] = data
                elseif categoryName == 'OtherActions' then Config.OtherActions[id] = data
                end

                seedCount = seedCount + 1
            end
        end

        insertActions('Actions', defaults.Actions)
        insertActions('PlayerActions', defaults.PlayerActions)
        insertActions('OtherActions', defaults.OtherActions)

        print(('^2[mri_Qadmin] Sincronização de Actions concluída. Total Semeado: %s^7'):format(seedCount))
    end
end

-- Load settings on startup
AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        CreateThread(function()
            Wait(1500) -- Small delay to ensure oxmysql is fully connected
            LoadActions()
        end)
    end
end)

-- API Callbacks for NUI (CRUD operations for future UI tab)
lib.callback.register('mri_Qadmin:callback:GetActions', function(source)
    if not IsPlayerAceAllowed(source, 'qadmin.page.settings') then return {} end
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
