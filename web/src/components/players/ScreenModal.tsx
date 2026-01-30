import { useEffect, useState, useRef } from 'react'
import { MriModal, MriButton } from '@mriqbox/ui-kit'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import Spinner from '@/components/Spinner'
import { RefreshCw, Camera, AlertCircle } from 'lucide-react'

import { signaling } from '@/utils/signaling'

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
}

interface ScreenModalProps {
    playerId: number | null
    onClose: () => void
    playerName?: string
}

export default function ScreenModal({ playerId, onClose, playerName }: ScreenModalProps) {
    const { sendNui, on, off } = useNui()
    const { gameData } = useAppState()
    const [image, setImage] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const timeoutRef = useRef<number | null>(null)
    const chunksRef = useRef<Record<string, { total: number, chunks: Record<number, string> }>>({})

    // WebRTC Logic
    const peerRef = useRef<RTCPeerConnection | null>(null)
    const [useWebRTC, setUseWebRTC] = useState(true) // Should come from config
    // We need our own ID for signaling.
    // For this simple test, we assume the user has already somehow identified or we Fetch it.
    // Let's assume fetching on mount.
    const [myId, setMyId] = useState<string|null>(null)

    useEffect(() => {
       // Get Self ID (Quick Hack: Ask server or use generic)
       // We'll use a random ID for Admin if not provided, but Signaling needs correct routing.
       // The server knows 'source' of request. The Target sends Offer to 'source'.
       // So Admin must register with that same 'source' ID.
       // We can ask NUI 'whoami'?
       sendNui('getSelfId').then(id => {
           if(id) {
               setMyId(String(id))
               const url = gameData.webrtcUrl || 'ws://localhost:3000';
               signaling.init(url, String(id))
           }
       }).catch(() => {
           // Fallback for dev?
       })
    }, [sendNui])

    // Listen for WebRTC Offer
    useEffect(() => {
        if (!useWebRTC || !myId) return

        console.log('[ScreenModal] Listening for Signaling Messages...');
        const unsub = signaling.onMessage(async (msg: any) => {
            console.log('[ScreenModal] Raw Message:', msg.type, 'Source:', msg.sourceId, 'Target:', msg.targetId);

            if (msg.type === 'offer' && String(msg.sourceId) === String(playerId)) {
                // Received Offer from Target
                 console.log('[ScreenModal] ✅ Received Valid Offer from', playerId)
                 const pc = new RTCPeerConnection(RTC_CONFIG)
                 peerRef.current = pc

                 pc.ondatachannel = (e) => {
                     const dc = e.channel
                     console.log('[ScreenModal] DataChannel Received!')
                     dc.onmessage = (evt) => {
                         setImage(evt.data)
                         setLoading(false)
                     }
                 }

                 await pc.setRemoteDescription(new RTCSessionDescription(msg.data))
                 const answer = await pc.createAnswer()
                 await pc.setLocalDescription(answer)

                 signaling.send({
                     type: 'answer',
                     targetId: String(playerId),
                     sourceId: myId,
                     data: answer
                 })

                 pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        signaling.send({
                            type: 'candidate',
                            targetId: String(playerId),
                            sourceId: myId,
                            data: event.candidate
                        })
                    }
                 }
            }
            if (msg.type === 'candidate' && String(msg.sourceId) === String(playerId)) {
                 if(peerRef.current) await peerRef.current.addIceCandidate(new RTCIceCandidate(msg.data))
            }
        })
        return () => {
            unsub()
            if(peerRef.current) peerRef.current.close()
        }
    }, [useWebRTC, myId, playerId])

    useEffect(() => {
        if (!playerId) return
        if (useWebRTC && !myId) {
            console.log('[ScreenModal] Waiting for MyID before requesting stream...')
            return
        }

        const fetchScreen = async () => {
            setLoading(true)
            setError(null)
            // don't clear image immediately to prevent flicker

            console.log('[ScreenModal] Requesting Screen for:', playerId)

            try {
                // Request the screenshot
                const res = await sendNui('GetPlayerScreen', { targetId: playerId })
                if (res?.status === 'error') {
                   setError(res.message)
                   setLoading(false)
                } else {
                   // Set timeout for 15s waiting for chunks
                   if (timeoutRef.current) clearTimeout(timeoutRef.current)
                   timeoutRef.current = window.setTimeout(() => {
                        setLoading((prev) => {
                            if (prev) {
                                // If we have partial data, maybe show it? No, base64 needs to be complete.
                                setError("Timeout waiting for chunks")
                                return false
                            }
                            return prev
                        })
                   }, 15000)
                }
            } catch (e) {
                setError("Failed to request screen")
                setLoading(false)
            }
        }

        fetchScreen()

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [playerId, refreshTrigger, sendNui, useWebRTC, myId])

    useEffect(() => {
        const handler = (data: any) => {
             // data = { id: source, captureId, current, total, data }
             if (data && String(data.id) === String(playerId)) {
                 const buffer = chunksRef.current[data.captureId] || { total: data.total, chunks: {} }
                 buffer.chunks[data.current] = data.data
                 chunksRef.current[data.captureId] = buffer

                 // Check completion
                 if (Object.keys(buffer.chunks).length === data.total) {
                     // Reassemble
                     let fullImage = ""
                     for(let i=1; i<=data.total; i++) {
                         fullImage += buffer.chunks[i]
                     }

                     setImage(fullImage)
                     setLoading(false)
                     if (timeoutRef.current) clearTimeout(timeoutRef.current)

                     // Cleanup old buffers
                     delete chunksRef.current[data.captureId]
                 }
             }
        }

        on('ReceiveScreenChunk', handler)

        return () => {
            off('ReceiveScreenChunk', handler)
        }
    }, [playerId, on, off])

    if (!playerId) return null

    return (
        <MriModal onClose={onClose} className="w-[800px] h-[600px] max-w-2xl flex flex-col p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <Camera className="w-5 h-5 text-primary" />
                    Screen View: {playerName || playerId}
                </div>
            </div>

            <div className="flex-1 bg-black/50 rounded-lg overflow-hidden flex items-center justify-center relative border border-input mb-4">
                {loading && (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
                            <Spinner />
                            <span className="text-xs">Connecting to video feed...</span>
                    </div>
                )}

                {error && (
                        <div className="flex flex-col items-center gap-2 text-red-400">
                            <AlertCircle className="w-8 h-8" />
                            <span className="text-sm">{error}</span>
                    </div>
                )}

                {image && (
                    <img
                        src={image}
                        alt="Player Screen"
                        className="w-full h-full object-contain"
                    />
                )}
            </div>

            <div className="flex justify-end gap-2">
                    <MriButton
                    onClick={() => setRefreshTrigger(p => p + 1)}
                    disabled={loading}
                    className="flex items-center gap-2"
                    >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                    </MriButton>
            </div>
        </MriModal>
    )
}
