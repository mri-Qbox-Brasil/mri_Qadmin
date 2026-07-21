RegisterNetEvent('mri_Qadmin:server:unban_cid', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.unban_player') then return end

    local src = source
    local citizenid = GetValue(selectedData, "cid")
    if type(citizenid) ~= 'string' or citizenid == '' or #citizenid > 64 then
        TriggerClientEvent('QBCore:Notify', src, "CID inválido.", "error", 5000)
        return
    end

    -- Busca o license (pode estar com prefixo license2:)
    local license = MySQL.scalar.await('SELECT license FROM players WHERE citizenid = ?', { citizenid })
    if not license then
        TriggerClientEvent('QBCore:Notify', src, ("❌ Nenhum jogador encontrado com CID %s."):format(citizenid), "error", 5000)
        return
    end

    -- Gera as duas versões possíveis de license
    local license1 = license:gsub("^license2:", "license:")
    local license2 = license:gsub("^license:", "license2:")

    -- Deleta qualquer ban que use license:xxx ou license2:xxx
    local affectedRows = MySQL.update.await('DELETE FROM bans WHERE license = ? OR license = ?', { license1, license2 })
    if affectedRows and affectedRows > 0 then
        TriggerClientEvent('QBCore:Notify', src, ("✅ Jogador com CID %s foi desbanido."):format(citizenid), "success", 5000)
        AddLog(src, 'mri_Qadmin', 'bans', 'info', ('Desbanimento: CID %s desbanido'):format(citizenid), { cid = citizenid })
    else
        TriggerClientEvent('QBCore:Notify', src, ("⚠️ Nenhum banimento encontrado com as licenças associadas ao CID %s."):format(citizenid), "error", 5000)
    end
end)

RegisterNetEvent('mri_Qadmin:server:delete_cid', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.delete_character') then return end

    local src = source
    local citizenid = GetValue(selectedData, "cid")
    if not citizenid or type(citizenid) ~= 'string' or citizenid == '' then
        TriggerClientEvent('QBCore:Notify', src, "CID inválido.", "error", 5000)
        return
    end

    -- Se o personagem deletado pertence a um master que está online, bloqueia
    -- a menos que o próprio actor seja master.
    local onlinePlayer = QBCore.Functions.GetPlayerByCitizenId(citizenid)
    if onlinePlayer and not CheckTargetable(src, onlinePlayer.PlayerData.source) then return end

    -- Cleanup em cascata: vehicles, warns, group memberships do mri_Qadmin
    -- e licenses-related bans devem ser tratados separadamente pelo unban.
    MySQL.query.await('DELETE FROM player_vehicles WHERE citizenid = ?', { citizenid })
    MySQL.query.await('DELETE FROM mri_qadmin_character_groups WHERE citizenid = ?', { citizenid })

    -- player_warns usa a license como identifier (não o cid). A tabela pode não
    -- existir em todo servidor, e sua collation pode divergir de `players` — o
    -- que quebra um JOIN direto (Illegal mix of collations). Por isso resolvemos
    -- a license primeiro e deletamos por parâmetro (sem comparar colunas).
    local hasWarns = MySQL.scalar.await([[
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'player_warns' LIMIT 1
    ]])
    if hasWarns then
        local warnLicense = MySQL.scalar.await('SELECT license FROM players WHERE citizenid = ?', { citizenid })
        if warnLicense then
            MySQL.query.await('DELETE FROM player_warns WHERE targetIdentifier = ?', { warnLicense })
        end
    end

    -- Finalmente o personagem. Se o alvo estiver ONLINE, delega ao qbx_core:
    -- DeleteCharacter dá DropPlayer antes de deletar, evitando que o qbx
    -- re-salve o personagem no disconnect (senão ele "voltaria"). Offline
    -- (ou sem qbx), deleta direto do banco.
    local deleted
    if onlinePlayer and GetResourceState('qbx_core') == 'started' then
        exports.qbx_core:DeleteCharacter(citizenid)
        deleted = true
    else
        if onlinePlayer then
            -- Fallback sem qbx: expulsa antes pra não re-salvar no drop.
            DropPlayer(tostring(onlinePlayer.PlayerData.source), 'Um admin deletou o personagem que você estava usando.')
        end
        local affectedRows = MySQL.update.await('DELETE FROM players WHERE citizenid = ?', { citizenid })
        deleted = affectedRows and affectedRows > 0
    end

    if deleted then
        TriggerClientEvent('QBCore:Notify', src, ("✅ Jogador com CID %s foi deletado."):format(citizenid), "success", 5000)
        AddLog(src, 'mri_Qadmin', 'players', 'error', ('Deletar personagem: CID %s deletado (cascade)'):format(citizenid), { citizenid = citizenid })
        TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
    else
        TriggerClientEvent('QBCore:Notify', src, ("❌ Nenhum jogador encontrado com CID %s."):format(citizenid), "error", 5000)
    end
end)


-- Ban Player
RegisterNetEvent('mri_Qadmin:server:BanPlayer', function(actionKey, selectedData)
    if not CheckPerms(source, 'qadmin.action.ban_player') then return end
    if not RateLimit(source, 'ban_player', 1000) then return end

    Debug('debug', ('[BanPlayer] actionKey: %s | selectedData: %s'):format(tostring(actionKey), json.encode(selectedData)))
    local player = tonumber(GetValue(selectedData, "Player"))
    if player and not CheckTargetable(source, player) then return end
    local reason = tostring(GetValue(selectedData, "Reason") or "")
    local duration = GetValue(selectedData, "Duration") or GetValue(selectedData, "Duração")
    local time = tonumber(duration)

    -- Validação: time precisa ser numérico, não-negativo, e dentro do range MAX
    -- ban permanente é representado por 2147483647 (max int32 unix).
    local PERMANENT = 2147483647
    if not time or time < 0 then
        return QBCore.Functions.Notify(source, "Duração de ban inválida.", "error", 5000)
    end
    -- Cap em 10 anos (em segundos) — qualquer coisa além é tratado como permanente
    local TEN_YEARS = 60 * 60 * 24 * 365 * 10
    if time ~= PERMANENT and time > TEN_YEARS then time = PERMANENT end

    local banTime = time == PERMANENT and PERMANENT or (os.time() + time)
    -- Evita overflow do int32 que MySQL signed int aceita
    if banTime > PERMANENT then banTime = PERMANENT end
    local timeTable = os.date('*t', banTime)

    -- Check if target is online
    local targetPlayerOnline = player and QBCore.Functions.GetPlayer(player)

    if targetPlayerOnline then
        -- ONLINE BAN
        MySQL.insert.await('INSERT INTO bans (name, license, discord, ip, reason, expire, bannedby) VALUES (?, ?, ?, ?, ?, ?, ?)',
            { GetPlayerName(player), QBCore.Functions.GetIdentifier(player, 'license'), QBCore.Functions.GetIdentifier(
                player, 'discord'), QBCore.Functions.GetIdentifier(player, 'ip'), reason, banTime, GetPlayerName(source) })

        if time == PERMANENT then
            DropPlayer(player, locale("notifications.banned") .. '\n' .. locale("notifications.reason") .. reason .. locale("notifications.ban_perm"))
        else
            DropPlayer(player,
                locale("notifications.banned") ..
                '\n' ..
                locale("notifications.reason") ..
                reason ..
                '\n' ..
                locale("notifications.ban_expires") ..
                timeTable['day'] ..
                '/' .. timeTable['month'] .. '/' .. timeTable['year'] .. ' ' .. timeTable['hour'] .. ':' .. timeTable['min'])
        end
        QBCore.Functions.Notify(source, locale("notifications.playerbanned", GetPlayerName(player), banTime, reason), 'success', 7500)
        local logData = GetTargetData(player)
        logData.reason = reason
        logData.duration = duration
        AddLog(source, 'mri_Qadmin', 'bans', 'warn', ('Banimento: %s foi banido'):format(GetPlayerName(player) or player), logData)

    else
        -- OFFLINE BAN
        -- We need at least a license or CID
        local licenseVal = GetValue(selectedData, "license")
        local discord = GetValue(selectedData, "discord")
        local name = GetValue(selectedData, "name") or "Offline Player"

        -- If we only have CID, try to fetch license
        local cid = GetValue(selectedData, "cid")
        if not licenseVal and cid then
             licenseVal = MySQL.scalar.await('SELECT license FROM players WHERE citizenid = ?', { cid })
        end

        if not licenseVal then
            QBCore.Functions.Notify(source, "Não foi possível banir: Player Offline e License não encontrada.", 'error', 7500)
            return
        end

        MySQL.insert.await('INSERT INTO bans (name, license, discord, ip, reason, expire, bannedby) VALUES (?, ?, ?, ?, ?, ?, ?)',
            { name, licenseVal, discord or "", "0.0.0.0", reason, banTime, GetPlayerName(source) })

        QBCore.Functions.Notify(source, locale("notifications.playerbanned", name, banTime, reason), 'success', 7500)
        AddLog(source, 'mri_Qadmin', 'bans', 'warn', ('Banimento (offline): %s foi banido'):format(name), { reason = reason, duration = duration, name = name, license = licenseVal })
    end

    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', source)
end)

-- Unban Player
RegisterNetEvent('mri_Qadmin:server:UnbanPlayer', function(data, selectedData)
    local src = source or 0

    if not CheckPerms(src, 'qadmin.action.unban_player') then
        return
    end

    local targetId = tonumber(GetValue(selectedData, "Player"))
    if not targetId then
        return
    end

    local licenseVal = QBCore.Functions.GetIdentifier(targetId, 'license')

    if not licenseVal then
        if src > 0 then
            QBCore.Functions.Notify(src, 'License do jogador não encontrada.', 'error', 7500)
        end
        return
    end

    local result = MySQL.query.await('SELECT * FROM bans WHERE license = ?', { licenseVal })

    if result and #result > 0 then
        MySQL.update.await('DELETE FROM bans WHERE license = ?', { licenseVal })

        if src > 0 then
            QBCore.Functions.Notify(src, 'Jogador desbanido com sucesso.', 'success', 7500)
        end
        AddLog(src, 'mri_Qadmin', 'bans', 'info', ('Desbanimento: %s desbanido'):format(GetPlayerName(targetId) or targetId), GetTargetData(targetId))
        TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
    else
        if src > 0 then
            QBCore.Functions.Notify(src, 'Nenhum ban ativo encontrado para esse jogador.', 'error', 7500)
        end
    end
end)

-- Warn Player
RegisterNetEvent('mri_Qadmin:server:WarnPlayer', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.warn_player') then return end
    local targetId = tonumber(GetValue(selectedData, "Player"))
    local target = targetId and QBCore.Functions.GetPlayer(targetId)
    local reason = tostring(GetValue(selectedData, "Reason") or "")
    local sender = QBCore.Functions.GetPlayer(source)
    local warnId = 'WARN-' .. math.random(1111, 9999)
    if target ~= nil then
        QBCore.Functions.Notify(target.PlayerData.source,
            locale("notifications.warned") .. ", por: " .. locale("notifications.reason") .. " " .. reason, 'inform', 60000)
        QBCore.Functions.Notify(source,
            locale("notifications.warngiven") .. GetPlayerName(target.PlayerData.source) .. ", por: " .. reason)
        local warnLogData = GetTargetData(target.PlayerData.source)
        warnLogData.reason = reason
        warnLogData.warnId = warnId
        AddLog(source, 'mri_Qadmin', 'players', 'info', ('Aviso: %s recebeu advertência'):format(GetPlayerName(target.PlayerData.source)), warnLogData)
        MySQL.insert.await('INSERT INTO player_warns (senderIdentifier, targetIdentifier, reason, warnId) VALUES (?, ?, ?, ?)',
            {
                sender.PlayerData.license,
                target.PlayerData.license,
                reason,
                warnId
            })
    else
        TriggerClientEvent('QBCore:Notify', source, locale("notifications.not_online"), 'error')
    end
end)

RegisterNetEvent('mri_Qadmin:server:KickPlayer', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.kick_player') then return end
    local src = source
    local playerVal = tonumber(GetValue(selectedData, "Player"))
    if not CheckTargetable(src, playerVal) then return end
    local target = QBCore.Functions.GetPlayer(playerVal)
    local reason = GetValue(selectedData, "Reason")

    if not target then
        QBCore.Functions.Notify(src, locale("notifications.not_online"), 'error', 7500)
        return
    end

    DropPlayer(target.PlayerData.source, locale("notifications.kicked") .. '\n' .. locale("notifications.reason") .. reason)
    local kickLogData = GetTargetData(target.PlayerData.source)
    kickLogData.reason = reason
    AddLog(src, 'mri_Qadmin', 'players', 'warn', ('Expulsão: %s foi expulso'):format(GetPlayerName(target.PlayerData.source)), kickLogData)
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Verify Player
RegisterNetEvent('mri_Qadmin:server:verifyPlayer', function(actionKey, selectedData)
	local src = source
	if not CheckPerms(src, 'qadmin.action.verify_player') then
		return
	end

	Debug('debug', ('[DEBUG] verifyPlayer event received. ActionKey: %s'):format(tostring(actionKey)))

	local val = GetValue(selectedData, "Player")
	local playerId = tonumber(val)
	Debug('debug', ('[DEBUG] Attempting to verify player. ID Raw: %s | ID Number: %s'):format(tostring(val), tostring(playerId)))

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
		AddLog(src, 'mri_Qadmin', 'players', 'info', newState and ('Verificação: jogador %s marcado como verificado'):format(GetPlayerName(playerId) or playerId) or ('Verificação: verificação removida do jogador %s'):format(GetPlayerName(playerId) or playerId), { target = playerId })

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
		Debug('debug', ('[DEBUG] Player not found for ID: ' .. tostring(playerId)))
		QBCore.Functions.Notify(src, locale("notifications.not_online"), "error")
	end
end)

-- Revive Player
RegisterNetEvent('mri_Qadmin:server:Revive', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.revive') then return end

    local src = source
    local player = tonumber(GetValue(selectedData, "Player"))
    if not player then return end

    -- Trigger multiple common revive events for compatibility
    TriggerClientEvent('hospital:client:Revive', player)
    TriggerClientEvent('qbx_medical:client:revive', player)
    TriggerClientEvent('QBCore:Client:Revive', player)

    -- Notify the target player
    TriggerClientEvent('QBCore:Notify', player, 'Você foi revivido por um administrador.', 'success')
    AddLog(src, 'mri_Qadmin', 'players', 'success', ('Revive: %s foi revivido'):format(GetPlayerName(player) or player), GetTargetData(player))

    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Revive All
RegisterNetEvent('mri_Qadmin:server:ReviveAll', function(_)
    if not CheckPerms(source, 'qadmin.action.revive_all') then return end

    -- Trigger standard hospital revive event for all
    TriggerClientEvent('hospital:client:Revive', -1)

    -- If it's Qbox, also try the qbx_medical event just in case
    if GetResourceState('mri_Qbox') == 'started' then
        TriggerClientEvent('qbx_medical:client:revive', -1)
    end
    AddLog(source, 'mri_Qadmin', 'players', 'success', 'Revive em massa: todos os jogadores foram revividos', {})
end)

-- Revive Radius
RegisterNetEvent('mri_Qadmin:server:ReviveRadius', function(_)
    if not CheckPerms(source, 'qadmin.action.revive_all') then return end

    local src = source
    local ped = GetPlayerPed(src)
    local pos = GetEntityCoords(ped)
    local allPlayers = QBCore.Functions.GetPlayers()

    for _, v in pairs(allPlayers) do
        local targetPed = GetPlayerPed(v)
        local targetPos = GetEntityCoords(targetPed)
        local dist = #(pos - targetPos)

        if dist < 15.0 then
            TriggerClientEvent('hospital:client:Revive', v)
            TriggerClientEvent('qbx_medical:client:revive', v)
            TriggerClientEvent('QBCore:Client:Revive', v)
            TriggerClientEvent('QBCore:Notify', v, 'Você foi revivido por um administrador.', 'success')
        end
    end
    AddLog(src, 'mri_Qadmin', 'players', 'success', 'Revive em raio: jogadores próximos foram revividos', {})
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Revive Self (admin revives themselves)
RegisterNetEvent('mri_Qadmin:server:ReviveSelf', function()
    if not CheckPerms(source, 'qadmin.action.revive_self') then return end
    local src = source
    TriggerClientEvent('hospital:client:Revive', src)
    TriggerClientEvent('qbx_medical:client:revive', src)
    TriggerClientEvent('QBCore:Client:Revive', src)
    AddLog(src, 'mri_Qadmin', 'players', 'success', 'Revive próprio: admin se reviveu', {})
end)

-- Clear Chat
RegisterNetEvent('mri_Qadmin:server:ClearChat', function()
    if not CheckPerms(source, 'qadmin.action.clear_chat') then return end
    TriggerClientEvent('chat:clear', -1)
    AddLog(source, 'mri_Qadmin', 'actions', 'info', ('Chat limpo por %s'):format(GetPlayerName(source) or source), {})
end)

-- Set RoutingBucket
RegisterNetEvent('mri_Qadmin:server:SetBucket', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.set_bucket') then return end

    local src = source
    local player = tonumber(GetValue(selectedData, "Player"))
    if not player then
        return QBCore.Functions.Notify(src, "Jogador inválido.", 'error', 5000)
    end
    if not CheckTargetable(src, player) then return end
    local bucket = tonumber(GetValue(selectedData, "Bucket"))
    if not bucket or bucket < 0 or bucket % 1 ~= 0 then
        return QBCore.Functions.Notify(src, "Bucket inválido.", 'error', 5000)
    end
    local currentBucket = GetPlayerRoutingBucket(player)

    Debug('debug', ('[SetBucket] Player: %s | Bucket: %s | Current Bucket: %s'):format(player, bucket, currentBucket))

    if bucket == currentBucket then
        return QBCore.Functions.Notify(src, locale("notifications.target_same_bucket", player), 'error', 7500)
    end

    SetPlayerRoutingBucket(player, bucket)
    QBCore.Functions.Notify(src, locale("notifications.bucket_set_for_target", player, bucket), 'success', 7500)
    AddLog(src, 'mri_Qadmin', 'players', 'info', ('Bucket: jogador %s movido para bucket %d'):format(GetPlayerName(tonumber(player)) or player, bucket), { player = player, bucket = bucket })
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Get RoutingBucket
RegisterNetEvent('mri_Qadmin:server:GetBucket', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.set_bucket') then return end

    local src = source
    local player = GetValue(selectedData, "Player")
    local currentBucket = GetPlayerRoutingBucket(tonumber(player))

    QBCore.Functions.Notify(src, locale("notifications.bucket_get", player, currentBucket), 'success', 7500)
end)

-- Helper to format money into the array expected by the UI
local function formatPlayerMoney(Player)
    local moneyArr = {}
    local moneyData = Player.PlayerData.money or {}
    for k, v in pairs(moneyData) do
        local val = Player.Functions.GetMoney(k)
        if val == nil then val = v end
        table.insert(moneyArr, { name = k, amount = val })
    end
    return moneyArr
end

-- Give Money
RegisterNetEvent('mri_Qadmin:server:GiveMoney', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.give_money') then return end
    if not RateLimit(source, 'give_money', 500) then return end

    local src = source
    local target = GetValue(selectedData, "Player")
    local amount = tonumber(GetValue(selectedData, "Amount"))
    local moneyType = tostring(GetValue(selectedData, "Type") or "")
    local Player = QBCore.Functions.GetPlayer(tonumber(target))

    if Player == nil then
        return QBCore.Functions.Notify(src, locale("notifications.not_online"), 'error', 7500)
    end
    if not CheckTargetable(src, tonumber(target)) then return end
    if not amount or amount <= 0 then
        return QBCore.Functions.Notify(src, "Valor inválido.", 'error', 5000)
    end
    if Player.PlayerData.money == nil or Player.PlayerData.money[moneyType] == nil then
        return QBCore.Functions.Notify(src, "Tipo de dinheiro desconhecido: " .. moneyType, 'error', 5000)
    end

    Player.Functions.AddMoney(moneyType, amount)
    QBCore.Functions.Notify(src,
        locale((moneyType == "crypto" and "give_money_crypto" or "give_money"), tonumber(amount),
            Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname), "success")
    local moneyLogData = GetTargetData(tonumber(target))
    moneyLogData.amount = tonumber(amount)
    moneyLogData.type = moneyType
    AddLog(src, 'mri_Qadmin', 'money', 'info', ('Dar dinheiro: R$%s (%s) dado a %s %s'):format(amount, moneyType, Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname), moneyLogData)

    TriggerClientEvent('mri_Qadmin:client:UpdatePlayerMoney', -1, {
        id = tonumber(target),
        money = formatPlayerMoney(Player)
    })
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Give Money to all
RegisterNetEvent('mri_Qadmin:server:GiveMoneyAll', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.give_money') then return end
    if not RateLimit(source, 'give_money_all', 5000) then
        return QBCore.Functions.Notify(source, 'Aguarde antes de repetir essa ação.', 'error', 3000)
    end

    local src = source
    local amount = tonumber(GetValue(selectedData, "Amount"))
    local moneyType = tostring(GetValue(selectedData, "Type") or "")
    local players = QBCore.Functions.GetPlayers()

    if not amount or amount <= 0 then
        return QBCore.Functions.Notify(src, "Valor inválido.", 'error', 5000)
    end

    -- Valida o tipo de dinheiro contra um jogador de referência (todos usam os mesmos tipos)
    local refPlayer = QBCore.Functions.GetPlayer(tonumber(src))
    if refPlayer == nil then
        for _, v in pairs(players) do
            refPlayer = QBCore.Functions.GetPlayer(tonumber(v))
            if refPlayer then break end
        end
    end
    if refPlayer == nil or refPlayer.PlayerData.money == nil or refPlayer.PlayerData.money[moneyType] == nil then
        return QBCore.Functions.Notify(src, "Tipo de dinheiro desconhecido: " .. moneyType, 'error', 5000)
    end

    AddLog(src, 'mri_Qadmin', 'money', 'warn', ('Dar dinheiro a todos: R$%s (%s) dado a todos os jogadores'):format(amount, moneyType), { amount = amount, type = moneyType })
    for _, v in pairs(players) do
        local Player = QBCore.Functions.GetPlayer(tonumber(v))
        if Player then
            Player.Functions.AddMoney(moneyType, amount)
            QBCore.Functions.Notify(src,
                locale((moneyType == "crypto" and "give_money_all_crypto" or "give_money_all"), amount), "success")

            TriggerClientEvent('mri_Qadmin:client:UpdatePlayerMoney', -1, {
                id = tonumber(v),
                money = formatPlayerMoney(Player)
            })
        end
    end
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Take Money
RegisterNetEvent('mri_Qadmin:server:TakeMoney', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.remove_money') then return end
    if not RateLimit(source, 'take_money', 500) then return end

    local src = source
    local target = GetValue(selectedData, "Player")
    local amount = tonumber(GetValue(selectedData, "Amount"))
    local moneyType = tostring(GetValue(selectedData, "Type") or "")
    local Player = QBCore.Functions.GetPlayer(tonumber(target))

    if Player == nil then
        return QBCore.Functions.Notify(src, locale("notifications.not_online"), 'error', 7500)
    end
    if not CheckTargetable(src, tonumber(target)) then return end
    if not amount or amount <= 0 then
        return QBCore.Functions.Notify(src, "Valor inválido.", 'error', 5000)
    end

    local currentBalance = Player.PlayerData.money and Player.PlayerData.money[moneyType]
    if currentBalance == nil then
        return QBCore.Functions.Notify(src, "Tipo de dinheiro desconhecido: " .. moneyType, 'error', 5000)
    end

    if currentBalance < amount then
        return QBCore.Functions.Notify(src, locale("notifications.not_enough_money"), "primary")
    end

    Player.Functions.RemoveMoney(moneyType, amount, "state-fees")

    QBCore.Functions.Notify(src,
        locale((moneyType == "crypto" and "take_money_crypto" or "take_money"), amount .. "R$",
            Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname), "success")
    local takeLogData = GetTargetData(tonumber(target))
    takeLogData.amount = amount
    takeLogData.type = moneyType
    AddLog(src, 'mri_Qadmin', 'money', 'warn', ('Remover dinheiro: R$%s (%s) removido de %s %s'):format(amount, moneyType, Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname), takeLogData)

    TriggerClientEvent('mri_Qadmin:client:UpdatePlayerMoney', -1, {
        id = tonumber(target),
        money = formatPlayerMoney(Player)
    })
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Blackout
local Blackout = false
RegisterNetEvent('mri_Qadmin:server:ToggleBlackout', function(_)
    if not CheckPerms(source, 'qadmin.action.blackout') then return end
    if not RateLimit(source, 'blackout', 1500) then return end
    local src = source

    Blackout = not Blackout
    exports["qb-weathersync"]:setBlackout(Blackout)

    if Blackout then
        TriggerClientEvent('QBCore:Notify', src, locale("notifications.blackout", "Ativado"), 'primary')
        AddLog(src, 'mri_Qadmin', 'server', 'warn', 'Blackout ativado', {})
    else
        TriggerClientEvent('QBCore:Notify', src, locale("notifications.blackout", "Desativado"), 'primary')
        AddLog(src, 'mri_Qadmin', 'server', 'info', 'Blackout desativado', {})
    end
end)

-- Toggle Cuffs
RegisterNetEvent('mri_Qadmin:server:CuffPlayer', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.toggle_cuffs') then return end

    local target = tonumber(GetValue(selectedData, "Player"))
    if not CheckTargetable(source, target) then return end

    if GetResourceState("ND_Police") == "started" then
        local playerIsCuffed = Player(target).state.isCuffed

        if playerIsCuffed then
            TriggerClientEvent("ND_Police:uncuffPed", target)
            AddLog(source, 'mri_Qadmin', 'players', 'info', ('Algemas: jogador %s desalgemado'):format(GetPlayerName(target) or target), GetTargetData(target))
            return QBCore.Functions.Notify(source, locale("notifications.toggled_cuffs_off"), 'success')
        end
        TriggerClientEvent("ND_Police:syncNormalCuff", target, "front", "cuffs")
        AddLog(source, 'mri_Qadmin', 'players', 'warn', ('Algemas: jogador %s algemado'):format(GetPlayerName(target) or target), GetTargetData(target))
        return QBCore.Functions.Notify(source, locale("notifications.toggled_cuffs_on"), 'success')
    end

    TriggerClientEvent('mri_Qadmin:client:ToggleCuffs', target)
    QBCore.Functions.Notify(source, locale("notifications.toggled_cuffs"), 'success')
    AddLog(source, 'mri_Qadmin', 'players', 'warn', ('Algemas: algemas alternadas no jogador %s'):format(GetPlayerName(target) or target), GetTargetData(target))
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', source)
end)

-- Give Clothing Menu
RegisterNetEvent('mri_Qadmin:server:ClothingMenu', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.clothing_menu') then return end

    local src = source
    local target = tonumber(GetValue(selectedData, "Player"))

    if target == nil then
        return QBCore.Functions.Notify(src, locale("notifications.not_online"), 'error', 7500)
    end
    if not CheckTargetable(src, target) then return end

    if target == src then
        TriggerClientEvent("mri_Qadmin:client:CloseUI", src)
    end

    TriggerClientEvent('qb-clothing:client:openMenu', target)
    AddLog(src, 'mri_Qadmin', 'players', 'info', ('Roupa: editor de roupa aberto para %s'):format(GetPlayerName(target) or target), GetTargetData(target))
end)

-- Set Ped
RegisterNetEvent("mri_Qadmin:server:setPed", function(_, selectedData)
    local src = source
    if not CheckPerms(source, 'qadmin.action.set_ped') then
        QBCore.Functions.Notify(src, locale("notifications.no_perms"), "error", 5000)
        return
    end

    local ped = GetValue(selectedData, "Ped Models") -- Assuming label as default if table
    local tsrc = tonumber(GetValue(selectedData, "Player"))
    if not CheckTargetable(src, tsrc) then return end
    local Player = QBCore.Functions.GetPlayer(tsrc)

    if not Player then
        QBCore.Functions.Notify(locale("notifications.not_online"), "error", 5000)
        return
    end

    TriggerClientEvent("mri_Qadmin:client:setPed", Player.PlayerData.source, ped)
    AddLog(src, 'mri_Qadmin', 'players', 'info', ('Ped: modelo %s aplicado em %s %s'):format(ped, Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname), { target = tsrc, ped = ped })
    TriggerClientEvent('mri_Qadmin:client:RefreshPlayers', src)
end)

-- Callback para listar bans com paginação e busca
lib.callback.register('mri_Qadmin:callback:GetBans', function(src, data)
    if not CheckPerms(src, 'qadmin.page.players') then return { bans = {}, total = 0 } end
    local page = math.max(1, tonumber(data and data.page) or 1)
    local pageSize = math.min(200, math.max(1, tonumber(data and data.pageSize) or 50))
    local search = SanitizeLikeSearch(data and data.search or "", 64)
    local offset = (page - 1) * pageSize

    local query = 'SELECT * FROM bans'
    local countQuery = 'SELECT COUNT(1) FROM bans'
    local params = {}

    if search ~= "" then
        -- SanitizeLikeSearch já escapou wildcards; default ESCAPE de MySQL é `\`
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
RegisterNetEvent('mri_Qadmin:server:unban_rowid', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.unban_player') then return end

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
        AddLog(src, 'mri_Qadmin', 'bans', 'info', ('Desbanimento: ban #%d removido'):format(banId), { banId = banId })
    else
        TriggerClientEvent('QBCore:Notify', src, "Nenhum banimento removido.", "error", 5000)
    end
end)
-- Kill Player
RegisterNetEvent('mri_Qadmin:server:KillPlayer', function(_, selectedData)
    if not CheckPerms(source, 'qadmin.action.kill_player') then return end

    local src = source
    local targetId = tonumber(GetValue(selectedData, "Player"))
    if not CheckTargetable(src, targetId) then return end
    local targetPlayer = QBCore.Functions.GetPlayer(targetId)

    Debug('debug', ('[mri_Qadmin] KillPlayer: Admin %s killing Target %s'):format(src, targetId))

    if targetPlayer then
        -- Trigger client event on target to kill themselves (reliable way)
        TriggerClientEvent('mri_Qadmin:client:ForceKill', targetPlayer.PlayerData.source)
        QBCore.Functions.Notify(src, locale("notifications.kill_player", targetPlayer.PlayerData.charinfo.firstname), 'success')
        AddLog(src, 'mri_Qadmin', 'players', 'warn', ('Matar: %s %s foi morto'):format(targetPlayer.PlayerData.charinfo.firstname, targetPlayer.PlayerData.charinfo.lastname), GetTargetData(targetId))
    else
        QBCore.Functions.Notify(src, locale("notifications.not_online"), 'error')
    end
end)

lib.callback.register('mri_Qadmin:callback:GetPlayerCoords', function(src, targetIds)
    if not CheckPerms(src, 'qadmin.page.livemap') then return {} end
    local coordsList = {}
    if not targetIds or type(targetIds) ~= 'table' then return coordsList end

    for _, id in ipairs(targetIds) do
        local ped = GetPlayerPed(id)
        if ped and ped ~= 0 then
            local coords = GetEntityCoords(ped)
            local heading = GetEntityHeading(ped)
            local playerObj = QBCore.Functions.GetPlayer(id)
            local vitals = { health = 100, armor = 0, hunger = 100, thirst = 100 }
            if playerObj then
                vitals.health = GetEntityHealth(ped)
                vitals.armor = GetPedArmour(ped)
                vitals.hunger = playerObj.PlayerData.metadata['hunger'] or 100
                vitals.thirst = playerObj.PlayerData.metadata['thirst'] or 100
                vitals.isDead = playerObj.PlayerData.metadata['isdead'] or playerObj.PlayerData.metadata['inlaststand'] or false
            end

            table.insert(coordsList, {
                id = id,
                x = coords.x,
                y = coords.y,
                heading = heading,
                name = GetPlayerName(id) or "Unknown",
                vitals = vitals
            })
        end
    end
    return coordsList
end)

lib.callback.register('mri_Qadmin:callback:GetAllPlayerCoords', function(src)
    if not CheckPerms(src, 'qadmin.page.livemap') then return {} end
    local allPlayers = QBCore.Functions.GetPlayers()
    local coordsList = {}

    for _, id in pairs(allPlayers) do
        local playerSrc = tonumber(id)
        local ped = GetPlayerPed(playerSrc)
        if ped and ped ~= 0 then
            local coords = GetEntityCoords(ped)
            local heading = GetEntityHeading(ped)
            local playerObj = QBCore.Functions.GetPlayer(playerSrc)
            local name
            local vitals = { health = 100, armor = 0, hunger = 100, thirst = 100 }
            local inVehicle = false
            local vehicleType = nil
            local vehicle = GetVehiclePedIsIn(ped, false)
            if vehicle and vehicle ~= 0 then
                inVehicle = true
                -- Read from client-synced state bag
                vehicleType = Entity(ped).state.vehicleType or 'car'
            end

            local isStaff = IsPlayerAceAllowed(playerSrc, 'qadmin.master')
            local staffColor = nil
            if isStaff then
                local rgb, _ = GetPlayerESPColor(playerSrc)
                if rgb then
                    staffColor = RGBToHex(rgb)
                end
            end

            if playerObj then
                name = playerObj.PlayerData.charinfo.firstname .. ' ' .. playerObj.PlayerData.charinfo.lastname
                vitals.health = GetEntityHealth(ped)
                vitals.armor = GetPedArmour(ped)
                vitals.hunger = playerObj.PlayerData.metadata['hunger'] or 100
                vitals.thirst = playerObj.PlayerData.metadata['thirst'] or 100
                vitals.isDead = playerObj.PlayerData.metadata['isdead'] or playerObj.PlayerData.metadata['inlaststand'] or false
            else
                name = GetPlayerName(playerSrc)
            end

            table.insert(coordsList, {
                id = playerSrc,
                x = coords.x,
                y = coords.y,
                heading = heading,
                name = name,
                vitals = vitals,
                inVehicle = inVehicle,
                vehicleType = vehicleType,
                isStaff = isStaff,
                staffColor = staffColor
            })
        end
    end

    return coordsList
end)

-- Real-time vitals for ScreenModal
lib.callback.register('mri_Qadmin:callback:GetPlayerVitals', function(src, targetId)
    if not CheckPerms(src, 'qadmin.page.players') then return nil end
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

-- Global Announcement
RegisterNetEvent('mri_Qadmin:server:Announce', function(message)
    local src = source
    if not CheckPerms(src, 'qadmin.action.announcements') then return end
    if not RateLimit(src, 'announce', 2000) then
        return QBCore.Functions.Notify(src, 'Aguarde antes de enviar outro anúncio.', 'error', 3000)
    end

    if not message or message == "" then return end
    if type(message) ~= 'string' then return end
    if #message > 500 then message = message:sub(1, 500) end

    Debug('debug', ('[mri_Qadmin] Announce: %s sent message: %s'):format(GetPlayerName(src), message))

    -- Standard QBCore notification to all players
    TriggerClientEvent('QBCore:Notify', -1, message, 'primary', 10000)

    -- Optional: Send to chat as well
    TriggerClientEvent('chat:addMessage', -1, {
        color = { 255, 0, 0},
        multiline = true,
        args = {"ANÚNCIO", message}
    })
    AddLog(src, 'mri_Qadmin', 'server', 'info', ('Anúncio global: %s'):format(message), { message = message })
end)

-- Relay for client-only toggle actions (god mode, noclip, etc.)
-- SECURITY: rate-limit + caps de tamanho para evitar spam que enche
-- mri_qadmin_logs e DB io.
RegisterNetEvent('mri_Qadmin:server:LogClientAction', function(category, level, message, data)
    local src = source
    if not CheckPerms(src, 'qadmin.open') then return end
    if not RateLimit(src, 'log_client_action', 250) then return end

    local validCats  = { players=true, bans=true, inventory=true, vehicles=true, money=true, server=true, permissions=true, chat=true, actions=true, system=true }
    local validLevels = { info=true, success=true, warn=true, error=true }
    category = validCats[category]  and category or 'actions'
    level    = validLevels[level] and level    or 'info'

    local msgStr = tostring(message or '')
    if #msgStr > 500 then msgStr = msgStr:sub(1, 500) end

    AddLog(src, 'mri_Qadmin', category, level, msgStr, type(data) == 'table' and data or {})
end)
