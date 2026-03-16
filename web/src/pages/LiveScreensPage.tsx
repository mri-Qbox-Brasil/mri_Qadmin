import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { MriPageHeader, MriCard, MriPlayerScreenStream } from '@mriqbox/ui-kit'
import { Monitor, X, Video, Wifi, Maximize2, Minimize2, Keyboard } from 'lucide-react'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { useI18n } from '@/hooks/useI18n'
import { signaling } from '@/utils/signaling'
import { subscribeFromCF } from '@/utils/cf-sfu'
import { cn } from '@/lib/utils'
import { MOCK_PLAYERS } from '@/utils/mockData'

interface WatchedPlayer {
    id: number
    name: string
    loading: boolean
    showKeyboard?: boolean
    error?: string
}

export default function LiveScreensPage() {
    const { sendNui, on, off } = useNui()
    const { gameData, settings } = useAppState()
    const { t } = useI18n()
    const [players, setPlayers] = useState<any[]>([])
    const [watching, setWatching] = useState<WatchedPlayer[]>([])
    const [maximizedId, setMaximizedId] = useState<number | null>(null)

    // Fetch online-only player list
    useEffect(() => {
        sendNui('getPlayers', { page: 1, limit: 200, search: '' }, { data: MOCK_PLAYERS }).then((res: any) => {
            const list = res.data || (Array.isArray(res) ? res : [])
            if (list) setPlayers(list.filter((p: any) => p.online === true))
        })
    }, [sendNui])

    // Use a ref to track active streams for unmount cleanup
    const watchingRef = useRef<WatchedPlayer[]>([])
    useEffect(() => { watchingRef.current = watching }, [watching])

    const selfIdValue = (gameData as any)?.selfId;
    const selfIdRef = useRef(selfIdValue);
    useEffect(() => { if (selfIdValue) selfIdRef.current = selfIdValue }, [selfIdValue]);

    // Initialize signaling for the viewer role
    useEffect(() => {
        if (!selfIdRef.current) return;
        const url = settings?.WebRTCUrl || gameData.webrtcUrl || null;
        const provider = (settings?.SignalingProvider || gameData.signalingProvider || 'websocket') as any;
        signaling.init(url, String(selfIdRef.current), provider);
    }, [gameData.webrtcUrl, gameData.signalingProvider, settings?.WebRTCUrl, settings?.SignalingProvider]);

    const streamLabels = useMemo(() => ({
        connecting: t('stream_connecting'),
        error_title: t('stream_error_title'),
        error_desc: t('stream_error_desc'),
        retry: t('stream_retry'),
        live: t('stream_live'),
        stable: t('stream_stable'),
        mock_active: t('stream_mock_active'),
        simulator: t('stream_simulator')
    }), [t]);

    const wrappedSendNui = useCallback((event: string, data: any) => {
        if ((event === 'GetPlayerScreen' || event === 'StopPlayerScreen') && !data.viewerId) {
            const target = data.targetId || 'unknown';
            data.viewerId = `list-${selfIdRef.current || 'unknown'}-${target}`;
        }
        return sendNui(event, data);
    }, [sendNui]);

    // Effect to handle stream initiation after component mounting (to avoid race conditions)
    const lastWatchingRef = useRef<number[]>([]);
    useEffect(() => {
        const currentIds = watching.map(w => w.id);
        const added = currentIds.filter(id => !lastWatchingRef.current.includes(id));

        added.forEach(id => {
            wrappedSendNui('GetPlayerScreen', { targetId: id }).catch(err => {
                console.error('[LiveScreens] Request failed for', id, err);
            });
        });

        lastWatchingRef.current = currentIds;
    }, [watching, wrappedSendNui]);

    useEffect(() => {
        return () => {
            // Stop all active streams when navigating away from the page
            watchingRef.current.forEach((p: WatchedPlayer) => {
                wrappedSendNui('StopPlayerScreen', {
                    targetId: p.id
                }).catch(() => { })
            })
        }
    }, [wrappedSendNui])

    const toggleWatch = useCallback((player: any) => {
        setWatching(prev => {
            if (prev.find(w => w.id === player.id)) {
                if (maximizedId === player.id) setMaximizedId(null)
                wrappedSendNui('StopPlayerScreen', { targetId: player.id }).catch(() => { })
                return prev.filter(w => w.id !== player.id);
            }
            return [...prev, { id: player.id, name: player.name, loading: true, showKeyboard: false }];
        });
    }, [maximizedId, wrappedSendNui]);

    const toggleMaximize = (id: number) => {
        setMaximizedId(prev => prev === id ? null : id)
    }

    const toggleKeyboard = (id: number) => {
        setWatching(prev => prev.map(w => w.id === id ? { ...w, showKeyboard: !w.showKeyboard } : w))
    }

    return (
        <div className="h-full flex flex-col bg-background relative overflow-hidden">
            <MriPageHeader title={t('livescreens_title') || "Live Screens Dashboard"} icon={Monitor} />

            <div className="flex-1 pt-4 p-2 overflow-hidden flex flex-col gap-4 relative">
                {/* Active feeds grid */}
                <div className="flex-1 border rounded-xl p-4 overflow-auto bg-card/50 relative">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Video className="w-5 h-5 text-red-500" />
                            {t('livescreens_active') || "Active Feeds"} ({watching.length})
                        </h2>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Wifi className="w-3 h-3" />
                            {t('livescreens_webrtc') || "WebRTC Live"}
                        </div>
                    </div>

                    {watching.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                            {t('livescreens_empty') || "Select players below to watch their screen"}
                        </div>
                    ) : (
                        <div className={cn(
                            "grid gap-4 transition-all duration-300",
                            maximizedId
                                ? "grid-cols-1 h-full"
                                : "grid-cols-4"
                        )}>
                            {watching.map(p => {
                                const isMax = maximizedId === p.id
                                if (maximizedId && !isMax) return null // Hide others when one is maximized for clean view

                                return (
                                    <MriCard
                                        key={p.id}
                                        className={cn(
                                            "overflow-hidden flex flex-col bg-background transition-all duration-300",
                                            isMax ? "h-full min-h-[400px]" : "aspect-[16/10]"
                                        )}
                                    >
                                        <div className="p-2 border-b flex justify-between items-center bg-muted/50">
                                            <span className="font-bold truncate text-sm">
                                                {p.name} <span className="text-muted-foreground font-normal">#{p.id}</span>
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => toggleKeyboard(p.id)}
                                                    className={cn(
                                                        "p-1 rounded transition-colors",
                                                        p.showKeyboard ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                                    )}
                                                    title={p.showKeyboard ? "Ocultar teclado" : "Mostrar teclado"}
                                                >
                                                    <Keyboard className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => toggleMaximize(p.id)}
                                                    className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                                    title={isMax ? "Minimizar" : "Maximizar"}
                                                >
                                                    {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                                </button>
                                                <button
                                                    onClick={() => toggleWatch(p)}
                                                    className="p-1 rounded text-muted-foreground hover:bg-destructive hover:text-white transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <MriPlayerScreenStream
                                            playerId={p.id}
                                            playerName={p.name}
                                            showKeyboard={p.showKeyboard}
                                            className="flex-1"
                                            onSendNui={wrappedSendNui}
                                            onNuiEvent={(event: string, cb: any) => {
                                                on(event, cb);
                                                return () => off(event, cb);
                                            }}
                                            signaling={signaling as any}
                                            subscribeFromCF={subscribeFromCF}
                                            webrtcConfig={settings?.webrtc}
                                            selfId={`list-${selfIdValue || 'unknown'}-${p.id}`}
                                            labels={streamLabels}
                                        />
                                    </MriCard>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Player selector */}
                {!maximizedId && (
                    <div className="h-1/3 border rounded-xl p-4 overflow-hidden flex flex-col bg-card shrink-0">
                        <h3 className="font-semibold mb-2">{t('livescreens_available') || "Available Players"}</h3>
                        <div className="overflow-auto flex-1">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {players.map(p => {
                                    const isWatching = watching.some(w => w.id === p.id)
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => toggleWatch(p)}
                                            className={cn(
                                                "flex items-center gap-2 p-2 rounded border text-sm transition-colors",
                                                isWatching
                                                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                                    : 'hover:bg-accent border-transparent hover:border-border'
                                            )}
                                        >
                                            {isWatching ? <X className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                            <span className="truncate">{p.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
