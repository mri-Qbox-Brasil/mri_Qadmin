-- ─── NUI → server relay ───────────────────────────────────────────────────────
-- Todos os callbacks abaixo seguem o padrão do mri_Qadmin:
--   NUI (fetch) → RegisterNUICallback no client → lib.callback.await → server

RegisterNUICallback('getVipRanks', function(_, cb)
    cb(lib.callback.await('mri_Qadmin:vip:getRanks', false))
end)

RegisterNUICallback('createVipRank', function(data, cb)
    cb(lib.callback.await('mri_Qadmin:vip:createRank', false, data))
end)

RegisterNUICallback('updateVipRank', function(data, cb)
    cb(lib.callback.await('mri_Qadmin:vip:updateRank', false, data))
end)

RegisterNUICallback('deleteVipRank', function(data, cb)
    cb(lib.callback.await('mri_Qadmin:vip:deleteRank', false, data))
end)

RegisterNUICallback('getVipPlayers', function(_, cb)
    cb(lib.callback.await('mri_Qadmin:vip:getVipPlayers', false))
end)

RegisterNUICallback('addVipPlayer', function(data, cb)
    cb(lib.callback.await('mri_Qadmin:vip:addVipPlayer', false, data))
end)

RegisterNUICallback('removeVipPlayer', function(data, cb)
    cb(lib.callback.await('mri_Qadmin:vip:removeVipPlayer', false, data))
end)

RegisterNUICallback('updateVipPlayer', function(data, cb)
    cb(lib.callback.await('mri_Qadmin:vip:updateVipPlayer', false, data))
end)
