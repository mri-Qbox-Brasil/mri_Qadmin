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

local Plugins = {}

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
            if IsPlayerAceAllowed(source, required[i]) then
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
    if type(manifest.resource) ~= 'string' or manifest.resource == '' then return false end

    -- Sanitize: garante shape minimo. So resources do server podem chamar o
    -- export, entao confiamos no caller.
    Plugins[manifest.id] = {
        id            = manifest.id,
        label         = manifest.label or manifest.id,
        icon          = manifest.icon or 'box',
        resource      = manifest.resource,
        htmlPath      = manifest.htmlPath,
        requiredPerms = manifest.requiredPerms or {},
        permDefs      = manifest.permDefs,
        description   = manifest.description,
    }

    print(('[mri_Qadmin] Plugin registrado: %s (resource: %s)'):format(manifest.id, manifest.resource))
    broadcastPluginsUpdated()
    RegisterPermissionsForPlugin(Plugins[manifest.id])
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

-- Limpa registry quando o resource do plugin para (evita iframe quebrado
-- apontando pra resource morto).
AddEventHandler('onResourceStop', function(resourceName)
    local removed = false
    for id, manifest in pairs(Plugins) do
        if manifest.resource == resourceName then
            Plugins[id] = nil
            removed = true
            print(('[mri_Qadmin] Plugin removido (resource parou): %s'):format(id))
        end
    end
    if removed then broadcastPluginsUpdated() end
end)

-- Callback usado pela NUI no boot pra hidratar a lista inicial. Filtra por
-- ACE do source pra nao expor plugins que ele nao pode acessar.
lib.callback.register('mri_Qadmin:server:getPlugins', function(source)
    return pluginsForSource(source)
end)
