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
Config.Debug = false -- Set to true to enable debug prints

-- Give Car
Config.DefaultGarage = "Pillbox Garage Parking"
Config.VehicleImages = "" -- Custom URL for vehicle images (e.g. "https://cdn.example.com/vehicles/")
-- Signaling backend: "fivem-native" | "websocket" (uses mri_Qsignaling / wss URL) | "cloudflare-sfu"
Config.SignalingProvider = "fivem-native"
Config.WebRTCUrl = "wss://YOUR_SERVER_IP:3002" -- used only when SignalingProvider = "websocket" (mri_Qsignaling port 3002)

Config.Actions = {}
Config.PlayerActions = {}
Config.OtherActions = {}

Config.Descriptions = {
    Fuel = "Define o sistema de combustível utilizado pelos veículos gerenciados no painel (ex: cdn-fuel, ox_fuel).",
    Dealership = "Sistema de concessionária integrado para checar o estoque antes de gerar veículos (ex: mri, ps-dealerships).",
    RenewedPhone = "Mude para true se utilizar o qb-phone Renewed (suporte a multijob).",
    AdminKey = "Tecla de atalho primária para abrir o menu admin (ex: 0, F8).",
    NoclipKey = "Tecla de atalho rápido para ativar Noclip no servidor (ex: 9, INSERT).",
    Debug = "Ativa logs detalhados (Prints) de rastreamento no console F8 e na janela TxAdmin/Servidor.",
    DefaultGarage = "Nome exato da garagem padrão (DB) usada quando carros são 'dados' e salvos a um jogador na aba de Doar.",
    VehicleImages = "Caso use imagens customizadas no seu Frontend de Inventário, defina a URL inteira aqui. Deixar vazio puxa do docs.fivem (webRTC local).",
    SignalingProvider = "Backend do webrtc. 'fivem-native' (sem servidor externo), 'websocket' (requer nodeJS mri_Qsignaling rodando) ou 'cloudflare-sfu'.",
    WebRTCUrl = "Endpoint obrigatório caso o SignalingProvider esteja como 'websocket'. Geralmente é wss://seu-ip:porta.",
    Keybindings = "Permitir ou proibir que as teclas configuradas abram o painel. Se false, só abrirá via comandos (/adm)."
}

Config.Options = {
    Fuel = {
        { label = "cdn-fuel", value = "cdn-fuel" },
        { label = "ps-fuel", value = "ps-fuel" },
        { label = "LegacyFuel", value = "LegacyFuel" },
        { label = "ox_fuel", value = "ox_fuel" }
    },
    Dealership = {
        { label = "mri", value = "mri" },
        { label = "ps-dealerships", value = "ps-dealerships" },
        { label = "Nenhum (Desativado)", value = "none" }
    },
    SignalingProvider = {
        { label = "FiveM Native (Mais Simples)", value = "fivem-native" },
        { label = "Websocket (Externo compatível com HTTPS)", value = "websocket" },
        { label = "Cloudflare SFU (BETA)", value = "cloudflare-sfu" }
    }
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
