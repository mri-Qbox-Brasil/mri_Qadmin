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

-- Indice (nome do resource -> caminho no disco) e um cache PURO EM MEMORIA: os
-- caminhos sao especificos da sessao do servidor (mudam entre restarts), entao
-- nao faz sentido persistir em disco — geramos sob demanda a partir de
-- GetResourcePath. Sem persistencia: sem staleness no boot e sem storm de
-- escrita pelos onResourceStart.
local resourceIndex = nil
local resourceNameLookup = nil
local recentWrites = {}
-- Cache de gravabilidade por resource (nome -> bool). Escrita cross-resource e
-- bloqueada pelo sandbox do FiveM, exceto com add_filesystem_permission.
local resourceWritable = {}
-- Definidas mais abaixo; forward-declaradas porque isResourceWritable (acima do
-- ponto de definicao) precisa usar attemptWrite.
local writtenMatches
local attemptWrite

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

-- Caracteres que sobrevivem ao aspeamento e sao interpretados pelo shell
-- (cmd: %VAR%, !VAR!; sh: $, `). Caminhos/nomes que os contenham nunca vao para
-- o os.execute — sao recusados antes, evitando expansao/injecao.
local function hasShellHazard(value)
    return tostring(value or ''):find('[%%%$`!]') ~= nil
end

-- Detecta o SO para escolher mkdir/rmdir corretos. O Lua do FiveM normalmente
-- NAO expoe 'package' (acessar o global nil nao estoura; indexar sim — por isso
-- o curto-circuito), entao caimos no separador do caminho do proprio resource
-- (drive letter / '\' => Windows; '/' => Unix). Lazy + cacheado: so resolve no
-- primeiro uso (runtime), quando as natives ja estao disponiveis.
local cachedIsWindows = nil
local function isWindows()
    if cachedIsWindows == nil then
        if package and package.config then
            cachedIsWindows = package.config:sub(1, 1) == '\\'
        else
            local sample = tostring(GetResourcePath(GetCurrentResourceName()) or '')
            cachedIsWindows = sample:find('^%a:') ~= nil or sample:find('\\') ~= nil
        end
    end
    return cachedIsWindows
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

-- A escrita usa a native SaveResourceFile (writeDiskFile). O FS bridge em Node
-- so e usado para LISTAR (leitura), entao mantemos apenas o list aqui.
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

    -- Metacaracteres de shell: nomes novos passam por mkdir/rmdir via os.execute,
    -- entao recusamos os que o shell interpreta mesmo entre aspas.
    if cleaned:find('[%%%$`!&;%(%)%^]') then
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

-- Monta o indice (nome do resource -> caminho absoluto no disco) varrendo os
-- resources carregados no servidor, in-memory. Preserva o cache de diretorios ja
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

    print(('[mri_Qadmin] Resource index gerado em runtime: %s resources.'):format(resourceIndex.count))
    return resourceIndex
end

-- Garante o indice em memoria (gera na primeira vez / se estiver vazio).
local function ensureResourceIndex()
    if not resourceIndex or countIndexedResources() == 0 then
        generateResourceIndex()
    end
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

    local index = ensureResourceIndex()
    index.resources = type(index.resources) == 'table' and index.resources or {}

    local cached = index.resources[name]
    index.resources[name] = {
        root = root,
        directories = (type(cached) == 'table' and type(cached.directories) == 'table') and cached.directories or {},
    }
    index.count = countIndexedResources()
    buildNameLookup(index)
end

local function findIndexedResource(resourceName)
    local safeName = trim(resourceName)
    if safeName == '' then
        return nil
    end

    -- Indice em memoria, gerado sob demanda (auto-cura se vazio).
    local index = ensureResourceIndex()

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
        local isKeepFile = baseName(path) == '.qadmin_keep'
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

-- Descobre se da pra gravar no resource (cacheado). O proprio mri_Qadmin sempre
-- pode; nos demais, faz um probe nao-destrutivo escrevendo o marcador oculto
-- .qadmin_keep (ja filtrado das listagens) e relendo. Se o sandbox bloquear, o
-- arquivo nem chega a ser criado.
local function isResourceWritable(target)
    if target.resource == GetCurrentResourceName() then
        return true
    end

    local cached = resourceWritable[target.resource]
    if cached ~= nil then
        return cached
    end

    -- Probe com o MESMO mecanismo do save real (native + fallback os.execute),
    -- escrevendo o marcador oculto .qadmin_keep com um token e relendo.
    local probeAbs = target.root .. '\\.qadmin_keep'
    local probeTarget = {
        resource = target.resource,
        relative = '.qadmin_keep',
        absolute = probeAbs,
        root = target.root,
    }
    local token = ('mriqadmin-%s'):format(tostring(os.time()))
    local writable = attemptWrite(probeTarget, token)

    if writable then
        -- limpa o probe (best-effort; se nao der, fica oculto nas listagens).
        if not os.remove(probeAbs) and pathExists(probeAbs) then
            SaveResourceFile(target.resource, '.qadmin_keep', '', 0)
        end
    end

    resourceWritable[target.resource] = writable
    return writable
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
        writable = isResourceWritable(target),
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

    if hasShellHazard(absolutePath) then
        return false, 'Caminho com caractere nao suportado para criar pasta.'
    end

    local command = isWindows()
        and ('cmd /c mkdir %s >nul 2>nul'):format(cmdQuote(absolutePath))
        or ('mkdir -p %s >/dev/null 2>&1'):format(cmdQuote(absolutePath))

    local ok, exitType, code = os.execute(command)
    if commandSucceeded(ok, exitType, code) and pathExists(absolutePath) then
        return true
    end

    return false, 'Nao foi possivel criar a pasta no disco.'
end

-- Exclui um arquivo (os.remove) ou pasta (rmdir/rm -rf) direto no disco, sem
-- passar pelo FS bridge do Node — que e bloqueado pelo sandbox em artifacts novos.
local function deletePhysicalEntry(absolutePath, isDirectory)
    if isDirectory then
        if hasShellHazard(absolutePath) then
            return false, 'Caminho com caractere nao suportado para excluir pasta.'
        end

        local command = isWindows()
            and ('cmd /c rmdir /s /q %s >nul 2>nul'):format(cmdQuote(absolutePath))
            or ('rm -rf %s >/dev/null 2>&1'):format(cmdQuote(absolutePath))

        local ok, exitType, code = os.execute(command)
        if commandSucceeded(ok, exitType, code) and not pathExists(absolutePath) then
            return true
        end

        return false, 'Nao foi possivel excluir a pasta no disco.'
    end

    local removed = os.remove(absolutePath)
    if removed then
        return true
    end

    return false, 'Nao foi possivel excluir o arquivo no disco.'
end

-- Confirma a gravacao relendo o conteudo do disco (io cru) ou via native
-- (LoadResourceFile). A leitura e a fonte da verdade — o retorno de write/close
-- do Lua do FiveM nao e confiavel.
writtenMatches = function(target, text)
    local disk = readPhysicalFile(target.absolute)
    if type(disk) == 'string' and sameTextContent(disk, text) then
        return true
    end

    local native = LoadResourceFile(target.resource, target.relative)
    return type(native) == 'string' and sameTextContent(native, text)
end

-- Grava `text` no destino via native SaveResourceFile e confirma por releitura.
-- Escrita cross-resource e bloqueada pelo sandbox do FiveM (io cru e os.execute
-- tambem nao contornam) — so funciona no proprio mri_Qadmin ou com
-- add_filesystem_permission no server.cfg.
attemptWrite = function(target, text)
    SaveResourceFile(target.resource, target.relative, text, #text)
    return writtenMatches(target, text)
end

local function writeDiskFile(target, content)
    local text = tostring(content or '')
    -- best-effort: garante a pasta pai (no-op se ja existir).
    ensureDirectoryExists(target.absolute:match('^(.*)[\\/][^\\/]+$') or normalizeSlashes(target.root))

    -- attemptWrite: native SaveResourceFile e, se o sandbox barrar, fallback via
    -- os.execute (copy do temp). Importante: NUNCA io.open('wb') no caminho cru —
    -- com sandbox o write e bloqueado mas o 'wb' ja TRUNCOU o arquivo (perda de
    -- dados).
    if attemptWrite(target, text) then
        recentWrites[targetKey(target)] = text
        resourceWritable[target.resource] = true
        return true
    end

    resourceWritable[target.resource] = false
    print(('[mri_Qadmin] write falhou | resource=%s self=%s rel=%s'):format(
        tostring(target.resource),
        tostring(target.resource == GetCurrentResourceName()),
        tostring(target.relative)
    ))

    local hint = (target.resource == GetCurrentResourceName())
        and 'Falha ao gravar mesmo no proprio mri_Qadmin.'
        or ('O sandbox do FiveM bloqueia escrita em "%s". Adicione no server.cfg: add_filesystem_permission mri_Qadmin write %s'):format(target.resource, target.resource)

    return false, ('Nao foi possivel gravar o arquivo. %s'):format(hint)
end

local function createDirectory(target)
    if pathExists(target.absolute) then
        return true
    end

    local created, createError = ensureDirectoryExists(target.absolute)
    if created then
        return true
    end

    return false, createError or 'Nao foi possivel criar a pasta.'
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

    -- Nunca reiniciar o proprio mri_Qadmin daqui: StopResource no proprio resource
    -- mata o callback em andamento (o save trava e o painel cai). Quem edita os
    -- arquivos do painel deve reiniciar manualmente.
    local restarted = false
    if data.restartResource == true
        and target.resource ~= GetCurrentResourceName()
        and GetResourceState(target.resource) == 'started' then
        StopResource(target.resource)
        Wait(200)
        StartResource(target.resource)
        restarted = true
    end

    AddLog(source, 'mri_Qadmin', 'server', 'info', ('Arquivo salvo em %s: %s'):format(target.resource, target.relative), {
        resource = target.resource,
        file = target.relative,
        restarted = restarted,
    })

    local selfEdit = data.restartResource == true and not restarted
    return {
        ok = true,
        message = restarted and 'Arquivo salvo e resource reiniciado.'
            or (selfEdit and 'Arquivo salvo. Reinicie o mri_Qadmin manualmente para aplicar.'
            or 'Arquivo salvo com sucesso.'),
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

    -- Exige change_resource (como browse/get/save) alem de resource_delete, pra
    -- nao deixar a exclusao com gate mais frouxo que a leitura/edicao.
    if not CheckPerms(source, 'qadmin.action.change_resource') then
        return { ok = false, message = 'Sem permissao para gerenciar arquivos do resource.' }
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

    local deleted, deleteError = deletePhysicalEntry(target.absolute, isDirectory)
    if not deleted then
        print(('[mri_Qadmin] Falha ao excluir %s/%s: %s'):format(target.resource, target.relative, tostring(deleteError)))
        return { ok = false, message = deleteError or 'Nao foi possivel excluir a entrada.' }
    end

    removeIndexedEntry(target.resource, target.relative)

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
    -- Mantem o indice em memoria em dia; barato (so GetResourcePath, sem disco).
    indexResource(resourceName)
    TriggerClientEvent('mri_Qadmin:client:UpdateResourceState', -1, getResourceData(resourceName))
end)

AddEventHandler('onResourceStop', function(resourceName)
    TriggerClientEvent('mri_Qadmin:client:UpdateResourceState', -1, getResourceData(resourceName))
end)

-- Gera o indice em memoria no start (captura os resources ja iniciados). Os que
-- iniciarem depois entram pelo onResourceStart acima, e o findIndexedResource
-- regenera sob demanda se o indice estiver vazio.
CreateThread(generateResourceIndex)
