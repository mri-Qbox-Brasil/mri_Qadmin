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
    local index = 1

    local function executeNextQuery()
        if index > #queries then
            if callback then
                callback()
            end
            return
        end

        MySQL.Async.execute(
            queries[index],
            {},
            function()
                print("Tabela verificada/criada: " .. index)
                index = index + 1
                executeNextQuery()
            end
        )
    end

    executeNextQuery()
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

AddEventHandler(
    "onResourceStart",
    function(resourceName)
        if GetCurrentResourceName() == resourceName then
            print("Recurso " .. resourceName .. " iniciado. Verificando/criando tabelas...")
            createTables()
        end
    end
)
