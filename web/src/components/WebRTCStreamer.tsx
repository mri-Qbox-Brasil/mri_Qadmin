
import React, { useEffect, useRef } from 'react';
import { useNui } from '@/context/NuiContext';
import { useAppState } from '@/context/AppState';
import { signaling } from '@/utils/signaling';
// We don't static import GameRender to avoid early instantiation loops

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export default function WebRTCStreamer() {
    const { on, off } = useNui();
    const peerRef = useRef<RTCPeerConnection | null>(null);

    const { gameData } = useAppState();
    const webrtcUrl = gameData.webrtcUrl;

    useEffect(() => {

        const startHandler = async (data: any) => {
            console.log('[WebRTC Streamer] Start Request from:', data.targetId, 'Self:', data.selfId);

            // 2. Init Signaling
            const url = webrtcUrl || 'wss://ws.gf2.in';
            signaling.init(url, String(data.selfId));

            console.log('[WebRTC Streamer] Initializing Peer with static STUN:', RTC_CONFIG.iceServers);

            // Close any previous peer before creating a new one
            if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }

            const pc = new RTCPeerConnection(RTC_CONFIG);
            peerRef.current = pc;

            // 3. Init Game Render (Singleton)
            try {
                const { default: renderer } = await import('@/utils/fivem-renderer');
                console.log('[WebRTC Streamer] GameRender Singleton Loaded');
                const stream = (renderer as any).startStream() as MediaStream;

                // Add Tracks to Peer
                stream.getTracks().forEach((track: MediaStreamTrack) => {
                   if(peerRef.current) {
                       peerRef.current.addTrack(track, stream);
                       console.log('[WebRTC Streamer] Added Track:', track.kind, 'Enabled:', track.enabled);
                   }
                });
            } catch (err) {
                console.error('[WebRTC Streamer] Failed to load renderer or start stream:', err);
            }

            pc.onconnectionstatechange = () => {
                console.log('[WebRTC Streamer] 🔌 Connection State:', pc.connectionState);
            };

            // ICE Candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    // console.log('[WebRTC Streamer] Sending Ice Candidate');
                    signaling.send({
                        type: 'candidate',
                        targetId: 'viewer-' + String(data.targetId),
                        sourceId: String(data.selfId),
                        data: event.candidate
                    });
                }
            };

            // Create Offer
            console.log('[WebRTC Streamer] Creating Offer (with tracks)...');
            const offer = await pc.createOffer();
            console.log('[WebRTC Streamer] Offer Created. Setting LocalDesc...');
            await pc.setLocalDescription(offer);

            // Send Offer
            console.log('[WebRTC Streamer] Sending Offer via Signaling...');
            signaling.send({
                type: 'offer',
                targetId: 'viewer-' + String(data.targetId),
                sourceId: String(data.selfId),
                data: offer
            });
            console.log('[WebRTC Streamer] Offer SENT to', 'viewer-' + String(data.targetId));

            // Listen for Answer
            const candidateQueue: any[] = [];
            signaling.onMessage(async (msg) => {
                const expectedSource = 'viewer-' + String(data.targetId);
                // console.log('[WebRTC Streamer] Received Message Type:', msg.type, 'from:', msg.sourceId);

                if (msg.type === 'answer' && String(msg.sourceId) === expectedSource) {
                    console.log('[WebRTC Streamer] ✅ Received Valid Answer!');
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.data));

                    console.log('[WebRTC Streamer] Processing Queued Candidates:', candidateQueue.length);
                    while(candidateQueue.length > 0) {
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

            pc.oniceconnectionstatechange = () => {
                console.log('[WebRTC Streamer] 🧊 ICE State:', pc.iceConnectionState);
            };
        };

        const stopHandler = () => {
             if (peerRef.current) peerRef.current.close();
             // We DO NOT stop the renderer here because it's a singleton shared with the Modal
             peerRef.current = null;
        };

        on('StartWebRTC', startHandler);
        on('StopWebRTC', stopHandler);

        return () => {
            off('StartWebRTC', startHandler);
            off('StopWebRTC', stopHandler);
            // check destroy logic
        };
    }, [on, off, webrtcUrl]);

    return null; // Hidden component
}
