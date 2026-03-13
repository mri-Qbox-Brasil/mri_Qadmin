import React, { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

import { Player, VehicleDevData, CoordsData, GameData, EntityInfoData, PaginationState } from '@/types'

interface AppStateValue {
    players: Player[]
    setPlayers: React.Dispatch<React.SetStateAction<Player[]>>
    selectedPlayer: Player | null
    setSelectedPlayer: React.Dispatch<React.SetStateAction<Player | null>>

    // Pagination
    pagination: PaginationState
    setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
    // Caching
    lastPlayersFetch: number
    setLastPlayersFetch: React.Dispatch<React.SetStateAction<number>>

    menuWide: boolean
    setMenuWide: (v: boolean) => void

    // Game Data
    gameData: GameData
    setGameData: (d: React.SetStateAction<GameData>) => void
    staffMessages: any[]
    setStaffMessages: React.Dispatch<React.SetStateAction<any[]>>

    // Overlay states
    vehicleDev: VehicleDevData | null
    setVehicleDev: (v: VehicleDevData | null) => void
    showCoords: CoordsData | null
    setShowCoords: (v: CoordsData | null) => void
    entityInfo: EntityInfoData | null
    setEntityInfo: (v: EntityInfoData | null) => void

    // User Permissions
    myPermissions: string[]
    setMyPermissions: (p: string[]) => void
    permissionRefreshTrigger: number
    setPermissionRefreshTrigger: React.Dispatch<React.SetStateAction<number>>

    // Dynamic Settings
    settings: Record<string, any>
    setSettings: React.Dispatch<React.SetStateAction<Record<string, any>>>

    // Mocks
    useMocks: boolean
    setUseMocks: (v: boolean) => void
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined)

export function AppStateProvider({ children }: { children: ReactNode }) {
    const [players, setPlayers] = useState<Player[]>([])
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

    const [pagination, setPagination] = useState<PaginationState>({
        page: 1, limit: 20, total: 0, totalPages: 1, search: ''
    })

    const [lastPlayersFetch, setLastPlayersFetch] = useState<number>(0)

    const [menuWide, setMenuWide] = useState<boolean>(false)
    const [myPermissions, setMyPermissions] = useState<string[]>([]) // Start empty
    const [permissionRefreshTrigger, setPermissionRefreshTrigger] = useState<number>(0)

    const [gameData, setGameData] = useState<GameData>({
        items: [],
        jobs: [],
        gangs: [],
        locations: [],
        peds: [],
        vehicles: [],
        actions: {},
        playerActions: {},
        otherActions: {},
        resources: [],
        commands: [],
        vehicleImages: '',
        bans: [],
        descriptions: {},
        settingOptions: {}
    })

    const [vehicleDev, setVehicleDev] = useState<VehicleDevData | null>(null)
    const [showCoords, setShowCoords] = useState<CoordsData | null>(null)
    const [entityInfo, setEntityInfo] = useState<EntityInfoData | null>(null)
    const [staffMessages, setStaffMessages] = useState<any[]>([])

    const [settings, setSettings] = useState<Record<string, any>>({})
    const [useMocks, setUseMocks] = useState<boolean>(false)


    return (
        <AppStateContext.Provider value={{
            players, setPlayers,
            selectedPlayer, setSelectedPlayer,
            pagination, setPagination,
            lastPlayersFetch, setLastPlayersFetch,
            menuWide, setMenuWide,
            gameData, setGameData,
            staffMessages, setStaffMessages,
            vehicleDev, setVehicleDev,
            showCoords, setShowCoords,
            entityInfo, setEntityInfo,
            myPermissions, setMyPermissions,
            permissionRefreshTrigger, setPermissionRefreshTrigger,
            settings, setSettings,
            useMocks, setUseMocks
        }}>
            {children}
        </AppStateContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState() {
    const ctx = useContext(AppStateContext)
    if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
    return ctx
}
