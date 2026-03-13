-- Global configuration for Luacheck
-- Documentation: https://luacheck.readthedocs.io/en/stable/config.html

-- Standard libraries and FiveM/QBCore globals
globals = {
    -- FiveM / CitizenFX Core
    "Citizen", "GetHashKey", "Wait", "CreateThread", "SetTimeout",
    "RegisterNetEvent", "TriggerEvent", "TriggerClientEvent", "TriggerServerEvent",
    "AddEventHandler", "RegisterNUICallback", "SendNUIMessage", "exports",
    "GetConvar", "GetConvarInt", "GetResourceState", "GetParentResourceName",
    "GetNumResources", "GetResourceInfo", "IsAceAllowed",
    "GlobalState", "Entity", "Player", "LocalPlayer", "lib", "cache", "source",
    "joaat", "promise", "PerformHttpRequest", "vec", "vec2", "vec3", "vec4",
    "quat", "mat2", "mat3", "mat4",

    -- Commonly used natives
    "GetPlayerPed", "GetEntityCoords", "GetEntityHeading", "GetEntityHealth", "GetPedArmour",
    "SetEntityCoords", "SetEntityHeading", "GetPlayerRoutingBucket", "GetPlayerPing",
    "NetworkIsPlayerActive", "NetworkIsPlayerConnected", "json", "MySQL", "allJobs", "allGangs",
    "PlayerPedId", "PlayerId", "GetPlayerServerId", "GetPlayerFromServerId",
    "SetEntityVisible", "SetPlayerInvincible", "GetAmmoInPedWeapon", "SetAmmoInClip",
    "SetPedInfiniteAmmo", "RefillAmmoInstantly", "GetSelectedPedWeapon", "SetPedAmmo",
    "SetPlayerModel", "SetPedDefaultComponentVariation", "SetModelAsNoLongerNeeded",
    "HudWeaponWheelIgnoreSelection", "DisableAllControlActions", "EnableControlAction",
    "GetEntityRotation", "CreateCameraWithParams", "SetCamActive", "RenderScriptCams",
    "AttachCamToEntity", "SetGameplayCamRelativeHeading", "DetachEntity", "DestroyCam",
    "GetControlNormal", "GetCamRot", "SetCamRot", "RequestCollisionAtCoord",
    "FreezeEntityPosition", "SetEntityCollision", "SetEntityAlpha", "ResetEntityAlpha",
    "SetLocalPlayerVisibleLocally", "SetEveryoneIgnorePlayer", "SetPoliceIgnorePlayer",
    "SetEntityInvincible", "GetGroundZFor_3dCoord", "StartShapeTestRay", "GetShapeTestResult",
    "IsDisabledControlJustReleased", "SetEntityCoordsNoOffset", "IsPauseMenuActive",
    "DoesBlipExist", "RemoveBlip", "SetMpGamerTagVisibility", "RemoveMpGamerTag",
    "GetBlipFromEntity", "CreateFakeMpGamerTag", "SetMpGamerTagAlpha", "SetMpGamerTagHealthBarColour",
    "NetworkIsPlayerTalking", "GetPlayerInvincible", "AddBlipForEntity", "ShowHeadingIndicatorOnBlip",
    "SetBlipCategory", "GetEntityModel", "SetBlipSprite", "GetVehicleNumberOfPassengers",
    "IsVehicleSeatFree", "ShowNumberOnBlip", "HideNumberOnBlip", "SetBlipRotation",
    "SetBlipNameToPlayerName", "SetBlipScale", "Vdist", "SetBlipAlpha", "RequestScaleformMovie",
    "HasScaleformMovieLoaded", "BeginScaleformMovieMethod", "EndScaleformMovieMethod",
    "ScaleformMovieMethodAddParamInt", "ScaleformMovieMethodAddParamPlayerNameString",
    "GetControlInstructionalButton", "NetworkIsInSpectatorMode", "NetworkSetInSpectatorMode",
    "SetScaleformMovieAsNoLongerNeeded", "DrawScaleformMovieFullscreen", "IsControlJustPressed",
    "SetPedCoordsKeepVehicle", "GetModelDimensions", "GetEntityMatrix", "DrawLine",
    "GetGameplayCamRot", "GetGameplayCamCoord", "IsEntityAVehicle", "IsEntityAPed",
    "IsEntityAnObject", "SetEntityAsMissionEntity", "DeleteEntity", "DrawMarker",
    "StartEntityFire", "StopEntityFire", "AddExplosion", "PlaySoundFrontend",
    "SetPedMotionBlur", "SetPedMovementClipset", "SetPedIsDrunk", "ShakeGameplayCam",
    "SetPedMoveRateOverride", "SetRunSprintMultiplierForPlayer", "ResetPedMovementClipset",
    "SetTimecycleModifierStrength", "IsModelValid", "DeleteVehicle", "CreateVehicle",
    "TaskWarpPedIntoVehicle", "GetVehicleNumberPlateText", "SetVehicleNumberPlateText",
    "VehToNet", "SetVehicleModKit", "ToggleVehicleMod", "SetVehicleFixed", "GetNumVehicleMods",
    "SetVehicleMod", "NetToVeh", "GetOffsetFromEntityInWorldCoords", "World3dToScreen2d",
    "GetGameplayCamCoords", "GetDistanceBetweenCoords", "GetGameplayCamFov", "SetTextFont",
    "SetTextProportional", "SetTextScale", "SetTextColour", "SetTextEntry", "SetTextCentre",
    "AddTextComponentString", "DrawText", "GetActivePlayers", "IsEntityVisible",
    "LoadResourceFile", "GetCurrentResourceName", "SetNuiFocus", "ExecuteCommand",
    "GetGameTimer", "GetResourcePath", "IsPlayerAceAllowed", "GetRegisteredCommands",
    "DropPlayer", "SetPlayerRoutingBucket", "IsPrincipalAceAllowed", "IsDuplicityVersion",
    "AddStateBagChangeHandler", "GetResourceMetadata", "GetResourceByFindIndex",
    "StartResource", "StopResource", "SetPedArmour", "joaat",

    -- Framework / Custom globals
    "QBCore", "Config", "locale", "_U", "Debug", "CheckPerms", "CheckDataFromKey",
    "GetValue", "PlayerData", "GetCoreData", "GetData", "ToggleUI", "Log",
    "broadcastMoneyUpdate", "IsPlayerInPrincipal", "CheckAlreadyPlate",
    "RGBToHex", "CheckRoutingbucket", "GetPlayerESPColor", "DrawText3D"
}

-- Global ignores
ignore = {
    "212", -- unused argument, unless it starts with underscore
    "611", -- line contains only whitespace
    "631", -- line is too long
}

-- Allow unused arguments if they start with underscore
unused_args = true

-- Files to exclude
exclude_files = {
    "web/**",
    ".git/**",
    "node_modules/**"
}

-- Path specific configurations
files["server/*.lua"] = {
    globals = { "MySQL" }
}

files["fxmanifest.lua"] = {
    globals = {
        "fx_version", "game", "lua54", "use_experimental_fxv2_oal",
        "description", "author", "version", "ox_lib", "shared_scripts",
        "server_scripts", "client_scripts", "dependencies", "files", "ui_page"
    }
}
