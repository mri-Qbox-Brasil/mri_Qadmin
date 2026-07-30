fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_experimental_fxv2_oal "yes"

description "Admin Panel for QbCore and Qbox"
author "MRI Qbox Team"
version "1.21.0"

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
    "server/dashboard_cache.lua",
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
    "client/notify.lua",
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
    -- default_actions é lido via LoadResourceFile (server/actions.lua), por isso
    -- precisa estar em files{}. ped.lua/weapons.lua já rodam como shared_scripts
    -- (definem os globais Peds/Weapons), então não são duplicados aqui.
    "data/default_actions.lua",
    -- object.lua NÃO é shared_script: é um módulo (`return { [hash] = nome }`) carregado no
    -- cliente via `require "data.object"` (nearby_scanner.lua, toggle_laser.lua). O require do
    -- ox_lib usa LoadResourceFile, então o arquivo precisa estar aqui para chegar ao cliente.
    "data/object.lua",
    "locales/*.json",
}

ui_page "web/build/index.html"


