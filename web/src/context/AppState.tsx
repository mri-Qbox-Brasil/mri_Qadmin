import React, { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type Player = any

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
  actions: any[] | Record<string, any>
  resources: any[]
  commands: any[]
  vehicleImages: string
  bans: any[]
  webrtcUrl?: string
  signalingProvider?: 'websocket' | 'fivem-native' | 'cloudflare-sfu'
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

interface AppStateValue {
  players: Player[]
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>
  selectedPlayer: Player | null
  setSelectedPlayer: (p: Player | null) => void

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
    actions: [],
    resources: [],
    commands: [],
    vehicleImages: '',
    bans: []
  })

  const [vehicleDev, setVehicleDev] = useState<VehicleDevData | null>(null)
  const [showCoords, setShowCoords] = useState<CoordsData | null>(null)
  const [entityInfo, setEntityInfo] = useState<EntityInfoData | null>(null)
  const [staffMessages, setStaffMessages] = useState<any[]>([])

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
      permissionRefreshTrigger, setPermissionRefreshTrigger
    }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
