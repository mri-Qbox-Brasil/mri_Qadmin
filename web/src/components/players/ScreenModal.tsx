import { useEffect, useState, useRef, useCallback } from 'react';
import { MriModal } from '@mriqbox/ui-kit';
import { useNui } from '@/context/NuiContext';
import { useAppState } from '@/context/AppState';
import Spinner from '@/components/Spinner';
import {
    RefreshCw, Camera, AlertCircle, Wifi,
    Heart, Shield, Utensils, Droplets, Brain
} from 'lucide-react';
import { signaling } from '@/utils/signaling';

const RTC_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

interface ScreenModalProps {
    playerId: number | null
    onClose: () => void
    playerName?: string
}

interface Vitals {
    health:   number   // 0-200 (FiveM entity health)
    armor:    number   // 0-100
    ping:     number   // ms
    metadata: {
        hunger?: number   // 0-100
        thirst?: number   // 0-100
        stress?: number   // 0-100
        [key: string]: any
    }
}

// ─── Stat bar ────────────────────────────────────────────────────────────────
function StatBar({
    icon, label, value, max = 100, color, inverted = false, onClick, actionLabel
}: {
    icon: React.ReactNode, label: string, value: number, max?: number,
    color: string, inverted?: boolean,
    onClick?: () => void, actionLabel?: string
}) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const displayPct = inverted ? 100 - pct : pct;
    const barColor = displayPct >= 60 ? color
        : displayPct >= 30 ? 'bg-yellow-500'
        : 'bg-red-500';

    const El = onClick ? 'button' : 'div';
    return (
        <El
            {...(onClick ? { onClick, title: actionLabel, type: 'button' } : {})}
            className={`flex items-center gap-2 text-xs w-full text-left rounded px-1 -mx-1 py-0.5
                ${onClick ? 'cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors ring-0 hover:ring-1 ring-white/10' : ''}`}
        >
            <span className="text-muted-foreground w-3.5 flex-shrink-0">{icon}</span>
            <span className="text-muted-foreground w-10 flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-7 text-right tabular-nums font-mono text-muted-foreground">
                {inverted ? Math.round(value) : Math.round(pct)}%
            </span>
        </El>
    );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
function Badge({ children, color }: { children: React.ReactNode, color: string }) {
    return (
        <div className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border ${color}`}>
            {children}
        </div>
    );
}

export default function ScreenModal({ playerId, onClose, playerName }: ScreenModalProps) {
    const { sendNui } = useNui();
    const { gameData } = useAppState();
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const [fps, setFps]           = useState<number | null>(null);
    const [vitals, setVitals]     = useState<Vitals | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // WebRTC
    const peerRef  = useRef<RTCPeerConnection | null>(null);
    const [myId, setMyId]         = useState<string|null>(null);
    const myIdRef  = useRef<string|null>(null);

    // ── Init ────────────────────────────────────────────────────────────────
    useEffect(() => {
       sendNui('getSelfId').then(id => {
           if (id) {
               const sid = String(id);
               myIdRef.current = sid;
               setMyId(sid);
               const url = gameData.webrtcUrl || 'wss://ws.gf2.in';
               signaling.init(url, 'viewer-' + sid);
           }
       }).catch(err => console.error('[ScreenModal] getSelfId FAILED:', err));
    }, [sendNui, gameData.webrtcUrl]);

    // ── Vitals polling ──────────────────────────────────────────────────────
    const fetchVitals = useCallback(() => {
        if (!playerId) return;
        sendNui('GetPlayerVitals', { targetId: playerId }).then((v: any) => {
            if (v && !v.error) setVitals(v);
        }).catch(() => {});
    }, [playerId, sendNui]);

    useEffect(() => {
        if (!playerId) return;
        fetchVitals();
        const id = setInterval(fetchVitals, 3000);
        return () => clearInterval(id);
    }, [playerId, fetchVitals]);

    // ── FPS – self-view ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!myId || !playerId || String(playerId) !== String(myId)) return;
        const id = setInterval(() => {
            import('@/utils/fivem-renderer').then(({ default: r }) => {
                const f = (r as any).getFps();
                if (f !== null) setFps(f);
            });
        }, 500);
        return () => clearInterval(id);
    }, [myId, playerId]);

    // ── Signaling / WebRTC ───────────────────────────────────────────────────
    useEffect(() => {
        if (!playerId) return;

        if (myId && String(playerId) === String(myId)) {
            import('@/utils/fivem-renderer').then(({ default: renderer }) => {
                const stream = (renderer as any).startStream() as MediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.error('Autoplay error:', e));
                    setLoading(false);
                }
            }).catch(e => console.error('[ScreenModal] Import failed:', e));
            return;
        }

        const unsub = signaling.onMessage(async (msg: any) => {
            if (msg.type === 'offer' && String(msg.sourceId) === String(playerId)) {
                const currentMyId = myIdRef.current;
                if (!currentMyId) return;

                const pc = new RTCPeerConnection(RTC_CONFIG);
                peerRef.current = pc;
                const q: any[] = [];
                (pc as any)._queue = q;

                pc.oniceconnectionstatechange = () => {
                    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                        const statsId = setInterval(async () => {
                            if (!peerRef.current) { clearInterval(statsId); return; }
                            try {
                                const stats = await peerRef.current.getStats();
                                stats.forEach((report: any) => {
                                    if (report.type === 'inbound-rtp' && report.kind === 'video' && report.framesPerSecond !== undefined) {
                                        setFps(Math.round(report.framesPerSecond));
                                    }
                                });
                            } catch (_) {}
                        }, 1000);
                    }
                };

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
                signaling.send({ type: 'answer', targetId: String(playerId), sourceId: 'viewer-' + currentMyId, data: answer });

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        signaling.send({ type: 'candidate', targetId: String(playerId), sourceId: 'viewer-' + currentMyId, data: event.candidate });
                    }
                };
            }
            if (msg.type === 'candidate' && String(msg.sourceId) === String(playerId)) {
                const pc = peerRef.current;
                if (pc && pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(msg.data));
                else if (pc) (pc as any)._queue.push(msg.data);
            }
        });

        setLoading(true);
        signaling.onConnect(() => {
            sendNui('GetPlayerScreen', { targetId: playerId });
        });

        return () => {
            unsub();
            if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
        };
    }, [playerId, sendNui]);

    // ── Actions ──────────────────────────────────────────────────────────────
    const setVital = useCallback(async (vital: string, value: number) => {
        if (!playerId) return;
        setActionLoading(true);
        await sendNui('SetPlayerVital', { targetId: playerId, vital, value });
        setTimeout(() => { fetchVitals(); setActionLoading(false); }, 800);
    }, [playerId, sendNui, fetchVitals]);

    const handleRevive = () => setVital('health', 200);
    const handleMaxStats = async () => {
        if (!playerId) return;
        setActionLoading(true);
        await sendNui('SetPlayerVital', { targetId: playerId, vital: 'health',  value: 200 });
        await sendNui('SetPlayerVital', { targetId: playerId, vital: 'armor',   value: 100 });
        await sendNui('SetPlayerVital', { targetId: playerId, vital: 'hunger',  value: 100 });
        await sendNui('SetPlayerVital', { targetId: playerId, vital: 'thirst',  value: 100 });
        await sendNui('SetPlayerVital', { targetId: playerId, vital: 'stress',  value: 0   });
        setTimeout(() => { fetchVitals(); setActionLoading(false); }, 800);
    };

    const handleRefresh = useCallback(() => {
        if (!playerId) return;
        setLoading(true);
        setFps(null);
        if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
        signaling.onConnect(() => sendNui('GetPlayerScreen', { targetId: playerId }));
    }, [playerId, sendNui]);

    if (!playerId) return null;

    // ── Derived vitals values ──────────────────────────────────────────────
    const hp        = vitals ? Math.max(0, vitals.health - 100)   : null;  // 0-100
    const armor     = vitals ? vitals.armor                         : null;
    const hunger    = vitals ? (vitals.metadata?.hunger ?? 0)       : null;
    const thirst    = vitals ? (vitals.metadata?.thirst ?? 0)       : null;
    const stress    = vitals ? (vitals.metadata?.stress ?? 0)       : null;
    const ping      = vitals ? vitals.ping                          : null;
    const isDead    = vitals ? vitals.health < 101                  : false;

    const fpsBadgeColor = fps === null ? '' :
        fps >= 30 ? 'text-green-400 border-green-500/30 bg-green-500/10' :
        fps >= 15 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                    'text-red-400    border-red-500/30    bg-red-500/10';

    const pingColor = ping === null ? '' :
        ping < 80  ? 'text-green-400  border-green-500/30  bg-green-500/10'  :
        ping < 150 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                     'text-red-400    border-red-500/30    bg-red-500/10';

    return (
        <MriModal onClose={onClose} className="w-[900px] max-w-4xl flex flex-col p-5 bg-card border-border">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-4">
                <Camera className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-bold text-base flex-1 truncate">
                    {playerName || `Player #${playerId}`}
                    {isDead && <span className="ml-2 text-xs text-red-400 font-normal">💀 Morto</span>}
                </span>

                {/* Ping */}
                {ping !== null && (
                    <Badge color={pingColor}>
                        {ping}ms
                    </Badge>
                )}

                {/* FPS */}
                {fps !== null && (
                    <Badge color={fpsBadgeColor}>
                        <Wifi className="w-3 h-3" />
                        {fps}fps
                    </Badge>
                )}

                {/* Refresh stream button */}
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    title="Atualizar stream"
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* ── Body: video + vitals ────────────────────────────────── */}
            <div className="flex gap-3 flex-1 min-h-0">
                {/* Video feed */}
                <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center relative border border-input" style={{ aspectRatio: '16/9' }}>
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse z-10 bg-black/80">
                            <Spinner />
                            <span className="text-xs">Conectando ao feed...</span>
                        </div>
                    )}
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-400 z-10 bg-black/80">
                            <AlertCircle className="w-8 h-8" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}
                    <video
                        ref={videoRef}
                        className="w-full h-full object-contain bg-black"
                        autoPlay playsInline muted
                        onLoadedMetadata={e => e.currentTarget.play().catch(console.error)}
                    />
                </div>

                {/* Vitals panel */}
                <div className="w-48 flex flex-col gap-3 flex-shrink-0">
                    <div className="bg-muted/30 border border-border rounded-lg p-3 flex flex-col gap-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Vitais</p>

                        {vitals ? (
                            <>
                                <StatBar icon={<Heart className="w-3 h-3" />}    label="Vida"   value={hp ?? 0}     color="bg-red-500"    onClick={() => setVital('health', 200)} actionLabel="Clique para reviver" />
                                <StatBar icon={<Shield className="w-3 h-3" />}   label="Armor"  value={armor ?? 0}  color="bg-blue-500"   onClick={() => setVital('armor', 100)}  actionLabel="Clique para max armor" />
                                <StatBar icon={<Utensils className="w-3 h-3" />} label="Fome"   value={hunger ?? 0} color="bg-orange-500" onClick={() => setVital('hunger', 100)} actionLabel="Clique para saciar fome" />
                                <StatBar icon={<Droplets className="w-3 h-3" />} label="Sede"   value={thirst ?? 0} color="bg-cyan-500"   onClick={() => setVital('thirst', 100)} actionLabel="Clique para saciar sede" />
                                <StatBar icon={<Brain className="w-3 h-3" />}    label="Stress" value={stress ?? 0}  color="bg-purple-500" onClick={() => setVital('stress', 0)}   actionLabel="Clique para zerar stress" inverted />
                            </>
                        ) : (
                            <div className="text-xs text-muted-foreground italic">Carregando...</div>
                        )}
                    </div>

                </div>
            </div>
        </MriModal>
    );
}
