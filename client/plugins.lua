-- Plugin registry (client): propaga a lista pra NUI e expõe os exports que o
-- plugin usa pra abrir/fechar o painel na página dele —
-- OpenPlugin / ClosePlugin / TogglePlugin / IsPluginOpen ('spawns').
-- Destino: opts da chamada > defaultRoute/defaultPage/defaultCategory do
-- manifest > plugin:<id>. `focus` so existe por chamada.

local cachedPlugins = {}
local pluginsFetched = false
-- Espelho da rota que o React confirmou por `routeChanged`. Nunca um palpite:
-- o gate de pagina (effectiveRoute) pode recusar o destino em silencio, e um
-- valor otimista aqui mentiria pra sempre, porque a recusa nao muda a rota e
-- portanto nao dispara `routeChanged`.
local currentRoute = nil
-- Rota com que cada plugin foi aberto. `opts.route` sobrescreve o default, e
-- recalcular sem os opts deixaria a sessao infechavel e indetectavel por id.
local openedRoutes = {}

RegisterNetEvent('mri_Qadmin:client:pluginsUpdated', function(plugins)
    cachedPlugins = plugins or {}
    pluginsFetched = true
    SendNUIMessage({
        action = 'pluginsUpdated',
        data = { plugins = cachedPlugins },
    })
end)

local function getPlugins()
    if not pluginsFetched then
        cachedPlugins = lib.callback.await('mri_Qadmin:server:getPlugins', false) or {}
        pluginsFetched = true
    end
    return cachedPlugins
end

RegisterNUICallback('getPlugins', function(_, cb)
    cb(getPlugins())
end)

RegisterNUICallback('routeChanged', function(data, cb)
    if type(data) == 'table' and type(data.route) == 'string' then
        currentRoute = data.route
    end
    cb({ status = 'ok' })
end)

--- @param pluginId string
--- @param opts table|nil { route?: string, page?: string, category?: string, focus?: string }
--- @return string|nil route, string|nil page, string|nil category, string|nil focus
local function resolveTarget(pluginId, opts)
    local manifest = getPlugins()[pluginId]
    if not manifest then return nil end
    opts = type(opts) == 'table' and opts or {}
    return opts.route or manifest.defaultRoute or ('plugin:' .. pluginId),
        opts.page or manifest.defaultPage,
        opts.category or manifest.defaultCategory,
        opts.focus
end

--- @param pluginId string
--- @param opts table|nil
--- @return boolean success, string|nil reason
local function openPlugin(pluginId, opts)
    if type(pluginId) ~= 'string' or pluginId == '' then return false, 'invalid_id' end

    local route, page, category, focus = resolveTarget(pluginId, opts)
    if not route then
        Debug('error', locale('plugins.logs.open.unknown', pluginId))
        return false, 'not_registered'
    end

    if not CheckPerms('qadmin.open') then return false, 'no_permission' end

    SendNUIMessage({
        action = 'navigate',
        data = { route = route, page = page, category = category, focus = focus },
    })
    openedRoutes[pluginId] = route

    if not IsMenuVisible() then
        local tbl, loc = GetTranslations()
        if tbl then
            SendNUIMessage({ action = 'setTranslations', data = { translations = tbl, locale = loc } })
        end
        ToggleUI(true)
    end

    Debug('debug', locale('plugins.logs.open.opened', pluginId, route))
    return true
end

--- Com pluginId, só fecha se a página ativa for a dele: plugin em background
--- não derruba o painel que o admin abriu em outra aba.
--- @param pluginId string|nil
--- @return boolean success, string|nil reason
local function closePlugin(pluginId)
    if pluginId ~= nil and (type(pluginId) ~= 'string' or pluginId == '') then return false, 'invalid_id' end
    if not IsMenuVisible() then return false, 'already_closed' end

    if pluginId then
        local route = resolveTarget(pluginId)
        if not route then return false, 'not_registered' end
        if currentRoute ~= (openedRoutes[pluginId] or route) then return false, 'not_active' end
    end

    ToggleUI(false)
    -- Fechar o painel fecha todo mundo: manter entrada aqui faria `IsPluginOpen`
    -- responder true se o admin voltasse na mao pra mesma rota.
    openedRoutes = {}
    Debug('debug', locale('plugins.logs.open.closed', tostring(pluginId or '*')))
    return true
end

--- @param pluginId string
--- @param opts table|nil
--- @return boolean success, string|nil reason
local function togglePlugin(pluginId, opts)
    if type(pluginId) ~= 'string' or pluginId == '' then return false, 'invalid_id' end

    local route = openedRoutes[pluginId] or resolveTarget(pluginId, opts)
    if IsMenuVisible() and route and currentRoute == route then
        return closePlugin(pluginId)
    end
    return openPlugin(pluginId, opts)
end

--- @param pluginId string
--- @return boolean
local function isPluginOpen(pluginId)
    if not IsMenuVisible() or type(pluginId) ~= 'string' then return false end
    -- Sem `lib.callback.await` aqui: plugin chama isto em loop, e o painel so
    -- fica visivel depois de a NUI ter buscado a lista no boot.
    if not pluginsFetched then return false end
    local route = openedRoutes[pluginId] or resolveTarget(pluginId)
    return route ~= nil and currentRoute == route
end

exports('OpenPlugin', openPlugin)
exports('ClosePlugin', closePlugin)
exports('TogglePlugin', togglePlugin)
exports('IsPluginOpen', isPluginOpen)

RegisterNetEvent('mri_Qadmin:client:OpenPlugin', function(pluginId, opts)
    openPlugin(pluginId, opts)
end)

RegisterNetEvent('mri_Qadmin:client:ClosePlugin', function(pluginId)
    closePlugin(pluginId)
end)

RegisterNetEvent('mri_Qadmin:client:TogglePlugin', function(pluginId, opts)
    togglePlugin(pluginId, opts)
end)
