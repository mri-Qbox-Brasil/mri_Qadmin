
Debug('^2[mri_Qadmin] Carregando Sistema de Sincronizacao de Dados...^7')

RegisterNetEvent('mri_Qadmin:server:GetInitialData', function()
    local src = source
    if not HasPerms(src, 'qadmin.open') then return end

    Debug(('[mri_Qadmin] Iniciando envio latente de dados iniciais para %s (%s)'):format(GetPlayerName(src), src))

    local serverInfo = GetServerData()
    if not HasPerms(src, 'qadmin.action.info_admin') then
        serverInfo.totalCash = nil
        serverInfo.totalBank = nil
        serverInfo.totalCrypto = nil
    end

    -- PII gate: getPlayers retorna license/IP/discord/steam/fivem dos jogadores.
    -- Não enviar nada disso para quem só tem qadmin.open mas não qadmin.page.players.
    local playersPayload
    if HasPerms(src, 'qadmin.page.players') then
        playersPayload = getPlayers(1, 100, "")
    else
        playersPayload = { data = {}, total = 0, pages = 0 }
    end

    local data = {
        serverInfo = serverInfo,
        resources = HasPerms(src, 'qadmin.page.resources') and RefreshResources() or {},
        permissions = GetUserPermissions(src),
        permissionDefinitions = GetPermissionDefinitions(),
        actions = GetAllDynamicActions(),
        groups = HasPerms(src, 'qadmin.page.groups') and GetGroupsData() or { jobs = {}, gangs = {} },
        items = HasPerms(src, 'qadmin.page.items') and GetItemsList() or {},
        vehicles = HasPerms(src, 'qadmin.page.vehicles') and GetVehiclesList() or {},
        commands = GetCommandsList(src),
        peds = Peds or {},
        locations = {},
        settings = HasPerms(src, 'qadmin.page.settings') and GetPrimitiveSettings() or {},
        players = playersPayload,
        qboxEnabled = GetResourceState("mri_Qbox") == 'started'
    }

    -- 200,000 bytes per second (approx 200KB/s) to be fast but safe
    TriggerLatentClientEvent('mri_Qadmin:client:ReceiveInitialData', src, 200000, data)
end)
