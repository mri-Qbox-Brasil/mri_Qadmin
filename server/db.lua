local function splitStr(inputstr, sep)
    if sep == nil then
        sep = "%s"
    end
    local t = {}
    for str in string.gmatch(inputstr, "([^" .. sep .. "]+)") do
        str = string.gsub(str, "^%s*(.-)%s*$", "%1")
        if not (str == nil or str == "") then
            table.insert(t, str)
        end
    end
    return t
end

local function executeQueries(queries, callback)
    for index, query in ipairs(queries) do
        local ok, err = pcall(MySQL.query.await, query)
        if ok then
            Debug('debug', 'Tabela verificada/criada: ' .. index)
        else
            Debug('error', 'query ' .. index .. ' falhou: ' .. tostring(err))
        end
    end
    if callback then callback() end
end

--- Remove comentários de linha (-- ...) antes do split por ';'.
--- O split é ingênuo: um ';' escrito DENTRO de um comentário parte a instrução seguinte ao
--- meio, e o CREATE TABLE afetado nunca roda — falha silenciosa, porque executeQueries usa
--- pcall e o boot segue como se nada tivesse acontecido.
local function stripSqlComments(sql)
    return (sql:gsub("%-%-[^\n]*", ""))
end

local function createTables()
    local filePath = "database.sql"
    local sql = LoadResourceFile(GetCurrentResourceName(), filePath)
    local queries = splitStr(stripSqlComments(sql), ";")
    executeQueries(
        queries,
        function()
            Debug('debug', "Todas as tabelas foram verificadas/criadas.")
            TriggerEvent("mri_Qadmin:db:ready")
        end
    )
end

SetConvarReplicated('ox:printlevel:mri_Qadmin', Config.Logs.PrintLevel or 'debug')
Debug('debug', "Recurso iniciado. Verificando/criando tabelas...")
createTables()