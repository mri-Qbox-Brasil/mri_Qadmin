import { useEffect, useState, useRef, useCallback } from 'react';
import { useNui } from '@/context/NuiContext';
import { useAppState } from '@/context/AppState';
import { useI18n } from '@/hooks/useI18n';
import Spinner from '@/components/Spinner';
import { AlertCircle, Wifi, Monitor as MonitorIcon, Keyboard } from 'lucide-react';
import { signaling } from '@/utils/signaling/index';
import { subscribeFromCF } from '@/utils/cf-sfu';
import { cn } from '@/lib/utils';
import { MriKeyboardVisualizer } from '@mriqbox/ui-kit';

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
    showKeyboard?: boolean;
}

export default function PlayerScreenStream({
    playerId,
    playerName,
    className,
    onFpsUpdate,
    autoPlay = true,
    muted = true,
    isMock = false,
    showKeyboard = false
}: PlayerScreenStreamProps) {
    const { sendNui, on, off } = useNui();
    const { gameData, settings } = useAppState();
    const { t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [myId, setMyId] = useState<string | null>(null);
    const myIdRef = useRef<string | null>(null);

    // ── Key Visualization ──
    const [pressedKeys, setPressedKeys] = useState<string[]>([]);

    useEffect(() => {
        // Real NUI Events
        const handleKeys = (data: any) => {
            if (String(data.id) === String(playerId)) {
                setPressedKeys(data.keys);
            }
        };

        // Browser Event Simulator (for testing without game)
        const handleBrowserKeys = (e: KeyboardEvent) => {
            if (!isMock) return;

            const keyMap: Record<string, string> = {
                'w': 'W', 'a': 'A', 's': 'S', 'd': 'D',
                ' ': 'SPACE', 'Shift': 'SHIFT', 'Control': 'CTRL', 'Alt': 'ALT',
                'Tab': 'TAB', 'Enter': 'ENTER', 'Escape': 'ESC', 'Backspace': 'BACK',
                'ArrowUp': 'UP', 'ArrowDown': 'DWN', 'ArrowLeft': 'LFT', 'ArrowRight': 'RGT',
                // Numpad Support
                'numpad/': 'NUM /', 'numpad*': 'NUM *', 'numpad-': 'NUM -',
                'numpad+': 'NUM +', 'numpad.': 'NUM .', 'numpad0': 'NUM 0', 'numpad1': 'NUM 1',
                'numpad2': 'NUM 2', 'numpad3': 'NUM 3', 'numpad4': 'NUM 4', 'numpad5': 'NUM 5',
                'numpad6': 'NUM 6', 'numpad7': 'NUM 7', 'numpad8': 'NUM 8', 'numpad9': 'NUM 9'
            };

            let label = keyMap[e.key] || e.key.toUpperCase();

            // Browser Numpad Code handling
            if (e.code.startsWith('Numpad')) {
                const numKey = e.code.replace('Numpad', 'NUM ');
                if (keyMap[e.code.toLowerCase()]) label = keyMap[e.code.toLowerCase()];
                else label = numKey;

                // Specific fix for NumpadEnter vs Enter
                if (e.code === 'NumpadEnter') label = 'NUM ENTER';
            }

            setPressedKeys(prev => {
                if (e.type === 'keydown') {
                    return prev.includes(label) ? prev : [...prev, label];
                } else {
                    return prev.filter(k => k !== label);
                }
            });
        };

        const handleMouse = (e: MouseEvent) => {
            if (!isMock) return;
            const label = e.button === 0 ? 'LMB' : e.button === 2 ? 'RMB' : null;
            if (!label) return;

            setPressedKeys(prev => {
                if (e.type === 'mousedown') {
                    return prev.includes(label) ? prev : [...prev, label];
                } else {
                    return prev.filter(k => k !== label);
                }
            });
        };

        on('ReceivePlayerKeys', handleKeys);
        if (isMock) {
            window.addEventListener('keydown', handleBrowserKeys);
            window.addEventListener('keyup', handleBrowserKeys);
            window.addEventListener('mousedown', handleMouse);
            window.addEventListener('mouseup', handleMouse);
        }

        return () => {
            off('ReceivePlayerKeys', handleKeys);
            if (isMock) {
                window.removeEventListener('keydown', handleBrowserKeys);
                window.removeEventListener('keyup', handleBrowserKeys);
                window.removeEventListener('mousedown', handleMouse);
                window.removeEventListener('mouseup', handleMouse);
            }
        };
    }, [playerId, on, off, isMock]);

    useEffect(() => {
        if (!playerId || isMock) return;
        sendNui('StartWatchingPlayer', { targetId: playerId }).catch(() => {});
        return () => {
            sendNui('StopWatchingPlayer', { targetId: playerId }).catch(() => {});
        };
    }, [playerId, sendNui, isMock]);

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
        <div className={cn("relative bg-black flex items-center justify-center overflow-hidden group", className)}>
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
                    {/* Placeholder Background Video for Testing */}
                    <div className="absolute inset-0 opacity-40 grayscale blur-[2px]">
                        <video
                            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                            autoPlay
                            loop
                            muted
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <MonitorIcon className="w-20 h-20 text-muted-foreground opacity-20 relative z-10" />
                    <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-[10px] text-white z-10 border border-white/10 uppercase tracking-widest font-bold">
                        Mock Feed (Simulator Active) • ID: {playerId}
                    </div>
                    <div className="absolute top-4 left-4 bg-primary/20 text-primary text-[9px] px-2 py-0.5 rounded border border-primary/30 z-10 animate-pulse">
                        LIVE TESTING
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

            {/* Keyboard Overlay */}
            {showKeyboard && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[900px] px-4 pointer-events-none z-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <MriKeyboardVisualizer
                        pressedKeys={pressedKeys}
                        className="scale-[0.6] lg:scale-[0.7] origin-bottom shadow-2xl pointer-events-auto"
                    />
                </div>
            )}
        </div>
    );
}
