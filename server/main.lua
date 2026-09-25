QBCore = exports['qb-core']:GetCoreObject()

-- GetCoreObject e uma copia: acompanha os veiculos cadastrados/editados em runtime no qbx_core
AddEventHandler('qbx_core:server:onVehicleUpdate', function(model, vehicle)
    QBCore.Shared.Vehicles[model] = vehicle
end)

-- Callbacks
