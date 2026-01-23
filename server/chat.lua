local messages = {}

local function notifyPlayers()
    local players = QBCore.Functions.GetPlayers()

    for i = 1, #players, 1 do
        local player = players[i]
        if QBCore.Functions.IsOptin(player) then
            QBCore.Functions.Notify(player, locale("new_staffchat", "inform", 7500))
        end
    end
end

RegisterNetEvent("onResourceStart", function(resourceName)
    if GetCurrentResourceName() == resourceName then
        messages = MySQL.Sync.fetchAll("SELECT * FROM mri_qadmin_chat", {}) or {}
        print(json.encode(messages))
    end
end)

RegisterNetEvent("mri_Qadmin:server:sendMessage", function(message, citizenid, fullname)
    if not CheckPerms(source, "mod") then return end

    local createdAt = os.time() * 1000

    notifyPlayers()

    messages[#messages + 1] = { message = message, citizenid = citizenid, fullname = fullname, createdAt = createdAt }
    print(json.encode(messages))

    MySQL.Async.insert("INSERT INTO mri_qadmin_chat (message, citizenid, fullname) VALUES (?, ?, ?)", {
        message,
        citizenid,
        fullname
    })
end)

lib.callback.register("mri_Qadmin:callback:GetMessages", function()
    if not CheckPerms(source, "mod") then return {} end
    return messages
end)
