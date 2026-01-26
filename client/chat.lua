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

	local message = msgData.message

	TriggerServerEvent("mri_Qadmin:server:sendMessage", message, PlayerData.citizenid, PlayerData.charinfo.firstname .. " " .. PlayerData.charinfo.lastname)

	local data = getMessagesCallBack()
	cb({
		messages = data or {},
		myCitizenid = PlayerData.citizenid
	})
end)
