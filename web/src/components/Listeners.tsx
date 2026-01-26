import { useEffect } from 'react'
import { useNui } from '../context/NuiContext'
import { useAppState } from '../context/AppState'

export default function Listeners() {
  const { on, off, sendNui } = useNui()
  const {
    setPlayers,
    setVehicleDev,
    setShowCoords,
    setEntityInfo,
    setGameData,
    setStaffMessages,
    setMyPermissions
  } = useAppState()

  useEffect(() => {
    const setupUI = (data: any) => {
      setGameData((prev: any) => ({
        ...prev,
        ...data
      }))
      if (data.server) {
        // Option: we could store server info in AppState too if we want it global
      }
      if (data.permissions) {
        setMyPermissions(Array.isArray(data.permissions) ? data.permissions : [])
      }
    }

    const setResourceData = (data: any) => {
      setGameData((prev: any) => ({ ...prev, resources: Array.isArray(data) ? data : [] }))
    }

    const setPlayersData = (data: any) => {
      setPlayers(Array.isArray(data) ? data : [])
    }

    const onData = (data: any) => {
      // Helper to ensure array
      const asArray = (arr: any) => Array.isArray(arr) ? arr : []

      setGameData((prev: any) => ({
        ...prev,
        ...data,
        items: asArray(data.items),
        jobs: asArray(data.jobs),
        gangs: asArray(data.gangs),
        locations: asArray(data.locations),
        peds: Array.isArray(data.pedlist) ? data.pedlist : (Array.isArray(prev.peds) ? prev.peds : []),
        vehicles: asArray(data.vehicles),
        commands: asArray(data.commands),
        bans: asArray(data.bans),
        // Actions can be object or array, handled by component
        actions: data.actions || prev.actions || []
      }))
      setPlayers(asArray(data.players || []))
    }

    const showVehicleMenu = (data: any) => {
      setVehicleDev(data)
    }

    const showCoordsMenu = (data: any) => {
      setShowCoords(data)
    }

    const showEntityInfo = (data: any) => {
      setEntityInfo(data)
    }

    const setMessages = (data: any) => {
      setStaffMessages(Array.isArray(data) ? data : (data && Array.isArray(data.messages) ? data.messages : []))
    }

    const setPermissions = (data: any) => {
        setMyPermissions(Array.isArray(data) ? data : [])
    }

    on('setupUI', setupUI)
    on('setResourceData', setResourceData)
    on('setPlayersData', setPlayersData)
    on('data', onData)
    on('showVehicleMenu', showVehicleMenu)
    on('showCoordsMenu', showCoordsMenu)
    on('showEntityInfo', showEntityInfo)
    on('setMessages', setMessages)
    on('updatePermissions', setPermissions)

    // Request initial data to avoid race conditions
    sendNui('getData').then(onData)

    return () => {
      off('setupUI', setupUI)
      off('setResourceData', setResourceData)
      off('setPlayersData', setPlayersData)
      off('data', onData)
      off('showVehicleMenu', showVehicleMenu)
      off('showCoordsMenu', showCoordsMenu)
      off('showEntityInfo', showEntityInfo)
      off('setMessages', setMessages)
    }
  }, [on, off, setPlayers, setVehicleDev, setShowCoords, setEntityInfo, setGameData])

  return null
}
