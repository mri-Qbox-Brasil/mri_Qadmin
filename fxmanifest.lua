fx_version "cerulean"
game "gta5"
lua54 "yes"
use_experimental_fxv2_oal "yes"

description "Admin Panel for QbCore and Qbox"
author "MRI Qbox Team"
version "1.0.0"

ox_lib "locale"

shared_scripts {
    "@ox_lib/init.lua",
    "shared/**/*.lua",
}

server_scripts {
    "@oxmysql/lib/MySQL.lua",
    "server/**/*.lua",
}

client_scripts {
    "client/main.lua",
    "client/**/*.lua",
}

dependencies {
    "ox_lib",
    "oxmysql",
}

files {
    "web/build/**",
    "data/ped.lua",
    "data/object.lua",
    "locales/*.json",
}

ui_page "web/build/index.html"
