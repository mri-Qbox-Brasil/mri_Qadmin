function GetCoreData()
    local groups = lib.callback.await('mri_Qadmin:callback:GetGroupsData', false)
    if not groups then groups = { jobs = {}, gangs = {} } end

    return {
        items = lib.callback.await('mri_Qadmin:callback:GetItems', false) or {},
        vehicles = lib.callback.await('mri_Qadmin:callback:GetVehicles', false) or {},
        commands = lib.callback.await('mri_Qadmin:callback:GetCommands', false) or {},
        resources = lib.callback.await('mri_Qadmin:callback:GetResources', false) or {},

        jobs = groups.jobs or {},
        gangs = groups.gangs or {},
        pedlist = lib.callback.await('mri_Qadmin:callback:GetPedList', false) or {},
        locations = lib.callback.await('mri_Qadmin:callback:GetLocations', false) or {},
        actions = Config.Actions,
        vehicleImages = Config.VehicleImages
    }
end

function GetData()
    local data = GetCoreData()
    SendNUIMessage({
        action = "data",
        data = data,
    })
end
