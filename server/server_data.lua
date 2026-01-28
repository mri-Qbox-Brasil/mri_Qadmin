QBCore = exports["qb-core"]:GetCoreObject()

lib.callback.register(
    "mri_Qadmin:callback:GetServerInfo",
    function(source, cb)
        local stats = MySQL.single.await([[
            SELECT
                (SELECT COUNT(1) FROM player_vehicles) as vehicleCount,
                (SELECT COUNT(1) FROM bans) as bansCount,
                (SELECT COUNT(1) FROM players) as characterCount,
                (SELECT COUNT(DISTINCT license) FROM players) as uniquePlayers,
                SUM(JSON_UNQUOTE(JSON_EXTRACT(money, '$.cash'))) as totalCash,
                SUM(JSON_UNQUOTE(JSON_EXTRACT(money, '$.bank'))) as totalBank,
                SUM(JSON_UNQUOTE(JSON_EXTRACT(money, '$.crypto'))) as totalCrypto
            FROM players
        ]])

        local onlinePlayers = 0
        local GetPlayers = QBCore.Functions.GetQBPlayers()
        for _ in pairs(GetPlayers) do
            onlinePlayers = onlinePlayers + 1
        end

        local serverInfo = {
            totalCash = stats.totalCash or 0,
            totalBank = stats.totalBank or 0,
            totalCrypto = stats.totalCrypto or 0,
            uniquePlayers = stats.uniquePlayers or 0,
            onlinePlayers = onlinePlayers,
            vehicleCount = stats.vehicleCount or 0,
            bansCount = stats.bansCount or 0,
            characterCount = stats.characterCount or 0
        }

        return serverInfo
    end
)
