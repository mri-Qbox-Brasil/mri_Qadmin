
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
    items: Array.from({ length: 20 }).map((_, i) => ({
        name: `item_${i}`,
        label: `Item ${i}`,
        description: `This is a description for Item ${i}`,
        weight: 100,
        type: 'item',
        image: `item_${i}.png`
    })),
    vehicles: Array.from({ length: 20 }).map((_, i) => ({
        name: `Vehicle ${i}`,
        model: `vehicle${i}`,
        price: 50000 + (i * 1000),
        category: 'sport',
        stock: 5,
        image: `vehicle${i}.png`
    })),
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
        { name: "tp", description: "Teleport to coords" }
    ],
    actions: {
        "teleport_options": { label: "Teleport Options", dropdown: [] },
        "wealth_management": { label: "Wealth Management", dropdown: [] }
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
