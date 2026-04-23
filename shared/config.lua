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
Config.Debug = true -- Set to true to enable debug prints

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
    DefaultGarage     = "settings.desc.DefaultGarage",
    VehicleImages     = "settings.desc.VehicleImages",
    MapBaseUrl        = "settings.desc.MapBaseUrl",
    SignalingProvider = "settings.desc.SignalingProvider",
    WebRTCUrl         = "settings.desc.WebRTCUrl",
    Keybindings       = "settings.desc.Keybindings",
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

function Debug(...)
    if not Config.Debug then return end

    if IsDuplicityVersion() then
        -- Server Side Print (TxAdmin / Console)
        lib.print.info(...)
    else
        -- Client Side Print (F8)
        print('[mri_Qadmin DEBUG]', ...)
    end
end
