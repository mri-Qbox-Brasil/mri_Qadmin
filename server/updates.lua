-- Verificacao de atualizacao do proprio mri_Qadmin contra a ultima GitHub Release.
-- Resultado e cacheado e reusado no payload inicial da NUI (data_sync.lua),
-- evitando bater na API do GitHub a cada jogador que abre o painel.

local REPO = 'mri-Qbox-Brasil/mri_Qadmin'
local CHECK_INTERVAL = 6 * 60 * 60 * 1000 -- revalida a cada 6h
local RELEASES_URL = ('https://api.github.com/repos/%s/releases/latest'):format(REPO)

local updateInfo = {
    current = GetResourceMetadata(GetCurrentResourceName(), 'version', 0) or '0.0.0',
    latest = nil,
    updateAvailable = false,
    url = ('https://github.com/%s/releases/latest'):format(REPO),
    checkedAt = 0,
}

-- "v1.2.3" / "1.2.3" -> 1, 2, 3
local function parseSemver(v)
    v = (v or ''):gsub('^v', '')
    local maj, min, pat = v:match('^(%d+)%.(%d+)%.(%d+)')
    return tonumber(maj) or 0, tonumber(min) or 0, tonumber(pat) or 0
end

local function isNewer(latest, current)
    local lMaj, lMin, lPat = parseSemver(latest)
    local cMaj, cMin, cPat = parseSemver(current)
    if lMaj ~= cMaj then return lMaj > cMaj end
    if lMin ~= cMin then return lMin > cMin end
    return lPat > cPat
end

local function checkForUpdates()
    PerformHttpRequest(RELEASES_URL, function(code, body, _headers)
        if code == 200 and body and body ~= '' then
            local ok, data = pcall(json.decode, body)
            if ok and data and data.tag_name then
                local latest = (data.tag_name):gsub('^v', '')
                local current = updateInfo.current
                -- Em dev a versao pode ainda ser o placeholder "__VERSION__"
                -- (nao substituido pelo release). Sem semver valido, nunca
                -- marcamos update pra evitar falso positivo.
                local validCurrent = current:match('^%d+%.%d+%.%d+') ~= nil

                updateInfo.latest = latest
                updateInfo.url = data.html_url or updateInfo.url
                updateInfo.updateAvailable = validCurrent and isNewer(latest, current)
                updateInfo.checkedAt = os.time()

                Debug('debug', ('[mri_Qadmin] Update check: current=%s latest=%s available=%s')
                    :format(current, latest, tostring(updateInfo.updateAvailable)))
            else
                Debug('debug', ('[mri_Qadmin] Update check: resposta invalida da API do GitHub'))
            end
        else
            Debug('debug', ('[mri_Qadmin] Update check falhou (HTTP %s)'):format(tostring(code)))
        end
    end, 'GET', '', { ['User-Agent'] = 'mri_Qadmin', ['Accept'] = 'application/vnd.github+json' })
end

-- Consumido por data_sync.lua para anexar ao payload inicial (gated por perm).
function GetUpdateInfo()
    return updateInfo
end

CreateThread(function()
    while true do
        checkForUpdates()
        Wait(CHECK_INTERVAL)
    end
end)
