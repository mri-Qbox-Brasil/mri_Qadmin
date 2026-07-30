QBCore = exports["qb-core"]:GetCoreObject()

--- Contagem de jogadores conectados. Sai da memória do core, nunca do banco —
--- é o único número do dashboard que precisa ser exato no instante da leitura.
local function CountOnlinePlayers()
    local onlinePlayers = 0
    local GetPlayers = QBCore.Functions.GetQBPlayers()
    for _ in pairs(GetPlayers) do
        onlinePlayers = onlinePlayers + 1
    end
    return onlinePlayers
end

--- Estatísticas do servidor.
---
--- Os números de banco (economia, contagem de personagens/veículos/bans) vêm do
--- snapshot em server/dashboard_cache.lua, que só é reconstruído quando algo de
--- fato mudou. `onlinePlayers` continua vindo da memória a cada chamada.
---
--- Consequência aceita: a economia exibida reflete o que já foi PERSISTIDO. O
--- dinheiro que um jogador online ganhou desde o último save do core só aparece
--- no próximo ciclo. Para um agregado de servidor inteiro isso é ruído; o custo
--- de manter exato seria uma varredura da tabela `players` por abertura, que é
--- justamente o que este cache existe para eliminar.
--- @return table
local function GetServerData()
    local snap = GetDashboardSnapshot()

    if not snap then
        -- Banco indisponível na primeira carga: devolve estrutura válida com
        -- zeros em vez de nil, para a UI renderizar em vez de travar no skeleton.
        return {
            totalCash = 0,
            totalBank = 0,
            totalCrypto = 0,
            uniquePlayers = 0,
            onlinePlayers = CountOnlinePlayers(),
            vehicleCount = 0,
            bansCount = 0,
            characterCount = 0
        }
    end

    return {
        totalCash = snap.totalCash,
        totalBank = snap.totalBank,
        totalCrypto = snap.totalCrypto,
        uniquePlayers = snap.uniquePlayers,
        onlinePlayers = CountOnlinePlayers(),
        vehicleCount = snap.vehicleCount,
        bansCount = snap.bansCount,
        characterCount = snap.characterCount
    }
end
_G.GetServerData = GetServerData

--- Agregados dos gráficos (histograma de patrimônio, top-25, concentração).
--- Antes eram derivados no JS a partir da tabela `players` inteira transferida
--- para o NUI; agora saem prontos do snapshot.
--- @param src number
--- @return table|nil nil quando o admin não tem a página de estatísticas
local function GetDashboardChartData(src)
    if not HasPerms(src, 'qadmin.page.statistics') then return nil end

    local snap = GetDashboardSnapshot()
    if not snap then return nil end

    local charts = snap.charts
    -- Sem info_admin o admin vê a forma da distribuição, mas não os valores.
    -- O nome no ranking é dado de jogador, não financeiro, então permanece.
    if not HasPerms(src, 'qadmin.action.info_admin') then
        local masked = {}
        for i, p in ipairs(charts.topPlayers) do
            masked[i] = { citizenid = p.citizenid, name = p.name }
        end
        return {
            buckets = charts.buckets,
            topPlayers = masked,
            top10Share = nil
        }
    end

    return charts
end
_G.GetDashboardChartData = GetDashboardChartData

--- Remove os totais financeiros de quem não pode vê-los.
--- @param data table
--- @param src number
local function MaskFinancials(data, src)
    if not HasPerms(src, 'qadmin.action.info_admin') then
        data.totalCash = nil
        data.totalBank = nil
        data.totalCrypto = nil
    end
    return data
end
_G.MaskFinancials = MaskFinancials

lib.callback.register(
    "mri_Qadmin:callback:GetServerInfo",
    function(source)
        if not CheckPerms(source, 'qadmin.open') then return nil end
        local data = MaskFinancials(GetServerData(), source)
        -- Gráficos viajam junto: uma ida e volta em vez de uma chamada por card,
        -- e ambos saem do mesmo snapshot (portanto sempre consistentes entre si).
        data.charts = GetDashboardChartData(source)
        return data
    end
)
