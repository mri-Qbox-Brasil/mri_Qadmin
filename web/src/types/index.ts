export interface Player {
    id: string | number
    cid?: string
    citizenid?: string
    license?: string
    license2?: string
    name: string
    job: { name: string; label: string; grade: { name: string; level: number } }
    gang: { name: string; label: string; grade: { name: string; level: number } }
    cash: number
    bank: number
    crypto: number
    vehicles?: any[]
    online: boolean
    ping?: number
    bucket?: number
    health?: number
    armor?: number
    last_loggedout?: number | string
    metadata?: {
        verified?: boolean
        hunger?: number
        thirst?: number
        stress?: number
        isdead?: boolean
    }
    money?: { name: string; amount: number }[]
    steam?: string
    live?: string
    fivem?: string
    discord?: string
    ip?: string
    vitals?: {
        health: number
        armor: number
        hunger: number
        thirst: number
        stress: number
    }
}

export interface SummaryData {
    totalCash: number
    totalBank: number
    totalCrypto: number
    uniquePlayers: number
    vehicleCount: number
    bansCount: number
    characterCount: number
    onlinePlayers: number
}

export interface VehicleDevData {
    show: boolean
    name: string
    model: string
    netID: string
    engine_health?: string
    body_health?: string
    plate?: string
    fuel?: string
    speed?: string
}

export interface CoordsData {
    show: boolean
    x: string
    y: string
    z: string
    heading?: string
}

export interface GameData {
    items: any[]
    jobs: any[]
    gangs: any[]
    locations: any[]
    peds: any[]
    vehicles: any[]
    actions: Record<string, any>
    playerActions: Record<string, any>
    otherActions: Record<string, any>
    resources: any[]
    commands: any[]
    vehicleImages: string
    inventory?: string
    selfId?: number | string
    bans: any[]
    webrtcUrl?: string
    signalingProvider?: 'websocket' | 'fivem-native' | 'cloudflare-sfu'
    descriptions?: Record<string, string>
    settingOptions?: Record<string, { label: string, value: string }[]>
}

export interface EntityInfoData {
    show: boolean
    name: string
    hash: string
}

export interface PaginationState {
    page: number
    limit: number
    total: number
    totalPages: number
    search: string
}

export type Handler = (data: any) => void

export interface NuiContextValue {
    sendNui: <T = any>(eventName: string, data?: unknown, debugReturn?: T) => Promise<T>
    on: (action: string, handler: Handler) => void
    off: (action: string, handler: Handler) => void
    debugMode: boolean
}

export interface ThemeContextType {
    theme: string
    setTheme: (t: string) => void
    accent: string
    setAccent: (c: string) => void
    scale: number
    setScale: (s: number) => void
}
