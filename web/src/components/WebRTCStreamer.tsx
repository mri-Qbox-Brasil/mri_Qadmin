
import { useEffect, useRef } from 'react';
import { useNui } from '@/context/NuiContext';
import { useAppState } from '@/context/AppState';
import { signaling } from '@/utils/signaling/index';
// We don't static import GameRender to avoid early instantiation loops

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export default function WebRTCStreamer() {
    const { on, off, sendNui } = useNui();
    const connectionsRef = useRef<Map<string, { pc: RTCPeerConnection, signalingUnsub: () => void }>>(new Map());
    const startingViewersRef = useRef<Set<string>>(new Set());

    const { gameData, settings } = useAppState();
    const webrtcUrl = settings?.WebRTCUrl || gameData.webrtcUrl;
    const providerType = (settings?.SignalingProvider ?? gameData.signalingProvider ?? 'websocket') as 'websocket' | 'fivem-native' | 'cloudflare-sfu';

    const configRef = useRef({ webrtcUrl, providerType });
    useEffect(() => {
        configRef.current = { webrtcUrl, providerType };
    }, [webrtcUrl, providerType]);

    useEffect(() => {
        let rendererInstance: any = null;

        const cleanup = (vid?: string) => {
            if (vid) {
                const conn = connectionsRef.current.get(vid);
                if (conn) {
                    conn.pc.close();
                    conn.signalingUnsub();
                    connectionsRef.current.delete(vid);
                    if (rendererInstance) rendererInstance.stopStream();
                }
            } else {
                connectionsRef.current.forEach((conn) => {
                    conn.pc.close();
                    conn.signalingUnsub();
                    if (rendererInstance) rendererInstance.stopStream();
                });
                connectionsRef.current.clear();
            }
        };

        const initializeConnection = async (targetViewerId: string) => {
            try {
                let myId = (gameData as any).selfId;
                if (!myId) {
                    try {
                        const res = await sendNui('getSelfId', {}, 0);
                        myId = typeof res === 'object' && res !== null ? (res as any).id : Number(res);
                    } catch (e) {
                        console.error('[WebRTC Streamer] Failed to get selfId:', e);
                        return;
                    }
                }

                // Init Signaling
                const url = configRef.current.webrtcUrl || null;
                signaling.init(url, String(myId), configRef.current.providerType);

                // Load renderer
                let stream: MediaStream | null = null;
                try {
                    const { default: renderer } = await import('@/utils/fivem-renderer');
                    rendererInstance = renderer;
                    stream = (renderer as any).startStream() as MediaStream;
                } catch (err) {
                    console.error('[WebRTC Streamer] Failed to load renderer:', err);
                    return;
                }

                if (configRef.current.providerType === 'cloudflare-sfu') {
                    const { publishToCF } = await import('@/utils/cf-sfu');
                    const { pc, sessionId, trackName } = await publishToCF(stream!);
                    const signalingUnsub = () => { };
                    connectionsRef.current.set(targetViewerId, { pc, signalingUnsub });
                    signaling.send({
                        type: 'cf-track-ready',
                        sessionId,
                        trackName,
                        targetId: targetViewerId,
                        sourceId: String(myId),
                    });
                    return;
                }

                const pc = new RTCPeerConnection(RTC_CONFIG);
                stream!.getTracks().forEach(track => pc.addTrack(track, stream!));

                pc.onconnectionstatechange = () => {
                    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                        cleanup(targetViewerId);
                    }
                };

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        signaling.send({
                            type: 'candidate',
                            targetId: targetViewerId,
                            sourceId: String(myId),
                            data: event.candidate
                        });
                    }
                };

                const candidateQueue: any[] = [];
                const normalizeId = (id: string) => id.replace(/^(viewer-)+/, '');

                const signalingUnsub = signaling.onMessage(async (msg) => {
                    const msgSourceId = String((msg as any).sourceId || '');

                    // Prefix-agnostic comparison: treats 'list-2-1' and 'viewer-list-2-1' as the same
                    if (normalizeId(msgSourceId) !== normalizeId(targetViewerId)) return;

                    if (msg.type === 'answer') {
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                            while (candidateQueue.length > 0) {
                                const cand = candidateQueue.shift();
                                await pc.addIceCandidate(new RTCIceCandidate(cand));
                            }
                        } catch (err) {
                            console.error('[WebRTC Streamer] Remote description error:', err);
                        }
                    } else if (msg.type === 'candidate') {
                        if (pc.remoteDescription) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(msg.data));
                            } catch (err) {
                                console.error('[WebRTC Streamer] ICE error:', err);
                            }
                        } else {
                            candidateQueue.push(msg.data);
                        }
                    }
                });

                connectionsRef.current.set(targetViewerId, { pc, signalingUnsub });
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                signaling.send({
                    type: 'offer',
                    targetId: targetViewerId,
                    sourceId: String(myId),
                    data: offer
                });
            } catch (err) {
                console.error('[WebRTC Streamer] Init failed:', err);
                cleanup(targetViewerId);
            } finally {
                startingViewersRef.current.delete(targetViewerId);
            }
        };

        const startHandler = async (data: any) => {
            const rawTargetId = String(data.viewerId || data.targetId || '');
            const targetViewerId = rawTargetId.startsWith('viewer-') ? rawTargetId : `viewer-${rawTargetId}`;

            if (startingViewersRef.current.has(targetViewerId)) return;
            startingViewersRef.current.add(targetViewerId);

            if (connectionsRef.current.has(targetViewerId)) {
                const old = connectionsRef.current.get(targetViewerId);
                if (old) {
                    old.pc.close();
                    old.signalingUnsub();
                    connectionsRef.current.delete(targetViewerId);
                }
            }

            await initializeConnection(targetViewerId);
        };

        const stopHandler = (data: any) => {
            const rawVid = String(data.viewerId || '');
            const vid = rawVid.startsWith('viewer-') ? rawVid : `viewer-${rawVid}`;
            cleanup(vid);
        };

        on('StartWebRTC', startHandler);
        on('StopWebRTC', stopHandler);

        return () => {
            cleanup();
            off('StartWebRTC', startHandler);
            off('StopWebRTC', stopHandler);
        };
    }, [on, off, sendNui, gameData]);

    return null;
}
