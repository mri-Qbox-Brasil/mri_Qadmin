lib.callback.register('mri_Qadmin:callback:GetPedList', function()
    if not CheckPerms(source, 'mod') then return {} end
    -- TODO: Get peds
    return {}
end)