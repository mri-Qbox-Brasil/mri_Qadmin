Config = Config or {}

Config.Fuel = "cdn-fuel"        -- "ps-fuel", "LegacyFuel", "ox_fuel"
Config.ResourcePerms = 'admin' -- permission to control resource(start stop restart)
Config.ShowCommandsPerms = 'admin' -- permission to show all commands
Config.OpenPanelPerms = { 'admin', 'mod', 'support' }
Config.RenewedPhone = false    -- if you use qb-phone from renewed. (multijob)

-- Key Bindings
Config.Keybindings = true
Config.AdminKey = "0"
Config.NoclipKey = "9"

-- Give Car
Config.DefaultGarage = "Pillbox Garage Parking"
Config.VehicleImages = "" -- Custom URL for vehicle images (e.g. "https://cdn.example.com/vehicles/")

Config.Actions = {
    ["admin_car"] = {
        label = "Admin Car",
        type = "client",
        event = "mri_Qadmin:client:Admincar",
        perms = "mod",
    },

    ["ban_player"] = {
        label = "Banir Jogador",
        perms = "mod",
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
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:BringPlayer" },
        },
    },

    ["change_weather"] = {
        label = "Alterar Clima",
        perms = "mod",
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
        perms = "mod",
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
        perms = "mod",
        dropdown = {
            { label = "Plate",   option = "text" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:ChangePlate" },
        },
    },

    ["clear_inventory"] = {
        label = "Limpar Inventário",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:ClearInventory" },
        },
    },

    ["clear_inventory_offline"] = {
        label = "Limpar Inventário Offline",
        perms = "mod",
        dropdown = {
            { label = "Citizen ID", option = "text", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:ClearInventoryOffline" },
        },
    },

    ["clothing_menu"] = {
        label = "Dar Menu de Roupas",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:ClothingMenu" },
        },
    },

    ["set_ped"] = {
        label = "Definir Ped",
        perms = "mod",
        dropdown = {
            { label = "Player",     option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Ped Models", option = "dropdown", data = "pedlist" },
            { label = "Confirmar",    option = "button", type = "server", event = "mri_Qadmin:server:setPed" },
        },
    },

    ["copy_coords"] = {
        label = "Copiar Coordenadas",
        perms = "mod",
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
        perms = "mod",
    },

    ["freeze_player"] = {
        label = "Congelar Jogador",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:FreezePlayer" },
        },
    },

    ["kill_player"] = {
        label = "Matar Jogador",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:KillPlayer" },
        },
    },

    ["drunk_player"] = {
        label = "Deixar Jogador Bêbado",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:DrunkPlayer" },
        },
    },

    ["remove_stress"] = {
        label = "Remover Estresse",
        perms = "mod",
        dropdown = {
            { label = "Jogador (Opcional)", option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar",           option = "button", type = "server", event = "mri_Qadmin:server:RemoveStress" },
        },
    },

    ["set_ammo"] = {
        label = "Definir Munição",
        perms = "mod",
        dropdown = {
            { label = "Quantidade de Munição", option = "text" },
            { label = "Confirmar",      option = "button", type = "client", event = "mri_Qadmin:client:SetAmmo" },
        },
    },

    ["god_mode"] = {
        label = "Modo Deus",
        type = "client",
        event = "mri_Qadmin:client:ToggleGodmode",
        perms = "mod",
    },

    ["give_car"] = {
        label = "Dar Carro",
        perms = "mod",
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
        perms = "mod",
    },

    ["blackout"] = {
        label = "Ativar/Desativar Queda de Energia",
        type = "server",
        event = "mri_Qadmin:server:ToggleBlackout",
        perms = "mod",
    },

    ["toggle_duty"] = {
        label = "Ativar/Desativar Serviço",
        type = "server",
        event = "QBCore:ToggleDuty",
        perms = "mod",
    },

    ["toggle_laser"] = {
        label = "Ativar/Desativar Laser",
        type = "client",
        event = "mri_Qadmin:client:ToggleLaser",
        perms = "mod",
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
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Bucket",  option = "text" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:SetBucket" },
        },
    },

    ["get_bucket"] = {
        label = "Obter Bucket de Roteamento",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:GetBucket" },
        },
    },

    ["mute_player"] = {
        label = "Silenciar Jogador",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:MutePlayer" },
        },
    },

    ["noclip"] = {
        label = "Noclip",
        type = "client",
        event = "mri_Qadmin:client:ToggleNoClip",
        perms = "mod",
    },

    ["open_inventory"] = {
        label = "Abrir Inventário",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:openInventory" },
        },
    },

    ["open_stash"] = {
        label = "Abrir Depósito",
        perms = "mod",
        dropdown = {
            { label = "Stash",   option = "text" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:openStash" },
        },
    },

    ["open_trunk"] = {
        label = "Abrir Porta-malas",
        perms = "mod",
        dropdown = {
            { label = "Plate",   option = "text" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:openTrunk" },
        },
    },

    ["change_vehicle_state"] = {
        label = "Definir Estado do Veículo na Garagem",
        perms = "mod",
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
        perms = "mod",
    },

    ["revive_player"] = {
        label = "Reviver Jogador",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button", type = "server", event = "mri_Qadmin:server:Revive" },
        },
    },

    ["revive_radius"] = {
        label = "Reviver Raio",
        type = "server",
        event = "mri_Qadmin:server:ReviveRadius",
        perms = "mod",
    },

    ["refuel_vehicle"] = {
        label = "Reabastecer Veículo",
        type = "client",
        event = "mri_Qadmin:client:RefuelVehicle",
        perms = "mod",
    },

    ["set_job"] = {
        label = "Definir Emprego",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Job", option = "dropdown", data = "jobs", valueField = "name", labelField = "label" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:SetJob" },
        },
    },

    ["fire_job"] = {
        label = "Demitir do Emprego",
        perms = "mod",
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
        perms = "mod",
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
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Gang",    option = "dropdown", data = "gangs", valueField = "name", labelField = "label" },
            { label = "Confirmar", option = "button",   type = "client", event = "mri_Qadmin:client:SetGang" },
        },
    },

    ["give_money"] = {
        label = "Dar Dinheiro",
        perms = "mod",
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
        perms = "mod",
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
        perms = "mod",
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
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Item",    option = "dropdown", data = "items", valueField = "item", labelField = "name" },
            { label = "Amount",  option = "text" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:GiveItem" },
        },
    },

    ["give_item_all"] = {
        label = "Dar Item para Todos",
        perms = "mod",
        dropdown = {
            { label = "Item",    option = "dropdown", data = "items", valueField = "item", labelField = "name" },
            { label = "Amount",  option = "text" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:GiveItemAll" },
        },
    },

    ["spawn_vehicle"] = {
        label = "Gerar Veículo",
        perms = "mod",
        dropdown = {
            { label = "Vehicle", option = "dropdown", data = "vehicles", valueField = "model", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "client",  event = "mri_Qadmin:client:SpawnVehicle" },
        },
    },

    ["fix_vehicle"] = {
        label = "Consertar Veículo",
        type = "command",
        event = "fix",
        perms = "mod",
    },

    ["fix_vehicle_for"] = {
        label = "Consertar Veículo para jogador",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:FixVehFor" },
        },
    },

    ["spectate_player"] = {
        label = "Espectar Jogador",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:SpectateTarget" },
        },
    },

    ["telport_to_player"] = {
        label = "Teleportar para Jogador",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:TeleportToPlayer" },
        },
    },

    ["telport_to_coords"] = {
        label = "Teleportar para Coordenadas",
        perms = "mod",
        dropdown = {
            { label = "Coordenadas",  option = "text" },
            { label = "Confirmar", option = "button", type = "client", event = "mri_Qadmin:client:TeleportToCoords" },
        },
    },

    ["teleport_to_location"] = {
        label = "Teleportar para Localização",
        perms = "mod",
        dropdown = {
            { label = "Location", option = "dropdown", data = "locations" },
            { label = "Confirmar",  option = "button",   type = "client",   event = "mri_Qadmin:client:TeleportToLocation" },
        },
    },

    ["teleport_to_marker"] = {
        label = "Teleportar para Marcador",
        type = "command",
        event = "tpm",
        perms = "mod",
    },

    ["teleport_back"] = {
        label = "Teleportar de Volta",
        type = "client",
        event = "mri_Qadmin:client:TeleportBack",
        perms = "mod",
    },

    ["vehicle_dev"] = {
        label = "Menu de Desenvolvimento de Veículos",
        type = "client",
        event = "mri_Qadmin:client:ToggleVehDevMenu",
        perms = "mod",
    },

    ["toggle_coords"] = {
        label = "Ativar/Desativar Coordenadas",
        type = "client",
        event = "mri_Qadmin:client:ToggleCoords",
        perms = "mod",
    },

    ["toggle_blips"] = {
        label = "Ativar/Desativar Blips",
        type = "client",
        event = "mri_Qadmin:client:toggleBlips",
        perms = "mod",
    },

    ["toggle_names"] = {
        label = "Ativar/Desativar Nomes",
        type = "client",
        event = "mri_Qadmin:client:toggleNames",
        perms = "mod",
    },

    ["toggle_cuffs"] = {
        label = "Ativar/Desativar Algemas",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:CuffPlayer" },
        },
    },

    ["max_mods"] = {
        label = "Maximizar Mods do Veículo",
        type = "client",
        event = "mri_Qadmin:client:maxmodVehicle",
        perms = "mod",
    },

    ["warn_player"] = {
        label = "Alertar Jogador",
        perms = "mod",
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
        perms = "mod",
    },

    ["kick_player"] = {
        label = "Expulsar Jogador",
        perms = "mod",
        dropdown = {
            { label = "Player",  option = "dropdown", data = "players", valueField = "id", labelField = "name" },
            { label = "Reason",  option = "text" },
            { label = "Confirmar", option = "button",   type = "server", event = "mri_Qadmin:server:KickPlayer" },
        },
    },

    ["play_sound"] = {
        label = "Tocar Som",
        perms = "mod",
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
        perms = "admin",
        type = "server"
    }
}

Config.PlayerActions = {
    ["teleportToPlayer"] = {
        label = "Teleportar",
        type = "server",
        event = "mri_Qadmin:server:TeleportToPlayer",
        perms = "mod",
    },
    ["bringPlayer"] = {
        label = "Puxar",
        type = "server",
        event = "mri_Qadmin:server:BringPlayer",
        perms = "mod",
    },
    ["sendPlayerBack"] = {
        label = "Enviar de Volta",
        type = "server",
        event = "mri_Qadmin:server:SendPlayerBack",
        perms = "mod",
    },
    ["revivePlayer"] = {
        label = "Reviver",
        event = "mri_Qadmin:server:Revive",
        perms = "mod",
        type = "server"
    },
    ["verifyPlayer"] = {
        label = "Verificar Jogador",
        event = "mri_Qadmin:server:verifyPlayer",
        perms = "mod",
        type = "server"
    },
    ["givePlayerMoney"] = {
        label = "Dar Dinheiro",
        event = "mri_Qadmin:server:givePlayerMoney",
        perms = "mod",
        type = "server"
    },
    ["removePlayerMoney"] = {
        label = "Remover Dinheiro",
        event = "mri_Qadmin:server:removePlayerMoney",
        perms = "mod",
        type = "server"
    },
    ["clothesMenu"] = {
        label = "Remover Dinheiro",
        event = "mri_Qadmin:server:clothesMenu",
        perms = "mod",
        type = "server"
    },
    ["spawnPersonalVehicle"] = {
        label = "Gerar Veículo Pessoal",
        event = "mri_Qadmin:client:SpawnPersonalVehicle",
        perms = "mod",
        type = "client"
    },
    ["deletePersonalVehicle"] = {
        label = "Deletar Veículo Pessoal",
        event = "mri_Qadmin:server:DeleteVehicleByPlate",
        perms = "mod",
        type = "server"
    },
    ["banPlayer"] = {
        label = "Banir Jogador",
        event = "mri_Qadmin:server:BanPlayer",
        perms = "mod",
        type = "server"
    },
    ["kickPlayer"] = {
        label = "Expulsar Jogador",
        event = "mri_Qadmin:server:KickPlayer",
        perms = "mod",
        type = "server"
    },
    ["unban_cid"] = {
        label = "Banir Jogador",
        event = "mri_Qadmin:server:unban_cid",
        perms = "mod",
        type = "server"
    },
    ["delete_cid"] = {
        label = "Excluir Jogador",
        event = "mri_Qadmin:server:delete_cid",
        perms = "mod",
        type = "server"
    },
    ["unban_rowid"] = {
        label = "Desbanir Jogador",
        event = "mri_Qadmin:server:unban_rowid",
        perms = "mod",
        type = "server"
    },
}

Config.OtherActions = {
    ["toggleDevmode"] = {
        type = "client",
        event = "mri_Qadmin:client:ToggleDev",
        perms = "mod",
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
