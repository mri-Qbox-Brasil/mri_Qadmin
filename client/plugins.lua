-- ============================================================
-- Plugin registry — client bridge
-- ============================================================
-- Recebe updates do server (lista de plugins registrados) e propaga pra NUI.
-- A NUI consome via NUI callback `getPlugins` no boot e via NUI message
-- `pluginsUpdated` em runtime.
-- ============================================================

local cachedPlugins = {}

RegisterNetEvent('mri_Qadmin:client:pluginsUpdated', function(plugins)
    cachedPlugins = plugins or {}
    -- NuiContext destrutura `event.data.data` — payload precisa vir aninhado.
    SendNUIMessage({
        action = 'pluginsUpdated',
        data = { plugins = cachedPlugins },
    })
end)

RegisterNUICallback('getPlugins', function(_, cb)
    -- Se cache vazio (boot inicial), busca do server.
    if next(cachedPlugins) == nil then
        local fresh = lib.callback.await('mri_Qadmin:server:getPlugins', false)
        cachedPlugins = fresh or {}
    end
    cb(cachedPlugins)
end)

RegisterNetEvent('mri_Qadmin:client:forwardPluginMessage', function(pluginId, payload)
    if type(pluginId) == 'table' then
        payload = pluginId.payload
        pluginId = pluginId.pluginId
    end

    if type(pluginId) ~= 'string' or pluginId == '' or type(payload) ~= 'table' then
        return
    end

    SendNUIMessage({
        action = 'forwardPluginMessage',
        data = {
            pluginId = pluginId,
            payload = payload,
        },
    })
end)
