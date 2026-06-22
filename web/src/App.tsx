import { useState, useEffect, useMemo } from 'react'
import Dashboard from '@/pages/Dashboard/Dashboard'
import Players from '@/pages/Players'
import Items from '@/pages/Items'
import Sidebar from '@/components/Sidebar'
import { MriPluginHost } from '@/plugin/MriPluginHost'
import { MriPluginManifest } from '@/plugin/types'
import { useI18n } from '@/hooks/useI18n'
import { MriTabletFrame } from '@mriqbox/ui-kit'
import Listeners from '@/components/Listeners'
import UpdateBanner from '@/components/UpdateBanner'
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
import Vip from '@/pages/Vip'
import NearbyEntities from '@/components/overlays/NearbyEntities'

import { useAppState } from '@/context/AppState'
import { useTheme } from '@/context/ThemeContext'
import { useNui } from '@/context/NuiContext'
import WebRTCStreamer from '@/components/WebRTCStreamer'
import { isEnvBrowser } from '@/utils/misc'
import { MOCK_GAME_DATA, MOCK_PLAYERS, MOCK_PLUGINS } from '@/utils/mockData'

import { hasPermission, getPagePermissions } from '@/utils/permissions'

export default function App() {
    // Routes built-in tipadas + escape pra `plugin:{id}` (string aberta)
    const [route, setRoute] = useState<string>('dashboard')
    const { players, setSelectedPlayer, setGameData, setPlayers, myPermissions, setMyPermissions, setSettings, permissionDefinitions, setPermissionDefinitions } = useAppState()
    const pagePermissions = useMemo(() => getPagePermissions(permissionDefinitions), [permissionDefinitions])
    const { on, off, sendNui } = useNui()
    const { scale, accentColor, backgroundColor } = useTheme()
    const { locale } = useI18n()
    const [plugins, setPlugins] = useState<Record<string, MriPluginManifest>>({})
    const isDev = (import.meta as any)?.env?.DEV === true
    const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const devParam = query ? query.get('devpanel') === '1' : false
    const devStorage = typeof window !== 'undefined' ? window.localStorage.getItem('ps:devOpen') === '1' : false
    const [visible, setVisible] = useState<boolean>(isDev || isEnvBrowser() || devParam || devStorage)
    const [frameVisible, setFrameVisible] = useState<boolean>(isDev || isEnvBrowser() || devParam || devStorage)
    const [panelPhase, setPanelPhase] = useState<'closed' | 'opening' | 'open' | 'closing'>(
        (isDev || isEnvBrowser() || devParam || devStorage) ? 'open' : 'closed'
    )
    const [autoScale, setAutoScale] = useState(1)

    useEffect(() => {
        let openTimer: ReturnType<typeof setTimeout> | undefined
        let closeTimer: ReturnType<typeof setTimeout> | undefined

        // Maquina de estado de animacao orientada pela prop `visible`: precisa
        // setar estado de forma sincrona ao montar/desmontar o frame.
        /* eslint-disable react-hooks/set-state-in-effect */
        if (visible) {
            setFrameVisible(true)
            setPanelPhase(prev => prev === 'open' ? prev : 'opening')
            openTimer = setTimeout(() => setPanelPhase('open'), 180)
        } else if (frameVisible) {
            setPanelPhase('closing')
            closeTimer = setTimeout(() => {
                setFrameVisible(false)
                setPanelPhase('closed')
            }, 120)
        }
        /* eslint-enable react-hooks/set-state-in-effect */

        return () => {
            if (openTimer) clearTimeout(openTimer)
            if (closeTimer) clearTimeout(closeTimer)
        }
    }, [visible, frameVisible])

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
            } else if (r in pagePermissions) {
                const perm = pagePermissions[r]
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
    }, [players, setSelectedPlayer, myPermissions, pagePermissions])

    useEffect(() => {
        // Seed de dados mock apenas no navegador (dev), uma vez no mount.
        /* eslint-disable react-hooks/set-state-in-effect */
        if (isEnvBrowser()) {
            setGameData(MOCK_GAME_DATA)
            setPlayers(MOCK_PLAYERS)
            setSettings({ MapBaseUrl: 'https://assets.mriqbox.com.br/admin/map/' })
            setMyPermissions(['qadmin.page.*', 'qadmin.action.*'])
            setPermissionDefinitions(MOCK_GAME_DATA.permissionDefinitions)
            setPlugins(MOCK_PLUGINS)
        }
        /* eslint-enable react-hooks/set-state-in-effect */
    }, [setGameData, setPlayers, setMyPermissions, setSettings, setPermissionDefinitions])

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

    // Plugin registry sync — fetch lista inicial + listen broadcasts em runtime.
    useEffect(() => {
        if (isEnvBrowser()) return
        sendNui<Record<string, MriPluginManifest>>('getPlugins')
            .then((p) => {
                if (p && typeof p === 'object') setPlugins(p)
            })
            .catch(console.error)

        const onPluginsUpdated = (data: { plugins?: Record<string, MriPluginManifest> } | undefined) => {
            const next = data?.plugins
            if (next && typeof next === 'object') setPlugins(next)
        }
        on('pluginsUpdated', onPluginsUpdated)
        return () => off('pluginsUpdated', onPluginsUpdated)
    }, [on, off, sendNui])

    // Derived route based on permissions
    const effectiveRoute = useMemo(() => {
        // Plugin routes: server-side ja filtrou por ACE perm antes de mandar
        // o manifest. Se o plugin chegou no client, e acessivel pelo user.
        if (route.startsWith('plugin:')) {
            const id = route.slice('plugin:'.length)
            const manifest = plugins[id]
            return manifest ? route : 'no_access' // 'no_access' so se resource parou
        }

        if (route === 'dashboard') {
            if (!hasPermission(myPermissions, 'qadmin.page.dashboard') && !hasPermission(myPermissions, 'qadmin.page.commands')) {
                const firstAllowed = Object.entries(pagePermissions).find(([, p]) => hasPermission(myPermissions, p))
                return firstAllowed ? firstAllowed[0] : 'no_access'
            }
        } else if (route in pagePermissions) {
            const perm = pagePermissions[route]
            if (!hasPermission(myPermissions, perm)) {
                const firstAllowed = Object.entries(pagePermissions).find(([, p]) => hasPermission(myPermissions, p))
                return firstAllowed ? firstAllowed[0] : 'no_access'
            }
        } else if (route !== 'credits') {
            if (permissionDefinitions.length === 0) {
                const firstAllowed = Object.entries(pagePermissions).find(([, p]) => hasPermission(myPermissions, p))
                return firstAllowed ? firstAllowed[0] : 'no_access'
            }
        }
        return route
    }, [route, myPermissions, pagePermissions, permissionDefinitions, plugins])

    useEffect(() => {
        const onVisible = (data: any) => {
            const newVis = typeof data === 'object' && 'data' in data ? Boolean(data.data) : Boolean(data)
            setVisible(newVis)

            if (newVis && !isEnvBrowser()) {
                sendNui('mri_Qadmin:callback:GetMyPermissions').then((perms) => {
                    if (Array.isArray(perms)) setMyPermissions(perms)
                }).catch(console.error)

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
            {frameVisible && (
            <MriTabletFrame
                visible={frameVisible}
                scale={scale * autoScale}
                size="lg"
            >
                {/* Wrapper flex obrigatorio: MriTabletFrame forca display:block
                    via inline style, entao o layout sidebar+conteudo precisa
                    do flex container interno. */}
                <div className={`admin-panel-shell ${panelPhase === 'opening' ? 'is-opening' : panelPhase === 'closing' ? 'is-closing' : panelPhase === 'open' ? 'is-open' : ''}`}>
                <div className="flex w-full h-full">
                {/* Overlays */}
                {(() => {
                    const handleRoute = (r: any) => {
                        if (r === 'devmode') {
                            sendNui('clickButton', { data: 'toggleDevmode' })
                            sendNui('hideUI')
                            return
                        }
                        setRoute(r)
                    }

                    return <Sidebar onRoute={handleRoute} currentRoute={effectiveRoute} plugins={plugins} />
                })()}
                <div className="flex-1 p-2 overflow-hidden flex flex-col min-h-0 min-w-0">
                    <UpdateBanner />
                    {effectiveRoute === 'no_access' ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                            <span className="text-4xl">🔒</span>
                            <p className="text-sm font-medium">Sem permissão de acesso</p>
                        </div>
                    ) : effectiveRoute.startsWith('plugin:') ? (
                        (() => {
                            const id = effectiveRoute.slice('plugin:'.length)
                            const manifest = plugins[id]
                            if (!manifest) return null
                            return (
                                <MriPluginHost
                                    manifest={manifest}
                                    accentColor={accentColor}
                                    backgroundColor={backgroundColor}
                                    locale={locale}
                                    perms={myPermissions}
                                    onRequestClose={() => sendNui('hideUI')}
                                />
                            )
                        })()
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
                                                                            effectiveRoute === 'vip' ? <Vip /> :
                                                                            null}
                </div>
                </div>
                </div>
            </MriTabletFrame>
            )}
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
