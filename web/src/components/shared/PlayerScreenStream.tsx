import { useEffect, useState, useRef, useCallback } from 'react';
import { useNui } from '@/context/NuiContext';
import { useAppState } from '@/context/AppState';
import { useI18n } from '@/context/I18n';
import Spinner from '@/components/Spinner';
import { AlertCircle, Wifi, Monitor as MonitorIcon } from 'lucide-react';
import { signaling } from '@/utils/signaling/index';
import { subscribeFromCF } from '@/utils/cf-sfu';
import { cn } from '@/lib/utils';

const RTC_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

interface PlayerScreenStreamProps {
    playerId: number | string;
    playerName?: string;
    className?: string;
    onFpsUpdate?: (fps: number) => void;
    autoPlay?: boolean;
    muted?: boolean;
    isMock?: boolean;
}

export default function PlayerScreenStream({
    playerId,
    playerName,
    className,
    onFpsUpdate,
    autoPlay = true,
    muted = true,
    isMock = false
}: PlayerScreenStreamProps) {
    const { sendNui } = useNui();
    const { gameData, settings } = useAppState();
    const { t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [myId, setMyId] = useState<string | null>(null);
    const myIdRef = useRef<string | null>(null);

    // ── Init Signaling ──
    useEffect(() => {
        if (!playerId) return;

        sendNui('getSelfId').then(id => {
            if (id) {
                const sid = String(id);
                myIdRef.current = sid;
                setMyId(sid);
                const url = settings?.WebRTCUrl || gameData.webrtcUrl || null;
                const provider = (settings?.SignalingProvider ?? gameData.signalingProvider ?? 'websocket') as 'websocket' | 'fivem-native' | 'cloudflare-sfu';
                signaling.init(url, 'viewer-' + sid, provider);
            }
        }).catch(err => console.error('[PlayerScreenStream] getSelfId FAILED:', err));

        return () => {
            signaling.disconnect();
        };
    }, [sendNui, gameData.webrtcUrl, settings?.WebRTCUrl, settings?.SignalingProvider, playerId]);

    // ── Signaling / WebRTC Logic ──
    useEffect(() => {
        if (!playerId || !myId) return;

        // Mock Handle
        if (isMock) {
            setLoading(false);
            return;
        }

        // Self-view Bypass
        if (String(playerId) === String(myId)) {
            import('@/utils/fivem-renderer').then(({ default: renderer }) => {
                const stream = (renderer as any).startStream() as MediaStream;
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                    setLoading(false);
                }
            });
            return;
        }

        const provider = settings?.SignalingProvider ?? gameData.signalingProvider ?? 'websocket';

        // CF SFU Path
        if (provider === 'cloudflare-sfu') {
            const unsubSignal = signaling.onMessage(async (msg: any) => {
                if (msg.type === 'cf-track-ready' && String(msg.sourceId) === String(playerId)) {
                    try {
                        const { pc, stream } = await subscribeFromCF(msg.sessionId, msg.trackName);
                        peerRef.current = pc;
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                            videoRef.current.play().catch(() => {});
                            setLoading(false);
                        }
                    } catch (err) {
                        setError(t('stream_error_cf') || 'CF SFU subscribe failed');
                    }
                }
            });

            sendNui('GetPlayerScreen', { targetId: playerId });
            return () => {
                unsubSignal();
                if (peerRef.current) peerRef.current.close();
                sendNui('StopPlayerScreen', { targetId: playerId });
            };
        }

        // P2P Path
        const unsub = signaling.onMessage(async (msg: any) => {
            if (msg.type === 'offer' && String(msg.sourceId) === String(playerId)) {
                const currentMyId = myIdRef.current;
                if (!currentMyId) return;

                const pc = new RTCPeerConnection(RTC_CONFIG);
                peerRef.current = pc;
                const q: any[] = [];
                (pc as any)._queue = q;

                pc.oniceconnectionstatechange = () => {
                    if ((pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') && onFpsUpdate) {
                        const statsId = setInterval(async () => {
                            if (!peerRef.current) { clearInterval(statsId); return; }
                            try {
                                const stats = await peerRef.current.getStats();
                                stats.forEach((report: any) => {
                                    if (report.type === 'inbound-rtp' && report.kind === 'video' && report.framesPerSecond !== undefined) {
                                        onFpsUpdate(Math.round(report.framesPerSecond));
                                    }
                                });
                            } catch (_) {}
                        }, 1000);
                    }
                };

                pc.ontrack = (event) => {
                    const stream = event.streams[0];
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
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
        const trigger = () => sendNui('GetPlayerScreen', { targetId: playerId });

        if ((signaling as any).isConnected?.()) trigger();
        signaling.onConnect(trigger);

        return () => {
            unsub();
            if (peerRef.current) {
                peerRef.current.close();
                peerRef.current = null;
            }
            sendNui('StopPlayerScreen', { targetId: playerId });
        };
    }, [playerId, myId, sendNui, gameData.signalingProvider, settings?.SignalingProvider, isMock, onFpsUpdate]);

    // Attachment Watcher
    useEffect(() => {
        if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
            setLoading(false);
        }
    });

    return (
        <div className={cn("relative bg-black flex items-center justify-center overflow-hidden", className)}>
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse z-10 bg-black/80">
                    <Spinner />
                    <span className="text-xs">{t('connecting_to_feed') || "Connecting to feed..."}</span>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-400 z-10 bg-black/80 p-4 text-center">
                    <AlertCircle className="w-8 h-8" />
                    <span className="text-sm">{error}</span>
                </div>
            )}
            {isMock ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20">
                    <MonitorIcon className="w-20 h-20 text-muted-foreground opacity-20" />
                    <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-[10px] text-white">
                        MOCK FEED (BROWSER TEST) - ID: {playerId}
                    </div>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain bg-black"
                    autoPlay={autoPlay}
                    playsInline
                    muted={muted}
                />
            )}
        </div>
    );
}
