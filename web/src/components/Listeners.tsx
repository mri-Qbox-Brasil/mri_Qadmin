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
    setStaffMessages
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
    }

    const setResourceData = (data: any) => {
      setGameData((prev: any) => ({ ...prev, resources: data }))
    }

    const setPlayersData = (data: any) => {
      setPlayers(data)
    }

    const onData = (data: any) => {
      setGameData((prev: any) => ({
        ...prev,
        ...data,
        peds: data.pedlist || prev.peds || []
      }))
      setPlayers(data.players || [])
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
      setStaffMessages(data)
    }

    on('setupUI', setupUI)
    on('setResourceData', setResourceData)
    on('setPlayersData', setPlayersData)
    on('data', onData)
    on('showVehicleMenu', showVehicleMenu)
    on('showCoordsMenu', showCoordsMenu)
    on('showEntityInfo', showEntityInfo)
    on('setMessages', setMessages)

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
