lib.callback.register('mri_Qadmin:callback:GetLocations', function()
    if not CheckPerms(source, 'mod') then return {} end
    return QBCore.Functions.GetLocations()
end)