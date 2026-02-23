
import React, { useEffect, useRef } from 'react';
import { useNui } from '@/context/NuiContext';
import { useAppState } from '@/context/AppState';
import { signaling } from '@/utils/signaling/index';
import { publishToCF } from '@/utils/cf-sfu';
// We don't static import GameRender to avoid early instantiation loops

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export default function WebRTCStreamer() {
    const { on, off, sendNui } = useNui();
    const peerRef = useRef<RTCPeerConnection | null>(null);

    const { gameData } = useAppState();
    const webrtcUrl = gameData.webrtcUrl;

    useEffect(() => {

        const startHandler = async (data: any) => {
            console.log('[WebRTC Streamer] Start Request from:', data.targetId, 'Self:', data.selfId);

            // Init Signaling (for metadata exchange in all providers)
            const url = webrtcUrl || null;
            const provider = (gameData.signalingProvider ?? 'websocket') as 'websocket' | 'fivem-native' | 'cloudflare-sfu';
            signaling.init(url, String(data.selfId), provider);

            // Close any previous peer
            if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }

            // Load renderer (shared singleton)
            let stream: MediaStream | null = null;
            try {
                const { default: renderer } = await import('@/utils/fivem-renderer');
                console.log('[WebRTC Streamer] GameRender Singleton Loaded');
                stream = (renderer as any).startStream() as MediaStream;
            } catch (err) {
                console.error('[WebRTC Streamer] Failed to load renderer:', err);
                return;
            }

            // ── CF SFU path ──────────────────────────────────────────────────
            if (provider === 'cloudflare-sfu') {
                try {
                    console.log('[WebRTC Streamer] CF SFU publish starting...');
                    const { pc, sessionId, trackName } = await publishToCF(stream!);
                    peerRef.current = pc;

                    // Announce track info to the admin viewer via signaling relay
                    signaling.send({
                        type: 'cf-track-ready',
                        sessionId,
                        trackName,
                        targetId: 'viewer-' + String(data.targetId),
                        sourceId: String(data.selfId),
                    });

                    pc.onconnectionstatechange = () =>
                        console.log('[CF SFU Streamer] Connection State:', pc.connectionState);
                } catch (err) {
                    console.error('[CF SFU Streamer] Publish failed:', err);
                }
                return;
            }

            // ── P2P path (fivem-native or websocket) ─────────────────────────
            const pc = new RTCPeerConnection(RTC_CONFIG);
            peerRef.current = pc;

            stream!.getTracks().forEach((track: MediaStreamTrack) => {
                if (peerRef.current) {
                    peerRef.current.addTrack(track, stream!);
                    console.log('[WebRTC Streamer] Added Track:', track.kind, 'Enabled:', track.enabled);
                }
            });

            pc.onconnectionstatechange = () =>
                console.log('[WebRTC Streamer] 🔌 Connection State:', pc.connectionState);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    signaling.send({
                        type: 'candidate',
                        targetId: 'viewer-' + String(data.targetId),
                        sourceId: String(data.selfId),
                        data: event.candidate
                    });
                }
            };

            console.log('[WebRTC Streamer] Creating Offer (with tracks)...');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            signaling.send({
                type: 'offer',
                targetId: 'viewer-' + String(data.targetId),
                sourceId: String(data.selfId),
                data: offer
            });
            console.log('[WebRTC Streamer] Offer SENT to', 'viewer-' + String(data.targetId));

            const candidateQueue: any[] = [];
            signaling.onMessage(async (msg) => {
                const expectedSource = 'viewer-' + String(data.targetId);

                if (msg.type === 'answer' && String(msg.sourceId) === expectedSource) {
                    console.log('[WebRTC Streamer] ✅ Received Valid Answer!');
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                    while (candidateQueue.length > 0) {
                        const cand = candidateQueue.shift();
                        await pc.addIceCandidate(new RTCIceCandidate(cand));
                    }
                }
                if (msg.type === 'candidate' && String(msg.sourceId) === expectedSource) {
                    if (pc.remoteDescription) {
                        await pc.addIceCandidate(new RTCIceCandidate(msg.data));
                    } else {
                        candidateQueue.push(msg.data);
                    }
                }
            });

            pc.oniceconnectionstatechange = () =>
                console.log('[WebRTC Streamer] 🧊 ICE State:', pc.iceConnectionState);
        };

        const stopHandler = () => {
            if (peerRef.current) peerRef.current.close();
            peerRef.current = null;
        };

        on('StartWebRTC', startHandler);
        on('StopWebRTC', stopHandler);

        return () => {
            off('StartWebRTC', startHandler);
            off('StopWebRTC', stopHandler);
        };
    }, [on, off, sendNui, webrtcUrl, gameData.signalingProvider]);

    return null;
}
