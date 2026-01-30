
import React, { useEffect, useRef } from 'react';
import { useNui } from '@/context/NuiContext';
import { useAppState } from '@/context/AppState';
import { signaling } from '@/utils/signaling';

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export default function WebRTCStreamer() {
    const { on, off } = useNui();
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<RTCDataChannel | null>(null);
    const streamingTargetRef = useRef<string | null>(null);

    // Initialize Signaling on Mount (if we knew our ID? We might need to wait for 'StartWebRTC' to know our ID?
    // Actually Players.tsx usually knows self ID via other means, but here we are global.
    // Let's rely on 'StartWebRTC' passing selfId.

    const { gameData } = useAppState();

    useEffect(() => {
        const startHandler = async (data: any) => {
            // data = { targetId (Requester), selfId }
            console.log('[WebRTC Streamer] Start Request from:', data.targetId, 'Self:', data.selfId);

            // Init Signaling
            const url = gameData.webrtcUrl || 'ws://localhost:3000';
            console.log('[WebRTC Streamer] Connecting to:', url);
            signaling.init(url, String(data.selfId));
            streamingTargetRef.current = String(data.targetId);

            // Create Peer
            const pc = new RTCPeerConnection(RTC_CONFIG);
            peerRef.current = pc;

            // Create Data Channel
            console.log('[WebRTC Streamer] Creating Data Channel "stream"');
            const dc = pc.createDataChannel("stream");
            channelRef.current = dc;

            dc.onopen = () => console.log('[WebRTC Streamer] Channel Open!');

            // ICE Candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    signaling.send({
                        type: 'candidate',
                        targetId: String(data.targetId),
                        sourceId: String(data.selfId),
                        data: event.candidate
                    });
                }
            };

            // Create Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Send Offer
            console.log('[WebRTC Streamer] Sending Offer via Signaling...');
            signaling.send({
                type: 'offer',
                targetId: String(data.targetId),
                sourceId: String(data.selfId),
                data: offer
            });

            // Listen for Answer
            signaling.onMessage(async (msg) => {
                if (msg.type === 'answer' && msg.sourceId === String(data.targetId)) {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                }
                if (msg.type === 'candidate' && msg.sourceId === String(data.targetId)) {
                     await pc.addIceCandidate(new RTCIceCandidate(msg.data));
                }
            });
        };

        const stopHandler = () => {
             if (peerRef.current) peerRef.current.close();
             peerRef.current = null;
             channelRef.current = null;
        };

        const frameHandler = (data: any) => {
            // data.data is the base64 string
            if (channelRef.current && channelRef.current.readyState === 'open') {
                channelRef.current.send(data.data);
            }
        };

        on('StartWebRTC', startHandler);
        on('StopWebRTC', stopHandler);
        on('StreamFrame', frameHandler);

        return () => {
            off('StartWebRTC', startHandler);
            off('StopWebRTC', stopHandler);
            off('StreamFrame', frameHandler);
        };
    }, [on, off]);

    return null; // Hidden component
}
