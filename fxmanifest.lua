fx_version "cerulean"
game "gta5"
lua54 "yes"
use_experimental_fxv2_oal "yes"

description "Admin Panel for QbCore and Qbox"
author "MRI Qbox Team"
version "1.0.6"

ox_lib "locale"

shared_scripts {
    "@ox_lib/init.lua",
    "shared/**/*.lua",
}

server_scripts {
    "@oxmysql/lib/MySQL.lua",
    "server/main.lua",
    "server/utils.lua",
    "server/chat.lua",
    "server/commands.lua",
    "server/db.lua",
    "server/groups.lua",
    "server/inventory.lua",
    "server/items.lua",
    "server/locations.lua",
    "server/misc.lua",
    "server/peds.lua",
    "server/permissions.lua",
    "server/settings.lua",
    "server/actions.lua",
    "server/players.lua",
    "server/resources.lua",
    "server/server_data.lua",
    "server/spectate.lua",
    "server/teleport.lua",
    "server/trolls.lua",
    "server/vehicle.lua",
    "server/wall.lua",
    "server/key_manager.lua",
    "server/tickets.lua",
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
    "client/tickets.lua",
}

dependencies {
    "ox_lib",
    "oxmysql"
}


files {
    "web/build/**",
    "web/build/map/tiles/**/*",
    "data/ped.lua",
    "data/object.lua",
    "locales/*.json",
}

ui_page "web/build/index.html"
