Config = Config or {}

Config.Fuel = "cdn-fuel"        -- "ps-fuel", "LegacyFuel", "ox_fuel"
Config.Dealership = "mri"     -- "mri" (for qbx_vehicleshop with stock system) or "none" to disable
Config.ResourcePerms = 'admin' -- permission to control resource(start stop restart)
Config.ShowCommandsPerms = 'admin' -- permission to show all commands
Config.OpenPanelPerms = { 'qadmin.open', 'admin' }
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
Config.LiveVideoMethod = "webrtc" -- "screenshot" (Chunked/Resize) or "webrtc" (External Server)
Config.WebRTCUrl = "wss://ws.gf2.in" -- Set to "wss://ws.gf2.in" for Productiont

Config.Actions = {
    ["admin_car"] = {
        label = "Admin Car",
        type = "client",
        event = "mri_Qadmin:client:Admincar",
        perms = "qadmin.action.admin_car",
    },

    ["ban_player"] = {
        label = "Banir Jogador",
        perms = "qadmin.action.ban_player",
        dropdown = {
            { label = "Player", option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Reason", option = "text" },
            {
                label = "Duração",
                option = "dropdown",
                data = {
                    { label = "Permanente",  value = "2147483647" },
                    { label = "10 Minutos", value = "600" },
                    { label = "30 Minutos", value = "1800" },
                    { label = "1 Hora",     value = "3600" },
                    { label = "6 Horas",    value = "21600" },
                    { label = "12 Horas",   value = "43200" },
                    { label = "1 Dia",      value = "86400" },
                    { label = "3 Dias",     value = "259200" },
                    { label = "1 Semana",   value = "604800" },
                    { label = "3 Semanas",  value = "1814400" },
                },
            },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:BanPlayer" },
        },
    },

    ["bring_player"] = {
        label = "Puxar Jogador",
        perms = "qadmin.action.bring_player",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:BringPlayer" },
        },
    },

    ["change_weather"] = {
        label = "Alterar Clima",
        perms = "qadmin.action.change_weather",
        dropdown = {
            {
                label = "Weather",
                option = "dropdown",
                data = {
                    { label = "Extraensolarado", value = "Extrasunny" },
                    { label = "Limpo",      value = "Clear" },
                    { label = "Neutro",     value = "Neutral" },
                    { label = "Nevoeiro",   value = "Smog" },
                    { label = "Neblina",    value = "Foggy" },
                    { label = "Nublado",    value = "Overcast" },
                    { label = "Nuvens",     value = "Clouds" },
                    { label = "Limpeza",    value = "Clearing" },
                    { label = "Chuva",      value = "Rain" },
                    { label = "Trovão",     value = "Thunder" },
                    { label = "Neve",       value = "Snow" },
                    { label = "Tempestade de Neve", value = "Blizzard" },
                    { label = "Neve Leve",  value = "Snowlight" },
                    { label = "Natal",      value = "Xmas" },
                    { label = "Halloween",  value = "Halloween" },
                },
            },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:ChangeWeather" },
        },
    },

    ["change_time"] = {
        label = "Alterar Horário",
        perms = "qadmin.action.change_time",
        dropdown = {
            {
                label = "Time Events",
                option = "dropdown",
                data = {
                    { label = "Amanhecer", value = "06" },
                    { label = "Manhã", value = "09" },
                    { label = "Meio-dia",    value = "12" },
                    { label = "Pôr do Sol",  value = "21" },
                    { label = "Entardecer", value = "22" },
                    { label = "Noite",   value = "24" },
                },
            },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:ChangeTime" },
        },
    },

    ["change_plate"] = {
        label = "Alterar Placa",
        perms = "qadmin.action.change_plate",
        dropdown = {
            { label = "Plate",   option = "text" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:ChangePlate" },
        },
    },

    ["clear_inventory"] = {
        label = "Limpar Inventário",
        perms = "qadmin.action.clear_inventory",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:ClearInventory" },
        },
    },

    ["clear_inventory_offline"] = {
        label = "Limpar Inventário Offline",
        perms = "qadmin.action.clear_inventory_offline",
        dropdown = {
            { label = "Citizen ID", option = "text", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:ClearInventoryOffline" },
        },
    },

    ["clothing_menu"] = {
        label = "Dar Menu de Roupas",
        perms = "qadmin.action.clothing_menu",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:ClothingMenu" },
        },
    },

    ["set_ped"] = {
        label = "Definir Ped",
        perms = "qadmin.action.set_ped",
        dropdown = {
            { label = "Player",     option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Ped Models", option = "dropdown", data = "pedlist" },
            { label = "Confirmar",    option = "button", type = "server", event = "mri_Qadmin:server:setPed" },
        },
    },

    ["copy_coords"] = {
        label = "Copiar Coordenadas",
        perms = "apprentice",
        dropdown = {
            {
                label = "Copy Coords",
                option = "dropdown",
                data = {
                    { label = "Copiar Vector2", value = "vector2" },
                    { label = "Copiar Vector3", value = "vector3" },
                    { label = "Copiar Vector4", value = "vector4" },
                    { label = "Copiar Direção", value = "heading" },
                },
            },
            { label = "Copiar para Área de Transferência", option = "button", type = "client", event = "mri_Qadmin:client:copyToClipboard"},
        },
    },

    ["delete_vehicle"] = {
        label = "Deletar Veículo",
        type = "command",
        event = "dv",
        perms = "qadmin.action.delete_vehicle",
    },

    ["freeze_player"] = {
        label = "Congelar Jogador",
        perms = "qadmin.action.freeze_player",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:FreezePlayer" },
        },
    },

    ["kill_player"] = {
        label = "Matar Jogador",
        perms = "qadmin.action.kill_player",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:KillPlayer" },
        },
    },

    ["drunk_player"] = {
        label = "Deixar Jogador Bêbado",
        perms = "qadmin.action.drunk_player",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:DrunkPlayer" },
        },
    },

    ["remove_stress"] = {
        label = "Remover Estresse",
        perms = "qadmin.action.remove_stress",
        dropdown = {
            { label = "Jogador (Opcional)", option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar",           option = "button", type = "server", event = "mri_Qadmin:server:RemoveStress" },
        },
    },

    ["set_ammo"] = {
        label = "Definir Munição",
        perms = "qadmin.action.set_ammo",
        dropdown = {
            { label = "Quantidade de Munição", option = "text" },
            { label = "Confirmar",      option = "button", type = "client", event = "mri_Qadmin:client:SetAmmo" },
        },
    },

    ["god_mode"] = {
        label = "Modo Deus",
        type = "client",
        event = "mri_Qadmin:client:ToggleGodmode",
        perms = "qadmin.action.god_mode",
    },

    ["give_car"] = {
        label = "Dar Carro",
        perms = "qadmin.action.give_car",
        dropdown = {
            { label = "Vehicle",           option = "dropdown", data = "vehicles", valueField = "model", labelField = "name" },
            { label = "Player",            option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Placa (Opcional)",  option = "text" },
            { label = "Garagem (Opcional)", option = "text" },
            { label = "Confirmar",           option = "button", type = "server", event = "mri_Qadmin:server:givecar" },
        }
    },

    ["invisible"] = {
        label = "Invisível",
        type = "client",
        event = "mri_Qadmin:client:ToggleInvisible",
        perms = "qadmin.action.invisible",
    },

    ["blackout"] = {
        label = "Ativar/Desativar Queda de Energia",
        type = "server",
        event = "mri_Qadmin:server:ToggleBlackout",
        perms = "qadmin.action.blackout",
    },

    ["toggle_duty"] = {
        label = "Ativar/Desativar Serviço",
        type = "server",
        event = "QBCore:ToggleDuty",
        perms = "qadmin.action.toggle_duty",
    },

    ["toggle_laser"] = {
        label = "Ativar/Desativar Laser",
        type = "client",
        event = "mri_Qadmin:client:ToggleLaser",
        perms = "qadmin.action.toggle_laser",
    },

    -- ["set_perms"] = {
    --     label = "Definir Permissões",
    --     perms = "mod",
    --     dropdown = {
    --         { label = "Player",  option = "dropdown", data = "players" },
    --         {
    --             label = "Permissões",
    --             option = "dropdown",
    --             data = {
    --                 { label = "Moderador", value = "mod" },
    --                 { label = "Administrador", value = "admin" },
    --                 { label = "Deus", value = "god" },
    --             },
    --         },
    --         { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:SetPerms" },
    --     },
    -- },

    ["set_bucket"] = {
        label = "Definir Bucket de Roteamento",
        perms = "qadmin.action.set_bucket",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Bucket",  option = "text" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:SetBucket" },
        },
    },

    ["get_bucket"] = {
        label = "Obter Bucket de Roteamento",
        perms = "qadmin.action.get_bucket",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:GetBucket" },
        },
    },

    ["mute_player"] = {
        label = "Silenciar Jogador",
        perms = "qadmin.action.mute_player",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:MutePlayer" },
        },
    },

    ["noclip"] = {
        label = "Noclip",
        type = "client",
        event = "mri_Qadmin:client:ToggleNoClip",
        perms = "qadmin.action.noclip",
    },

    ["open_inventory"] = {
        label = "Abrir Inventário",
        perms = "qadmin.action.open_inventory",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:openInventory" },
        },
    },

    ["open_stash"] = {
        label = "Abrir Depósito",
        perms = "qadmin.action.open_stash",
        dropdown = {
            { label = "Stash",   option = "text" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:openStash" },
        },
    },

    ["open_trunk"] = {
        label = "Abrir Porta-malas",
        perms = "qadmin.action.open_trunk",
        dropdown = {
            { label = "Plate",   option = "text" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:openTrunk" },
        },
    },

    ["change_vehicle_state"] = {
        label = "Definir Estado do Veículo na Garagem",
        perms = "qadmin.action.change_vehicle_state",
        dropdown = {
            { label = "Plate",   option = "text" },
            {
                label = "Estado",
                option = "dropdown",
                data = {
                    { label = "Dentro",  value = "1" },
                    { label = "Fora", value = "0" },
                },
            },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:SetVehicleState" },
        },
    },

    ["revive_all"] = {
        label = "Reviver Todos",
        type = "server",
        event = "mri_Qadmin:server:ReviveAll",
        perms = "qadmin.action.revive",
    },

    ["revive_player"] = {
        label = "Reviver Jogador",
        perms = "qadmin.action.revive",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:Revive" },
        },
    },

    ["revive_radius"] = {
        label = "Reviver Raio",
        type = "server",
        event = "mri_Qadmin:server:ReviveRadius",
        perms = "qadmin.action.revive",
    },

    ["refuel_vehicle"] = {
        label = "Reabastecer Veículo",
        type = "client",
        event = "mri_Qadmin:client:RefuelVehicle",
        perms = "qadmin.action.refuel_vehicle",
    },

    ["set_job"] = {
        label = "Definir Emprego",
        perms = "qadmin.action.set_job",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Job", option = "dropdown", data = "jobs", valueField = "name", labelField = "label" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:SetJob" },
        },
    },

    ["fire_job"] = {
        label = "Demitir do Emprego",
        perms = "qadmin.action.fire_job",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            {
                label = "Job",
                option = "dropdown",
                valueField = "name",
                labelField = "label",
                data = {
                    { label = "Desempregado",      value = "unemployed" },
                },
            },
            {
                label = "Grade",
                option = "dropdown",
                data = {
                    { label = "Civil",      value = 0 },
                },
            },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:SetJob" },
        },
    },

    ["fire_gang"] = {
        label = "Demitir da Gangue",
        perms = "qadmin.action.fire_gang",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            {
                label = "Gang",
                option = "dropdown",
                valueField = "name",
                labelField = "label",
                data = {
                    { label = "Sem gangue",      value = "none" },
                },
            },
            {
                label = "Grade",
                option = "dropdown",
                data = {
                    { label = "Civil",      value = 0 },
                },
            },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:SetGang" },
        },
    },

    ["set_gang"] = {
        label = "Definir Gangue",
        perms = "qadmin.action.set_gang",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Gang",    option = "dropdown", data = "gangs", valueField = "name", labelField = "label" },
            { label = "Confirmar", option = "button",   type = "client", event = "mri_Qadmin:client:SetGang" },
        },
    },

    ["give_money"] = {
        label = "Dar Dinheiro",
        perms = "qadmin.action.give_money",
        dropdown = {
            { label = "Player", option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Amount", option = "text" },
            {
                label = "Type",
                option = "dropdown",
                data = {
                    { label = "Dinheiro",   value = "cash" },
                    { label = "Banco",   value = "bank" },
                    { label = "Cripto", value = "crypto" },
                },
            },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:GiveMoney" },
        },
    },

    ["give_money_all"] = {
        label = "Dar Dinheiro para Todos",
        perms = "qadmin.action.give_money_all",
        dropdown = {
            { label = "Amount",  option = "text" },
            {
                label = "Type",
                option = "dropdown",
                data = {
                    { label = "Dinheiro",   value = "cash" },
                    { label = "Banco",   value = "bank" },
                    { label = "Cripto", value = "crypto" },
                },
            },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:GiveMoneyAll" },
        },
    },

    ["remove_money"] = {
        label = "Remover Dinheiro",
        perms = "qadmin.action.remove_money",
        dropdown = {
            { label = "Player", option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Amount", option = "text" },
            {
                label = "Type",
                option = "dropdown",
                data = {
                    { label = "Dinheiro", value = "cash" },
                    { label = "Banco", value = "bank" },
                },
            },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:TakeMoney" },
        },
    },

    ["give_item"] = {
        label = "Dar Item",
        perms = "qadmin.action.give_item",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Item",    option = "dropdown", data = "items", valueField = "item", labelField = "name" },
            { label = "Amount",  option = "text" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:GiveItem" },
        },
    },

    ["give_item_all"] = {
        label = "Dar Item para Todos",
        perms = "qadmin.action.give_item_all",
        dropdown = {
            { label = "Item",    option = "dropdown", data = "items", valueField = "item", labelField = "name" },
            { label = "Amount",  option = "text" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:GiveItemAll" },
        },
    },

    ["spawn_vehicle"] = {
        label = "Gerar Veículo",
        perms = "qadmin.action.spawn_vehicle",
        dropdown = {
            { label = "Vehicle", option = "dropdown", data = "vehicles", valueField = "model", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "client",  event = "mri_Qadmin:client:SpawnVehicle" },
        },
    },

    ["fix_vehicle"] = {
        label = "Consertar Veículo",
        type = "command",
        event = "fix",
        perms = "qadmin.action.fix_vehicle",
    },

    ["fix_vehicle_for"] = {
        label = "Consertar Veículo para jogador",
        perms = "qadmin.action.fix_vehicle_for",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:FixVehFor" },
        },
    },

    ["spectate_player"] = {
        label = "Espectar Jogador",
        perms = "qadmin.action.spectate_player",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:SpectateTarget" },
        },
    },

    ["telport_to_player"] = {
        label = "Teleportar para Jogador",
        perms = "qadmin.action.teleport_to_player",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:TeleportToPlayer" },
        },
    },

    ["telport_to_coords"] = {
        label = "Teleportar para Coordenadas",
        perms = "qadmin.action.teleport_to_coords",
        dropdown = {
            { label = "Coordenadas",  option = "text" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:TeleportToCoords" },
        },
    },

    ["teleport_to_location"] = {
        label = "Teleportar para Localização",
        perms = "qadmin.action.teleport_to_location",
        dropdown = {
            { label = "Location", option = "dropdown", data = "locations" },
            { label = "Confirmar",  option = "button",   type = "client",   event = "mri_Qadmin:client:TeleportToLocation" },
        },
    },

    ["teleport_to_marker"] = {
        label = "Teleportar para Marcador",
        type = "command",
        event = "tpm",
        perms = "qadmin.action.teleport_to_marker",
    },

    ["teleport_back"] = {
        label = "Teleportar de Volta",
        type = "client",
        event = "mri_Qadmin:client:TeleportBack",
        perms = "qadmin.action.teleport_back",
    },

    ["vehicle_dev"] = {
        label = "Menu de Desenvolvimento de Veículos",
        type = "client",
        event = "mri_Qadmin:client:ToggleVehDevMenu",
        perms = "qadmin.action.vehicle_dev",
    },

    ["toggle_coords"] = {
        label = "Ativar/Desativar Coordenadas",
        type = "client",
        event = "mri_Qadmin:client:ToggleCoords",
        perms = "qadmin.action.toggle_coords",
    },

    ["toggle_blips"] = {
        label = "Ativar/Desativar Blips",
        type = "client",
        event = "mri_Qadmin:client:toggleBlips",
        perms = "qadmin.action.toggle_blips",
    },

    ["toggle_names"] = {
        label = "Ativar/Desativar Nomes",
        type = "client",
        event = "mri_Qadmin:client:toggleNames",
        perms = "qadmin.action.toggle_names",
    },

    ["toggle_cuffs"] = {
        label = "Ativar/Desativar Algemas",
        perms = "qadmin.action.toggle_cuffs",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:CuffPlayer" },
        },
    },

    ["max_mods"] = {
        label = "Maximizar Mods do Veículo",
        type = "client",
        event = "mri_Qadmin:client:maxmodVehicle",
        perms = "qadmin.action.max_mods",
    },

    ["warn_player"] = {
        label = "Alertar Jogador",
        perms = "qadmin.action.warn_player",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Reason",  option = "text" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:WarnPlayer" },
        },
    },

    ["infinite_ammo"] = {
        label = "Munição Infinita",
        type = "client",
        event = "mri_Qadmin:client:setInfiniteAmmo",
        perms = "qadmin.action.infinite_ammo",
    },

    ["kick_player"] = {
        label = "Expulsar Jogador",
        perms = "qadmin.action.kick_player",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Reason",  option = "text" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:KickPlayer" },
        },
    },

    ["play_sound"] = {
        label = "Tocar Som",
        perms = "qadmin.action.play_sound",
        dropdown = {
            { label = "Player",     option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            {
                label = "Sound",
                option = "dropdown",
                data = {
                    { label = "Alerta",      value = "alert" },
                    { label = "Algema",       value = "cuff" },
                    { label = "Chave de Ar", value = "airwrench" },
                },
            },
            { label = "Tocar Som", option = "button",   type = "client", event = "mri_Qadmin:client:PlaySound" },
        },
    },

    ["update_vehicle_stock"] = {
        label = "Atualizar Estoque",
        event = "mri_Qadmin:server:UpdateVehicleStock",
        perms = "qadmin.action.update_vehicle_stock",
        type = "server"
    },
    ["enable_wall"] = {
        label = "Ativar/Desativar Wall",
        event = "mri_Qadmin:server:enableWall",
        perms = "qadmin.action.enable_wall",
        type = "server"
    },
}

Config.PlayerActions = {
    ["teleportToPlayer"] = {
        label = "Teleportar",
        type = "server",
        event = "mri_Qadmin:server:TeleportToPlayer",
        perms = "qadmin.action.teleport_to_player",
    },
    ["bringPlayer"] = {
        label = "Puxar",
        type = "server",
        event = "mri_Qadmin:server:BringPlayer",
        perms = "qadmin.action.bring_player",
    },
    ["sendPlayerBack"] = {
        label = "Enviar de Volta",
        type = "server",
        event = "mri_Qadmin:server:SendPlayerBack",
        perms = "qadmin.action.teleport_back",
    },
    ["revivePlayer"] = {
        label = "Reviver",
        event = "mri_Qadmin:server:Revive",
        perms = "qadmin.action.revive",
        type = "server"
    },
    ["verifyPlayer"] = {
        label = "Verificar Jogador",
        event = "mri_Qadmin:server:verifyPlayer",
        perms = "qadmin.action.verify_player",
        type = "server"
    },
    ["givePlayerMoney"] = {
        label = "Dar Dinheiro",
        event = "mri_Qadmin:server:givePlayerMoney",
        perms = "qadmin.action.give_money",
        type = "server"
    },
    ["removePlayerMoney"] = {
        label = "Remover Dinheiro",
        event = "mri_Qadmin:server:removePlayerMoney",
        perms = "qadmin.action.remove_money",
        type = "server"
    },
    ["clothingMenu"] = {
        label = "Menu de Roupas",
        event = "mri_Qadmin:server:ClothingMenu",
        perms = "qadmin.action.clothing_menu",
        type = "server"
    },
    ["spawnPersonalVehicle"] = {
        label = "Gerar Veículo Pessoal",
        event = "mri_Qadmin:client:SpawnPersonalVehicle",
        perms = "qadmin.action.spawn_vehicle",
        type = "client"
    },
    ["deletePersonalVehicle"] = {
        label = "Deletar Veículo Pessoal",
        event = "mri_Qadmin:server:DeleteVehicleByPlate",
        perms = "qadmin.action.delete_vehicle",
        type = "server"
    },
    ["banPlayer"] = {
        label = "Banir Jogador",
        event = "mri_Qadmin:server:BanPlayer",
        perms = "qadmin.action.ban_player",
        type = "server"
    },
    ["kickPlayer"] = {
        label = "Expulsar Jogador",
        event = "mri_Qadmin:server:KickPlayer",
        perms = "qadmin.action.kick_player",
        type = "server"
    },
    ["unban_cid"] = {
        label = "Banir Jogador",
        event = "mri_Qadmin:server:unban_cid",
        perms = "qadmin.action.unban_player",
        type = "server"
    },
    ["delete_cid"] = {
        label = "Excluir Jogador",
        event = "mri_Qadmin:server:delete_cid",
        perms = "qadmin.action.delete_character",
        type = "server"
    },
    ["unban_rowid"] = {
        label = "Desbanir Jogador",
        event = "mri_Qadmin:server:unban_rowid",
        perms = "qadmin.action.unban_player",
        type = "server"
    },
    ["fireJob"] = {
        label = "Demitir do Emprego",
        event = "mri_Qadmin:server:SetJob",
        perms = "qadmin.action.fire_job",
        type = "server"
    },
    ["fireGang"] = {
        label = "Demitir da Gangue",
        event = "mri_Qadmin:server:SetGang",
        perms = "qadmin.action.fire_gang",
        type = "server"
    },
    ["give_item_player"] = {
        label = "Dar Item",
        event = "mri_Qadmin:server:GiveItem",
        perms = "qadmin.action.give_item",
        type = "server"
    },
}

Config.OtherActions = {
    ["toggleDevmode"] = {
        type = "client",
        event = "mri_Qadmin:client:ToggleDev",
        perms = "qadmin.action.toggle_devmode",
        label = "Ativar/Desativar Modo Desenvolvedor"
    }
}

AddEventHandler("onResourceStart", function()
    Wait(100)
    if GetResourceState('ox_inventory') == 'started' then
        Config.Inventory = 'ox_inventory'
    elseif GetResourceState('ps-inventory') == 'started' then
        Config.Inventory = 'ps-inventory'
    elseif GetResourceState('lj-inventory') == 'started' then
        Config.Inventory = 'lj-inventory'
    elseif GetResourceState('qb-inventory') == 'started' then
        Config.Inventory = 'qb-inventory'
    end
end)

function Debug(...)
    if not Config.Debug then return end
    print('[mri_Qadmin DEBUG]', ...)
end
