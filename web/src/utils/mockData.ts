
export const MOCK_PLAYERS = [
    {
        id: 1,
        name: "John Doe",
        citizenid: "BRL9MRI12345",
        license: "license:1234567890abcdef",
        discord: "discord:123456789012345678",
        ip: "127.0.0.1",
        ping: 25,
        bucket: 1,
        online: true,
        health: 100,
        armor: 100,
        cash: 5000,
        bank: 150000,
        crypto: 10,
        metadata: {
            verified: true,
            hunger: 80,
            thirst: 90,
            stress: 10,
            coords: { x: -768.58, y: -2443.77, w: 14.52 },
            position: { x: -768.58, y: -2443.77, z: 14.52, heading: 180.0 }
        },
        charinfo: {
            firstname: "John",
            lastname: "Doe",
            birthdate: "1990-05-15",
            gender: 0,
            nationality: "American",
            cid: 1,
            account: "BRL9MRI12345678",
            phone: "555-0101",
            backstory: "A long-time resident of Los Santos, John has worked in many sectors before finding his place."
        },
        job: { label: "Police", name: "police", grade: { name: "Officer", level: 1 } },
        gang: { label: "None", name: "none", grade: { name: "None", level: 0 } },
        money: [
            { name: "cash", amount: 5000 },
            { name: "bank", amount: 150000 },
            { name: "crypto", amount: 10 }
        ],
        vehicles: [
            { label: "Adder", model: "adder", plate: "XYZ 123", stock: 1 },
            { label: "Police Cruiser", model: "police", plate: "POL 911", stock: 1 }
        ]
    },
    {
        id: 2,
        name: "Jane Smith",
        citizenid: "BRL9MRI67890",
        license: "license:0987654321fedcba",
        discord: "discord:987654321098765432",
        ip: "192.168.1.1",
        ping: 40,
        bucket: 1,
        online: true,
        cash: 200,
        bank: 5000,
        crypto: 0,
        metadata: { verified: false },
        job: { label: "EMS", name: "ambulance", grade: { name: "Medic", level: 2 } },
        gang: { label: "Ballas", name: "ballas", grade: { name: "Member", level: 1 } },
        money: [
            { name: "cash", amount: 200 },
            { name: "bank", amount: 5000 },
            { name: "crypto", amount: 0 }
        ],
        vehicles: []
    },
    {
        id: 3,
        name: "Offline User",
        citizenid: "BRL9MRI00000",
        license: "license:offlineuser123",
        last_loggedout: Date.now() - 86400000,
        online: false,
        cash: 0,
        bank: 0,
        crypto: 0,
        job: { label: "Unemployed", name: "unemployed", grade: { name: "Unemployed", level: 0 } },
        gang: { label: "None", name: "none", grade: { name: "None", level: 0 } },
    },
    {
        id: 4,
        name: "Banido Permanente",
        citizenid: "BRL9MRI00001",
        license: "license:bannedperm456",
        last_loggedout: Date.now() - 3 * 86400000,
        online: false,
        cash: 0,
        bank: 0,
        crypto: 0,
        job: { label: "Unemployed", name: "unemployed", grade: { name: "Unemployed", level: 0 } },
        gang: { label: "None", name: "none", grade: { name: "None", level: 0 } },
        ban: {
            id: 42,
            reason: 'Uso de cheats / Trapaça',
            expire: 2147483647,
            bannedby: 'Admin Master',
            isPermanent: true,
        },
    },
    {
        id: 5,
        name: "Banido Temporário",
        citizenid: "BRL9MRI00002",
        license: "license:bannedtemp789",
        last_loggedout: Date.now() - 86400000,
        online: false,
        cash: 0,
        bank: 0,
        crypto: 0,
        job: { label: "Unemployed", name: "unemployed", grade: { name: "Unemployed", level: 0 } },
        gang: { label: "None", name: "none", grade: { name: "None", level: 0 } },
        ban: {
            id: 43,
            reason: 'Linguagem inapropriada no chat',
            expire: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
            bannedby: 'Moderador João',
            isPermanent: false,
        },
    },
];

export const MOCK_GROUPS = [
    {
        id: 'admin',
        label: 'Administrador',
        description: 'Grupo padrão de gestão completa.',
        permissions: ['qadmin.page.dashboard', 'qadmin.page.players', 'qadmin.page.groups', 'qadmin.page.permissions', 'qadmin.action.revive', 'qadmin.action.teleport_to_player']
    },
    {
        id: 'moderador',
        label: 'Moderador I',
        description: 'Atendimento de tickets básicos.',
        permissions: ['qadmin.page.dashboard', 'qadmin.page.players', 'qadmin.action.freeze_player', 'qadmin.action.spectate_player']
    },
    {
        id: 'suporte',
        label: 'Suporte Técnico',
        description: 'Ajuda a jogadores novatos.',
        permissions: ['qadmin.page.dashboard', 'qadmin.page.staffchat', 'qadmin.action.heal']
    }
];

export const MOCK_CHARACTER_GROUPS = {
    'BRL9MRI12345': ['admin', 'moderador'],
    'BRL9MRI67890': ['suporte']
};

export const MOCK_PERMISSION_DEFINITIONS = [
    { id: 'qadmin.open',                      category: 'other'        },
    { id: 'qadmin.master',                    category: 'other'        },
    { id: 'qadmin.page.dashboard',            category: 'dashboard'    },
    { id: 'qadmin.page.players',              category: 'players'      },
    { id: 'qadmin.page.groups',               category: 'groups'       },
    { id: 'qadmin.page.bans',                 category: 'bans'         },
    { id: 'qadmin.page.staffchat',            category: 'staffchat'    },
    { id: 'qadmin.page.items',                category: 'items'        },
    { id: 'qadmin.page.vehicles',             category: 'vehicles'     },
    { id: 'qadmin.page.commands',             category: 'commands'     },
    { id: 'qadmin.page.actions',              category: 'actions'      },
    { id: 'qadmin.page.permissions',          category: 'permissions'  },
    { id: 'qadmin.page.resources',            category: 'resources'    },
    { id: 'qadmin.page.settings',             category: 'settings'     },
    { id: 'qadmin.page.devmode',              category: 'devmode'      },
    { id: 'qadmin.page.livemap',              category: 'livemap'      },
    { id: 'qadmin.page.livescreens',          category: 'livescreens'  },
    { id: 'qadmin.page.logs',                 category: 'dashboard'    },
    { id: 'qadmin.action.revive',             category: 'actions'      },
    { id: 'qadmin.action.ban_player',         category: 'actions'      },
    { id: 'qadmin.action.kick_player',        category: 'actions'      },
    { id: 'qadmin.action.freeze_player',      category: 'actions'      },
    { id: 'qadmin.action.spectate_player',    category: 'actions'      },
    { id: 'qadmin.action.teleport_to_player', category: 'actions'      },
    { id: 'qadmin.action.god_mode',           category: 'actions'      },
    { id: 'qadmin.action.noclip',             category: 'actions'      },
    { id: 'qadmin.action.give_money',         category: 'actions'      },
    { id: 'qadmin.action.give_item',          category: 'actions'      },
    { id: 'qadmin.action.spawn_vehicle',      category: 'actions'      },
    { id: 'qadmin.commands',                  category: 'commands'     },
]

export const MOCK_GAME_DATA = {
    permissionDefinitions: MOCK_PERMISSION_DEFINITIONS,
    qboxEnabled: true,
    items: [
        { name: "water", label: "Water Bottle", description: "A refreshing bottle of water.", weight: 100, type: 'item', image: "water.png" },
        { name: "sandwich", label: "Sandwich", description: "A tasty sandwich.", weight: 200, type: 'item', image: "sandwich.png" },
        { name: "weapon_pistol", label: "Pistol", description: "Standard issue 9mm.", weight: 1000, type: 'weapon', image: "weapon_pistol.png" },
        { name: "phone", label: "Mobile Phone", description: "A smartphone.", weight: 150, type: 'item', image: "phone.png" },
        { name: "radio", label: "Radio", description: "Communication device.", weight: 500, type: 'item', image: "radio.png" },
        { name: "bandage", label: "Bandage", description: "Basic first aid.", weight: 50, type: 'item', image: "bandage.png" },
        { name: "lockpick", label: "Lockpick", description: "Used for picking locks.", weight: 20, type: 'item', image: "lockpick.png" },
        { name: "repairkit", label: "Repair Kit", description: "Fixes vehicles.", weight: 2000, type: 'item', image: "repairkit.png" }
    ],
    vehicles: [
        { name: "Adder", model: "adder", price: 1000000, category: 'super', stock: 2, image: "adder.png" },
        { name: "Zentorno", model: "zentorno", price: 725000, category: 'super', stock: 5, image: "zentorno.png" },
        { name: "Sanchez", model: "sanchez", price: 8000, category: 'motorcycles', stock: 15, image: "sanchez.png" },
        { name: "BMX", model: "bmx", price: 500, category: 'bicycles', stock: 50, image: "bmx.png" },
        { name: "Police Cruiser", model: "police", price: 50000, category: 'emergency', stock: 10, image: "police.png" },
        { name: "Ambulance", model: "ambulance", price: 65000, category: 'emergency', stock: 5, image: "ambulance.png" },
        { name: "Mule", model: "mule", price: 35000, category: 'commercial', stock: 8, image: "mule.png" }
    ],
    jobs: [
        {
            label: "Police",
            name: "police",
            grades: {
                '0': { name: 'Cadet' },
                '1': { name: 'Officer' },
                '2': { name: 'Sergeant' },
                '3': { name: 'Lieutenant' },
                '4': { name: 'Chief' }
            },
            members: [{ id: "1", name: "John Doe", online: true, grade: { name: "Chief", level: 4 } }]
        },
        {
            label: "EMS",
            name: "ambulance",
            grades: {
                '0': { name: 'Student' },
                '1': { name: 'Medic' },
                '2': { name: 'Doctor' },
                '3': { name: 'Chief' }
            },
            members: []
        },
        {
            label: "Mechanic",
            name: "mechanic",
            grades: {
                '0': { name: 'Recruit' },
                '1': { name: 'Novice' },
                '2': { name: 'Master' },
                '3': { name: 'Leader' },
                '4': { name: 'Boss' }
            },
            members: [{ id: "2", name: "Fix It Felix", online: false, grade: { name: "Boss", level: 4 } }]
        }
    ],
    gangs: [
        {
            label: "Ballas",
            name: "ballas",
            grades: {
                '0': { name: 'Recruit' },
                '1': { name: 'Member' },
                '2': { name: 'OG' },
                '3': { name: 'Boss' },
                '4': { name: 'Godfather' },
                '5': { name: 'Legend' }
            },
            members: [{ id: "3", name: "CJ", online: true, grade: { name: "OG", level: 5 } }]
        },
        {
            label: "Families",
            name: "families",
            grades: {
                '0': { name: 'Recruit' },
                '1': { name: 'Member' },
                '2': { name: 'Boss' }
            },
            members: []
        }
    ],
    resources: [
        { name: "mri_Qadmin", version: "1.0.0", author: "Project Sloth", description: "Admin Menu", resourceState: "started" },
        { name: "qb-core", version: "1.2.0", author: "Qbox", description: "Core Framework", resourceState: "started" },
        { name: "ox_lib", version: "3.0.0", author: "Overextended", description: "Library", resourceState: "started" },
        { name: "stopped-resource", version: "0.0.1", author: "Unknown", description: "Buggy resource", resourceState: "stopped" }
    ],
    bans: [
        { id: "1", name: "Banned User", reason: "Cheating", expire: Date.now() + 100000000, bannedby: "Admin", license: "license:banned", discord: "discord:12345", ip: "127.0.0.1" }
    ],
    commands: [
        { name: "noclip", description: "Toggle noclip" },
        { name: "god", description: "Toggle godmode" },
        { name: "tp", description: "Teleport to coords" },
        { name: "tpm", description: "Teleport to waypoint" },
        { name: "dv", description: "Delete vehicle" },
        { name: "car", description: "Spawn a vehicle" },
        { name: "giveitem", description: "Give item to player" },
        { name: "setjob", description: "Set player job" },
        { name: "setgang", description: "Set player gang" },
        { name: "revive", description: "Revive a player" },
        { name: "heal", description: "Heal a player" },
        { name: "announce", description: "Send an announcement" },
        { name: "kick", description: "Kick a player" },
        { name: "ban", description: "Ban a player" }
    ],
    actions: {
        "teleport_options": {
            label: "Teleport Options",
            dropdown: [
                { id: "tp_waypoint", label: "Teleport to Waypoint", option: "button" },
                { id: "tp_coords", label: "Teleport to Coords", option: "text", placeholder: "x, y, z" },
                { id: "tp_location", label: "Teleport to Location", option: "dropdown", data: "locations" }
            ]
        },
        "wealth_management": {
            label: "Wealth Management",
            dropdown: [
                { id: "give_cash", label: "Give Cash", option: "text", placeholder: "Amount" },
                { id: "give_bank", label: "Give Bank", option: "text", placeholder: "Amount" },
                { id: "remove_cash", label: "Remove Cash", option: "text", placeholder: "Amount" }
            ]
        }
    },
    playerActions: {
        "kill_player": { label: "Kill Player", dropdown: [{ id: "kill", label: "Execute", option: "button" }] },
        "revive_player": { label: "Revive Player", dropdown: [{ id: "revive", label: "Execute", option: "button" }] },
        "freeze_player": { label: "Freeze Player", dropdown: [{ id: "freeze", label: "Execute", option: "button" }] },
        "spectate_player": { label: "Spectate", dropdown: [{ id: "spectate", label: "Execute", option: "button" }] },
        "open_inventory": { label: "Open Inventory", dropdown: [{ id: "inventory", label: "Execute", option: "button" }] }
    },
    otherActions: {
        "clear_area": { label: "Clear Area", dropdown: [{ id: "radius", label: "Radius", option: "text", placeholder: "e.g. 100" }] },
        "spawn_vehicle": { label: "Spawn Vehicle", dropdown: [{ id: "vehicle", label: "Vehicle Model", option: "dropdown", data: "vehicles" }] }
    },
    staffMessages: [
        { fullname: "John Doe", message: "Anyone seeing the report about ID 42?", time: Date.now() - 3600000 },
        { fullname: "Jane Smith", message: "Yeah, I'm checking it now. Seems like a VDM request.", time: Date.now() - 3500000 },
        { fullname: "John Doe", message: "Copy that. Let me know if you need help.", time: Date.now() - 3400000 },
        { fullname: "Admin User", message: "Guys, don't forget the community meeting at 8 PM.", time: Date.now() - 1800000 },
        { fullname: "Jane Smith", message: "I'll be there.", time: Date.now() - 1750000 },
        { fullname: "Moderator One", message: "Can someone key me for the pd garage?", time: Date.now() - 600000 },
        { fullname: "Admin User", message: "Done.", time: Date.now() - 500000 },
        { fullname: "Moderator One", message: "Thanks!", time: Date.now() - 450000 }
    ],
    vehicleImages: "https://docs.fivem.net/vehicles/",
    locations: [],
    peds: []
};

export const MOCK_CHANGELOG = [
    {
        repo: "mri_Qadmin",
        author: "Project Sloth",
        date: new Date().toLocaleString(),
        message: "feat: implement togglable mock mode for developer settings",
        url: "https://github.com/mri-Qbox-Brasil/mri_Qadmin"
    },
    {
        repo: "qb-core",
        author: "Qbox",
        date: new Date(Date.now() - 86400000).toLocaleString(),
        message: "fix: resolve issue with player character loading sequence",
        url: "https://github.com/mri-Qbox-Brasil/qb-core"
    },
    {
        repo: "ox_lib",
        author: "Overextended",
        date: new Date(Date.now() - 172800000).toLocaleString(),
        message: "docs: update API documentation for version 3.0.0",
        url: "https://github.com/mri-Qbox-Brasil/ox_lib"
    },
    {
        repo: "mri_Qadmin",
        author: "Project Sloth",
        date: new Date(Date.now() - 259200000).toLocaleString(),
        message: "refactor: optimize bans table alignment with fixed layout",
        url: "https://github.com/mri-Qbox-Brasil/mri_Qadmin"
    }
];

export const MOCK_INVENTORY = {
    items: [
        { name: "water", label: "Garrafa De Água", count: 2, slot: 1, weight: 200, metadata: { type: 'item' } },
        { name: "bread", label: "Pão", count: 1, slot: 2, weight: 150 },
        { name: "weapon_pistol", label: "Pistola 9mm", count: 1, slot: 5, weight: 1200, metadata: { ammo: 12, components: ['suppressor'] } },
        { name: "phone", label: "iPhone 15", count: 1, slot: 3, weight: 180 },
        { name: "bandage", label: "Bandagem", count: 5, slot: 4, weight: 50 },
        { name: "radio", label: "Rádio", count: 1, slot: 6, weight: 450 }
    ],
    weight: 2230,
    maxWeight: 85000,
    slots: 30
};

const now = Math.floor(Date.now() / 1000)
const ago = (s: number) => now - s

export const MOCK_LOGS = {
    total: 38,
    logs: [
        { id: 38, resource: 'mri_Qadmin', category: 'bans',        level: 'warn',    message: 'Banimento: Carlos Silva foi banido',                              admin: 'João Admin',    data: { reason: 'Hack de dinheiro', duration: '86400', player: 'Carlos Silva' },           created_at: ago(45)     },
        { id: 37, resource: 'mri_Qadmin', category: 'players',     level: 'success', message: 'Revive: Pedro Santos foi revivido',                               admin: 'Maria Mod',     data: { player: 12 },                                                                        created_at: ago(120)    },
        { id: 36, resource: 'mri_Qadmin', category: 'money',       level: 'info',    message: 'Dar dinheiro: R$5000 (cash) dado a Ana Oliveira',                 admin: 'João Admin',    data: { target: '7', amount: 5000, type: 'cash' },                                           created_at: ago(310)    },
        { id: 35, resource: 'mri_Qadmin', category: 'inventory',   level: 'info',    message: 'Dar item: 5x water dado a Pedro Santos',                          admin: 'Maria Mod',     data: { item: 'water', amount: 5, player: 12 },                                              created_at: ago(480)    },
        { id: 34, resource: 'mri_Qadmin', category: 'players',     level: 'warn',    message: 'Expulsão: Lucas Costa foi expulso',                               admin: 'Dev Gabriel',   data: { player: 'Lucas Costa', reason: 'Linguagem inapropriada' },                          created_at: ago(600)    },
        { id: 33, resource: 'mri_Qadmin', category: 'vehicles',    level: 'info',    message: 'Admin Car: adm_zentorno salvo para João Admin',                   admin: 'João Admin',    data: { model: 'adm_zentorno', plate: 'ADMIN001' },                                          created_at: ago(720)    },
        { id: 32, resource: 'mri_Qadmin', category: 'server',      level: 'info',    message: 'Anúncio global: Manutenção programada para 22h',                  admin: 'Dev Gabriel',   data: { message: 'Manutenção programada para 22h' },                                         created_at: ago(900)    },
        { id: 31, resource: 'mri_Qadmin', category: 'bans',        level: 'info',    message: 'Desbanimento: CID ABC123 desbanido',                              admin: 'João Admin',    data: { cid: 'ABC123' },                                                                     created_at: ago(1100)   },
        { id: 30, resource: 'mri_Qadmin', category: 'players',     level: 'info',    message: 'Aviso: Fernanda Lima recebeu advertência',                        admin: 'Maria Mod',     data: { player: 'Fernanda Lima', reason: 'AFK em área pública', warnId: 'WARN-4821' },       created_at: ago(1300)   },
        { id: 29, resource: 'mri_Qadmin', category: 'money',       level: 'warn',    message: 'Remover dinheiro: R$2000 (bank) removido de Lucas Costa',         admin: 'João Admin',    data: { target: '9', amount: 2000, type: 'bank' },                                           created_at: ago(1500)   },
        { id: 28, resource: 'mri_Qadmin', category: 'permissions', level: 'info',    message: 'Grupo atualizado: grupo "moderador" teve permissões alteradas',    admin: 'Dev Gabriel',   data: { group: 'moderador', added: ['qadmin.action.kick_player'], removed: [] },             created_at: ago(1800)   },
        { id: 27, resource: 'mri_Qadmin', category: 'inventory',   level: 'warn',    message: 'Limpar inventário: inventário de Carlos Silva esvaziado',         admin: 'João Admin',    data: { player: 3 },                                                                         created_at: ago(2100)   },
        { id: 26, resource: 'mri_Qadmin', category: 'players',     level: 'warn',    message: 'Matar: Pedro Santos foi morto',                                   admin: 'Dev Gabriel',   data: { player: 12 },                                                                        created_at: ago(2400)   },
        { id: 25, resource: 'mri_Qadmin', category: 'vehicles',    level: 'info',    message: 'Spawn veículo: zentorno gerado',                                  admin: 'Maria Mod',     data: { model: 'zentorno', plate: 'TEST001' },                                               created_at: ago(2700)   },
        { id: 24, resource: 'mri_Qadmin', category: 'server',      level: 'info',    message: 'Alterar clima: Clear aplicado',                                   admin: 'Dev Gabriel',   data: { weather: 'Clear' },                                                                  created_at: ago(3000)   },
        { id: 23, resource: 'mri_Qadmin', category: 'system',      level: 'info',    message: 'Resource iniciado: mri_Qadmin',                                   admin: 'System',        data: { resource: 'mri_Qadmin' },                                                            created_at: ago(3300)   },
        { id: 22, resource: 'mri_Qadmin', category: 'players',     level: 'success', message: 'Revive em massa: todos os jogadores foram revividos',              admin: 'João Admin',    data: {},                                                                                    created_at: ago(3600)   },
        { id: 21, resource: 'mri_Qadmin', category: 'money',       level: 'warn',    message: 'Dar dinheiro a todos: R$1000 (cash) dado a todos os jogadores',   admin: 'Dev Gabriel',   data: { amount: 1000, type: 'cash' },                                                        created_at: ago(4200)   },
        { id: 20, resource: 'mri_Qadmin', category: 'bans',        level: 'warn',    message: 'Banimento (offline): Jogador Desconhecido foi banido',             admin: 'Maria Mod',     data: { reason: 'Duplication', name: 'Jogador Desconhecido', license: 'license:abc123' },    created_at: ago(4800)   },
        { id: 19, resource: 'mri_Qadmin', category: 'vehicles',    level: 'info',    message: 'Alterar placa: placa de ABZ1234 alterada para VIP0001',           admin: 'João Admin',    data: { oldPlate: 'ABZ1234', newPlate: 'VIP0001' },                                          created_at: ago(5400)   },
        { id: 18, resource: 'mri_Qadmin', category: 'players',     level: 'info',    message: 'Bucket: jogador 5 movido para bucket 2',                          admin: 'Dev Gabriel',   data: { player: '5', bucket: 2 },                                                            created_at: ago(6000)   },
        { id: 17, resource: 'mri_Qadmin', category: 'chat',        level: 'info',    message: 'Staff Chat: João Admin: @todos reunião em 5min',                  admin: 'João Admin',    data: { message: '@todos reunião em 5min' },                                                 created_at: ago(6600)   },
        { id: 16, resource: 'mri_Qadmin', category: 'inventory',   level: 'info',    message: 'Abrir inventário: inventário de Ana Oliveira aberto',             admin: 'Maria Mod',     data: { player: 7 },                                                                         created_at: ago(7200)   },
        { id: 15, resource: 'mri_Qadmin', category: 'permissions', level: 'warn',    message: 'Grupo criado: novo grupo "suporte" criado',                       admin: 'Dev Gabriel',   data: { group: 'suporte', label: 'Suporte' },                                                created_at: ago(7800)   },
        { id: 14, resource: 'mri_Qadmin', category: 'vehicles',    level: 'warn',    message: 'Deletar veículo: veículo de placa BRP0001 deletado',              admin: 'João Admin',    data: { plate: 'BRP0001' },                                                                  created_at: ago(8400)   },
        { id: 13, resource: 'mri_Qadmin', category: 'system',      level: 'error',   message: 'Erro ao conectar webhook: timeout após 30s',                      admin: 'System',        data: { webhook: 'discord.com/api/webhooks/...', error: 'ETIMEDOUT' },                       created_at: ago(9000)   },
        { id: 12, resource: 'mri_Qadmin', category: 'players',     level: 'info',    message: 'Verificação: Pedro Santos verificado',                            admin: 'Maria Mod',     data: { player: 12 },                                                                        created_at: ago(9600)   },
        { id: 11, resource: 'mri_Qadmin', category: 'server',      level: 'info',    message: 'Alterar horário: Night aplicado',                                 admin: 'Dev Gabriel',   data: { time: '24' },                                                                        created_at: ago(10200)  },
        { id: 10, resource: 'mri_Qadmin', category: 'inventory',   level: 'info',    message: 'Abrir depósito: police_stash_1 aberto',                          admin: 'João Admin',    data: { stash: 'police_stash_1' },                                                           created_at: ago(10800)  },
        { id: 9,  resource: 'mri_Qadmin', category: 'bans',        level: 'info',    message: 'Desbanimento: ban #47 removido',                                  admin: 'Maria Mod',     data: { banId: 47 },                                                                         created_at: ago(11400)  },
        { id: 8,  resource: 'mri_Qadmin', category: 'money',       level: 'info',    message: 'Dar dinheiro: R$10000 (bank) dado a Dev Gabriel',                 admin: 'Dev Gabriel',   data: { target: '1', amount: 10000, type: 'bank' },                                          created_at: ago(12000)  },
        { id: 7,  resource: 'mri_Qadmin', category: 'players',     level: 'warn',    message: 'Expulsão: Troll McTrollface foi expulso',                         admin: 'Maria Mod',     data: { player: 'Troll McTrollface', reason: 'Trolling em roleplay' },                      created_at: ago(12600)  },
        { id: 6,  resource: 'mri_Qadmin', category: 'vehicles',    level: 'info',    message: 'Admin Car: adm_elegy salvo para Dev Gabriel',                     admin: 'Dev Gabriel',   data: { model: 'adm_elegy', plate: 'ADMIN002' },                                             created_at: ago(13200)  },
        { id: 5,  resource: 'mri_Qadmin', category: 'server',      level: 'warn',    message: 'Blackout: ativado',                                               admin: 'Dev Gabriel',   data: {},                                                                                    created_at: ago(13800)  },
        { id: 4,  resource: 'mri_Qadmin', category: 'permissions', level: 'info',    message: 'Jogador adicionado ao grupo: Ana Oliveira → admin',               admin: 'Dev Gabriel',   data: { cid: 'BRL9DEV999', group: 'admin' },                                                 created_at: ago(14400)  },
        { id: 3,  resource: 'mri_Qadmin', category: 'inventory',   level: 'warn',    message: 'Limpar inventário (offline): inventário de CID XYZ789 esvaziado', admin: 'João Admin',    data: { cid: 'XYZ789' },                                                                     created_at: ago(15000)  },
        { id: 2,  resource: 'mri_Qadmin', category: 'players',     level: 'success', message: 'Revive: Ana Oliveira foi revivida',                               admin: 'Maria Mod',     data: { player: 7 },                                                                         created_at: ago(15600)  },
        { id: 1,  resource: 'mri_Qadmin', category: 'system',      level: 'info',    message: 'Resource iniciado: mri_Qadmin v1.8.0',                            admin: 'System',        data: { version: '1.8.0' },                                                                  created_at: ago(16200)  },
    ],
}


export const MOCK_LOG_SETTINGS = {
    categories: [
        { id: 'players',     label: '👤 Players',    webhook: '',                                                                              db: true,  discord: false, relay: false },
        { id: 'bans',        label: '🔨 Bans',       webhook: 'https://discord.com/api/webhooks/000000000000000000/example-bans-webhook',   db: true,  discord: true,  relay: false },
        { id: 'inventory',   label: '🎒 Inventário', webhook: '',                                                                              db: true,  discord: false, relay: false },
        { id: 'vehicles',    label: '🚗 Veículos',   webhook: '',                                                                              db: true,  discord: false, relay: false },
        { id: 'money',       label: '💰 Dinheiro',   webhook: 'https://discord.com/api/webhooks/000000000000000000/example-money-webhook',  db: true,  discord: true,  relay: false },
        { id: 'server',      label: '⚙️ Servidor',   webhook: '',                                                                              db: true,  discord: false, relay: false },
        { id: 'permissions', label: '🛡️ Permissões', webhook: '',                                                                              db: true,  discord: false, relay: false },
        { id: 'chat',        label: '💬 Chat',        webhook: '',                                                                              db: false, discord: false, relay: false },
        { id: 'system',      label: '🖥️ Sistema',    webhook: '',                                                                              db: true,  discord: false, relay: false },
    ],
    resourceMode: 'blacklist' as 'blacklist' | 'whitelist',
    fallbackWebhook: '',
    dbEnabled: true,
    maxMemory: 500,
    forwardEvent: '',
    resourceEntries: [
        { name: 'mri_Qadmin', db: true,  discord: true,  relay: false },
        { name: 'monitor',    db: false, discord: false, relay: false },
    ],
}

export const MOCK_VIP_RANKS = [
    { id: 'bronze',   label: 'Bronze',   color: '#cd7f32', salary: 2000, salaryType: 'cash',   inventoryLimit: 60  },
    { id: 'silver',   label: 'Silver',   color: '#c0c0c0', salary: 4000, salaryType: 'cash',   inventoryLimit: 100 },
    { id: 'gold',     label: 'Gold',     color: '#ffd700', salary: 7000, salaryType: 'bank',   inventoryLimit: 150 },
    { id: 'diamond',  label: 'Diamond',  color: '#b9f2ff', salary: 12000, salaryType: 'bank',  inventoryLimit: 200 },
]

export const MOCK_VIP = [
    {
        citizenid: 'BRL9MRI12345',
        name: 'John Doe',
        rankId: 'gold',
        expiration: now + 86400 * 25,
        salary: 7000,
        salaryType: 'bank',
        inventoryLimit: 150,
        online: true,
        vehicles: [
            { model: 'adder', label: 'Adder', plate: 'VIP 001', expiration: now + 86400 * 20 },
            { model: 'zentorno', label: 'Zentorno', plate: 'VIP 002', expiration: 0 },
        ],
    },
    {
        citizenid: 'BRL9MRI67890',
        name: 'Jane Smith',
        rankId: 'silver',
        expiration: now + 86400 * 6,
        salary: 4000,
        salaryType: 'cash',
        inventoryLimit: 100,
        online: true,
        vehicles: [],
    },
    {
        citizenid: 'BRL9MRI11223',
        name: 'Carlos Mendez',
        rankId: 'diamond',
        expiration: 0,
        salary: 12000,
        salaryType: 'bank',
        inventoryLimit: 200,
        online: false,
        vehicles: [
            { model: 'infernus', label: 'Infernus', plate: 'VIP 010', expiration: now + 86400 * 15 },
        ],
    },
    {
        citizenid: 'BRL9MRI44556',
        name: 'Ana Oliveira',
        rankId: 'bronze',
        expiration: now - 86400 * 2,
        salary: 2000,
        salaryType: 'cash',
        inventoryLimit: 60,
        online: false,
        vehicles: [],
    },
    {
        citizenid: 'BRL9MRI77889',
        name: 'Pedro Alves',
        rankId: 'gold',
        expiration: now + 86400 * 60,
        salary: 7000,
        salaryType: 'bank',
        inventoryLimit: 150,
        online: false,
        vehicles: [
            { model: 'elegy2', label: 'Elegy Retro', plate: 'VIP 020', expiration: 0 },
            { model: 'banshee2', label: 'Banshee 900R', plate: 'VIP 021', expiration: now + 86400 * 30 },
            { model: 'reaper', label: 'Reaper', plate: 'VIP 022', expiration: now + 86400 * 5 },
        ],
    },
]
