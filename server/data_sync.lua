
Debug('^2[mri_Qadmin] Carregando Sistema de Sincronizacao de Dados...^7')

RegisterNetEvent('mri_Qadmin:server:GetInitialData', function()
    local src = source
    if not HasPerms(src, 'qadmin.open') then return end

    Debug(('[mri_Qadmin] Iniciando envio latente de dados iniciais para %s (%s)'):format(GetPlayerName(src), src))

    local data = {
        serverInfo = GetServerData(),
        resources = RefreshResources(),
        permissions = GetUserPermissions(src),
        actions = GetAllDynamicActions(),
        groups = GetGroupsData(),
        items = GetItemsList(),
        vehicles = GetVehiclesList(),
        commands = GetCommandsList(src),
        peds = {},
        locations = {},
        settings = GetPrimitiveSettings(),
        players = getPlayers(1, 100, "")
    }

    -- 200,000 bytes per second (approx 200KB/s) to be fast but safe
    TriggerLatentClientEvent('mri_Qadmin:client:ReceiveInitialData', src, 200000, data)
end)
