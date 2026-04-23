lib.callback.register('mri_Qadmin:callback:GetLocations', function(source)
    if not CheckPerms(source, 'qadmin.page.livemap') then return {} end
    return {}
end)