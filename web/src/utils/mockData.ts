
export const MOCK_PLAYERS = [
    {
        id: 1,
        name: "John Doe",
        license: "license:1234567890abcdef",
        discord: "discord:123456789012345678",
        ip: "127.0.0.1",
        ping: 25,
        bucket: 1,
        online: true,
        health: 100,
        armor: 100,
        metadata: {
            verified: true,
            hunger: 80,
            thirst: 90,
            stress: 10,
            coords: { x: -768.58, y: -2443.77, w: 14.52 } // Updated as requested
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
        license: "license:0987654321fedcba",
        discord: "discord:987654321098765432",
        ip: "192.168.1.1",
        ping: 40,
        bucket: 1,
        online: true,
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
        license: "license:offlineuser123",
        last_loggedout: Date.now() - 86400000, // 1 day ago
        online: false,
        job: { label: "Unemployed", name: "unemployed", grade: { name: "Unemployed", level: 0 } },
        gang: { label: "None", name: "none", grade: { name: "None", level: 0 } },
    }
];

export const MOCK_ACES = [
    { id: 1, principal: 'group.admin', object: 'command.noclip', allow: 1 },
    { id: 2, principal: 'group.admin', object: 'command.givecar', allow: 1 },
    { id: 3, principal: 'group.mod', object: 'command.kick', allow: 1 },
    { id: 4, principal: 'identifier.steam:11000010a3c2b1d', object: 'command.god', allow: 0 },
];

export const MOCK_PRINCIPALS = [
    { id: 1, child: 'identifier.steam:11000010a3c2b1d', parent: 'group.admin' },
    { id: 2, child: 'identifier.license:abc1234567890', parent: 'group.mod' },
    { id: 3, child: 'group.admin', parent: 'group.mod' },
];

export const MOCK_GAME_DATA = {
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
