lib.callback.register('mri_Qadmin:callback:GetPedList', function(source)
    if not CheckPerms(source, 'qadmin.action.set_ped') then return {} end
    return Peds or {}
end)