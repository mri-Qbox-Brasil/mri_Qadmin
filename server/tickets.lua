local QBCore = exports['qb-core']:GetCoreObject()

-- Server Callback handlers and Events for tickets

-- Save an identifier mapping for a player when they join or create a ticket
local function savePlayerIdentifiers(source, primaryIdentifier)
    local identifiers = GetPlayerIdentifiers(source) or {}
    local parsed = {
        license = nil,
        steam = nil,
        discord = nil,
        fivem = nil
    }

    for _, id in ipairs(identifiers) do
        if string.find(id, "license:") then
            parsed.license = id
        elseif string.find(id, "steam:") then
            parsed.steam = id
        elseif string.find(id, "discord:") then
            parsed.discord = id
        elseif string.find(id, "fivem:") then
            parsed.fivem = id
        end
    end

    MySQL.insert([[
        INSERT INTO mri_player_identifiers (player_id, license, steam, discord, fivem)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            license = VALUES(license),
            steam = VALUES(steam),
            discord = VALUES(discord),
            fivem = VALUES(fivem)
    ]], { primaryIdentifier, parsed.license, parsed.steam, parsed.discord, parsed.fivem })
end

lib.callback.register("mri_Qadmin:callback:GetMyReports", function(source)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then return {} end
    local citizenid = Player.PlayerData.citizenid

    savePlayerIdentifiers(source, citizenid)

    local reports = MySQL.query.await([[
        SELECT 
            r.*, 
            (SELECT COUNT(*) FROM mri_report_messages WHERE report_id = r.id) as message_count
        FROM mri_reports r 
        WHERE r.player_id = ? 
        ORDER BY r.created_at DESC
    ]], {citizenid})

    -- Attach messages for each report
    for _, report in ipairs(reports) do
        report.messages = MySQL.query.await('SELECT * FROM mri_report_messages WHERE report_id = ? ORDER BY created_at ASC', {report.id})
    end

    return reports
end)

lib.callback.register("mri_Qadmin:callback:GetAllReports", function(source, filter)
    -- Check permissions
    if not CheckPerms('qadmin.page.tickets') then return {} end

    local query = "SELECT r.*, (SELECT COUNT(*) FROM mri_report_messages WHERE report_id = r.id) as message_count FROM mri_reports r"
    local params = {}
    
    if filter == "open" then
        query = query .. " WHERE r.status IN ('open', 'claimed')"
    elseif filter == "resolved" then
        query = query .. " WHERE r.status = 'resolved'"
    end
    
    query = query .. " ORDER BY r.priority DESC, r.created_at DESC"
    
    local reports = MySQL.query.await(query, params)
    
    -- Attach messages
    for _, report in ipairs(reports) do
        report.messages = MySQL.query.await('SELECT * FROM mri_report_messages WHERE report_id = ? ORDER BY created_at ASC', {report.id})
    end

    return reports
end)

RegisterNetEvent("mri_Qadmin:server:CreateReport", function(data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    
    local citizenid = Player.PlayerData.citizenid
    local name = GetPlayerName(src)
    local subject = data.subject or "Sem assunto"
    local category = data.category or "general"
    local description = data.description or ""
    local ped = GetPlayerPed(src)
    local coords = GetEntityCoords(ped)
    local coordsStr = json.encode({x = coords.x, y = coords.y, z = coords.z})

    local reportId = MySQL.insert.await([[
        INSERT INTO mri_reports (player_id, player_name, subject, category, description, player_coords)
        VALUES (?, ?, ?, ?, ?, ?)
    ]], {citizenid, name, subject, category, description, coordsStr})

    local newReport = MySQL.query.await('SELECT * FROM mri_reports WHERE id = ?', {reportId})[1]
    newReport.messages = {}

    -- Send back to creator
    TriggerClientEvent("mri_Qadmin:client:ReportCreated", src, newReport)
    
    -- Notify admins
    local admins = GetPlayers()
    for _, adminId in ipairs(admins) do
        if CheckPermsOffline(tonumber(adminId), 'qadmin.page.tickets') then
            TriggerClientEvent("mri_Qadmin:client:NewAdminReport", tonumber(adminId), newReport)
        end
    end
end)

RegisterNetEvent("mri_Qadmin:server:ClaimReport", function(reportId)
    local src = source
    if not CheckPerms('qadmin.page.tickets') then return end

    local name = GetPlayerName(src)
    local identifier = GetPlayerIdentifier(src, 0)
    
    MySQL.update.await('UPDATE mri_reports SET status = ?, claimed_by = ?, claimed_by_name = ? WHERE id = ?', 
        {'claimed', identifier, name, reportId})

    local updatedReport = MySQL.query.await('SELECT * FROM mri_reports WHERE id = ?', {reportId})[1]
    updatedReport.messages = MySQL.query.await('SELECT * FROM mri_report_messages WHERE report_id = ? ORDER BY created_at ASC', {reportId})

    TriggerClientEvent("mri_Qadmin:client:ReportUpdated", -1, updatedReport)
end)

RegisterNetEvent("mri_Qadmin:server:UnclaimReport", function(reportId)
    local src = source
    if not CheckPerms('qadmin.page.tickets') then return end

    MySQL.update.await('UPDATE mri_reports SET status = ?, claimed_by = NULL, claimed_by_name = NULL WHERE id = ?', 
        {'open', reportId})

    local updatedReport = MySQL.query.await('SELECT * FROM mri_reports WHERE id = ?', {reportId})[1]
    updatedReport.messages = MySQL.query.await('SELECT * FROM mri_report_messages WHERE report_id = ? ORDER BY created_at ASC', {reportId})

    TriggerClientEvent("mri_Qadmin:client:ReportUpdated", -1, updatedReport)
end)

RegisterNetEvent("mri_Qadmin:server:ResolveReport", function(reportId)
    local src = source
    if not CheckPerms('qadmin.page.tickets') then return end

    MySQL.update.await('UPDATE mri_reports SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?', 
        {'resolved', reportId})

    local updatedReport = MySQL.query.await('SELECT * FROM mri_reports WHERE id = ?', {reportId})[1]
    updatedReport.messages = MySQL.query.await('SELECT * FROM mri_report_messages WHERE report_id = ? ORDER BY created_at ASC', {reportId})

    TriggerClientEvent("mri_Qadmin:client:ReportUpdated", -1, updatedReport)
end)

RegisterNetEvent("mri_Qadmin:server:DeleteReport", function(reportId)
    local src = source
    if not CheckPerms('qadmin.page.tickets') then return end

    MySQL.query.await('DELETE FROM mri_reports WHERE id = ?', {reportId})

    TriggerClientEvent("mri_Qadmin:client:ReportDeleted", -1, reportId)
end)

RegisterNetEvent("mri_Qadmin:server:SendReportMessage", function(reportId, message)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    
    local name = GetPlayerName(src)
    local identifier = Player.PlayerData.citizenid
    local senderType = 'player'
    
    if CheckPermsOffline(src, 'qadmin.page.tickets') then
        -- We can assume it's an admin if they have the perm
        -- Check if they are the claimed admin or just an admin viewing
        senderType = 'admin'
    end

    local messageId = MySQL.insert.await([[
        INSERT INTO mri_report_messages (report_id, sender_id, sender_name, sender_type, message)
        VALUES (?, ?, ?, ?, ?)
    ]], {reportId, identifier, name, senderType, message})

    local newMessage = MySQL.query.await('SELECT * FROM mri_report_messages WHERE id = ?', {messageId})[1]
    
    TriggerClientEvent("mri_Qadmin:client:NewReportMessage", -1, newMessage)
end)

RegisterNetEvent("mri_Qadmin:server:SetReportPriority", function(reportId, priority)
    local src = source
    if not CheckPerms('qadmin.page.tickets') then return end

    MySQL.update.await('UPDATE mri_reports SET priority = ? WHERE id = ?', {priority, reportId})

    TriggerClientEvent("mri_Qadmin:client:ReportPriorityUpdated", -1, reportId, priority)
end)

RegisterNetEvent("mri_Qadmin:server:SendReportVoice", function(reportId, audioBase64, duration)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    
    local name = GetPlayerName(src)
    local identifier = Player.PlayerData.citizenid
    local senderType = 'player'
    
    if CheckPermsOffline(src, 'qadmin.page.tickets') then
        senderType = 'admin'
    end

    -- Attempt to read webhook from sws-report if possible
    local webhookUrl = ""
    local swsConfigStr = LoadResourceFile("sws-report", "config/main.lua")
    if swsConfigStr then
        local match = swsConfigStr:match('webhook%s*=%s*"([^"]+)"')
        if match then webhookUrl = match end
    end

    if webhookUrl == "" then
        QBCore.Functions.Notify(src, "Discord webhook não configurado no sws-report.", "error")
        return
    end

    exports['sws-report']:uploadVoiceToDiscord({
        webhookUrl = webhookUrl,
        base64Audio = audioBase64,
        reportId = reportId,
        senderName = name,
        botName = "mri_Qadmin"
    }, function(success, url, errorMsg)
        if not success or not url then
            QBCore.Functions.Notify(src, "Falha ao enviar áudio: " .. tostring(errorMsg), "error")
            return
        end

        local messageId = MySQL.insert.await([[
            INSERT INTO mri_report_messages (report_id, sender_id, sender_name, sender_type, message, message_type, audio_url, audio_duration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ]], {reportId, identifier, name, senderType, "[Voice Message]", "voice", url, math.ceil(duration)})

        local newMessage = MySQL.query.await('SELECT * FROM mri_report_messages WHERE id = ?', {messageId})[1]
        TriggerClientEvent("mri_Qadmin:client:NewReportMessage", -1, newMessage)
    end)
end)

lib.callback.register("mri_Qadmin:callback:GetReportNotes", function(source, reportId)
    if not CheckPerms('qadmin.page.tickets') then return {} end
    return MySQL.query.await('SELECT * FROM mri_report_notes WHERE report_id = ? ORDER BY created_at DESC', {reportId})
end)

RegisterNetEvent("mri_Qadmin:server:AddReportNote", function(reportId, note)
    local src = source
    if not CheckPerms('qadmin.page.tickets') then return end
    
    local name = GetPlayerName(src)
    local identifier = GetPlayerIdentifier(src, 0)
    
    MySQL.insert.await('INSERT INTO mri_report_notes (report_id, admin_id, admin_name, note) VALUES (?, ?, ?, ?)', 
        {reportId, identifier, name, note})
        
    local notes = MySQL.query.await('SELECT * FROM mri_report_notes WHERE report_id = ? ORDER BY created_at DESC', {reportId})
    TriggerClientEvent("mri_Qadmin:client:ReportNotesUpdated", src, reportId, notes)
end)

lib.callback.register("mri_Qadmin:callback:GetPlayerNotes", function(source, playerId)
    if not CheckPerms('qadmin.page.tickets') then return {} end
    return MySQL.query.await('SELECT * FROM mri_player_notes WHERE player_id = ? ORDER BY created_at DESC', {playerId})
end)

lib.callback.register("mri_Qadmin:callback:GetPlayerHistory", function(source, targetCitizenId)
    if not CheckPerms('qadmin.page.tickets') then return {} end
    
    local reports = MySQL.query.await([[
        SELECT 
            id, subject, category, status, priority, created_at, resolved_at, claimed_by_name
        FROM mri_reports 
        WHERE player_id = ? 
        ORDER BY created_at DESC
    ]], {targetCitizenId})
    
    local notes = MySQL.query.await('SELECT * FROM mri_player_notes WHERE player_id = ? ORDER BY created_at DESC', {targetCitizenId})
    
    local identifiers = MySQL.query.await('SELECT * FROM mri_player_identifiers WHERE player_id = ?', {targetCitizenId})[1] or {}
    
    return {
        reports = reports or {},
        notes = notes or {},
        identifiers = identifiers or {}
    }
end)

RegisterNetEvent("mri_Qadmin:server:AddPlayerNote", function(playerId, note)
    local src = source
    if not CheckPerms('qadmin.page.tickets') then return end
    
    local name = GetPlayerName(src)
    local identifier = GetPlayerIdentifier(src, 0)
    
    MySQL.insert.await('INSERT INTO mri_player_notes (player_id, admin_id, admin_name, note) VALUES (?, ?, ?, ?)', 
        {playerId, identifier, name, note})
        
    local notes = MySQL.query.await('SELECT * FROM mri_player_notes WHERE player_id = ? ORDER BY created_at DESC', {playerId})
    TriggerClientEvent("mri_Qadmin:client:PlayerNotesUpdated", src, playerId, notes)
end)
