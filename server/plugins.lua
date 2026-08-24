-- ============================================================
-- Plugin registry — host side
-- ============================================================
-- Outros resources MRI registram suas paginas administrativas via:
--   TriggerEvent('mri_Qadmin:registerPlugin', { id = 'spawns', label = 'Spawns', ... })
--
-- Qadmin guarda em memoria, expoe via callback `mri_Qadmin:server:getPlugins`,
-- e sincroniza com clients ja conectados via `mri_Qadmin:client:pluginsUpdated`.
-- Se o resource do plugin parar, removemos do registry automaticamente.
--
-- Drift control: o shape do manifest deve bater com web/src/plugin/types.ts
-- (MriPluginManifest).
-- ============================================================

local PluginsToRegister = {}
local Plugins = {}
local panelReady = false

-- Filtra Plugins por ACE perm do source. Semantica OR: plugin visivel se
-- user tem QUALQUER uma das perms listadas (mais util pra admin — plugin lista
-- todos os aces que dao acesso, inclusive fallbacks tipo `command` pra
-- god/console). Sem requiredPerms = sempre visivel.
local function pluginsForSource(source)
    local visible = {}
    for id, manifest in pairs(Plugins) do
        local required = manifest.requiredPerms or {}
        local allowed = #required == 0
        for i = 1, #required do
            -- HasPerms (não IsPlayerAceAllowed cru): honra master bypass e os
            -- principais estendidos (char:/job./gang.), consistente com o resto.
            if HasPerms(source, required[i]) then
                allowed = true
                break
            end
        end
        if allowed then visible[id] = manifest end
    end
    return visible
end

local function broadcastPluginsUpdated()
    -- Per-source: cada client recebe so os plugins que pode acessar.
    -- Necessario porque a NUI do Qadmin nao tem acesso direto ao IsPlayerAceAllowed,
    -- entao o gate tem que rodar server-side antes de enviar.
    local players = GetPlayers()
    for i = 1, #players do
        local src = tonumber(players[i])
        TriggerClientEvent('mri_Qadmin:client:pluginsUpdated', src, pluginsForSource(src))
    end
end

---@param manifest table { id, label, icon, resource, requiredPerms?, description? }
---@return boolean success
local function registerPlugin(manifest)
    if type(manifest) ~= 'table' then return false end
    if type(manifest.id) ~= 'string' or manifest.id == '' then return false end

    -- Sanitize: garante shape minimo. So resources do server podem chamar o
    -- export, entao confiamos no caller.
    -- `resource` é o NOME DO RESOURCE do plugin (usado pra montar a URL do iframe
    -- cfx-nui-<resource>). NÃO confundir com `id` (slug lógico do plugin) —
    -- quase sempre são diferentes (ex: id='spawns', resource='mri_Qspawn').
    PluginsToRegister[#PluginsToRegister + 1] = {
        id              = manifest.id,
        label           = manifest.label or manifest.id,
        icon            = manifest.icon or 'box',
        resource        = manifest.resource or manifest.id,
        htmlPath        = manifest.htmlPath,
        defaultRoute    = manifest.defaultRoute,
        defaultPage     = manifest.defaultPage,
        defaultCategory = manifest.defaultCategory,
        requiredPerms   = manifest.requiredPerms or {},
        permDefs        = manifest.permDefs,
        description     = manifest.description,
    }

    Debug('info', locale('plugins.logs.register.received', manifest.id))
    return true
end

-- Exports oficiais — plugin chama via:
--   exports['mri_Qadmin']:RegisterPlugin({ id, label, icon, resource, requiredPerms? })
--   exports['mri_Qadmin']:UnregisterPlugin('id')
-- Vantagens vs TriggerEvent: chamada sincrona (retorna sucesso/erro), fail-fast
-- se Qadmin nao tiver carregado, melhor descoberta via IDE/docs.
exports('RegisterPlugin', registerPlugin)

exports('UnregisterPlugin', function(id)
    if Plugins[id] then
        Plugins[id] = nil
        broadcastPluginsUpdated()
        return true
    end
    return false
end)

-- Caminho server-driven dos exports client-side (Open/Close/TogglePlugin): o
-- gate de permissao roda aqui, com HasPerms, antes de tocar no client.

--- @return boolean ok, string|nil reason
local function canDrivePanel(source, pluginId)
    source = tonumber(source)
    if not source or source <= 0 then return false, 'invalid_source' end
    if type(pluginId) ~= 'string' or pluginId == '' then return false, 'invalid_id' end
    if not Plugins[pluginId] then return false, 'not_registered' end
    if not pluginsForSource(source)[pluginId] then return false, 'no_permission' end
    if not HasPerms(source, 'qadmin.open') then return false, 'no_permission' end
    return true
end

--- @param source number
--- @param pluginId string
--- @param opts table|nil { route?: string, page?: string, category?: string, focus?: string }
--- @return boolean success, string|nil reason
exports('OpenPluginForPlayer', function(source, pluginId, opts)
    local ok, reason = canDrivePanel(source, pluginId)
    if not ok then return false, reason end
    TriggerClientEvent('mri_Qadmin:client:OpenPlugin', tonumber(source), pluginId, opts)
    return true
end)

exports('TogglePluginForPlayer', function(source, pluginId, opts)
    local ok, reason = canDrivePanel(source, pluginId)
    if not ok then return false, reason end
    TriggerClientEvent('mri_Qadmin:client:TogglePlugin', tonumber(source), pluginId, opts)
    return true
end)

--- @param pluginId string|nil so fecha se a pagina ativa for a dele
exports('ClosePluginForPlayer', function(source, pluginId)
    source = tonumber(source)
    if not source or source <= 0 then return false, 'invalid_source' end
    if pluginId ~= nil and (type(pluginId) ~= 'string' or pluginId == '') then return false, 'invalid_id' end
    TriggerClientEvent('mri_Qadmin:client:ClosePlugin', source, pluginId)
    return true
end)

CreateThread(function()
    while (true) do
        if panelReady then
            if #PluginsToRegister > 0 then
                local p = PluginsToRegister[1]
                Debug('debug', locale('plugins.logs.register.registering', p.id))
                Plugins[p.id] = p
                table.remove(PluginsToRegister, 1)
                broadcastPluginsUpdated()
                RegisterPermissionsForPlugin(Plugins[p.id])
            end
        end
        Wait(100)
    end
end)

-- Envia a lista de plugins assim que as permissões do player estiverem prontas.
-- Sem isso, o cache do client começa vazio e depende do NUI fazer fetch sob demanda.
AddEventHandler('mri_Qadmin:server:PlayerPermissionsReady', function(src)
    if not src then return end
    TriggerClientEvent('mri_Qadmin:client:pluginsUpdated', src, pluginsForSource(src))
end)

-- Limpa registry quando o resource do plugin para (evita iframe quebrado
-- apontando pra resource morto).
AddEventHandler('onResourceStop', function(resourceName)
    local removed = false
    for id, manifest in pairs(Plugins) do
        if manifest.resource == resourceName then
            Plugins[id] = nil
            removed = true
            Debug('info', locale('plugins.logs.register.removed', id))
        end
    end
    if removed then broadcastPluginsUpdated() end
end)

-- Sinaliza que o sistema de plugins está pronto.
-- Resources que precisam registrar plugins escutam este evento para auto-register.
AddEventHandler("mri_Qadmin:db:ready", function()
    panelReady = true
    Debug('info', locale('plugins.logs.ready'))
    -- Sinal oficial de re-registro: dispara sempre que o Qadmin (re)inicia,
    -- então plugins que escutam este evento voltam ao registry após um
    -- `ensure mri_Qadmin` sem depender do timing de onResourceStart.
    TriggerEvent('mri_Qadmin:server:pluginsReady')
end)

-- Callback usado pela NUI no boot pra hidratar a lista inicial. Filtra por
-- ACE do source pra nao expor plugins que ele nao pode acessar.
lib.callback.register('mri_Qadmin:server:getPlugins', function(source)
    return pluginsForSource(source)
end)
