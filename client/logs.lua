-- Callbacks NUI da aba de logs. Ponte fina: valida nada aqui, o server decide.

RegisterNUICallback('mri_Qadmin:callback:GetLogs', function(data, cb)
    local result = lib.callback.await('mri_Qadmin:callback:GetLogs', false, data)
    cb(result or { logs = {}, total = 0 })
end)

RegisterNUICallback('mri_Qadmin:callback:GetLogSettings', function(_, cb)
    local result = lib.callback.await('mri_Qadmin:callback:GetLogSettings', false)
    cb(result or false)
end)

RegisterNUICallback('mri_Qadmin:callback:SaveLogSettings', function(data, cb)
    local result = lib.callback.await('mri_Qadmin:callback:SaveLogSettings', false, data)
    cb(result or false)
end)