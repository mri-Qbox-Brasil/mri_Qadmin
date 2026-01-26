QBCore = exports['qb-core']:GetCoreObject()

lib.addCommand('adm', {
    help = 'Open the admin menu',
}, function(source)
    if CheckPerms(source, Config.OpenPanelPerms) then
        TriggerClientEvent('mri_Qadmin:client:OpenUI', source)
    end
end)
-- Callbacks
