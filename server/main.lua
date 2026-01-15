QBCore = exports['qb-core']:GetCoreObject()

lib.addCommand('adm', {
    help = 'Open the admin menu',
}, function(source)
    TriggerClientEvent('mri_Qadmin:client:OpenUI', source)
end)
-- Callbacks
