local QBCore = exports['qb-core']:GetCoreObject()

local wall_users = {}
local wall = false
local walldistance = 500 -- OneSync Infinity Max Distance
local armas = {
    [tostring(GetHashKey('WEAPON_ANIMAL'))] = 'Animal', [tostring(GetHashKey('WEAPON_COUGAR'))] = 'Cougar', [tostring(GetHashKey('WEAPON_ADVANCEDRIFLE'))] = 'Advanced Rifle',
    [tostring(GetHashKey('WEAPON_APPISTOL'))] = 'AP Pistol', [tostring(GetHashKey('WEAPON_ASSAULTRIFLE'))] = 'Assault Rifle', [tostring(GetHashKey('WEAPON_ASSAULTRIFLE_MK2'))] = 'Assault Rifke Mk2',
    [tostring(GetHashKey('WEAPON_ASSAULTSHOTGUN'))] = 'Assault Shotgun', [tostring(GetHashKey('WEAPON_ASSAULTSMG'))] = 'Assault SMG', [tostring(GetHashKey('WEAPON_AUTOSHOTGUN'))] = 'Automatic Shotgun',
    [tostring(GetHashKey('WEAPON_BULLPUPRIFLE'))] = 'Bullpup Rifle', [tostring(GetHashKey('WEAPON_BULLPUPRIFLE_MK2'))] = 'Bullpup Rifle Mk2',[tostring(GetHashKey('WEAPON_BULLPUPSHOTGUN'))] = 'Bullpup Shotgun',
    [tostring(GetHashKey('WEAPON_CARBINERIFLE'))] = 'Carbine Rifle', [tostring(GetHashKey('WEAPON_CARBINERIFLE_MK2'))] = 'Carbine Rifle Mk2', [tostring(GetHashKey('WEAPON_COMBATMG'))] = 'Combat MG',
    [tostring(GetHashKey('WEAPON_COMBATMG_MK2'))] = 'Combat MG Mk2', [tostring(GetHashKey('WEAPON_COMBATPDW'))] = 'Combat PDW', [tostring(GetHashKey('WEAPON_COMBATPISTOL'))] = 'Combat Pistol',
    [tostring(GetHashKey('WEAPON_COMPACTRIFLE'))] = 'Compact Rifle', [tostring(GetHashKey('WEAPON_DBSHOTGUN'))] = 'Double Barrel Shotgun', [tostring(GetHashKey('WEAPON_DOUBLEACTION'))] = 'Double Action Revolver',
    [tostring(GetHashKey('WEAPON_FLAREGUN'))] = 'Flare gun', [tostring(GetHashKey('WEAPON_GUSENBERG'))] = 'Gusenberg', [tostring(GetHashKey('WEAPON_HEAVYPISTOL'))] = 'Heavy Pistol',
    [tostring(GetHashKey('WEAPON_HEAVYSHOTGUN'))] = 'Heavy Shotgun', [tostring(GetHashKey('WEAPON_HEAVYSNIPER'))] = 'Heavy Sniper', [tostring(GetHashKey('WEAPON_HEAVYSNIPER_MK2'))] = 'Heavy Sniper',
    [tostring(GetHashKey('WEAPON_MACHINEPISTOL'))] = 'Machine Pistol', [tostring(GetHashKey('WEAPON_MARKSMANPISTOL'))] = 'Marksman Pistol', [tostring(GetHashKey('WEAPON_MARKSMANRIFLE'))] = 'Marksman Rifle',
    [tostring(GetHashKey('WEAPON_MARKSMANRIFLE_MK2'))] = 'Marksman Rifle Mk2', [tostring(GetHashKey('WEAPON_MG'))] = 'MG', [tostring(GetHashKey('WEAPON_MICROSMG'))] = 'Micro SMG',
    [tostring(GetHashKey('WEAPON_MINIGUN'))] = 'Minigun', [tostring(GetHashKey('WEAPON_MINISMG'))] = 'Mini SMG', [tostring(GetHashKey('WEAPON_MUSKET'))] = 'Musket',
    [tostring(GetHashKey('WEAPON_PISTOL'))] = 'Pistol', [tostring(GetHashKey('WEAPON_PISTOL_MK2'))] = 'Pistol Mk2', [tostring(GetHashKey('WEAPON_PISTOL50'))] = 'Pistol .50',
    [tostring(GetHashKey('WEAPON_PUMPSHOTGUN'))] = 'Pump Shotgun', [tostring(GetHashKey('WEAPON_PUMPSHOTGUN_MK2'))] = 'Pump Shotgun Mk2', [tostring(GetHashKey('WEAPON_RAILGUN'))] = 'Railgun',
    [tostring(GetHashKey('WEAPON_REVOLVER'))] = 'Revolver', [tostring(GetHashKey('WEAPON_REVOLVER_MK2'))] = 'Revolver Mk2', [tostring(GetHashKey('WEAPON_SAWNOFFSHOTGUN'))] = 'Sawnoff Shotgun',
    [tostring(GetHashKey('WEAPON_SMG'))] = 'SMG', [tostring(GetHashKey('WEAPON_SMG_MK2'))] = 'SMG Mk2', [tostring(GetHashKey('WEAPON_SNIPERRIFLE'))] = 'Sniper Rifle',
    [tostring(GetHashKey('WEAPON_SNSPISTOL'))] = 'SNS Pistol', [tostring(GetHashKey('WEAPON_SNSPISTOL_MK2'))] = 'SNS Pistol Mk2', [tostring(GetHashKey('WEAPON_SPECIALCARBINE'))] = 'Special Carbine',
    [tostring(GetHashKey('WEAPON_SPECIALCARBINE_MK2'))] = 'Special Carbine Mk2', [tostring(GetHashKey('WEAPON_STINGER'))] = 'Stinger', [tostring(GetHashKey('WEAPON_STUNGUN'))] = 'Stungun',
    [tostring(GetHashKey('WEAPON_VINTAGEPISTOL'))] = 'Vintage Pistol', [tostring(GetHashKey('VEHICLE_WEAPON_PLAYER_LASER'))] = 'Vehicle Lasers',
    [tostring(GetHashKey('WEAPON_FIRE'))] = 'Fire', [tostring(GetHashKey('WEAPON_FLARE'))] = 'Flare', [tostring(GetHashKey('WEAPON_FLAREGUN'))] = 'Flaregun',
    [tostring(GetHashKey('WEAPON_MOLOTOV'))] = 'Molotov', [tostring(GetHashKey('WEAPON_PETROLCAN'))] = 'Petrol Can', [tostring(GetHashKey('WEAPON_HELI_CRASH'))] = 'Helicopter Crash',
    [tostring(GetHashKey('WEAPON_RAMMED_BY_CAR'))] = 'Rammed by Vehicle', [tostring(GetHashKey('WEAPON_RUN_OVER_BY_CAR'))] = 'Ranover by Vehicle', [tostring(GetHashKey('VEHICLE_WEAPON_SPACE_ROCKET'))] = 'Vehicle Space Rocket',
    [tostring(GetHashKey('VEHICLE_WEAPON_TANK'))] = 'Tank', [tostring(GetHashKey('WEAPON_AIRSTRIKE_ROCKET'))] = 'Airstrike Rocket', [tostring(GetHashKey('WEAPON_AIR_DEFENCE_GUN'))] = 'Air Defence Gun',
    [tostring(GetHashKey('WEAPON_COMPACTLAUNCHER'))] = 'Compact Launcher', [tostring(GetHashKey('WEAPON_EXPLOSION'))] = 'Explosion', [tostring(GetHashKey('WEAPON_FIREWORK'))] = 'Firework',
    [tostring(GetHashKey('WEAPON_GRENADE'))] = 'Grenade', [tostring(GetHashKey('WEAPON_GRENADELAUNCHER'))] = 'Grenade Launcher', [tostring(GetHashKey('WEAPON_HOMINGLAUNCHER'))] = 'Homing Launcher',
    [tostring(GetHashKey('WEAPON_PASSENGER_ROCKET'))] = 'Passenger Rocket', [tostring(GetHashKey('WEAPON_PIPEBOMB'))] = 'Pipe bomb', [tostring(GetHashKey('WEAPON_PROXMINE'))] = 'Proximity Mine',
    [tostring(GetHashKey('WEAPON_RPG'))] = 'RPG', [tostring(GetHashKey('WEAPON_STICKYBOMB'))] = 'Sticky Bomb', [tostring(GetHashKey('WEAPON_VEHICLE_ROCKET'))] = 'Vehicle Rocket',
    [tostring(GetHashKey('WEAPON_BZGAS'))] = 'BZ Gas', [tostring(GetHashKey('WEAPON_FIREEXTINGUISHER'))] = 'Fire Extinguisher', [tostring(GetHashKey('WEAPON_SMOKEGRENADE'))] = 'Smoke Grenade',
    [tostring(GetHashKey('WEAPON_BATTLEAXE'))] = 'Battleaxe', [tostring(GetHashKey('WEAPON_BOTTLE'))] = 'Bottle', [tostring(GetHashKey('WEAPON_KNIFE'))] = 'Knife',
    [tostring(GetHashKey('WEAPON_MACHETE'))] = 'Machete', [tostring(GetHashKey('WEAPON_SWITCHBLADE'))] = 'Switch Blade', [tostring(GetHashKey('OBJECT'))] = 'Object',
    [tostring(GetHashKey('VEHICLE_WEAPON_ROTORS'))] = 'Vehicle Rotors', [tostring(GetHashKey('WEAPON_BALL'))] = 'Ball', [tostring(GetHashKey('WEAPON_BAT'))] = 'Bat',
    [tostring(GetHashKey('WEAPON_CROWBAR'))] = 'Crowbar', [tostring(GetHashKey('WEAPON_FLASHLIGHT'))] = 'Flashlight', [tostring(GetHashKey('WEAPON_GOLFCLUB'))] = 'Golfclub',
    [tostring(GetHashKey('WEAPON_HAMMER'))] = 'Hammer', [tostring(GetHashKey('WEAPON_HATCHET'))] = 'Hatchet', [tostring(GetHashKey('WEAPON_HIT_BY_WATER_CANNON'))] = 'Water Cannon',
    [tostring(GetHashKey('WEAPON_KNUCKLE'))] = 'Knuckle', [tostring(GetHashKey('WEAPON_NIGHTSTICK'))] = 'Night Stick', [tostring(GetHashKey('WEAPON_POOLCUE'))] = 'Pool Cue',
    [tostring(GetHashKey('WEAPON_SNOWBALL'))] = 'Snowball', [tostring(GetHashKey('WEAPON_WRENCH'))] = 'Wrench', [tostring(GetHashKey('WEAPON_DROWNING'))] = 'Drowned',
    [tostring(GetHashKey('WEAPON_DROWNING_IN_VEHICLE'))] = 'Drowned in Vehicle', [tostring(GetHashKey('WEAPON_BARBED_WIRE'))] = 'Barbed Wire', [tostring(GetHashKey('WEAPON_BLEEDING'))] = 'Bleed',
    [tostring(GetHashKey('WEAPON_ELECTRIC_FENCE'))] = 'Electric Fence', [tostring(GetHashKey('WEAPON_EXHAUSTION'))] = 'Exhaustion', [tostring(GetHashKey('WEAPON_FALL'))] = 'Falling'
}

RegisterNetEvent(GlobalState["mri_wall"]..":toggleWall")
RegisterNetEvent('mri_wall:updateWallUsers')
AddEventHandler('mri_wall:updateWallUsers', function(data)
    if wall then
        wall_users = data
    end
end)

-- Initial fetch when wall is toggled
AddEventHandler(GlobalState["mri_wall"]..":toggleWall",function(val)
    wall = val
    if wall then
        QBCore.Functions.Notify("Wall Ativado!", "success")
        -- Initial Fetch
        QBCore.Functions.TriggerCallback('mri_wall:getWallInfos', function(result)
            wall_users = result
        end)
    else
        QBCore.Functions.Notify("Wall Desativado!", "error")
        wall_users = {}
    end
end)

function DrawText3D(x,y,z, text, r,g,b)
    local onScreen,_x,_y=World3dToScreen2d(x,y,z)
    if onScreen then
        SetTextFont(4)
        SetTextProportional(1)
        SetTextScale(0.3, 0.3)
        SetTextColour(r, g, b, 255)
        SetTextEntry("STRING")
        SetTextCentre(1)
        for i = 1, string.len(text), 90 do
            local sub = string.sub(text, i, i + 89)
            AddTextComponentString(sub)
        end
        DrawText(_x,_y)
    end
end


local playersData = {}
local lastCacheUpdate = 0

-- Pre-parse RGB strings into tables to avoid regex in draw loop
local function GetColor(str, default)
    if not str or str == "" then return default end
    local r, g, b = str:match("(%d+),%s*(%d+),%s*(%d+)")
    if r and g and b then
        return {r = tonumber(r), g = tonumber(g), b = tonumber(b)}
    end
    return default
end

Citizen.CreateThread(function()
    while true do
        local sleep = 1000
        if wall then
            sleep = 250 -- Lógica de atualização (4x por segundo)
            local activePlayers = GetActivePlayers()
            local cam = GetGameplayCamCoord()
            
            for _, id in ipairs(activePlayers) do
                if NetworkIsPlayerActive(id) then
                    local src = GetPlayerServerId(id)
                    local srcStr = tostring(src)
                    local ped = GetPlayerPed(id)
                    
                    if ped ~= 0 and wall_users[srcStr] then
                        local coords = GetEntityCoords(ped, true)
                        local dist = #(coords - cam)
                        
                        if dist <= walldistance then
                            local user = wall_users[srcStr]
                            local health = math.floor(GetEntityHealth(ped))
                            local armour = GetPedArmour(ped)
                            local weaponHash = GetSelectedPedWeapon(ped)
                            local model = GetEntityModel(ped)
                            local invisible = not IsEntityVisible(ped)
                            
                            -- Build Text Strings Once
                            local infoText = ("~w~[%s] %s - ~w~%s\n~w~Health:~g~ %d ~w~| Armour:~b~ %d"):format(
                                user.citizenid or "N/A", src, user.name or "N/A", health, armour
                            )
                            
                            local extraText = ""
                            if invisible then extraText = extraText .. "\n~r~INVISÍVEL~w~" end
                            if model ~= 1885233650 and model ~= -1667301416 then
                                extraText = extraText .. "\n~w~Model: ~r~" .. model .. "~w~"
                            end
                            if user.wallstats then extraText = extraText .. "\n~w~[~g~WALL ON~w~]" end
                            if user.found_principals and user.found_principals ~= "" then
                                extraText = extraText .. "\n~w~[Princ: ~y~" .. user.found_principals .. "~w~]"
                            end
                            if armas[tostring(weaponHash)] then
                                extraText = extraText .. ("\n~w~ %s"):format(armas[tostring(weaponHash)]:upper())
                            end
                            
                            -- Determine Color (Pre-calculada)
                            local color
                            if invisible then
                                color = GetColor(user.inv_color, {r=255, g=255, b=0})
                            elseif health < 101 then
                                color = GetColor(user.dead_color, {r=255, g=0, b=0})
                            elseif user.group_color then
                                color = GetColor(user.group_color, {r=0, g=0, b=255})
                            else
                                color = GetColor(user.default_color, {r=0, g=0, b=255})
                            end
                            
                            playersData[src] = {
                                ped = ped,
                                coords = coords,
                                infoText = infoText,
                                extraText = extraText,
                                color = color,
                                visible = true
                            }
                        else
                            playersData[src] = nil
                        end
                    else
                        playersData[src] = nil
                    end
                end
            end
            
            -- Cleanup disconnected players from cache
            for src, _ in pairs(playersData) do
                local playerIdx = GetPlayerFromServerId(src)
                if playerIdx == -1 then playersData[src] = nil end
            end
        else
            playersData = {}
            sleep = 1000
        end
        Wait(sleep)
    end
end)

-- Rendering Thread (High frequency, low logic)
Citizen.CreateThread(function()
    while true do
        local sleep = 1000
        if wall then
            sleep = 0
            local myCoords = GetEntityCoords(PlayerPedId(), true)
            
            for src, data in pairs(playersData) do
                if data.visible then
                    local targetPed = data.ped
                    local targetCoords = GetEntityCoords(targetPed, true) -- Coords must stay in fast thread for smooth movement
                    
                    DrawText3D(targetCoords.x, targetCoords.y, targetCoords.z + 1.2, data.infoText, 255, 255, 255)
                    DrawText3D(targetCoords.x, targetCoords.y, targetCoords.z + 0.8, data.extraText, 255, 255, 255)
                    
                    local c = data.color
                    DrawLine(targetCoords.x, targetCoords.y, targetCoords.z, myCoords.x, myCoords.y, myCoords.z, c.r, c.g, c.b, 255)
                end
            end
        end
        Wait(sleep)
    end
end)

-----------------------------------------------------------------------------------------------------------------------------------------
-- NUI CALLBACKS
-----------------------------------------------------------------------------------------------------------------------------------------

RegisterNUICallback("mri_Qadmin:callback:GetWallSettings", function(_data, cb)
    local results = lib.callback.await('mri_Qadmin:callback:GetWallSettings', false)
    cb(results or {})
end)

RegisterNUICallback("mri_Qadmin:server:SaveWallSetting", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:SaveWallSetting', data.type, data.key, data.value)
    cb('ok')
end)

RegisterNUICallback("mri_Qadmin:server:DeleteWallPrincipalColor", function(data, cb)
    TriggerServerEvent('mri_Qadmin:server:DeleteWallPrincipalColor', data.principal)
    cb('ok')
end)