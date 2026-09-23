local blacklistCommands = {
    "sv_", "adhesive_", "citizen_", "con_", "endpoint_", "fileserver", "load_server",
    "mysql_connection", "net_tcp", "netPort", "netlib", "onesync", "onesync_",
    "rateLimiter_", "svgui", "web_base", "temp_", "txAdmin", "txa",
}

local function isCommandBlacklisted(commandName)
    for _, bcommand in pairs(blacklistCommands) do
        if string.match(commandName, '^' .. bcommand) then
            return true
        end
    end
    return false
end

local function GetCommandsList(source)
    -- Aceita o nó da lista OU o da aba de comandos. Antes vinha implícito pelo
    -- fallback qadmin.X -> qadmin.page.X em HasPerms; agora é explícito.
    -- HasPerms (não CheckPerms): isto molda payload — é chamado pelo data_sync a cada
    -- abertura do painel, então notificar aqui gerava um "sem permissão" espúrio para
    -- todo admin que não tem a aba de comandos. Lista vazia é a resposta correta.
    if source and not HasPerms(source, { "qadmin.commands", "qadmin.page.commands" }) then return {} end

    local allCommands = GetRegisteredCommands()
    local results = {}
    local added = {}

    for _, command in ipairs(allCommands) do
        if not isCommandBlacklisted(command.name) and not added[command.name] then
            results[#results + 1] = {
                name = '/' .. command.name
            }
            added[command.name] = true
        end
    end

    return results
end
_G.GetCommandsList = GetCommandsList

lib.callback.register('mri_Qadmin:callback:GetCommands', function(source)
    return GetCommandsList(source)
end)

-----------------------------------------------------------------------------------------------------------------------------------------
-- ADMIN COMMANDS
-----------------------------------------------------------------------------------------------------------------------------------------

-- /admin e /noclip: nomes do qbx_adminmenu, mantidos como apelidos.
lib.addCommand({ 'adm', 'admin' }, {
    help = 'Open the admin menu',
}, function(source)
    if not CheckPerms(source, 'qadmin.open') then return end
    TriggerClientEvent('mri_Qadmin:client:OpenUI', source)
end)

lib.addCommand({ 'nc', 'noclip' }, {
    help = 'Toggle noclip',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.noclip') then return end
    TriggerClientEvent("mri_Qadmin:client:ToggleNoClip", source)
end)

-- Atalhos das ações do painel. Mesmos eventos e permissões da ação.
lib.addCommand('names', {
    help = 'Toggle player names',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.toggle_names') then return end
    TriggerClientEvent('mri_Qadmin:client:toggleNames', source, 'toggle_names')
end)

lib.addCommand('blips', {
    help = 'Toggle player blips',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.toggle_blips') then return end
    TriggerClientEvent('mri_Qadmin:client:toggleBlips', source, 'toggle_blips')
end)

lib.addCommand('admincar', {
    help = 'Save the current vehicle to your garage',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.admincar') then return end
    TriggerClientEvent('mri_Qadmin:client:Admincar', source)
end)

-- Aceita qualquer modelo de ped, não só os da lista do painel. Quem valida é o
-- client de quem digitou, pra poder avisar o admin se o modelo não existir.
lib.addCommand({ 'setped', 'setmodel' }, {
    help = 'Set the ped model of yourself or another player',
    params = {
        { name = 'model', help = 'Ped model', type = 'string' },
        { name = 'id', help = 'Player ID (optional)', type = 'playerId', optional = true },
    },
}, function(source, args)
    if not CheckPerms(source, 'qadmin.action.set_ped') then return end

    local target = args.id or source
    if not CheckTargetable(source, target) then return end

    local Player = QBCore.Functions.GetPlayer(target)
    if not Player then
        return QBCore.Functions.Notify(source, locale("notifications.not_online"), "error", 5000)
    end

    if not lib.callback.await('mri_Qadmin:client:isValidPed', source, args.model) then
        return QBCore.Functions.Notify(source, locale("notifications.invalid_ped", args.model), "error", 5000)
    end

    TriggerClientEvent("mri_Qadmin:client:setPed", target, args.model)
    AddLog(source, 'mri_Qadmin', 'players', 'info', ('Ped: modelo %s aplicado em %s %s'):format(args.model, Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname), { target = target, ped = args.model })
end)

lib.addCommand("vector2", {
    help = 'Copy vector2 coordinates to clipboard',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.toggle_coords') then return end
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector2")
end)

lib.addCommand("vec2", {
    help = 'Copy vector2 coordinates to clipboard',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.toggle_coords') then return end
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector2")
end)

lib.addCommand("vector3", {
    help = 'Copy vector3 coordinates to clipboard',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.toggle_coords') then return end
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector3")
end)

lib.addCommand("vec3", {
    help = 'Copy vector3 coordinates to clipboard',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.toggle_coords') then return end
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector3")
end)

lib.addCommand("vector4", {
    help = 'Copy vector4 coordinates to clipboard',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.toggle_coords') then return end
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector4")
end)

lib.addCommand("vec4", {
    help = 'Copy vector4 coordinates to clipboard',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.toggle_coords') then return end
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector4")
end)

lib.addCommand("heading", {
    help = 'Copy heading to clipboard',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.toggle_coords') then return end
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "heading")
end)

lib.addCommand("setammo", {
    help = 'Set ammo to 999 for current weapon',
}, function(source)
    if not CheckPerms(source, 'qadmin.action.set_ammo') then return end
    TriggerClientEvent('mri_Qadmin:client:SetAmmoAdmin', source)
end)
