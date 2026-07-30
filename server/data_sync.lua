
Debug('debug', 'Carregando Sistema de Sincronizacao de Dados...')

-- Todas as checagens deste arquivo usam HasPerms (silencioso) DE PROPÓSITO: elas moldam
-- o payload — decidem o que entra nos dados iniciais, não barram uma ação do jogador.
-- Trocar por CheckPerms faria o admin receber uma enxurrada de "sem permissão" a cada
-- abertura do painel, uma por aba que ele não tem. Ver contrato em server/utils.lua.
RegisterNetEvent('mri_Qadmin:server:GetInitialData', function()
    local src = source
    if not HasPerms(src, 'qadmin.open') then return end

    Debug('debug', ('Iniciando envio latente de dados iniciais para %s (%s)'):format(GetPlayerName(src), src))

    -- Sai do snapshot cacheado (server/dashboard_cache.lua), não do banco: este
    -- handler dispara no login de TODO admin, e antes cada login pagava uma
    -- varredura completa da tabela `players`.
    local serverInfo = MaskFinancials(GetServerData(), src)
    serverInfo.charts = GetDashboardChartData(src)

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
        categoryDefinitions = GetCategoryDefinitions(),
        actions = GetAllDynamicActions(),
        groups = HasPerms(src, 'qadmin.page.groups') and GetGroupsData() or { jobs = {}, gangs = {} },
        items = HasPerms(src, 'qadmin.page.items') and GetItemsList() or {},
        vehicles = HasPerms(src, 'qadmin.page.vehicles') and GetVehiclesList() or {},
        commands = GetCommandsList(src),
        peds = Peds or {},
        locations = {},
        settings = HasPerms(src, 'qadmin.page.settings') and GetPrimitiveSettings() or {},
        players = playersPayload,
        -- Versao real do recurso em execucao (fxmanifest, injetada no release).
        -- Enviada a todos para a sidebar exibir a versao correta — o bundle web
        -- tem uma versao propria que pode ficar defasada entre releases.
        resourceVersion = GetUpdateInfo().current,
        -- Aviso de atualizacao so para quem pode agir nele (gerenciar recursos).
        updateInfo = HasPerms(src, 'qadmin.page.resources') and GetUpdateInfo() or nil
    }

    -- 200,000 bytes per second (approx 200KB/s) to be fast but safe
    TriggerLatentClientEvent('mri_Qadmin:client:ReceiveInitialData', src, 200000, data)
end)
