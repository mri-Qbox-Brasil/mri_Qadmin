
import { useState, useEffect } from 'react'
import { MriPageHeader, MriCard, MriButton } from '@mriqbox/ui-kit'
import { Monitor, Plus, X, Video } from 'lucide-react'
import { useNui } from '@/context/NuiContext'
import Spinner from '@/components/Spinner'

interface ScreenPlayer {
    id: number
    name: string
    image?: string
    loading?: boolean
    error?: string
}

export default function LiveScreensPage() {
    const { sendNui, on, off } = useNui()
    const [players, setPlayers] = useState<any[]>([])
    const [watching, setWatching] = useState<ScreenPlayer[]>([])

    // Fetch generic player list
    useEffect(() => {
        sendNui('getPlayers', { page: 1, limit: 100, search: '' }).then((res: any) => {
             // Server returns { data: [], total: ..., pages: ... }
             // or sometimes direct array if legacy? But our server/players.lua returns structure.
             const list = res.data || (Array.isArray(res) ? res : [])
             if (list) setPlayers(list)
        })
    }, [sendNui])

    // Poll for watched screens
    useEffect(() => {
        if (watching.length === 0) return

        const fetchAll = () => {
             watching.forEach(p => {
                 sendNui('GetPlayerScreen', { targetId: p.id })
             })
        }

        fetchAll()
        const interval = setInterval(fetchAll, 5000) // 5 seconds refresh to save bandwidth

        return () => clearInterval(interval)
    }, [watching, sendNui])

    const chunksRef = useState<Record<string, Record<string, { total: number, chunks: Record<number, string> }>>>({})[0]

    // Listen for images (chunks)
    useEffect(() => {
        const handler = (data: any) => {
            // data = { id: source, captureId, current, total, data }
            const playerId = String(data.id)

            // Initialize buffer for this player if needed
            if (!chunksRef[playerId]) chunksRef[playerId] = {}

            const buffer = chunksRef[playerId][data.captureId] || { total: data.total, chunks: {} }
            buffer.chunks[data.current] = data.data
            chunksRef[playerId][data.captureId] = buffer

             // Check completion
             if (Object.keys(buffer.chunks).length === data.total) {
                 // Reassemble
                 let fullImage = ""
                 for(let i=1; i<=data.total; i++) {
                     fullImage += buffer.chunks[i]
                 }

                 // Update State
                setWatching(prev => prev.map(p => {
                    if (String(p.id) === playerId) {
                        return { ...p, image: fullImage, loading: false }
                    }
                    return p
                }))

                // Cleanup
                delete chunksRef[playerId][data.captureId]
             }
        }

        on('ReceiveScreenChunk', handler)
        return () => off('ReceiveScreenChunk', handler)
    }, [on, off])

    const toggleWatch = (player: any) => {
        if (watching.find(w => w.id === player.id)) {
            setWatching(prev => prev.filter(w => w.id !== player.id))
        } else {
            setWatching(prev => [...prev, { id: player.id, name: player.name, loading: true }])
        }
    }

    return (
        <div className="h-full flex flex-col bg-background">
             <MriPageHeader title="Live Screens Dashboard" icon={Monitor} />

             <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
                 {/* Watching Grid */}
                 <div className="flex-1 border rounded-xl p-4 overflow-auto bg-card/50">
                     <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Video className="w-5 h-5 text-red-500" />
                            Active Feeds ({watching.length})
                        </h2>
                        <span className="text-xs text-muted-foreground">Refreshes every 5s</span>
                     </div>

                     {watching.length === 0 ? (
                         <div className="h-40 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                             Select players below to watch their screen
                         </div>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {watching.map(p => (
                                 <MriCard key={p.id} className="overflow-hidden flex flex-col bg-background">
                                     <div className="p-2 border-b flex justify-between items-center bg-muted/50">
                                         <span className="font-bold truncate">{p.name} (ID: {p.id})</span>
                                         <button onClick={() => toggleWatch(p)} className="text-muted-foreground hover:text-destructive">
                                             <X className="w-4 h-4" />
                                         </button>
                                     </div>
                                     <div className="aspect-video bg-black relative flex items-center justify-center">
                                         {p.loading && !p.image && <Spinner />}
                                         {p.image ? (
                                             <img src={p.image} className="w-full h-full object-cover" />
                                         ) : (
                                             !p.loading && <span className="text-xs text-muted-foreground">No Signal</span>
                                         )}
                                     </div>
                                 </MriCard>
                             ))}
                         </div>
                     )}
                 </div>

                 {/* Selector List */}
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
                                         disabled={isWatching}
                                         className={`flex items-center gap-2 p-2 rounded border text-sm transition-colors ${
                                             isWatching ? 'bg-primary/20 border-primary/50 opacity-50' : 'hover:bg-accent border-transparent hover:border-border'
                                         }`}
                                     >
                                         <Plus className="w-3 h-3" />
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
