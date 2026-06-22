fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_experimental_fxv2_oal "yes"

description "Admin Panel for QbCore and Qbox"
author "MRI Qbox Team"
version "__VERSION__"

ox_lib "locale"

shared_scripts {
    "@ox_lib/init.lua",
    "shared/**/*.lua",
    "data/weapons.lua",
    "data/ped.lua",
}

server_scripts {
    "@oxmysql/lib/MySQL.lua",
    "server/db.lua",
    "server/main.lua",
    "server/utils.lua",
    "server/logs.lua",
    "server/chat.lua",
    "server/commands.lua",
    "server/groups.lua",
    "server/inventory.lua",
    "server/inventory_callback.lua",
    "server/items.lua",
    "server/locations.lua",
    "server/misc.lua",
    "server/peds.lua",
    "server/permissions.lua",
    "server/settings.lua",
    "server/actions.lua",
    "server/players.lua",
    "server/resource_fs.js",
    "server/resources.lua",
    "server/server_data.lua",
    "server/spectate.lua",
    "server/teleport.lua",
    "server/trolls.lua",
    "server/vehicle.lua",
    "server/wall.lua",
    "server/vip.lua",
    "server/key_manager.lua",
    "server/webrtc.lua",
    "server/updates.lua",
    "server/data_sync.lua",
    "server/plugins.lua",
}

client_scripts {
    "client/main.lua",
    "client/utils.lua",
    "client/data.lua",
    "client/chat.lua",
    "client/inventory.lua",
    "client/misc.lua",
    "client/noclip.lua",
    "client/players.lua",
    "client/spectate.lua",
    "client/teleport.lua",
    "client/toggle_laser.lua",
    "client/troll.lua",
    "client/vehicles.lua",
    "client/wall.lua",
    "client/world.lua",
    "client/key_capture.lua",
    "client/nearby_scanner.lua",
    "client/vip.lua",
    "client/logs.lua",
    "client/webrtc.lua",
    "client/plugins.lua",
}

dependencies {
    "ox_lib",
    "oxmysql"
}

exports {
    "HasPerms",
    "CheckPerms",
    "IsPlayerInPrincipal",
    "GeneratePlate",
    "GetActions",    -- server
    "AddLog",        -- server: exports['mri_Qadmin']:AddLog(resource, category, level, message, data)
    "ToggleUI",      -- client
    "OpenUI",        -- client
    "IsMenuVisible", -- client
}


files {
    "web/build/**",
    "web/build/map/tiles/**/*",
    "data/ped.lua",
    "data/object.lua",
    "data/default_actions.lua",
    "data/weapons.lua",
    "locales/*.json",
}

ui_page "web/build/index.html"


