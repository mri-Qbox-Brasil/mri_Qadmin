local function getMessagesCallBack()
	return lib.callback.await('mri_Qadmin:callback:GetMessages', false)
end

RegisterNUICallback("GetMessages", function(_, cb)
	local data = getMessagesCallBack()
	cb({
		messages = data or {},
		myCitizenid = PlayerData and PlayerData.citizenid or nil
	})
end)

RegisterNUICallback("SendMessage", function(msgData, cb)
	if not PlayerData or not PlayerData.citizenid then return cb(0) end
	TriggerServerEvent("mri_Qadmin:server:sendMessage", msgData.message, PlayerData.citizenid, msgData.mentions)
	cb(1)
end)

RegisterNUICallback("GetStaffPlayers", function(_, cb)
	local staff = lib.callback.await('mri_Qadmin:callback:GetStaffPlayers', false)
	cb(staff or {})
end)

RegisterNetEvent('mri_Qadmin:client:newMessage', function(msg)
	SendNUIMessage({ type = 'newMessage', message = msg })
end)

RegisterNetEvent('mri_Qadmin:client:mentioned', function(senderName)
	PlaySoundFrontend(-1, "PICK_UP", "HUD_FRONTEND_DEFAULT_SOUNDSET", true)
	QBCore.Functions.Notify(senderName .. ' te marcou no Staff Chat!', 'primary', 6000)
	SendNUIMessage({ type = 'mentioned', senderName = senderName })
end)
