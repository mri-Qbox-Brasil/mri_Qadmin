local QBCore = exports['qb-core']:GetCoreObject()

-- Toggle UI logic specific for standard players to open the tickets UI
RegisterCommand("reportar", function()
    -- Request translations if necessary, then show the UI
    local locale = GetConvar('ox_locale', 'pt-br')
    local path = ('locales/%s.json'):format(locale)
    local raw = LoadResourceFile(GetCurrentResourceName(), path)
    if raw then
        local ok, tbl = pcall(json.decode, raw)
        if ok and tbl then
            SendNUIMessage({ action = 'setTranslations', data = { translations = tbl, locale = locale } })
        end
    end
    
    -- Flag telling the NUI to open directly to tickets in viewer mode
    SendNUIMessage({
        action = "openTicketsPlayerMode",
        data = { visible = true }
    })
    SetNuiFocus(true, true)
end, false)

RegisterKeyMapping("reportar", "Open Report Menu", "keyboard", "")

RegisterNUICallback("hideTicketsPlayerMode", function(_, cb)
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = "openTicketsPlayerMode",
        data = { visible = false }
    })
    cb("ok")
end)

-- NUI Callbacks for Tickets
RegisterNUICallback("mri_Qadmin:callback:GetMyReports", function(data, cb)
    local reports = lib.callback.await('mri_Qadmin:callback:GetMyReports', false)
    cb(reports or {})
end)

RegisterNUICallback("mri_Qadmin:callback:GetAllReports", function(data, cb)
    local filter = data.filter or "open"
    local reports = lib.callback.await('mri_Qadmin:callback:GetAllReports', false, filter)
    cb(reports or {})
end)

RegisterNUICallback("mri_Qadmin:callback:CreateReport", function(data, cb)
    TriggerServerEvent("mri_Qadmin:server:CreateReport", data)
    cb("ok")
end)

RegisterNUICallback("mri_Qadmin:callback:ClaimReport", function(data, cb)
    TriggerServerEvent("mri_Qadmin:server:ClaimReport", data.id)
    cb("ok")
end)

RegisterNUICallback("mri_Qadmin:callback:UnclaimReport", function(data, cb)
    TriggerServerEvent("mri_Qadmin:server:UnclaimReport", data.id)
    cb("ok")
end)

RegisterNUICallback("mri_Qadmin:callback:ResolveReport", function(data, cb)
    TriggerServerEvent("mri_Qadmin:server:ResolveReport", data.id)
    cb("ok")
end)

RegisterNUICallback("mri_Qadmin:callback:DeleteReport", function(data, cb)
    TriggerServerEvent("mri_Qadmin:server:DeleteReport", data.id)
    cb("ok")
end)

RegisterNUICallback("mri_Qadmin:callback:SendReportMessage", function(data, cb)
    TriggerServerEvent("mri_Qadmin:server:SendReportMessage", data.reportId, data.message)
    cb("ok")
end)

RegisterNUICallback("mri_Qadmin:callback:GetReportNotes", function(data, cb)
    local notes = lib.callback.await("mri_Qadmin:callback:GetReportNotes", false, data.reportId)
    cb(notes or {})
end)

RegisterNUICallback("mri_Qadmin:callback:AddReportNote", function(data, cb)
    TriggerServerEvent("mri_Qadmin:server:AddReportNote", data.reportId, data.note)
    cb("ok")
end)

RegisterNUICallback("mri_Qadmin:callback:GetPlayerNotes", function(data, cb)
    local notes = lib.callback.await("mri_Qadmin:callback:GetPlayerNotes", false, data.playerId)
    cb(notes or {})
end)

RegisterNUICallback("mri_Qadmin:callback:AddPlayerNote", function(data, cb)
    TriggerServerEvent("mri_Qadmin:server:AddPlayerNote", data.playerId, data.note)
    cb("ok")
end)

-- Ticket Server Events catchers to route to NUI
RegisterNetEvent("mri_Qadmin:client:ReportCreated", function(report)
    SendNUIMessage({
        action = "ReportCreated",
        data = report
    })
end)

RegisterNetEvent("mri_Qadmin:client:NewAdminReport", function(report)
    SendNUIMessage({
        action = "NewAdminReport",
        data = report
    })
    
    lib.notify({
        title = 'Novo Ticket',
        description = 'Assunto: ' .. report.subject,
        type = 'info'
    })
end)

RegisterNetEvent("mri_Qadmin:client:ReportUpdated", function(report)
    SendNUIMessage({
        action = "ReportUpdated",
        data = report
    })
end)

RegisterNetEvent("mri_Qadmin:client:ReportDeleted", function(reportId)
    SendNUIMessage({
        action = "ReportDeleted",
        data = reportId
    })
end)

RegisterNetEvent("mri_Qadmin:client:NewReportMessage", function(message)
    SendNUIMessage({
        action = "NewReportMessage",
        data = message
    })
end)

RegisterNetEvent("mri_Qadmin:client:ReportNotesUpdated", function(reportId, notes)
    SendNUIMessage({
        action = "ReportNotesUpdated",
        data = { reportId = reportId, notes = notes }
    })
end)

RegisterNetEvent("mri_Qadmin:client:PlayerNotesUpdated", function(playerId, notes)
    SendNUIMessage({
        action = "PlayerNotesUpdated",
        data = { playerId = playerId, notes = notes }
    })
end)
