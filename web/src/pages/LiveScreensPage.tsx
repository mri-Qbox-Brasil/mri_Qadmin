
import { useState, useEffect, useRef, useCallback } from 'react'
import { MriPageHeader, MriCard, MriButton } from '@mriqbox/ui-kit'
import { Monitor, X, Video, Wifi } from 'lucide-react'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import Spinner from '@/components/Spinner'
import { signaling } from '@/utils/signaling'

const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

interface WatchedPlayer {
    id: number
    name: string
    loading: boolean
    error?: string
    streamUrl?: string  // object URL for the stream
}

// Per-player WebRTC feed component
function PlayerFeed({ player, myId, onClose }: { player: WatchedPlayer, myId: string | null, onClose: () => void }) {
    const { sendNui } = useNui()
    const { gameData } = useAppState()
    const videoRef = useRef<HTMLVideoElement>(null)
    const peerRef  = useRef<RTCPeerConnection | null>(null)
    const [loading, setLoading] = useState(true)
    const myIdRef = useRef<string | null>(myId)

    // Keep ref in sync
    useEffect(() => { myIdRef.current = myId; }, [myId])

    useEffect(() => {
        if (!player.id) return;

        // SELF-VIEW BYPASS: use renderer directly (no WebRTC round-trip needed)
        if (myId && String(player.id) === String(myId)) {
            import('@/utils/fivem-renderer').then(({ default: renderer }) => {
                const stream = renderer.startStream();
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                    setLoading(false);
                }
            });
            return; // no cleanup needed — singleton keeps running
        }

        if (!myId) return; // wait for myId before doing WebRTC

        const unsub = signaling.onMessage(async (msg: any) => {
            if (msg.type === 'offer' && String(msg.sourceId) === String(player.id)) {
                const currentMyId = myIdRef.current;
                if (!currentMyId) return;

                const pc = new RTCPeerConnection(RTC_CONFIG);
                peerRef.current = pc;
                const q: any[] = [];
                (pc as any)._queue = q;

                pc.ontrack = (event) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = event.streams[0];
                        setLoading(false);
                    }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                while (q.length > 0) await pc.addIceCandidate(new RTCIceCandidate(q.shift()));

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                signaling.send({ type: 'answer', targetId: String(player.id), sourceId: 'viewer-' + currentMyId, data: answer });

                pc.onicecandidate = (e) => {
                    if (e.candidate)
                        signaling.send({ type: 'candidate', targetId: String(player.id), sourceId: 'viewer-' + currentMyId, data: e.candidate });
                };
            }
            if (msg.type === 'candidate' && String(msg.sourceId) === String(player.id)) {
                const pc = peerRef.current;
                if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(msg.data));
                else if (pc) (pc as any)._queue?.push(msg.data);
            }
        });

        // Request stream AFTER listener is set up and signaling is open
        signaling.onConnect(() => {
            sendNui('GetPlayerScreen', { targetId: player.id });
        });

        return () => {
            unsub();
            // Tell the streaming player to stop (clears isWebRTCStreaming flag on their end)
            sendNui('StopPlayerScreen', { targetId: player.id });
            peerRef.current?.close();
            peerRef.current = null;
        };
    }, [player.id, myId, sendNui]);

    return (
        <MriCard className="overflow-hidden flex flex-col bg-background">
            <div className="p-2 border-b flex justify-between items-center bg-muted/50">
                <span className="font-bold truncate text-sm">{player.name} <span className="text-muted-foreground font-normal">#{player.id}</span></span>
                <button onClick={onClose} className="text-muted-foreground hover:text-destructive ml-2 flex-shrink-0">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="aspect-video bg-black relative flex items-center justify-center">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground z-10">
                        <Spinner />
                        <span className="text-[10px]">Connecting...</span>
                    </div>
                )}
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                    onPlay={() => setLoading(false)}
                />
            </div>
        </MriCard>
    );
}

export default function LiveScreensPage() {
    const { sendNui } = useNui()
    const { gameData } = useAppState()
    const [players, setPlayers]   = useState<any[]>([])
    const [watching, setWatching] = useState<WatchedPlayer[]>([])
    const [myId, setMyId]         = useState<string | null>(null)

    // Get own player ID + init signaling once
    useEffect(() => {
        sendNui('getSelfId').then((id: any) => {
            if (id) {
                const sid = String(id);
                setMyId(sid);
                const url = gameData.webrtcUrl || 'wss://ws.gf2.in';
                signaling.init(url, 'viewer-' + sid);
            }
        })
    }, [sendNui, gameData.webrtcUrl])

    // Fetch online-only player list
    useEffect(() => {
        sendNui('getPlayers', { page: 1, limit: 200, search: '' }).then((res: any) => {
            const list = res.data || (Array.isArray(res) ? res : [])
            // Only show players that are currently online (have a valid server ID)
            if (list) setPlayers(list.filter((p: any) => p.online === true))
        })
    }, [sendNui])

    const toggleWatch = useCallback((player: any) => {
        setWatching(prev => {
            if (prev.find(w => w.id === player.id)) {
                return prev.filter(w => w.id !== player.id);
            }
            return [...prev, { id: player.id, name: player.name, loading: true }];
        });
    }, []);

    return (
        <div className="h-full flex flex-col bg-background">
            <MriPageHeader title="Live Screens Dashboard" icon={Monitor} />

            <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
                {/* Active feeds grid */}
                <div className="flex-1 border rounded-xl p-4 overflow-auto bg-card/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Video className="w-5 h-5 text-red-500" />
                            Active Feeds ({watching.length})
                        </h2>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Wifi className="w-3 h-3" />
                            WebRTC Live
                        </div>
                    </div>

                    {watching.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                            Select players below to watch their screen
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {watching.map(p => (
                                <PlayerFeed
                                    key={p.id}
                                    player={p}
                                    myId={myId}
                                    onClose={() => toggleWatch(p)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Player selector */}
                <div className="h-1/3 border rounded-xl p-4 overflow-hidden flex flex-col bg-card">
                    <h3 className="font-semibold mb-2">Available Players</h3>
                    <div className="overflow-auto flex-1">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {players.map(p => {
                                const isWatching = watching.some(w => w.id === p.id)
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => toggleWatch(p)}
                                        className={`flex items-center gap-2 p-2 rounded border text-sm transition-colors ${
                                            isWatching
                                                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                                : 'hover:bg-accent border-transparent hover:border-border'
                                        }`}
                                    >
                                        {isWatching ? <X className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                        <span className="truncate">{p.name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
