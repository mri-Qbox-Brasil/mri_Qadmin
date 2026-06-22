local INDEX_PATH = 'server/resource_index.json'
local MAX_EDITOR_FILE_SIZE = 1024 * 1024

local TEXT_EXTENSIONS = {
    lua = true,
    json = true,
    cfg = true,
    ini = true,
    txt = true,
    md = true,
    xml = true,
    html = true,
    css = true,
    scss = true,
    js = true,
    jsx = true,
    ts = true,
    tsx = true,
    yml = true,
    yaml = true,
    sql = true,
    toml = true,
    env = true,
    gitignore = true,
    editorconfig = true,
}

local resourceIndex = nil
local resourceNameLookup = nil
local recentWrites = {}
-- Vira true apos a geracao inicial do indice no boot. Antes disso, o storm de
-- onResourceStart nao reescreve o indice a cada resource (a geracao unica cobre
-- todos); depois, resources novos entram de forma incremental.
local indexBootDone = false

local function trim(value)
    return tostring(value or ''):gsub('^%s+', ''):gsub('%s+$', '')
end

local function normalizeSlashes(value)
    return tostring(value or ''):gsub('/', '\\')
end

local function browserPath(value)
    return tostring(value or ''):gsub('\\', '/')
end

local function cmdQuote(value)
    return '"' .. tostring(value or ''):gsub('"', '') .. '"'
end

local function pathExists(absolutePath)
    local ok = os.rename(absolutePath, absolutePath)
    return ok == true
end

local function readPhysicalFile(absolutePath)
    local handle = io.open(absolutePath, 'rb')
    if not handle then
        return nil
    end

    local content = handle:read('*a')
    handle:close()
    return content
end

local function normalizeTextForCompare(value)
    local text = tostring(value or '')
    text = text:gsub('^\239\187\191', '')
    text = text:gsub('\r\n', '\n'):gsub('\r', '\n')
    return text
end

local function sameTextContent(left, right)
    if left == right then
        return true
    end

    return normalizeTextForCompare(left) == normalizeTextForCompare(right)
end

local function targetKey(target)
    return tostring(target.resource or '') .. ':' .. tostring(target.relative or '')
end

local function writePhysicalFile(absolutePath, content)
    local handle, err = io.open(absolutePath, 'wb')
    if not handle then
        return false, ('Falha ao abrir arquivo para escrita: %s'):format(tostring(err or 'sem detalhe'))
    end

    local ok, writeErr = handle:write(tostring(content or ''))
    local closeOk, closeErr = handle:close()
    if ok == nil or closeOk == nil then
        return false, ('Falha ao gravar arquivo: %s'):format(tostring(writeErr or closeErr or 'sem detalhe'))
    end

    return true
end

local function writeWithFsBridge(target, content)
    local ok, result = pcall(function()
        return exports[GetCurrentResourceName()]:QadminWritePhysicalResourceFile(target.root, target.relative, tostring(content or ''))
    end)

    if not ok then
        return false, ('FS bridge falhou ao executar: %s'):format(tostring(result))
    end

    if type(result) ~= 'table' then
        return false, 'FS bridge nao retornou uma resposta valida.'
    end

    if result.ok == true then
        return true
    end

    return false, tostring(result.message or 'FS bridge nao conseguiu salvar.')
end

local function createDirectoryWithFsBridge(target)
    local ok, result = pcall(function()
        return exports[GetCurrentResourceName()]:QadminCreatePhysicalResourceDirectory(target.root, target.relative)
    end)

    if not ok then
        return false, ('FS bridge falhou ao executar: %s'):format(tostring(result))
    end

    if type(result) ~= 'table' then
        return false, 'FS bridge nao retornou uma resposta valida.'
    end

    if result.ok == true then
        return true
    end

    return false, tostring(result.message or 'FS bridge nao conseguiu criar a pasta.')
end

local function deleteWithFsBridge(target, isDirectory)
    local ok, result = pcall(function()
        return exports[GetCurrentResourceName()]:QadminDeletePhysicalResourceEntry(
            target.root,
            target.relative,
            isDirectory and 'folder' or 'file'
        )
    end)

    if not ok then
        return false, ('FS bridge falhou ao executar: %s'):format(tostring(result))
    end

    if type(result) ~= 'table' then
        return false, 'FS bridge nao retornou uma resposta valida.'
    end

    if result.ok == true then
        return true
    end

    return false, tostring(result.message or 'FS bridge nao conseguiu excluir.')
end

local function listWithFsBridge(target)
    local ok, result = pcall(function()
        return exports[GetCurrentResourceName()]:QadminListPhysicalResourceDirectory(target.root, target.relative)
    end)

    if not ok then
        return nil, ('FS bridge falhou ao executar: %s'):format(tostring(result))
    end

    if type(result) ~= 'table' then
        return nil, 'FS bridge nao retornou uma resposta valida.'
    end

    if result.ok == true then
        return type(result.entries) == 'table' and result.entries or {}
    end

    return nil, tostring(result.message or 'FS bridge nao conseguiu listar a pasta.')
end

local function currentResourceAbsolutePath(relativePath)
    local root = normalizeSlashes(GetResourcePath(GetCurrentResourceName()) or '')
    if root == '' then
        return nil
    end

    return root .. '\\' .. tostring(relativePath or ''):gsub('/', '\\')
end

local function sanitizeRelativePath(path)
    local normalized = tostring(path or ''):gsub('\\', '/'):gsub('^/+', ''):gsub('/+$', '')
    if normalized == '' then
        return ''
    end

    local clean = {}
    for segment in normalized:gmatch('[^/]+') do
        if segment == '..' or segment:find('[<>:"|?*]') then
            return nil
        end

        if segment ~= '' and segment ~= '.' then
            clean[#clean + 1] = segment
        end
    end

    return table.concat(clean, '/')
end

local function sanitizeEntryName(name)
    local cleaned = trim(name)
    if cleaned == '' or cleaned == '.' or cleaned == '..' then
        return nil
    end

    if cleaned:find('[\\/]') or cleaned:find('[<>:"|?*]') then
        return nil
    end

    return cleaned
end

local function joinRelativePath(basePath, childName)
    local safeBase = sanitizeRelativePath(basePath or '') or ''
    local safeChild = trim(childName or '')
    if safeBase == '' then
        return safeChild
    end

    return safeBase .. '/' .. safeChild
end

local function parentPath(relativePath)
    local safePath = sanitizeRelativePath(relativePath or '') or ''
    if safePath == '' then
        return ''
    end

    return safePath:match('^(.*)/[^/]+$') or ''
end

local function baseName(relativePath)
    local safePath = sanitizeRelativePath(relativePath or '') or ''
    return safePath:match('([^/]+)$') or safePath
end

local function fileExtension(path)
    local ext = tostring(path or ''):match('%.([^.]+)$')
    return ext and ext:lower() or ''
end

local function isTextFile(path)
    local ext = fileExtension(path)
    if ext ~= '' and TEXT_EXTENSIONS[ext] then
        return true
    end

    local filename = tostring(path or ''):match('([^/]+)$') or ''
    return TEXT_EXTENSIONS[filename:lower()] == true
end

local function sortEntries(entries)
    table.sort(entries, function(left, right)
        if (left.isDirectory == true) ~= (right.isDirectory == true) then
            return left.isDirectory == true
        end

        return tostring(left.name or ''):lower() < tostring(right.name or ''):lower()
    end)
end

local function countIndexedResources()
    local index = resourceIndex
    if not index or type(index.resources) ~= 'table' then
        return 0
    end

    local count = 0
    for _ in pairs(index.resources) do
        count = count + 1
    end

    return count
end

local function buildNameLookup(index)
    local lookup = {}
    for resourceName in pairs(index.resources or {}) do
        lookup[tostring(resourceName):lower()] = resourceName
    end

    resourceNameLookup = lookup
end

local function readCurrentResourceFile(relativePath)
    local raw = LoadResourceFile(GetCurrentResourceName(), relativePath)
    if type(raw) == 'string' and raw ~= '' then
        return raw
    end

    local absolutePath = currentResourceAbsolutePath(relativePath)
    if not absolutePath then
        return nil
    end

    local handle = io.open(absolutePath, 'rb')
    if not handle then
        return nil
    end

    raw = handle:read('*a')
    handle:close()
    return raw
end

local function loadResourceIndex(force)
    if resourceIndex and not force then
        return resourceIndex
    end

    local raw = readCurrentResourceFile(INDEX_PATH)
    if type(raw) ~= 'string' or raw == '' then
        resourceIndex = { generatedAt = nil, resourcesRoot = nil, count = 0, resources = {} }
        resourceNameLookup = {}
        print(('[mri_Qadmin] Resource index nao encontrado em %s.'):format(INDEX_PATH))
        return resourceIndex
    end

    local ok, decoded = pcall(json.decode, raw)
    if not ok or type(decoded) ~= 'table' then
        resourceIndex = { generatedAt = nil, resourcesRoot = nil, count = 0, resources = {} }
        resourceNameLookup = {}
        print(('[mri_Qadmin] Falha ao decodificar %s: %s'):format(INDEX_PATH, tostring(decoded)))
        return resourceIndex
    end

    decoded.resources = type(decoded.resources) == 'table' and decoded.resources or {}
    resourceIndex = decoded
    buildNameLookup(resourceIndex)

    print(('[mri_Qadmin] Resource index carregado: %s resources.'):format(countIndexedResources()))
    return resourceIndex
end

local function persistResourceIndex()
    if not resourceIndex then
        return
    end

    local ok, encoded = pcall(json.encode, resourceIndex)
    if ok and type(encoded) == 'string' then
        local absolutePath = currentResourceAbsolutePath(INDEX_PATH)
        local handle, err = absolutePath and io.open(absolutePath, 'wb') or nil
        if handle then
            handle:write(encoded)
            handle:close()
            return
        end

        print(('[mri_Qadmin] Falha ao persistir indice fisico: %s'):format(tostring(err or 'caminho indisponivel')))
        SaveResourceFile(GetCurrentResourceName(), INDEX_PATH, encoded, #encoded)
    end
end

-- Monta o indice (nome do resource -> caminho absoluto no disco) varrendo os
-- resources carregados no servidor. O servidor onde o mri_Qadmin roda e o unico
-- lugar que conhece os caminhos reais, entao o indice precisa ser gerado em
-- runtime (nao da pra pre-gerar no build/CI). Preserva o cache de diretorios ja
-- listado, quando existir, pra nao perder metadados entre regeracoes.
local function generateResourceIndex()
    local previous = (resourceIndex and type(resourceIndex.resources) == 'table') and resourceIndex.resources or {}
    local resources = {}
    local total = tonumber(GetNumResources() or 0) or 0
    local serverRoot = nil

    for i = 0, total - 1 do
        local name = GetResourceByFindIndex(i)
        if name and name ~= '' then
            local root = normalizeSlashes(GetResourcePath(name) or '')
            if root ~= '' then
                local cached = previous[name]
                resources[name] = {
                    root = root,
                    directories = (type(cached) == 'table' and type(cached.directories) == 'table') and cached.directories or {},
                }
                if not serverRoot then
                    serverRoot = root:match('^(.*)[\\/][^\\/]+$') or nil
                end
            end
        end
    end

    resourceIndex = {
        generatedAt = os.time(),
        resourcesRoot = serverRoot,
        count = 0,
        resources = resources,
    }
    resourceIndex.count = countIndexedResources()
    buildNameLookup(resourceIndex)
    persistResourceIndex()

    print(('[mri_Qadmin] Resource index gerado em runtime: %s resources.'):format(resourceIndex.count))
    return resourceIndex
end

-- Garante que um unico resource esteja no indice (ex.: iniciado apos o boot),
-- sem refazer a varredura completa.
local function indexResource(resourceName)
    local name = trim(resourceName)
    if name == '' then
        return
    end

    local root = normalizeSlashes(GetResourcePath(name) or '')
    if root == '' then
        return
    end

    local index = loadResourceIndex(false)
    index.resources = type(index.resources) == 'table' and index.resources or {}

    local cached = index.resources[name]
    index.resources[name] = {
        root = root,
        directories = (type(cached) == 'table' and type(cached.directories) == 'table') and cached.directories or {},
    }
    index.count = countIndexedResources()
    buildNameLookup(index)
    persistResourceIndex()
end

local function findIndexedResource(resourceName)
    local safeName = trim(resourceName)
    if safeName == '' then
        return nil
    end

    local index = loadResourceIndex(false)
    -- Auto-cura: se o indice estiver vazio (placeholder novo ou apos um reset),
    -- gera em runtime antes de desistir.
    if countIndexedResources() == 0 then
        index = generateResourceIndex()
    end

    local resources = index.resources or {}
    if resources[safeName] then
        return resources[safeName], safeName
    end

    local exactName = resourceNameLookup and resourceNameLookup[safeName:lower()]
    if exactName and resources[exactName] then
        return resources[exactName], exactName
    end

    return nil
end

local function resolveTarget(resourceName, relativePath)
    local resource, indexedName = findIndexedResource(resourceName)
    if not resource then
        return nil, 'Resource nao encontrado no indice.'
    end

    local relative = sanitizeRelativePath(relativePath or '')
    if relative == nil then
        return nil, 'Caminho invalido.'
    end

    local root = normalizeSlashes(resource.root or '')
    if root == '' then
        return nil, 'Resource sem diretorio indexado.'
    end

    local absolute = root
    if relative ~= '' then
        absolute = root .. '\\' .. relative:gsub('/', '\\')
    end

    return {
        resource = indexedName,
        root = root,
        relative = relative,
        absolute = absolute,
        indexed = resource,
    }
end

local function getResourceData(resourceName)
    return {
        name = resourceName,
        author = GetResourceMetadata(resourceName, 'author', 0),
        version = GetResourceMetadata(resourceName, 'version', 0),
        description = GetResourceMetadata(resourceName, 'description', 0),
        resourceState = GetResourceState(resourceName),
    }
end

local function refreshResources()
    local result = {}
    local totalResources = tonumber(GetNumResources() or 0) or 0

    for index = 0, totalResources - 1 do
        local resourceName = GetResourceByFindIndex(index)
        if resourceName and resourceName ~= '' then
            result[#result + 1] = getResourceData(resourceName)
        end
    end

    table.sort(result, function(left, right)
        return tostring(left.name or ''):lower() < tostring(right.name or ''):lower()
    end)

    return result
end

function RefreshResources()
    return refreshResources()
end

_G.RefreshResources = RefreshResources

local function cloneDirectoryEntries(entries)
    local cloned = {}
    if type(entries) ~= 'table' then
        return cloned
    end

    for _, entry in ipairs(entries) do
        local path = sanitizeRelativePath(entry.path or '') or ''
        local isKeepFile = path:match('(^|/)%.qadmin_keep$') ~= nil
        if not isKeepFile then
            cloned[#cloned + 1] = {
                name = tostring(entry.name or baseName(path)),
                path = path,
                isDirectory = entry.isDirectory == true,
                size = tonumber(entry.size or 0) or 0,
                modified = entry.modified,
                extension = tostring(entry.extension or fileExtension(path)),
                editable = entry.editable == true,
            }
        end
    end

    sortEntries(cloned)
    return cloned
end

local function upsertIndexedEntry(resourceName, relativePath, isDirectory, size)
    local target = resolveTarget(resourceName, parentPath(relativePath))
    if not target then
        return
    end

    local safePath = sanitizeRelativePath(relativePath or '')
    if not safePath or safePath == '' then
        return
    end

    local directory = target.relative
    target.indexed.directories = type(target.indexed.directories) == 'table' and target.indexed.directories or {}
    target.indexed.directories[directory] = type(target.indexed.directories[directory]) == 'table' and target.indexed.directories[directory] or {}

    local entries = target.indexed.directories[directory]
    local entry = {
        name = baseName(safePath),
        path = safePath,
        isDirectory = isDirectory == true,
        size = tonumber(size or 0) or 0,
        modified = os.date('!%Y-%m-%dT%H:%M:%SZ'),
        extension = isDirectory and '' or fileExtension(safePath),
        editable = (not isDirectory) and isTextFile(safePath),
    }

    for index, current in ipairs(entries) do
        if sanitizeRelativePath(current.path or '') == safePath then
            entries[index] = entry
            if isDirectory and type(target.indexed.directories[safePath]) ~= 'table' then
                target.indexed.directories[safePath] = {}
            end
            sortEntries(entries)
            return
        end
    end

    entries[#entries + 1] = entry
    if isDirectory and type(target.indexed.directories[safePath]) ~= 'table' then
        target.indexed.directories[safePath] = {}
    end
    sortEntries(entries)
end

local function removeIndexedEntry(resourceName, relativePath)
    local safePath = sanitizeRelativePath(relativePath or '')
    if not safePath or safePath == '' then
        return
    end

    local target = resolveTarget(resourceName, parentPath(safePath))
    if not target then
        return
    end

    target.indexed.directories = type(target.indexed.directories) == 'table' and target.indexed.directories or {}
    local directory = parentPath(safePath)
    local entries = target.indexed.directories[directory]

    if type(entries) == 'table' then
        for index = #entries, 1, -1 do
            if sanitizeRelativePath(entries[index].path or '') == safePath then
                table.remove(entries, index)
            end
        end
    end

    local prefix = safePath .. '/'
    for indexedDirectory in pairs(target.indexed.directories) do
        if indexedDirectory == safePath or tostring(indexedDirectory):sub(1, #prefix) == prefix then
            target.indexed.directories[indexedDirectory] = nil
        end
    end
end

local function listDirectory(resourceName, directory)
    local target, errorMessage = resolveTarget(resourceName, directory)
    if not target then
        return {
            ok = false,
            message = ('Diretorio invalido: %s (%s resources indexados).'):format(errorMessage or 'resource nao encontrado', countIndexedResources()),
        }
    end

    target.indexed.directories = type(target.indexed.directories) == 'table' and target.indexed.directories or {}
    local entries, liveError = listWithFsBridge(target)
    if type(entries) == 'table' then
        target.indexed.directories[target.relative] = entries
    else
        entries = target.indexed.directories[target.relative]
    end

    if type(entries) ~= 'table' then
        return {
            ok = false,
            message = liveError or ('Pasta nao esta no indice: %s'):format(target.relative == '' and 'root' or target.relative),
        }
    end

    local parent = ''
    if target.relative ~= '' then
        parent = parentPath(target.relative)
    end

    return {
        ok = true,
        resource = target.resource,
        directory = target.relative,
        parent = parent,
        root = browserPath(target.root),
        entries = cloneDirectoryEntries(entries),
    }
end

local function readDiskFile(target)
    local recent = recentWrites[targetKey(target)]
    local content = readPhysicalFile(target.absolute)
    if type(content) == 'string' then
        if recent and not sameTextContent(content, recent) then
            local nativeContent = LoadResourceFile(target.resource, target.relative)
            if type(nativeContent) == 'string' and sameTextContent(nativeContent, recent) then
                return nativeContent
            end
        end

        return content
    end

    content = LoadResourceFile(target.resource, target.relative)
    if type(content) == 'string' then
        return content
    end

    return nil
end

local function readResourceFile(resourceName, relativePath)
    local target = resolveTarget(resourceName, relativePath)
    if not target or target.relative == '' then
        return { ok = false, message = 'Arquivo invalido.' }
    end

    local content = readDiskFile(target)
    if type(content) ~= 'string' then
        return { ok = false, message = 'Arquivo nao encontrado.' }
    end

    local size = tonumber(#content) or 0
    local binary = content:find('\0', 1, true) ~= nil
    local editable = not binary and isTextFile(target.relative) and size <= MAX_EDITOR_FILE_SIZE

    return {
        ok = true,
        resource = target.resource,
        path = target.relative,
        name = baseName(target.relative),
        extension = fileExtension(target.relative),
        size = size,
        editable = editable,
        tooLarge = size > MAX_EDITOR_FILE_SIZE,
        binary = binary,
        content = binary and nil or content,
    }
end

local function commandSucceeded(ok, _, code)
    if ok == true or ok == 0 then
        return true
    end

    if type(ok) == 'number' then
        return ok == 0
    end

    return code == 0
end

local function ensureDirectoryExists(absolutePath)
    if pathExists(absolutePath) then
        return true
    end

    local ok, exitType, code = os.execute(('cmd /c mkdir %s >nul 2>nul'):format(cmdQuote(absolutePath)))
    if commandSucceeded(ok, exitType, code) and pathExists(absolutePath) then
        return true
    end

    return false, 'O Windows nao permitiu criar a pasta.'
end

local function writeDiskFile(target, content)
    local text = tostring(content or '')
    local bridgeSaved, bridgeError = writeWithFsBridge(target, text)
    if not bridgeSaved then
        return false, bridgeError
    end

    recentWrites[targetKey(target)] = text
    return true
end

local function createDirectory(target)
    if pathExists(target.absolute) then
        return true
    end

    return createDirectoryWithFsBridge(target)
end

local function saveResourceEditorFile(source, data)
    if not CheckPerms(source, 'qadmin.action.change_resource') then
        return { ok = false, message = 'Sem permissao para editar arquivos.' }
    end

    local target = resolveTarget(data.resource, data.path)
    if not target or target.relative == '' then
        return { ok = false, message = 'Arquivo invalido.' }
    end

    if not isTextFile(target.relative) then
        return { ok = false, message = 'Esse tipo de arquivo nao pode ser editado pelo painel.' }
    end

    local saved, saveError = writeDiskFile(target, data.content or '')
    if not saved then
        print(('[mri_Qadmin] Falha ao salvar %s/%s: %s'):format(target.resource, target.relative, tostring(saveError)))
        return { ok = false, message = saveError or 'Nao foi possivel salvar o arquivo.' }
    end

    upsertIndexedEntry(target.resource, target.relative, false, #(tostring(data.content or '')))

    if data.restartResource == true and GetResourceState(target.resource) == 'started' then
        StopResource(target.resource)
        Wait(200)
        StartResource(target.resource)
    end

    AddLog(source, 'mri_Qadmin', 'server', 'info', ('Arquivo salvo em %s: %s'):format(target.resource, target.relative), {
        resource = target.resource,
        file = target.relative,
        restarted = data.restartResource == true,
    })

    return {
        ok = true,
        message = data.restartResource == true and 'Arquivo salvo e resource reiniciado.' or 'Arquivo salvo com sucesso.',
        file = readResourceFile(target.resource, target.relative),
        resources = refreshResources(),
    }
end

local function createEntry(source, data)
    if not CheckPerms(source, 'qadmin.action.change_resource') then
        return { ok = false, message = 'Sem permissao para criar arquivos.' }
    end

    local safeDirectory = sanitizeRelativePath(data.directory or '')
    local safeName = sanitizeEntryName(data.name)
    local kind = tostring(data.kind or 'file')

    if safeDirectory == nil then
        return { ok = false, message = 'Diretorio invalido.' }
    end

    if not safeName then
        return { ok = false, message = 'Nome invalido.' }
    end

    local relativePath = sanitizeRelativePath(joinRelativePath(safeDirectory, safeName))
    if not relativePath then
        return { ok = false, message = 'Caminho invalido.' }
    end

    local target = resolveTarget(data.resource, relativePath)
    if not target then
        return { ok = false, message = 'Destino invalido.' }
    end

    if kind == 'folder' then
        if pathExists(target.absolute) then
            return { ok = false, message = 'Ja existe uma pasta ou arquivo com esse nome.' }
        end

        local created, createError = createDirectory(target)
        if not created then
            print(('[mri_Qadmin] Falha ao criar pasta %s: %s'):format(target.absolute, tostring(createError)))
            return { ok = false, message = createError or 'Nao foi possivel criar a pasta.' }
        end

        upsertIndexedEntry(target.resource, target.relative, true, 0)
        persistResourceIndex()
        return {
            ok = true,
            message = 'Pasta criada com sucesso.',
            browse = listDirectory(target.resource, safeDirectory),
        }
    end

    if pathExists(target.absolute) then
        return { ok = false, message = 'Ja existe uma pasta ou arquivo com esse nome.' }
    end

    local created, createError = writeDiskFile(target, data.content or '')
    if not created then
        print(('[mri_Qadmin] Falha ao criar arquivo %s: %s'):format(target.absolute, tostring(createError)))
        return { ok = false, message = createError or 'Nao foi possivel criar o arquivo.' }
    end

    upsertIndexedEntry(target.resource, target.relative, false, #(tostring(data.content or '')))
    persistResourceIndex()

    return {
        ok = true,
        message = 'Arquivo criado com sucesso.',
        browse = listDirectory(target.resource, safeDirectory),
        file = readResourceFile(target.resource, target.relative),
    }
end

local function deleteEntry(source, data)
    if not CheckPerms(source, 'qadmin.page.resources') then
        return { ok = false, message = 'Sem permissao para acessar resources.' }
    end

    if not CheckPerms(source, 'qadmin.action.resource_delete') then
        return { ok = false, message = 'Sem permissao para excluir arquivos ou pastas.' }
    end

    local target = resolveTarget(data.resource, data.path)
    if not target or target.relative == '' then
        return { ok = false, message = 'Entrada invalida para exclusao.' }
    end

    local isDirectory = data.isDirectory == true
    local parent = parentPath(target.relative)
    local deleted, deleteError = deleteWithFsBridge(target, isDirectory)
    if not deleted then
        print(('[mri_Qadmin] Falha ao excluir %s/%s: %s'):format(target.resource, target.relative, tostring(deleteError)))
        return { ok = false, message = deleteError or 'Nao foi possivel excluir a entrada.' }
    end

    removeIndexedEntry(target.resource, target.relative)
    persistResourceIndex()

    AddLog(source, 'mri_Qadmin', 'server', 'warn', ('Entrada excluida em %s: %s'):format(target.resource, target.relative), {
        resource = target.resource,
        path = target.relative,
        isDirectory = isDirectory,
    })

    return {
        ok = true,
        message = isDirectory and 'Pasta excluida com sucesso.' or 'Arquivo excluido com sucesso.',
        browse = listDirectory(target.resource, parent),
        deletedPath = target.relative,
        deletedDirectory = isDirectory,
    }
end

local function safeCallback(name, handler)
    lib.callback.register(name, function(...)
        local ok, response = pcall(handler, ...)
        if ok then
            return response
        end

        print(('[mri_Qadmin] callback %s failed: %s'):format(name, tostring(response)))
        return {
            ok = false,
            message = 'Erro interno no modulo de resources. Veja o console do servidor.',
        }
    end)
end

safeCallback('mri_Qadmin:callback:GetResources', function(source)
    if not CheckPerms(source, 'qadmin.page.resources') then
        return {}
    end

    return refreshResources()
end)

safeCallback('mri_Qadmin:callback:ChangeResourceState', function(source, data)
    if not CheckPerms(source, 'qadmin.action.change_resource') then
        return refreshResources()
    end

    local resourceName = tostring(data and data.name or '')
    local state = tostring(data and data.state or '')
    if resourceName == '' or state == '' then
        return refreshResources()
    end

    if state == 'start' then
        StartResource(resourceName)
        AddLog(source, 'mri_Qadmin', 'server', 'info', ('Recurso iniciado: %s'):format(resourceName), { resource = resourceName })
    elseif state == 'stop' then
        StopResource(resourceName)
        AddLog(source, 'mri_Qadmin', 'server', 'warn', ('Recurso parado: %s'):format(resourceName), { resource = resourceName })
    elseif state == 'restart' then
        StopResource(resourceName)
        Wait(200)
        StartResource(resourceName)
        AddLog(source, 'mri_Qadmin', 'server', 'warn', ('Recurso reiniciado: %s'):format(resourceName), { resource = resourceName })
    end

    return refreshResources()
end)

safeCallback('mri_Qadmin:callback:BrowseResourceFiles', function(source, resourceName, directory)
    if not CheckPerms(source, 'qadmin.page.resources') then
        return { ok = false, message = 'Sem permissao para acessar resources.' }
    end

    if not CheckPerms(source, 'qadmin.action.change_resource') then
        return { ok = false, message = 'Sem permissao para explorar resources.' }
    end

    return listDirectory(resourceName, directory)
end)

safeCallback('mri_Qadmin:callback:GetResourceFile', function(source, resourceName, path)
    if not CheckPerms(source, 'qadmin.page.resources') then
        return { ok = false, message = 'Sem permissao para acessar resources.' }
    end

    if not CheckPerms(source, 'qadmin.action.change_resource') then
        return { ok = false, message = 'Sem permissao para abrir arquivos.' }
    end

    return readResourceFile(resourceName, path)
end)

safeCallback('mri_Qadmin:callback:SaveResourceFile', function(source, data)
    if not CheckPerms(source, 'qadmin.page.resources') then
        return { ok = false, message = 'Sem permissao para acessar resources.' }
    end

    return saveResourceEditorFile(source, data or {})
end)

safeCallback('mri_Qadmin:callback:CreateResourceEntry', function(source, data)
    if not CheckPerms(source, 'qadmin.page.resources') then
        return { ok = false, message = 'Sem permissao para acessar resources.' }
    end

    return createEntry(source, data or {})
end)

safeCallback('mri_Qadmin:callback:DeleteResourceEntry', function(source, data)
    return deleteEntry(source, data or {})
end)

AddEventHandler('onResourceStart', function(resourceName)
    -- So indexa incrementalmente apos o boot; durante o boot a geracao unica
    -- (thread abaixo) cobre todos os resources de uma vez.
    if indexBootDone then
        indexResource(resourceName)
    end
    TriggerClientEvent('mri_Qadmin:client:UpdateResourceState', -1, getResourceData(resourceName))
end)

AddEventHandler('onResourceStop', function(resourceName)
    TriggerClientEvent('mri_Qadmin:client:UpdateResourceState', -1, getResourceData(resourceName))
end)

-- Gera o indice de resources no boot, dando um tempo pro restante do servidor
-- subir. Resources que iniciarem depois sao cobertos pelo onResourceStart acima,
-- e o findIndexedResource ainda regenera sob demanda se o indice estiver vazio.
CreateThread(function()
    Wait(2000)
    generateResourceIndex()
    indexBootDone = true
end)
