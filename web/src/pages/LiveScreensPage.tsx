import { useState, useEffect, useCallback } from 'react'
import { MriPageHeader, MriCard, MriButton } from '@mriqbox/ui-kit'
import { Monitor, X, Video, Wifi, Maximize2, Minimize2, Keyboard } from 'lucide-react'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { useI18n } from '@/context/I18n'
import PlayerScreenStream from '@/components/shared/PlayerScreenStream'
import { cn } from '@/lib/utils'

interface WatchedPlayer {
    id: number
    name: string
    loading: boolean
    showKeyboard?: boolean
    error?: string
}

export default function LiveScreensPage() {
    const { sendNui } = useNui()
    const { gameData, settings } = useAppState()
    const { t } = useI18n()
    const [players, setPlayers]   = useState<any[]>([])
    const [watching, setWatching] = useState<WatchedPlayer[]>([])
    const [maximizedId, setMaximizedId] = useState<number | null>(null)
    const [myId, setMyId]         = useState<string | null>(null)

    // Get own player ID
    useEffect(() => {
        sendNui('getSelfId').then((id: any) => {
            if (id) setMyId(String(id))
        })
    }, [sendNui])

    // Fetch online-only player list
    useEffect(() => {
        sendNui('getPlayers', { page: 1, limit: 200, search: '' }).then((res: any) => {
            const list = res.data || (Array.isArray(res) ? res : [])
            if (list) setPlayers(list.filter((p: any) => p.online === true))
        })
    }, [sendNui])

    const toggleWatch = useCallback((player: any) => {
        setWatching(prev => {
            if (prev.find(w => w.id === player.id)) {
                if (maximizedId === player.id) setMaximizedId(null)
                return prev.filter(w => w.id !== player.id);
            }
            return [...prev, { id: player.id, name: player.name, loading: true, showKeyboard: false }];
        });
    }, [maximizedId]);

    const toggleMaximize = (id: number) => {
        setMaximizedId(prev => prev === id ? null : id)
    }

    const toggleKeyboard = (id: number) => {
        setWatching(prev => prev.map(w => w.id === id ? { ...w, showKeyboard: !w.showKeyboard } : w))
    }

    return (
        <div className="h-full flex flex-col bg-background relative overflow-hidden">
            <MriPageHeader title={t('livescreens_title') || "Live Screens Dashboard"} icon={Monitor} />

            <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4 relative">
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
                                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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

                                        <PlayerScreenStream
                                            playerId={p.id}
                                            playerName={p.name}
                                            showKeyboard={p.showKeyboard}
                                            className="flex-1"
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
