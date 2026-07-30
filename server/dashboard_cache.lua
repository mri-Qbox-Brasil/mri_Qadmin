Debug('debug', 'Carregando Cache do Dashboard...')

-- ─────────────────────────────────────────────────────────────────────────────
-- Snapshot dos agregados do dashboard.
--
-- Antes: cada abertura do painel varria a tabela `players` inteira — o agregado
-- de economia (2x por abertura: GetInitialData no login + mount do Dashboard) e,
-- pior, o sweep progressivo que trazia TODAS as linhas para o NUI só para o JS
-- montar histograma e top-25. Com 10k personagens isso era ~70 queries e 10k
-- linhas serializadas, por abertura, por admin.
--
-- Agora: um snapshot único, reconstruído sob demanda e só quando faz sentido.
-- A política tem três guardas, nessa ordem:
--
--   1. THROTTLE_MS  — piso. Nunca reconstrói mais de uma vez nessa janela, por
--                     mais "sujo" que o estado esteja. Protege contra rajadas.
--   2. dirty        — sinal de que o banco mudou (save do core, drop de player,
--                     mutação feita pelo próprio painel). Sem sinal, não
--                     reconstrói: servidor vazio de madrugada = zero query.
--   3. MAX_AGE_MS   — teto. Reconstrói mesmo sem sinal, porque outros recursos
--                     escrevem em `players`/`player_vehicles`/`bans` sem nos
--                     avisar. É o que limita a deriva silenciosa.
--
-- Consequência: a parte de BANCO do dashboard pode estar até MAX_AGE_MS
-- desatualizada. A parte ONLINE (contagem e dinheiro de quem está conectado)
-- NÃO passa por aqui — sai direto da memória do core, sempre fresca. Ver
-- GetServerData em server/server_data.lua.
-- ─────────────────────────────────────────────────────────────────────────────

local THROTTLE_MS = 60 * 1000        -- piso entre reconstruções
local MAX_AGE_MS  = 30 * 60 * 1000   -- teto de desatualização
local TOP_LIMIT   = 25               -- linhas do ranking de patrimônio

-- Faixas do histograma de patrimônio. Fonte única da verdade: o label vai junto
-- no payload, então a UI só renderiza — não replica os limites.
local WEALTH_BUCKETS = {
    { label = '<10k',     min = nil,        max = 10000 },
    { label = '10–100k',  min = 10000,      max = 100000 },
    { label = '100k–1M',  min = 100000,     max = 1000000 },
    { label = '1–10M',    min = 1000000,    max = 10000000 },
    { label = '10M+',     min = 10000000,   max = nil },
}

local snapshot = nil
local builtAt = 0
local dirty = true
local building = false

--- Expressão que extrai um campo de dinheiro do JSON como número.
--- COALESCE porque personagem sem a chave (ex.: sem crypto) devolve NULL.
local function moneyExpr(field)
    return ("COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(money, '$.%s')) AS DECIMAL(20,2)), 0)"):format(field)
end

-- Tabela derivada: uma linha por personagem com os 3 saldos já numéricos.
-- Reaproveitada pelas duas queries do snapshot.
local WEALTH_SUBQUERY = ([[
    SELECT
        license,
        citizenid,
        charinfo,
        %s AS cash,
        %s AS bank,
        %s AS crypto
    FROM players
]]):format(moneyExpr('cash'), moneyExpr('bank'), moneyExpr('crypto'))

--- Monta os SUM(condição) que contam personagens por faixa. Em MySQL um
--- booleano soma como 1/0, então SUM(net < 10000) é o COUNT da faixa.
local function bucketSelects()
    local parts = {}
    for i, b in ipairs(WEALTH_BUCKETS) do
        local conds = {}
        if b.min then conds[#conds + 1] = ('net >= %d'):format(b.min) end
        if b.max then conds[#conds + 1] = ('net < %d'):format(b.max) end
        parts[#parts + 1] = ('COALESCE(SUM(%s), 0) AS bucket%d'):format(table.concat(conds, ' AND '), i)
    end
    return table.concat(parts, ',\n        ')
end

--- Executa uma query do snapshot anexando a SQL ao erro.
---
--- Sem isto, um `pcall(Build)` transforma "a query de agregados tem sintaxe
--- inválida no MariaDB tal" em "falhou" — e a SQL é MONTADA em runtime, então
--- nem dá para achá-la lendo o arquivo. O texto da query é o diagnóstico.
--- @param label string
--- @param runner function
--- @param sql string
local function runQuery(label, runner, sql)
    local ok, result = pcall(runner, sql)
    if not ok then
        error(('query "%s" falhou: %s\n--- SQL ---\n%s'):format(label, tostring(result), sql), 0)
    end
    return result
end

--- Reconstrói o snapshot. Duas queries: uma de agregados (contadores, totais e
--- histograma, tudo numa varredura só) e uma do ranking.
--- @return table|nil
local function Build()
    local aggregate = runQuery('agregados', MySQL.single.await, ([[
        SELECT
            (SELECT COUNT(1) FROM player_vehicles) AS vehicleCount,
            (SELECT COUNT(1) FROM bans) AS bansCount,
            COUNT(1) AS characterCount,
            COUNT(DISTINCT license) AS uniquePlayers,
            COALESCE(SUM(cash), 0) AS totalCash,
            COALESCE(SUM(bank), 0) AS totalBank,
            COALESCE(SUM(crypto), 0) AS totalCrypto,
            %s
        FROM (
            SELECT license, cash, bank, crypto, (cash + bank + crypto) AS net
            FROM (%s) AS m
        ) AS w
    ]]):format(bucketSelects(), WEALTH_SUBQUERY))

    if not aggregate then
        -- print e não Debug: Config.PrintLevel vem "none" de fábrica, e um
        -- dashboard zerado sem nenhuma pista no console é impossível de
        -- diagnosticar. Falha que quebra a tela não pode depender de verbosidade.
        print('^1[mri_Qadmin] Snapshot do dashboard: a query de agregados nao retornou nada.^7')
        return nil
    end

    local topRows = runQuery('ranking', MySQL.query.await, ([[
        SELECT citizenid, charinfo, license, (cash + bank + crypto) AS net
        FROM (%s) AS m
        ORDER BY net DESC
        LIMIT %d
    ]]):format(WEALTH_SUBQUERY, TOP_LIMIT)) or {}

    local topPlayers = {}
    for _, row in ipairs(topRows) do
        local charinfo = row.charinfo and json.decode(row.charinfo) or {}
        local first = charinfo.firstname or 'N/A'
        local last = charinfo.lastname or ''
        topPlayers[#topPlayers + 1] = {
            citizenid = row.citizenid,
            name = last ~= '' and (first .. ' ' .. last) or first,
            net = tonumber(row.net) or 0,
        }
    end

    local buckets = {}
    for i, b in ipairs(WEALTH_BUCKETS) do
        buckets[#buckets + 1] = {
            label = b.label,
            count = tonumber(aggregate['bucket' .. i]) or 0,
        }
    end

    -- Soma do patrimônio de TODOS os personagens — é o denominador da métrica de
    -- concentração. Não dá para usar a soma do top-25 como base, e mandar os
    -- totais separados deixa o cálculo na mão da UI sem custo extra.
    local totalWealth = (tonumber(aggregate.totalCash) or 0)
        + (tonumber(aggregate.totalBank) or 0)
        + (tonumber(aggregate.totalCrypto) or 0)

    local topSum = 0
    for i = 1, math.min(10, #topPlayers) do
        topSum = topSum + topPlayers[i].net
    end

    return {
        totalCash = tonumber(aggregate.totalCash) or 0,
        totalBank = tonumber(aggregate.totalBank) or 0,
        totalCrypto = tonumber(aggregate.totalCrypto) or 0,
        uniquePlayers = tonumber(aggregate.uniquePlayers) or 0,
        vehicleCount = tonumber(aggregate.vehicleCount) or 0,
        bansCount = tonumber(aggregate.bansCount) or 0,
        characterCount = tonumber(aggregate.characterCount) or 0,
        charts = {
            buckets = buckets,
            topPlayers = topPlayers,
            -- Fatia do patrimônio total nas mãos dos 10 maiores, em %.
            top10Share = totalWealth > 0 and math.floor((topSum / totalWealth) * 100 + 0.5) or 0,
        },
    }
end

--- Marca o snapshot como desatualizado. Barato: só levanta a flag, a query só
--- acontece se e quando alguém abrir o painel.
--- @param reason string|nil rótulo para o log de debug
function MarkDashboardDirty(reason)
    if not dirty then
        Debug('debug', ('Snapshot do dashboard marcado como sujo (%s)'):format(reason or 'sem motivo'))
    end
    dirty = true
end
_G.MarkDashboardDirty = MarkDashboardDirty

--- Devolve o snapshot, reconstruindo se a política mandar.
--- Pode ceder o frame (MySQL.await) — chame de dentro de uma coroutine.
--- @return table|nil
function GetDashboardSnapshot()
    local age = GetGameTimer() - builtAt
    local stale = (not snapshot)
        or (age >= MAX_AGE_MS)
        or (dirty and age >= THROTTLE_MS)

    if not stale then return snapshot end

    -- Dois admins abrindo o painel ao mesmo tempo não devem disparar duas
    -- varreduras: o segundo espera a que já está em voo.
    if building then
        local waited = 0
        while building and waited < 10000 do
            Wait(50)
            waited = waited + 50
        end
        return snapshot
    end

    building = true
    local ok, result = pcall(Build)
    building = false

    if not ok then
        -- Ver a nota sobre print vs Debug em Build(): este é o erro que explica
        -- um dashboard zerado, então ele sai sempre.
        print(('^1[mri_Qadmin] Falha ao reconstruir o snapshot do dashboard: %s^7'):format(tostring(result)))
        -- Empurra builtAt para que o throttle segure o retry: com um snapshot
        -- antigo em mãos, melhor servir stale do que martelar um banco em apuros.
        -- `dirty` continua ligado, então a próxima janela tenta de novo.
        --
        -- Sem snapshot nenhum (falha na primeira carga) isso não segura nada: a
        -- guarda `not snapshot` vence, e toda abertura do painel volta a tentar.
        -- É o comportamento desejado — não há stale para servir no lugar.
        builtAt = GetGameTimer()
        return snapshot
    end

    if result then
        snapshot = result
        builtAt = GetGameTimer()
        dirty = false
        Debug('debug', 'Snapshot do dashboard reconstruido')
    end

    return snapshot
end
_G.GetDashboardSnapshot = GetDashboardSnapshot

-- ─────────────────────────────────────────────────────────────────────────────
-- Sinais de invalidação
--
-- `playerDropped` é o sinal confiável: o core persiste o personagem na saída,
-- então toda desconexão significa `players` alterada. Os nomes de evento de save
-- variam entre qb-core e qbx_core (e entre versões), então registramos os
-- candidatos conhecidos — nome que não existe simplesmente nunca dispara, o
-- custo de registrar é zero. Se o seu core emite outro nome, acrescente em
-- Config.DashboardInvalidateEvents em vez de editar esta lista.
--
-- AddEventHandler e NÃO RegisterNetEvent: são eventos internos do servidor.
-- Registrar como net event deixaria qualquer client sujar o cache de fora.
-- ─────────────────────────────────────────────────────────────────────────────
local CORE_EVENTS = {
    'QBCore:Server:OnPlayerUnload',
    'QBCore:Server:OnPlayerSaved',
    'qb-core:server:playerSaved',
    'qbx_core:server:playerLoggedOut',
    'qbx_core:server:playerSaved',
}

for _, extra in ipairs(Config.DashboardInvalidateEvents or {}) do
    CORE_EVENTS[#CORE_EVENTS + 1] = extra
end

for _, evt in ipairs(CORE_EVENTS) do
    AddEventHandler(evt, function()
        MarkDashboardDirty(evt)
    end)
end

AddEventHandler('playerDropped', function()
    MarkDashboardDirty('playerDropped')
end)
