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
        MySQL.query.await(query)
        print("Tabela verificada/criada: " .. index)
    end
    if callback then callback() end
end

local function createTables()
    local filePath = "database.sql"
    local queries = splitStr(LoadResourceFile(GetCurrentResourceName(), filePath), ";")
    executeQueries(
        queries,
        function()
            print("Todas as tabelas foram verificadas/criadas.")
        end
    )
end

print("Recurso iniciado. Verificando/criando tabelas...")
createTables()

TriggerEvent("mri_Qadmin:db:ready")