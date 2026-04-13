lib.callback.register('mri_Qadmin:callback:GetPedList', function(source)
    if not CheckPerms(source, 'mod') then return {} end
    return Peds or {}
end)