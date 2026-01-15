import { useState, useEffect } from 'react'
import Dashboard from '@/pages/Dashboard/Dashboard'
import Players from '@/pages/Players'
import Items from '@/pages/Items'
import Sidebar from '@/components/Sidebar'
import Listeners from '@/components/Listeners'
import VehicleDev from '@/components/overlays/VehicleDev'
import ToggleCoords from '@/components/overlays/ToggleCoords'
import EntityInformation from '@/components/overlays/EntityInformation'
import Actions from '@/pages/Actions/Actions'
import Resources from '@/pages/Resources/Resources'
import StaffChat from '@/pages/StaffChat/StaffChat'
import Commands from '@/pages/Commands/Commands'
import Bans from '@/pages/Bans'
import Vehicles from '@/pages/Vehicles'
import Groups from '@/pages/Groups'
import Credits from '@/pages/Credits'
import Settings from '@/pages/Settings'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { isEnvBrowser } from '@/utils/misc'
import { MOCK_GAME_DATA, MOCK_PLAYERS } from '@/utils/mockData'

export default function App() {
  const [route, setRoute] = useState<'staffchat' | 'players' | 'resources' | 'commands' | 'actions' | 'items' | 'bans' | 'vehicles' | 'groups' | 'credits' | 'dashboard' | 'settings'>('dashboard')
  const { players, setSelectedPlayer, setGameData, setPlayers } = useAppState()
  const { on, off, sendNui } = useNui()
  const isDev = (import.meta as any)?.env?.DEV === true
  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const devParam = query ? query.get('devpanel') === '1' : false
  const devStorage = typeof window !== 'undefined' ? window.localStorage.getItem('ps:devOpen') === '1' : false
  const [visible, setVisible] = useState<boolean>(isDev || devParam || devStorage)

  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail || {}
      const { route: r, playerId } = detail
      if (!r) return
      if (r === 'players') {
        // try to find player in current state
        const p = players?.find((x: any) => String(x.id) === String(playerId))
        if (p) {
          setSelectedPlayer(p)
        } else if (playerId) {
          // store pending id so Players can pick it up after loading
          (window as any).__ps_pendingPlayerId = playerId
        }
        setRoute('players')
        return
      }
      setRoute(r)
    }

    window.addEventListener('ps:navigate', handler as EventListener)
    return () => window.removeEventListener('ps:navigate', handler as EventListener)
  }, [players, setSelectedPlayer])

  useEffect(() => {
    if (isEnvBrowser()) {
      setGameData(MOCK_GAME_DATA)
      setPlayers(MOCK_PLAYERS)
    }
  }, [setGameData, setPlayers])

  // Listen for NUI visibility messages from the client resource
  useEffect(() => {
    const onVisible = (data: any) => {
      console.log('[App] Received setVisible:', data)
      const newVis = typeof data === 'object' && 'data' in data ? Boolean(data.data) : Boolean(data)
      setVisible(newVis)
      try {
        const root = document.getElementById('root')
        if (root) root.style.display = newVis ? '' : 'none'
      } catch (e) {
        // ignore in non-browser environments
      }
    }
    on('setVisible', onVisible)
    return () => off('setVisible', onVisible)
  }, [on, off])

  // ensure root display follows `visible` (covers initial dev mode)
  useEffect(() => {
    try {
      const root = document.getElementById('root')
      if (root) root.style.display = visible ? '' : 'none'
    } catch (e) {}
  }, [visible])

  // expose helper in dev so user can toggle persistent dev-open state
  useEffect(() => {
    if (!isDev) return
    ;(window as any).psToggleDevPanel = (persist?: boolean) => {
      const newVis = !(document.getElementById('root')?.style.display === '' )
      if (persist) window.localStorage.setItem('ps:devOpen', newVis ? '1' : '0')
      setVisible(newVis)
    }
  }, [isDev])

  // Close the entire UI when Escape is pressed (mimic previous Svelte behaviour)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        // if a modal is open, let the modal handle Escape instead of closing whole UI
        try {
          if ((document.body as any).dataset && (document.body as any).dataset.psModalOpen === 'true') {
            return
          }
        } catch (err) {}
        if (visible) {
          try {
            // notify client to hide UI (client may also call SetNuiFocus(false))
            sendNui && sendNui('hideUI')
          } catch (err) {
            // ignore
            setVisible(false)
            try {
              const root = document.getElementById('root')
              if (root) root.style.display = 'none'
            } catch (e) {}
          }
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, sendNui])

  if (!visible) return null

  return (
    <div className="app-shell bg-background text-foreground">
      <Listeners />

      {/* Overlays */}
      <VehicleDev />
      <ToggleCoords />
      <EntityInformation />

      <Sidebar onRoute={setRoute} currentRoute={route} />
      <div className="flex-1 p-2 overflow-auto">
        {route === 'resources' ? <Resources /> :
         route === 'players' ? <Players /> :
         route === 'actions' ? <Actions /> :
         route === 'staffchat' ? <StaffChat /> :
         route === 'commands' ? <Commands /> :
         route === 'items' ? <Items /> :
         route === 'bans' ? <Bans /> :
         route === 'vehicles' ? <Vehicles /> :
         route === 'groups' ? <Groups /> :
         route === 'credits' ? <Credits /> :
         route === 'settings' ? <Settings /> :
         route === 'dashboard' ? <Dashboard /> :
         null}
      </div>
    </div>
  )
}
