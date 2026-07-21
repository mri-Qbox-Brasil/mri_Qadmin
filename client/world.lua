-- Changes the time
RegisterNetEvent('mri_Qadmin:client:ChangeTime', function(srcData, selectedData)
    local data = CheckDataFromKey(srcData)
    if not data or not CheckPerms(data.perms) then return end
    local time = selectedData["Time Events"].value

    if not time then return end

    TriggerServerEvent('qb-weathersync:server:setTime', time, 00)
    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'server', 'info', ('Hora: alterada para %s'):format(tostring(time)), {})
end)

-- Changes the weather
RegisterNetEvent('mri_Qadmin:client:ChangeWeather', function(srcData, selectedData)
    local data = CheckDataFromKey(srcData)
    if not data or not CheckPerms(data.perms) then return end
    local weather = selectedData["Weather"].value

    TriggerServerEvent('qb-weathersync:server:setWeather', weather)
    TriggerServerEvent('mri_Qadmin:server:LogClientAction', 'server', 'info', ('Clima: alterado para %s'):format(tostring(weather)), {})
end)

RegisterNetEvent('mri_Qadmin:client:copyToClipboard', function(srcData, selectedData)
    local data = CheckDataFromKey(srcData)
    if not data or not CheckPerms(data.perms) then return end

    local dropdown = selectedData["Copy Coords"].value
    local ped = PlayerPedId()
    local string = nil
    if dropdown == 'vector2' then
        local coords = GetEntityCoords(ped)
        local x = QBCore.Shared.Round(coords.x, 2)
        local y = QBCore.Shared.Round(coords.y, 2)
        string = "vector2(".. x ..", ".. y ..")"
        QBCore.Functions.Notify(locale("notifications.copy_vector2"), 'success')
    elseif dropdown == 'vector3' then
        local coords = GetEntityCoords(ped)
        local x = QBCore.Shared.Round(coords.x, 2)
        local y = QBCore.Shared.Round(coords.y, 2)
        local z = QBCore.Shared.Round(coords.z, 2)
        string = "vector3(".. x ..", ".. y ..", ".. z ..")"
        QBCore.Functions.Notify(locale("notifications.copy_vector3"), 'success')
    elseif dropdown == 'vector4' then
        local coords = GetEntityCoords(ped)
        local x = QBCore.Shared.Round(coords.x, 2)
        local y = QBCore.Shared.Round(coords.y, 2)
        local z = QBCore.Shared.Round(coords.z, 2)
        local heading = GetEntityHeading(ped)
        local h = QBCore.Shared.Round(heading, 2)
        string = "vector4(".. x ..", ".. y ..", ".. z ..", ".. h ..")"
        QBCore.Functions.Notify(locale("notifications.copy_vector4"), 'success')
    elseif dropdown == 'heading' then
        local heading = GetEntityHeading(ped)
        local h = QBCore.Shared.Round(heading, 2)
        string = h
        QBCore.Functions.Notify(locale("notifications.copy_heading"), 'success')
    elseif string == nil then
        QBCore.Functions.Notify(locale("notifications.empty_input"), 'error')
    end

    -- Only copy when we actually built a value (avoid clipboarding nil).
    if string ~= nil then
        lib.setClipboard(string)
    end

end)