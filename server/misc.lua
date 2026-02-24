RegisterNetEvent('mri_Qadmin:server:unban_cid', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local citizenid = GetValue(selectedData, "cid")
    if not citizenid then
        TriggerClientEvent('QBCore:Notify', src, "CID inválido.", "error", 5000)
        return
    end

    -- Busca o license (pode estar com prefixo license2:)
    MySQL.scalar('SELECT license FROM players WHERE citizenid = ?', { citizenid }, function(license)
        if not license then
            TriggerClientEvent('QBCore:Notify', src, ("❌ Nenhum jogador encontrado com CID %s."):format(citizenid), "error", 5000)
            return
        end

        -- Gera as duas versões possíveis de license
        local license1 = license:gsub("^license2:", "license:")
        local license2 = license:gsub("^license:", "license2:")

        -- Deleta qualquer ban que use license:xxx ou license2:xxx
        MySQL.update('DELETE FROM bans WHERE license = ? OR license = ?', { license1, license2 }, function(affectedRows)
            if affectedRows and affectedRows > 0 then
                TriggerClientEvent('QBCore:Notify', src, ("✅ Jogador com CID %s foi desbanido."):format(citizenid), "success", 5000)
            else
                TriggerClientEvent('QBCore:Notify', src, ("⚠️ Nenhum banimento encontrado com as licenças associadas ao CID %s."):format(citizenid), "error", 5000)
            end
        end)
    end)
end)

RegisterNetEvent('mri_Qadmin:server:delete_cid', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local citizenid = GetValue(selectedData, "cid")
    if not citizenid then
        TriggerClientEvent('QBCore:Notify', src, "CID inválido.", "error", 5000)
        return
    end

    -- Deleta o jogador usando oxmysql com callback garantido
    MySQL.update('DELETE FROM players WHERE citizenid = ?', { citizenid }, function(affectedRows)

        if affectedRows and affectedRows > 0 then
            TriggerClientEvent('QBCore:Notify', src, ("✅ Jogador com CID %s foi deletado."):format(citizenid), "success", 5000)
            TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
        else
            TriggerClientEvent('QBCore:Notify', src, ("❌ Nenhum jogador encontrado com CID %s."):format(citizenid), "error", 5000)
        end
    end)
end)


-- Ban Player
RegisterNetEvent('mri_Qadmin:server:BanPlayer', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local player = GetValue(selectedData, "Player")
    player = player and tonumber(player)
    local reason = GetValue(selectedData, "Reason") or ""
    local duration = GetValue(selectedData, "Duration") or GetValue(selectedData, "Duração")
    local time = tonumber(duration)

    local banTime = time == 2147483647 and 2147483647 or tonumber(os.time() + time)
    local timeTable = os.date('*t', banTime)

    -- Check if target is online
    local targetPlayer = player and QBCore.Functions.GetPlayer(player)

    if targetPlayer then
        -- ONLINE BAN
        MySQL.insert('INSERT INTO bans (name, license, discord, ip, reason, expire, bannedby) VALUES (?, ?, ?, ?, ?, ?, ?)',
            { GetPlayerName(player), QBCore.Functions.GetIdentifier(player, 'license'), QBCore.Functions.GetIdentifier(
                player, 'discord'), QBCore.Functions.GetIdentifier(player, 'ip'), reason, banTime, GetPlayerName(source) })

        if time == 2147483647 then
            DropPlayer(player, locale("banned") .. '\n' .. locale("reason") .. reason .. locale("ban_perm"))
        else
            DropPlayer(player,
                locale("banned") ..
                '\n' ..
                locale("reason") ..
                reason ..
                '\n' ..
                locale("ban_expires") ..
                timeTable['day'] ..
                '/' .. timeTable['month'] .. '/' .. timeTable['year'] .. ' ' .. timeTable['hour'] .. ':' .. timeTable['min'])
        end
        QBCore.Functions.Notify(source, locale("playerbanned", GetPlayerName(player), banTime, reason), 'success', 7500)

    else
        -- OFFLINE BAN
        -- We need at least a license or CID
        local license = GetValue(selectedData, "license")
        local discord = GetValue(selectedData, "discord")
        local name = GetValue(selectedData, "name") or "Offline Player"

        -- If we only have CID, try to fetch license
        local cid = GetValue(selectedData, "cid")
        if not license and cid then
             license = MySQL.scalar.await('SELECT license FROM players WHERE citizenid = ?', { cid })
        end

        if not license then
            QBCore.Functions.Notify(source, "Não foi possível banir: Player Offline e License não encontrada.", 'error', 7500)
            return
        end

        MySQL.insert('INSERT INTO bans (name, license, discord, ip, reason, expire, bannedby) VALUES (?, ?, ?, ?, ?, ?, ?)',
            { name, license, discord or "", "0.0.0.0", reason, banTime, GetPlayerName(source) })

        QBCore.Functions.Notify(source, locale("playerbanned", name, banTime, reason), 'success', 7500)
    end

    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', source)
end)

-- Unban Player
RegisterNetEvent('mri_Qadmin:server:UnbanPlayer', function(data, selectedData)
    local actionData = CheckDataFromKey(data)
    local src = source or 0

    if not actionData then
        return
    end

    if not CheckPerms(src, actionData.perms) then
        return
    end

    local targetId = tonumber(GetValue(selectedData, "Player"))
    if not targetId then
        return
    end

    local license = QBCore.Functions.GetIdentifier(targetId, 'license')

    if not license then
        if src > 0 then
            QBCore.Functions.Notify(src, 'License do jogador não encontrada.', 'error', 7500)
        end
        return
    end

    local result = MySQL.query.await('SELECT * FROM bans WHERE license = ?', { license })

    if result and #result > 0 then
        local deleteResult = MySQL.update.await('DELETE FROM bans WHERE license = ?', { license })

        if src > 0 then
            QBCore.Functions.Notify(src, 'Jogador desbanido com sucesso.', 'success', 7500)
        end
        TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
    else
        if src > 0 then
            QBCore.Functions.Notify(src, 'Nenhum ban ativo encontrado para esse jogador.', 'error', 7500)
        end
    end
end)

-- Warn Player
RegisterNetEvent('mri_Qadmin:server:WarnPlayer', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end
    local targetId = GetValue(selectedData, "Player")
    local target = QBCore.Functions.GetPlayer(targetId)
    local reason = GetValue(selectedData, "Reason")
    local sender = QBCore.Functions.GetPlayer(source)
    local warnId = 'WARN-' .. math.random(1111, 9999)
    if target ~= nil then
        QBCore.Functions.Notify(target.PlayerData.source,
            locale("warned") .. ", por: " .. locale("reason") .. " " .. reason, 'inform', 60000)
        QBCore.Functions.Notify(source,
            locale("warngiven") .. GetPlayerName(target.PlayerData.source) .. ", por: " .. reason)
        MySQL.insert('INSERT INTO player_warns (senderIdentifier, targetIdentifier, reason, warnId) VALUES (?, ?, ?, ?)',
            {
                sender.PlayerData.license,
                target.PlayerData.license,
                reason,
                warnId
            })
    else
        TriggerClientEvent('QBCore:Notify', source, locale("not_online"), 'error')
    end
end)

RegisterNetEvent('mri_Qadmin:server:KickPlayer', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end
    local src = source
    local playerVal = GetValue(selectedData, "Player")
    local target = QBCore.Functions.GetPlayer(tonumber(playerVal))
    local reason = GetValue(selectedData, "Reason")

    if not target then
        QBCore.Functions.Notify(src, locale("not_online"), 'error', 7500)
        return
    end

    DropPlayer(target.PlayerData.source, locale("kicked") .. '\n' .. locale("reason") .. reason)
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Verify Player
RegisterNetEvent('mri_Qadmin:server:verifyPlayer', function(actionKey, selectedData)
	local src = source
	local actionData = CheckDataFromKey(actionKey)

	Debug(('[DEBUG] verifyPlayer event received. ActionKey: %s'):format(tostring(actionKey)))

	if not actionData then
		Debug('[DEBUG] actionData not found for key: ' .. tostring(actionKey))
		return
	end

	if not CheckPerms(src, actionData.perms) then
		Debug('[DEBUG] Permission denied for verifyPlayer')
		return
	end

	local val = GetValue(selectedData, "Player")
	local playerId = tonumber(val)
	Debug(('[DEBUG] Attempting to verify player. ID Raw: %s | ID Number: %s'):format(tostring(val), tostring(playerId)))

	local Player = QBCore.Functions.GetPlayer(playerId)

	if Player then
		local metadata = Player.PlayerData.metadata or {}
		local currentState = metadata.verified or false

		local newState = not currentState
		Player.Functions.SetMetaData("verified", newState)

		if newState then
			local admin = QBCore.Functions.GetPlayer(src)
			local adminName = admin and admin.PlayerData.charinfo and (admin.PlayerData.charinfo.firstname .. ' ' .. admin.PlayerData.charinfo.lastname) or GetPlayerName(src)
			Player.Functions.SetMetaData("verified_by", adminName)
		else
			Player.Functions.SetMetaData("verified_by", nil)
		end

		local message = newState and "Jogador marcado como verificado." or "Verificação removida do jogador."
		TriggerClientEvent('QBCore:Notify', src, message, newState and "success" or "error", 5000)

		-- Also notify the target player
		TriggerClientEvent('QBCore:Notify', playerId, newState and "Você foi verificado pela staff." or "Sua verificação de staff foi removida.", "primary", 5000)

		-- Broadcast update to everyone so all admins see it immediately
		local ped = GetPlayerPed(playerId)
		TriggerClientEvent('mri_Qadmin:client:UpdatePlayerVitals', -1, {
			id = playerId,
			health = GetEntityHealth(ped),
			armor = GetPedArmour(ped),
			metadata = Player.PlayerData.metadata
		})

        TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
	else
		Debug('[DEBUG] Player not found for ID: ' .. tostring(playerId))
		QBCore.Functions.Notify(src, locale("not_online"), "error")
	end
end)

-- Revive Player
RegisterNetEvent('mri_Qadmin:server:Revive', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end
    local player = GetValue(selectedData, "Player")

    if GetResourceState('mri_Qbox') ~= 'started' then
        TriggerClientEvent('hospital:client:Revive', player)
    else
        TriggerClientEvent('mri_Qadmin:client:ExecuteCommand', source, ('revive %s'):format(player))
    end
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', source)
end)

-- Revive All
RegisterNetEvent('mri_Qadmin:server:ReviveAll', function(actionKey)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    if GetResourceState('mri_Qbox') ~= 'started' then
        TriggerClientEvent('hospital:client:Revive', -1)
    else
        TriggerClientEvent('mri_Qadmin:client:ExecuteCommand', source, ('reviveall %s'):format(player))
    end
end)

-- Revive Radius
RegisterNetEvent('mri_Qadmin:server:ReviveRadius', function(actionKey)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local ped = GetPlayerPed(src)
    local pos = GetEntityCoords(ped)
    local players = QBCore.Functions.GetPlayers()

    for k, v in pairs(players) do
        local target = GetPlayerPed(v)
        local targetPos = GetEntityCoords(target)
        local dist = #(pos - targetPos)

        if dist < 15.0 then
            if GetResourceState('mri_Qbox') ~= 'started' then
                TriggerClientEvent('hospital:client:Revive', v)
            else
                TriggerClientEvent('mri_Qadmin:client:ExecuteCommand', source, ('revive %s'):format(v))
            end
        end
    end
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', source)
end)

-- Set RoutingBucket
RegisterNetEvent('mri_Qadmin:server:SetBucket', function(actionKey, selectedData)
    Debug(json.encode(actionKey), json.encode(selectedData))
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local player = GetValue(selectedData, "Player")
    local bucket = tonumber(GetValue(selectedData, "Bucket"))
    local currentBucket = GetPlayerRoutingBucket(tonumber(player))

    Debug(player, bucket, currentBucket)

    if bucket == currentBucket then
        return QBCore.Functions.Notify(src, locale("target_same_bucket", player), 'error', 7500)
    end

    SetPlayerRoutingBucket(player, bucket)
    QBCore.Functions.Notify(src, locale("bucket_set_for_target", player, bucket), 'success', 7500)
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Get RoutingBucket
RegisterNetEvent('mri_Qadmin:server:GetBucket', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local player = GetValue(selectedData, "Player")
    local currentBucket = GetPlayerRoutingBucket(tonumber(player))

    QBCore.Functions.Notify(src, locale("bucket_get", player, currentBucket), 'success', 7500)
end)

-- Give Money
RegisterNetEvent('mri_Qadmin:server:GiveMoney', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local target = GetValue(selectedData, "Player")
    local amount = GetValue(selectedData, "Amount")
    local moneyType = GetValue(selectedData, "Type")
    local Player = QBCore.Functions.GetPlayer(tonumber(target))

    if Player == nil then
        return QBCore.Functions.Notify(src, locale("not_online"), 'error', 7500)
    end

    Player.Functions.AddMoney(tostring(moneyType), tonumber(amount))
    QBCore.Functions.Notify(src,
        locale((moneyType == "crypto" and "give_money_crypto" or "give_money"), tonumber(amount),
            Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname), "success")
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Give Money to all
RegisterNetEvent('mri_Qadmin:server:GiveMoneyAll', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local amount = GetValue(selectedData, "Amount")
    local moneyType = GetValue(selectedData, "Type")
    local players = QBCore.Functions.GetPlayers()

    for _, v in pairs(players) do
        local Player = QBCore.Functions.GetPlayer(tonumber(v))
        Player.Functions.AddMoney(tostring(moneyType), tonumber(amount))
        QBCore.Functions.Notify(src,
            locale((moneyType == "crypto" and "give_money_all_crypto" or "give_money_all"), tonumber(amount)), "success")
    end
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Take Money
RegisterNetEvent('mri_Qadmin:server:TakeMoney', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local target = GetValue(selectedData, "Player")
    local amount = GetValue(selectedData, "Amount")
    local moneyType = GetValue(selectedData, "Type")
    local Player = QBCore.Functions.GetPlayer(tonumber(target))

    if Player == nil then
        return QBCore.Functions.Notify(src, locale("not_online"), 'error', 7500)
    end

    if Player.PlayerData.money[moneyType] >= tonumber(amount) then
        Player.Functions.RemoveMoney(moneyType, tonumber(amount), "state-fees")
    else
        QBCore.Functions.Notify(src, locale("not_enough_money"), "primary")
    end

    QBCore.Functions.Notify(src,
        locale((moneyType == "crypto" and "take_money_crypto" or "take_money"), tonumber(amount) .. "R$",
            Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname), "success")
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Blackout
local Blackout = false
RegisterNetEvent('mri_Qadmin:server:ToggleBlackout', function(actionKey)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end
    Blackout = not Blackout

    local src = source

    if Blackout then
        TriggerClientEvent('QBCore:Notify', src, locale("blackout", "Ativado"), 'primary')
        while Blackout do
            Wait(0)
            exports["qb-weathersync"]:setBlackout(true)
        end
        exports["qb-weathersync"]:setBlackout(false)
        TriggerClientEvent('QBCore:Notify', src, locale("blackout", "Desativado"), 'primary')
    end
end)

-- Toggle Cuffs
RegisterNetEvent('mri_Qadmin:server:CuffPlayer', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local target = tonumber(GetValue(selectedData, "Player"))

    if GetResourceState("ND_Police") == "started" then
        local playerIsCuffed = Player(target).state.isCuffed
        local playerCuffType = Player(target).state.cuffType or "cuffs"

        if playerIsCuffed then
            TriggerClientEvent("ND_Police:uncuffPed", target)
            return QBCore.Functions.Notify(source, locale("toggled_cuffs_off"), 'success')
        end
        TriggerClientEvent("ND_Police:syncNormalCuff", target, "front", "cuffs")
        return QBCore.Functions.Notify(source, locale("toggled_cuffs_on"), 'success')
    end

    TriggerClientEvent('mri_Qadmin:client:ToggleCuffs', target)
    QBCore.Functions.Notify(source, locale("toggled_cuffs"), 'success')
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', source)
end)

-- Give Clothing Menu
RegisterNetEvent('mri_Qadmin:server:ClothingMenu', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local target = tonumber(GetValue(selectedData, "Player"))

    if target == nil then
        return QBCore.Functions.Notify(src, locale("not_online"), 'error', 7500)
    end

    if target == src then
        TriggerClientEvent("mri_Qadmin:client:CloseUI", src)
    end

    TriggerClientEvent('qb-clothing:client:openMenu', target)
end)

-- Set Ped
RegisterNetEvent("mri_Qadmin:server:setPed", function(actionKey, selectedData)
    local src = source
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then
        QBCore.Functions.Notify(src, locale("no_perms"), "error", 5000)
        return
    end

    local ped = GetValue(selectedData, "Ped Models") -- Assuming label as default if table
    local tsrc = tonumber(GetValue(selectedData, "Player"))
    local Player = QBCore.Functions.GetPlayer(tsrc)

    if not Player then
        QBCore.Functions.Notify(locale("not_online"), "error", 5000)
        return
    end

    TriggerClientEvent("mri_Qadmin:client:setPed", Player.PlayerData.source, ped)
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Callback para listar bans com paginação e busca
lib.callback.register('mri_Qadmin:callback:GetBans', function(source, data)
    local page = data and tonumber(data.page) or 1
    local pageSize = data and tonumber(data.pageSize) or 50
    local search = data and data.search or ""
    local offset = (page - 1) * pageSize

    local query = 'SELECT * FROM bans'
    local countQuery = 'SELECT COUNT(1) FROM bans'
    local params = {}

    if search ~= "" then
        local pattern = "%" .. search .. "%"
        query = query .. ' WHERE name LIKE ? OR reason LIKE ? OR license LIKE ?'
        countQuery = countQuery .. ' WHERE name LIKE ? OR reason LIKE ? OR license LIKE ?'
        params = { pattern, pattern, pattern }
    end

    local total = MySQL.scalar.await(countQuery, params)

    query = query .. ' LIMIT ? OFFSET ?'
    table.insert(params, pageSize)
    table.insert(params, offset)

    local bans = MySQL.query.await(query, params) or {}

    return {
        data = bans,
        total = total,
        pages = math.ceil(total / pageSize)
    }
end)

-- Desbanir por ID da linha
RegisterNetEvent('mri_Qadmin:server:unban_rowid', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local banId = tonumber(GetValue(selectedData, "ban_id"))
    if not banId then
        TriggerClientEvent('QBCore:Notify', src, "ID do banimento inválido.", "error", 5000)
        return
    end

    local affectedRows = MySQL.update.await('DELETE FROM bans WHERE id = ?', { banId })
    if affectedRows and affectedRows > 0 then
        TriggerClientEvent('QBCore:Notify', src, ("✅ Banimento removido com sucesso (ID %s)."):format(banId), "success", 5000)
        TriggerClientEvent('mri_Qadmin:client:RefreshBans', -1)
    else
        TriggerClientEvent('QBCore:Notify', src, "Nenhum banimento removido.", "error", 5000)
    end
end)
-- Kill Player
RegisterNetEvent('mri_Qadmin:server:KillPlayer', function(actionKey, selectedData)
    local actionData = CheckDataFromKey(actionKey)
    if not actionData or not CheckPerms(source, actionData.perms) then return end

    local src = source
    local targetId = tonumber(GetValue(selectedData, "Player"))
    local targetPed = GetPlayerPed(targetId)
    local targetPlayer = QBCore.Functions.GetPlayer(targetId)

    Debug(('[mri_Qadmin] KillPlayer: Admin %s killing Target %s'):format(src, targetId))

    if targetPlayer then
        -- Trigger client event on target to kill themselves (reliable way)
        TriggerClientEvent('mri_Qadmin:client:ForceKill', targetPlayer.PlayerData.source)
        QBCore.Functions.Notify(src, locale("kill_player", targetPlayer.PlayerData.charinfo.firstname), 'success')
    else
        QBCore.Functions.Notify(src, locale("not_online"), 'error')
    end
end)

lib.callback.register('mri_Qadmin:callback:GetPlayerCoords', function(source, targetIds)
    local coordsList = {}
    if not targetIds or type(targetIds) ~= 'table' then return coordsList end

    for _, id in ipairs(targetIds) do
        local ped = GetPlayerPed(id)
        if ped and ped ~= 0 then
            local coords = GetEntityCoords(ped)
            local heading = GetEntityHeading(ped)
            table.insert(coordsList, {
                id = id,
                x = coords.x,
                y = coords.y,
                heading = heading,
                name = GetPlayerName(id) or "Unknown"
            })
        end
    end
    return coordsList
end)

lib.callback.register('mri_Qadmin:callback:GetAllPlayerCoords', function(source)
    local players = QBCore.Functions.GetPlayers()
    local coordsList = {}

    for _, id in pairs(players) do
        local src = tonumber(id)
        local ped = GetPlayerPed(src)
        if ped and ped ~= 0 then
            local coords = GetEntityCoords(ped)
            local heading = GetEntityHeading(ped)
            local player = QBCore.Functions.GetPlayer(src)
            local name = "Unknown"
            local vitals = { health = 100, armor = 0, hunger = 100, thirst = 100 }
            local inVehicle = IsPedInAnyVehicle(ped, false)
            local isStaff = IsPlayerAceAllowed(src, 'qadmin.master')
            local staffColor = nil
            if isStaff then
                local rgb, _ = GetPlayerESPColor(src)
                if rgb then
                    staffColor = RGBToHex(rgb)
                end
            end

            if player then
                name = player.PlayerData.charinfo.firstname .. ' ' .. player.PlayerData.charinfo.lastname
                vitals.health = GetEntityHealth(ped)
                vitals.armor = GetPedArmour(ped)
                vitals.hunger = player.PlayerData.metadata['hunger'] or 100
                vitals.thirst = player.PlayerData.metadata['thirst'] or 100
                vitals.isDead = player.PlayerData.metadata['isdead'] or player.PlayerData.metadata['inlaststand'] or false
            else
                name = GetPlayerName(src)
            end

            table.insert(coordsList, {
                id = src,
                x = coords.x,
                y = coords.y,
                heading = heading,
                name = name,
                vitals = vitals,
                inVehicle = inVehicle,
                isStaff = isStaff,
                staffColor = staffColor
            })
        end
    end

    return coordsList
end)

-- Screenshot Logic
lib.callback.register('mri_Qadmin:callback:GetPlayerScreen', function(source, targetId)
    local target = tonumber(targetId)
    local src = source
    print('[DEBUG] GetPlayerScreen called. Source:', src, 'Target:', target)

    if target and target ~= 0 then
        -- Trigger WebRTC Start on Target
        -- Params: requesterSource (who wants to watch)
        TriggerClientEvent('mri_Qadmin:client:StartWebRTC', target, src)
        return { status = "webrtc_initiated" }
    end
    return { status = "error", message = "Invalid Target" }
end)

-- Real-time vitals for ScreenModal
lib.callback.register('mri_Qadmin:callback:GetPlayerVitals', function(source, targetId)
    local target = tonumber(targetId)
    if not target or target == 0 then return { error = 'Invalid target' } end
    local player = QBCore.Functions.GetPlayer(target)
    if not player then return { error = 'Player not found' } end
    local ped = GetPlayerPed(target)
    return {
        health   = GetEntityHealth(ped),
        armor    = GetPedArmour(ped),
        ping     = GetPlayerPing(target),
        metadata = player.PlayerData.metadata or {}
    }
end)

-- Stop WebRTC streaming on the target player
RegisterServerEvent('mri_Qadmin:server:StopPlayerScreen', function(targetId)
    local target = tonumber(targetId)
    if target and target ~= 0 then
        TriggerClientEvent('mri_Qadmin:client:StopWebRTC', target)
    end
end)

-- ── FiveM Native Signaling Relay ─────────────────────────────────────────────
-- Receives a signal message from one client and forwards it to the target.
-- The target is encoded in msg.targetId (e.g. "viewer-5" or "3").
RegisterServerEvent('mri_Qadmin:server:Signal', function(msg)
    if not msg or not msg.targetId then return end

    local targetIdStr = tostring(msg.targetId)
    local target = nil

    -- Resolve target by stripping "viewer-" prefix if present
    local rawId = targetIdStr:match("^viewer%-(%d+)$") or targetIdStr
    target = tonumber(rawId)

    if target and target ~= 0 then
        -- Deliver the message to the target player's NUI as a 'Signal' action
        TriggerClientEvent('mri_Qadmin:client:DeliverSignal', target, msg)
    end
end)

RegisterNetEvent('mri_Qadmin:server:ReceiveScreenChunk', function(requester, chunkData)
    -- chunkData = { captureId, current, total, data }
    if requester then
        TriggerClientEvent('mri_Qadmin:client:ReceiveScreenChunk', requester, {
             id = source, -- The player who sent the screen
             captureId = chunkData.captureId,
             current = chunkData.current,
             total = chunkData.total,
             data = chunkData.data
        })
    end
end)

-- ── Cloudflare Realtime SFU API Proxy ────────────────────────────────────────
-- Secrets are read from server/server_secrets.json via LoadResourceFile so they
-- never appear in shared_scripts and work regardless of the Lua runtime isolation.
local _cfSecrets = nil
local function cfSecrets()
    if _cfSecrets then return _cfSecrets end
    local raw = LoadResourceFile(GetCurrentResourceName(), 'server/server_secrets.json')
    if not raw then
        print('[CF SFU] ERROR: server/server_secrets.json not found!')
        _cfSecrets = {}
    else
        local ok, data = pcall(json.decode, raw)
        _cfSecrets = (ok and data) or {}
        if not _cfSecrets.CloudflareAppId then
            print('[CF SFU] ERROR: server_secrets.json is missing CloudflareAppId')
        else
            print('[CF SFU] Secrets loaded OK. AppId:', _cfSecrets.CloudflareAppId:sub(1, 8) .. '...')
        end
    end
    return _cfSecrets
end

local CF_BASE = 'https://rtc.live.cloudflare.com/v1/apps/'

local function cfRequest(method, path, body)
    local s   = cfSecrets()
    local appId     = s.CloudflareAppId     or ''
    local appSecret = s.CloudflareAppSecret or ''
    if appId == '' then return { error = 'CF credentials missing — check server/server_secrets.json' } end

    local p = promise.new()
    local url = CF_BASE .. appId .. path
    local headers = { ['Authorization'] = 'Bearer ' .. appSecret }
    local bodyStr = ''

    -- Only attach Content-Type + body when there is actual payload
    if body ~= nil and next(body) ~= nil then
        bodyStr = json.encode(body)
        headers['Content-Type'] = 'application/json'
    end

    print(('[CF SFU] --> %s %s (body: %d bytes)'):format(method, url, #bodyStr))
    PerformHttpRequest(url, function(code, responseBody, _h)
        print(('[CF SFU] <-- %d  %s'):format(code, (responseBody or ''):sub(1, 400)))
        if code >= 200 and code < 300 then
            local ok, data = pcall(json.decode, responseBody)
            if ok and data then p:resolve(data)
            else p:resolve({ raw = responseBody })
            end
        elseif code == 0 then
            p:resolve({ error = 'CF API: connection failed (code 0) — check server outbound HTTPS access' })
        else
            p:resolve({ error = ('CF API error %d: %s'):format(code, responseBody or '') })
        end
    end, method, bodyStr, headers)
    return Citizen.Await(p)
end

lib.callback.register('mri_Qadmin:callback:CFCreateSession', function(_source)
    -- sessions/new expects NO body and NO Content-Type
    local ok, result = pcall(cfRequest, 'POST', '/sessions/new', nil)
    if not ok then
        print('[CF SFU] CFCreateSession exception:', result)
        return { error = 'CFCreateSession exception: ' .. tostring(result) }
    end
    return result
end)

lib.callback.register('mri_Qadmin:callback:CFPublishTracks', function(_source, data)
    local ok, result = pcall(cfRequest, 'POST', ('/sessions/%s/tracks/new'):format(data.sessionId), {
        sessionDescription = data.offer,
        tracks = {{ location = 'local', mid = '0', trackName = 'screen' }},
    })
    if not ok then print('[CF SFU] CFPublishTracks exception:', result); return { error = tostring(result) } end
    return result
end)

lib.callback.register('mri_Qadmin:callback:CFSubscribe', function(_source, data)
    local ok, result = pcall(cfRequest, 'POST', ('/sessions/%s/tracks/new'):format(data.mySessionId), {
        tracks = {{ location = 'remote', sessionId = data.publisherSessionId, trackName = data.trackName }},
    })
    if not ok then print('[CF SFU] CFSubscribe exception:', result); return { error = tostring(result) } end
    return result
end)

lib.callback.register('mri_Qadmin:callback:CFRenegotiate', function(_source, data)
    return cfRequest('PUT', ('/sessions/%s/renegotiate'):format(data.sessionId), {
        sessionDescription = data.answer,
    })
end)

-- Relay publisher track info to the waiting admin viewer
RegisterServerEvent('mri_Qadmin:server:CFAnnounceTrack', function(data)
    local adminId = tonumber(data.adminId)
    if adminId and adminId ~= 0 then
        TriggerClientEvent('mri_Qadmin:client:CFTrackReady', adminId, {
            sessionId = data.sessionId,
            trackName = data.trackName,
        })
    end
end)
