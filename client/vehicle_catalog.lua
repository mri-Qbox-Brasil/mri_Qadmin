-- Vehicle catalog (mri_Qbox vehicles module) edited from the Vehicles tab; mri_Qbox checks permission on every call.

local CATALOG_RESOURCE = 'mri_Qbox'

local function catalogReady()
    return GetResourceState(CATALOG_RESOURCE) == 'started'
end

local function forward(name, ...)
    if not catalogReady() then return { success = false, message = 'catalog_offline' } end
    return lib.callback.await('mri_Qbox:vehicles:' .. name, false, ...) or { success = false }
end

RegisterNUICallback('vehicleCatalogGet', function(_, cb)
    local result = forward('get')
    if result.vehicles then
        for i = 1, #result.vehicles do
            local vehicle = result.vehicles[i]
            vehicle.inGame = IsModelInCdimage(joaat(vehicle.model))
        end
    end
    cb(result)
end)

RegisterNUICallback('vehicleCatalogSave', function(data, cb)
    cb(forward('save', data))
end)

RegisterNUICallback('vehicleCatalogRemove', function(data, cb)
    cb(forward('remove', data.model))
end)

RegisterNUICallback('vehicleCatalogRestore', function(data, cb)
    cb(forward('restore', data.model))
end)

RegisterNUICallback('vehicleCatalogCheckModel', function(data, cb)
    cb({ inGame = type(data.model) == 'string' and IsModelInCdimage(joaat(data.model)) or false })
end)

---@param key string
---@return string?
local function gameLabel(key)
    if not key or key == '' or key == 'CARNOTFOUND' then return nil end
    local text = GetLabelText(key)
    if text == 'NULL' then return key:sub(1, 1) .. key:sub(2):lower() end
    return text
end

---@param hash integer
---@return string
local function typeOf(hash)
    if IsThisModelABike(hash) or IsThisModelABicycle(hash) or IsThisModelAQuadbike(hash) then return 'bike' end
    if IsThisModelABoat(hash) or IsThisModelAJetski(hash) then return 'boat' end
    if IsThisModelAHeli(hash) then return 'heli' end
    if IsThisModelAPlane(hash) then return 'plane' end
    if IsThisModelATrain(hash) then return 'train' end
    return 'automobile'
end

-- Game models (base and streamed packs) missing from the qbx_core list, named by the game itself
RegisterNUICallback('vehicleCatalogMissing', function(_, cb)
    if not catalogReady() then return cb({ success = false, message = 'catalog_offline' }) end
    local known = exports.qbx_core:GetVehiclesByName()
    local missing = {}
    for _, model in ipairs(GetAllVehicleModels()) do
        model = model:lower()
        if not known[model] then
            local hash = joaat(model)
            missing[#missing + 1] = {
                model = model,
                name = gameLabel(GetDisplayNameFromVehicleModel(hash)) or model,
                brand = gameLabel(GetMakeNameFromVehicleModel(hash)) or '',
                type = typeOf(hash),
            }
        end
    end
    cb({ success = true, models = missing })
end)
