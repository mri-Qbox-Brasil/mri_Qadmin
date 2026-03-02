local commandsTable, addedCommands = {}, {}
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

lib.callback.register('mri_Qadmin:callback:GetCommands', function()
    if not CheckPerms(source, "qadmin.commands") then return {} end

    local allCommands = GetRegisteredCommands()

    for _, command in ipairs(allCommands) do
        if not isCommandBlacklisted(command.name) and not addedCommands[command.name] then
            commandsTable[#commandsTable + 1] = {
                name = '/' .. command.name
            }
            addedCommands[command.name] = true -- prevent duplicates
        end
    end

    return commandsTable
end)

-----------------------------------------------------------------------------------------------------------------------------------------
-- ADMIN COMMANDS
-----------------------------------------------------------------------------------------------------------------------------------------

lib.addCommand('adm', {
    help = 'Open the admin menu',
    restricted = 'qadmin.open'
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:OpenUI', source)
end)

lib.addCommand('nc', {
    help = 'Toggle noclip',
    restricted = 'qadmin.action.noclip'
}, function(source)
    TriggerClientEvent("mri_Qadmin:client:ToggleNoClip", source)
end)

lib.addCommand("vector2", {
    help = 'Copy vector2 coordinates to clipboard',
    restricted = 'qadmin.command.vector2'
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector2")
end)

lib.addCommand("vec2", {
    help = 'Copy vector2 coordinates to clipboard',
    restricted = 'qadmin.command.vector2'
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector2")
end)

lib.addCommand("vector3", {
    help = 'Copy vector3 coordinates to clipboard',
    restricted = 'qadmin.command.vector3'
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector3")
end)

lib.addCommand("vec3", {
    help = 'Copy vector3 coordinates to clipboard',
    restricted = 'qadmin.command.vector3'
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector3")
end)

lib.addCommand("vector4", {
    help = 'Copy vector4 coordinates to clipboard',
    restricted = 'qadmin.command.vector4'
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector4")
end)

lib.addCommand("vec4", {
    help = 'Copy vector4 coordinates to clipboard',
    restricted = 'qadmin.command.vector4'
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "vector4")
end)

lib.addCommand("heading", {
    help = 'Copy heading to clipboard',
    restricted = 'qadmin.command.heading'
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:CopyCoords', source, "heading")
end)

lib.addCommand("setammo", {
    help = 'Set ammo to 999 for current weapon',
    restricted = 'qadmin.command.setammo'
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:SetAmmoAdmin', source)
end)
