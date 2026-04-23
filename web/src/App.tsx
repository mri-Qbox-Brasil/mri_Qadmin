import { useState, useEffect, useMemo } from 'react'
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
import Vehicles from '@/pages/Vehicles'
import Groups from '@/pages/Groups'
import Credits from '@/pages/Credits'
import Settings from '@/pages/Settings'
import Permissions from '@/pages/Permissions/Permissions'
import LiveMapPage from './pages/LiveMapPage'
import LiveScreensPage from './pages/LiveScreensPage'
import Logs from '@/pages/Logs'
import NearbyEntities from '@/components/overlays/NearbyEntities'

import { useAppState } from '@/context/AppState'
import { useTheme } from '@/context/ThemeContext'
import { useNui } from '@/context/NuiContext'
import WebRTCStreamer from '@/components/WebRTCStreamer'
import { isEnvBrowser } from '@/utils/misc'
import { MOCK_GAME_DATA, MOCK_PLAYERS } from '@/utils/mockData'

import { hasPermission, PAGE_PERMISSIONS } from '@/utils/permissions'

// ... existing imports

export default function App() {
    const [route, setRoute] = useState<'staffchat' | 'players' | 'resources' | 'actions' | 'items' | 'vehicles' | 'groups' | 'credits' | 'dashboard' | 'settings' | 'permissions' | 'livemap' | 'livescreens' | 'logs'>('dashboard')
    const { players, setSelectedPlayer, setGameData, setPlayers, myPermissions, setMyPermissions, setSettings } = useAppState()
    const { on, off, sendNui } = useNui()
    const { scale } = useTheme()
    const isDev = (import.meta as any)?.env?.DEV === true
    const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const devParam = query ? query.get('devpanel') === '1' : false
    const devStorage = typeof window !== 'undefined' ? window.localStorage.getItem('ps:devOpen') === '1' : false
    const [visible, setVisible] = useState<boolean>(isDev || isEnvBrowser() || devParam || devStorage)
    const [autoScale, setAutoScale] = useState(1)

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            if (width > 1920) {
                setAutoScale(width / 1920);
            } else {
                setAutoScale(1);
            }
        };

        window.addEventListener('resize', updateScale);
        updateScale();
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    useEffect(() => {
        const handler = (e: any) => {
            const detail = e?.detail || {}
            const { route: r, playerId } = detail
            if (!r) return

            // Permission Check for navigation
            // Special case for dashboard: allow if either dashboard or commands permission is present
            if (r === 'dashboard') {
                if (!hasPermission(myPermissions, 'qadmin.page.dashboard') && !hasPermission(myPermissions, 'qadmin.page.commands')) {
                    return
                }
            } else if (r in PAGE_PERMISSIONS) {
                const perm = PAGE_PERMISSIONS[r as keyof typeof PAGE_PERMISSIONS]
                if (!hasPermission(myPermissions, perm)) {
                    return
                }
            }

            if (r === 'players') {
                const p = players?.find((x: any) => String(x.id) === String(playerId))
                if (p) {
                    setSelectedPlayer(p)
                } else if (playerId) {
                    (window as any).__ps_pendingPlayerId = playerId
                }
                setRoute('players')
                return
            }
            setRoute(r)
        }

        window.addEventListener('ps:navigate', handler as EventListener)
        return () => window.removeEventListener('ps:navigate', handler as EventListener)
    }, [players, setSelectedPlayer, myPermissions])

    useEffect(() => {
        if (isEnvBrowser()) {
            setGameData(MOCK_GAME_DATA)
            setPlayers(MOCK_PLAYERS)
            setSettings({ MapBaseUrl: 'https://assets.mriqbox.com.br/admin/map/' }) // Mock CDN for browser dev
            setMyPermissions(['qadmin.page.*', 'action.*']) // Full access to pages and actions in dev
        }
    }, [setGameData, setPlayers, setMyPermissions, setSettings])

    // Correct implementation:
    const { setPermissionRefreshTrigger } = useAppState()

    useEffect(() => {
        const onPerms = (perms: string[]) => {
            setMyPermissions(Array.isArray(perms) ? perms : [])
        }
        const onRefreshLists = () => {
            setPermissionRefreshTrigger(prev => prev + 1)
        }

        const onSettingsUpdate = (data: Record<string, any>) => {
            setSettings(data)
        }

        on('updatePermissions', onPerms)
        on('refreshPermissionsLists', onRefreshLists)
        on('updateSettings', onSettingsUpdate)

        return () => {
            off('updatePermissions', onPerms)
            off('refreshPermissionsLists', onRefreshLists)
            off('updateSettings', onSettingsUpdate)
        }
    }, [on, off, setMyPermissions, setPermissionRefreshTrigger, setSettings])

    // Derived route based on permissions
    const effectiveRoute = useMemo(() => {
        if (route === 'dashboard') {
            if (!hasPermission(myPermissions, 'qadmin.page.dashboard') && !hasPermission(myPermissions, 'qadmin.page.commands')) {
                const firstAllowed = Object.entries(PAGE_PERMISSIONS).find(([, p]) => hasPermission(myPermissions, p))
                return firstAllowed ? firstAllowed[0] : 'no_access'
            }
        } else if (route in PAGE_PERMISSIONS) {
            const perm = PAGE_PERMISSIONS[route as keyof typeof PAGE_PERMISSIONS]
            if (!hasPermission(myPermissions, perm)) {
                // Find first permitted page as fallback
                const firstAllowed = Object.entries(PAGE_PERMISSIONS).find(([, p]) => hasPermission(myPermissions, p))
                return firstAllowed ? firstAllowed[0] : 'no_access'
            }
        }
        return route
    }, [route, myPermissions])

    // Sync state back to dashboard if access is revoked (Side effect)
    // Removed setRoute in useEffect to avoid cascading renders. 
    // effectiveRoute handles the correct view rendering.

    // Listen for NUI visibility messages from the client resource
    useEffect(() => {
        const onVisible = (data: any) => {
            const newVis = typeof data === 'object' && 'data' in data ? Boolean(data.data) : Boolean(data)
            setVisible(newVis)

            if (newVis && !isEnvBrowser()) {
                // Fetch permissions
                sendNui('mri_Qadmin:callback:GetMyPermissions').then((perms) => {
                    if (Array.isArray(perms)) setMyPermissions(perms)
                }).catch(console.error)

                // Fetch Dynamic Settings
                sendNui('getSettings').then((settingsData) => {
                    if (settingsData && typeof settingsData === 'object') {
                        setSettings(settingsData)
                    }
                }).catch(console.error)
            }


        }
        on('setVisible', onVisible)
        return () => off('setVisible', onVisible)
    }, [on, off, sendNui, setMyPermissions, setSettings])



    // expose helper in dev so user can toggle persistent dev-open state
    useEffect(() => {
        if (!isDev) return
            ; (window as any).psToggleDevPanel = (persist?: boolean) => {
                setVisible(prev => {
                    const newVis = !prev
                    if (persist) window.localStorage.setItem('ps:devOpen', newVis ? '1' : '0')
                    return newVis
                })
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
                } catch {
                    // ignore
                }

                if (visible) {
                    try {
                        // notify client to hide UI (client may also call SetNuiFocus(false))
                        if (sendNui) sendNui('hideUI')
                    } catch {
                        // ignore
                        setVisible(false)
                    }
                }
            }
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [visible, sendNui, setVisible])

    // if (!visible) return null // REMOVED: We need WebRTCStreamer to stay mounted!

    return (
        <>
            <div
                className="app-shell bg-background text-foreground"
                style={{
                    display: visible ? 'flex' : 'none',
                    transform: `scale(${(scale / 100) * autoScale})`,
                    transformOrigin: 'center'
                }}
            >

                {/* Overlays */}
                {(() => {
                    const handleRoute = (r: any) => {
                        if (r === 'devmode') {
                            sendNui('clickButton', { data: 'toggleDevmode' })
                            return
                        }
                        setRoute(r)
                    }

                    return <Sidebar onRoute={handleRoute} currentRoute={effectiveRoute} />
                })()}
                <div className="flex-1 p-2 overflow-hidden flex flex-col min-h-0 min-w-0">
                    {effectiveRoute === 'no_access' ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                            <span className="text-4xl">🔒</span>
                            <p className="text-sm font-medium">Sem permissão de acesso</p>
                        </div>
                    ) : effectiveRoute === 'resources' ? <Resources /> :
                        effectiveRoute === 'players' ? <Players /> :
                            effectiveRoute === 'actions' ? <Actions /> :
                                effectiveRoute === 'staffchat' ? <StaffChat /> :
                                            effectiveRoute === 'items' ? <Items /> :
                                                effectiveRoute === 'vehicles' ? <Vehicles /> :
                                                        effectiveRoute === 'groups' ? <Groups /> :
                                                            effectiveRoute === 'credits' ? <Credits /> :
                                                                effectiveRoute === 'settings' ? <Settings /> :
                                                                    effectiveRoute === 'dashboard' ? <Dashboard /> :
                                                                        effectiveRoute === 'permissions' ? <Permissions /> :
                                                                            effectiveRoute === 'livemap' ? <LiveMapPage /> :
                                                                                effectiveRoute === 'livescreens' ? <LiveScreensPage /> :
                                                                                    effectiveRoute === 'logs' ? <Logs /> :
                                                                                        null}
                </div>
            </div>
            {/* Background elements and Overlays */}
            <Listeners />
            
            {/* Left side overlays container */}
            <div className="fixed inset-y-0 left-0 flex flex-col justify-center gap-4 z-50 pointer-events-none">
                <ToggleCoords />
                <VehicleDev />
                <EntityInformation />
            </div>

            <NearbyEntities />
            <WebRTCStreamer />


        </>
    )
}
