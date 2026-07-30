Config = Config or {}

Config.Fuel = "cdn-fuel"        -- "ps-fuel", "LegacyFuel", "ox_fuel"
Config.Dealership = "mri"     -- "mri" (for qbx_vehicleshop with stock system) or "none" to disable
Config.OpenPanelPerms = { 'qadmin.open' }
Config.RenewedPhone = false    -- if you use qb-phone from renewed. (multijob)

Config.SupportedLanguages = {
    { id = 'pt-br', label = 'Português (BR)' },
    { id = 'en', label = 'English' },
    { id = 'es', label = 'Español' },
}

-- Key Bindings
Config.Keybindings = true
Config.AdminKey = "0"
Config.NoclipKey = "9"

-- General
Config.PrintLevel = "none" -- "none" | "error" | "warn" | "info" | "verbose" | "debug"
Config.QBCoreAutoSync = true -- Auto-promote players with QBCore 'admin'/'god' to mri_Qadmin 'admin' group
Config.QBNotify = true -- Use QBCore.Functions.Notify for notifications (if false, does not notify)
Config.InternalNotify = true -- Use internal notification system (if false, does not notify)

-- Eventos extras que invalidam o cache de agregados do dashboard (server/dashboard_cache.lua).
-- Os nomes de save do qb-core/qbx_core já vêm registrados por padrão; use isto se
-- o seu core (ou um fork) emitir outro nome ao persistir personagens no banco.
Config.DashboardInvalidateEvents = {}

-- Give Car
Config.DefaultGarage = "Pillbox Garage Parking"
Config.VehicleImages = "" -- Custom URL for vehicle images (e.g. "https://cdn.example.com/vehicles/")
Config.MapBaseUrl = "https://assets.mriqbox.com.br/admin/map/" -- Custom URL for map tiles (GitHub Pages or other CDN)
-- Signaling backend: "fivem-native" | "websocket" (uses mri_Qsignaling / wss URL) | "cloudflare-sfu"
Config.SignalingProvider = "fivem-native"
Config.WebRTCUrl = "wss://YOUR_SERVER_IP:3002" -- used only when SignalingProvider = "websocket" (mri_Qsignaling port 3002)

Config.Actions = {}
Config.PlayerActions = {}
Config.OtherActions = {}

-- ─── Logs ─────────────────────────────────────────────────────────────────────
-- Configure one Discord webhook per category, or a single Fallback for all.
-- Leave as "" to disable that category's Discord forwarding.
Config.Logs = {
    Webhooks = {
        players     = "",   -- bans, kicks, revives, etc.
        bans        = "",   -- ban / unban actions
        inventory   = "",   -- give item, clear inventory, etc.
        vehicles    = "",   -- spawn, delete, admin car, etc.
        money       = "",   -- give/take money
        server      = "",   -- weather, time, announcements
        permissions = "",   -- group / permission changes
        chat        = "",   -- staff chat messages
        system      = "",   -- resource events, system logs
        -- Fallback: receives categories with no specific webhook
        Fallback    = "",
    },
    -- Event fired on other resources when a log is added (leave "" to disable)
    -- e.g. "myResource:onAdminLog"  (must be a server-side event handler)
    ForwardEvent = "",
    -- Fivemanage (https://fivemanage.com) — send logs out, and optionally read
    -- history back from them instead of the local database.
    Fivemanage = {
        -- Logs token from the Fivemanage dashboard. A Media/Files token is
        -- rejected with "invalid token type" on every log endpoint.
        Token   = "",
        -- Master switch for the 'fm' destination (AND'ed with per-category flags)
        Enabled = false,
        -- Mirror mode: the panel reads history from Fivemanage instead of MySQL.
        -- Requires Enabled + Token. The live feed keeps coming from memory.
        Mirror  = false,
        -- Optional dataset name. Must already exist in the Fivemanage dashboard —
        -- ingesting into an unknown dataset fails the whole batch. Leave "" for default.
        Dataset = "",
    },
    -- Persist logs to the database
    DBEnabled = true,
    -- Max in-memory buffer (most recent N logs kept for instant panel display)
    MaxMemory = 500,
    -- Per-resource destination overrides (AND logic with category settings).
    -- ResourceMode: 'blacklist' — unlisted resources pass through; 'whitelist' — only listed resources are processed.
    ResourceMode    = 'blacklist',
    -- e.g. { name = 'my_resource', db = true, discord = false, relay = true }
    ResourceEntries = {},
    -- Categories shown in the panel and routed to Discord webhooks.
    -- id must match the category string used in AddLog calls.
    -- Managed at runtime via the Logs settings panel; overridden by logs_settings.json if present.
    Categories = {
        { id = 'players',     label = '👤 Players'    },
        { id = 'bans',        label = '🔨 Bans'        },
        { id = 'inventory',   label = '🎒 Inventário'  },
        { id = 'vehicles',    label = '🚗 Veículos'    },
        { id = 'money',       label = '💰 Dinheiro'    },
        { id = 'server',      label = '⚙️ Servidor'    },
        { id = 'permissions', label = '🛡️ Permissões'  },
        { id = 'chat',        label = '💬 Chat'         },
        { id = 'system',      label = '🖥️ Sistema'     },
    },
}

Config.Descriptions = {
    Fuel              = "settings.desc.Fuel",
    Dealership        = "settings.desc.Dealership",
    RenewedPhone      = "settings.desc.RenewedPhone",
    AdminKey          = "settings.desc.AdminKey",
    NoclipKey         = "settings.desc.NoclipKey",
    Debug             = "settings.desc.Debug",
    QBCoreAutoSync    = "settings.desc.QBCoreAutoSync",
    DefaultGarage     = "settings.desc.DefaultGarage",
    VehicleImages     = "settings.desc.VehicleImages",
    MapBaseUrl        = "settings.desc.MapBaseUrl",
    SignalingProvider = "settings.desc.SignalingProvider",
    WebRTCUrl         = "settings.desc.WebRTCUrl",
    Keybindings       = "settings.desc.Keybindings",
    PrintLevel        = "settings.desc.PrintLevel",
    QBNotify          = "settings.desc.QBNotify",
    InternalNotify    = "settings.desc.InternalNotify",
}

Config.Options = {
    Fuel = {
        { label = "cdn-fuel",     value = "cdn-fuel"     },
        { label = "ps-fuel",      value = "ps-fuel"      },
        { label = "LegacyFuel",   value = "LegacyFuel"   },
        { label = "ox_fuel",      value = "ox_fuel"      },
    },
    Dealership = {
        { label = "mri",                          value = "mri"              },
        { label = "ps-dealerships",               value = "ps-dealerships"   },
        { label = "settings.option.none_disabled", value = "none"            },
    },
    SignalingProvider = {
        { label = "settings.option.fivem_native",  value = "fivem-native"   },
        { label = "settings.option.websocket",     value = "websocket"      },
        { label = "settings.option.cloudflare_sfu", value = "cloudflare-sfu" },
    },
    PrintLevel = {
        { label = "settings.option.none_disabled", value = "none"    },
        { label = "settings.option.error",         value = "error"   },
        { label = "settings.option.warn",          value = "warn"    },
        { label = "settings.option.info",          value = "info"    },
        { label = "settings.option.verbose",       value = "verbose" },
        { label = "settings.option.debug",         value = "debug"   },
    },
}

Config.Inventory = 'qb-inventory' -- Default

local function DetectInventory()
    if GetResourceState('ox_inventory') == 'started' then
        Config.Inventory = 'ox_inventory'
    elseif GetResourceState('ps-inventory') == 'started' then
        Config.Inventory = 'ps-inventory'
    elseif GetResourceState('lj-inventory') == 'started' then
        Config.Inventory = 'lj-inventory'
    elseif GetResourceState('qb-inventory') == 'started' then
        Config.Inventory = 'qb-inventory'
    end
end

AddEventHandler("onResourceStart", function(resource)
    if resource == 'ox_inventory' or resource == 'ps-inventory' or resource == 'lj-inventory' or resource == 'qb-inventory' or resource == GetCurrentResourceName() then
        DetectInventory()
    end
end)

-- Initial check
CreateThread(function()
    Wait(500)
    DetectInventory()
end)


--- Imprime mensagem de debug no console, respeitando o nível de log configurado.
--- @param msgLevel string|nil
--- @param args any|nil
function Debug(msgLevel, ...)
    if not Config.PrintLevel then return end
    if Config.PrintLevel == "none" then return end
    lib.print[msgLevel](...)
end

function Notify(src, message, mType)
    if Config.QBNotify then
        local QBCore = exports['qb-core']:GetCoreObject()
        QBCore.Functions.Notify(src, message, mType)
    end
    if Config.InternalNotify then
        TriggerClientEvent('mri_Qadmin:client:notify', src, message, mType)
    end
end
