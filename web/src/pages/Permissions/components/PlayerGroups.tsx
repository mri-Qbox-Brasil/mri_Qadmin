import React, { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { Loader2, MapPin, User, ChevronLeft } from 'lucide-react'
import { MriButton } from '@mriqbox/ui-kit'
import { useNui } from '@/context/NuiContext'
import { GroupData } from './GroupManager'
import { isEnvBrowser } from '@/utils/misc'
import { MOCK_CHARACTER_GROUPS, MOCK_PLAYERS } from '@/utils/mockData'
import { cn } from '@/lib/utils'
import { Player } from '@/types'

export default function PlayerGroups({ groups, searchQuery }: { groups: GroupData[], searchQuery: string }) {
    const { sendNui } = useNui()
    const { t } = useI18n()
    const [loading, setLoading] = useState(false)
    const [searchingPlayers, setSearchingPlayers] = useState(false)
    
    // Player list states
    const [playersList, setPlayersList] = useState<Player[]>([])
    const [activePlayer, setActivePlayer] = useState<Player | null>(null)
    
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())

    // Fetch players on mount or search
    const fetchPlayers = useCallback(async (query: string) => {
        setSearchingPlayers(true)
        try {
            const limit = 40;
            const searchLower = String(query).toLowerCase()
            
            const filteredMocks = query === '' 
                ? (MOCK_PLAYERS as any[])
                : (MOCK_PLAYERS as any[]).filter((p: any) =>
                    String(p.name || '').toLowerCase().includes(searchLower) ||
                    String(p.license || '').toLowerCase().includes(searchLower) ||
                    String(p.citizenid || '').toLowerCase().includes(searchLower) ||
                    String(p.id).includes(query)
                )

            const mock: any = { data: filteredMocks.slice(0, limit), total: filteredMocks.length, pages: 1 }

            const response = await sendNui('getPlayers', { page: 1, limit, search: query }, mock)
            const data = Array.isArray(response) ? response : (response.data || [])
            setPlayersList(data)
        } catch (e) {
            console.error(e)
        } finally {
            setSearchingPlayers(false)
        }
    }, [sendNui])

    // Debounce search using prop
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!activePlayer) fetchPlayers(searchQuery)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery, activePlayer, fetchPlayers])


    const loadPlayerGroups = async (player: Player) => {
        setLoading(true)
        try {
            const cid = player.citizenid
            let result: string[] = []
            
            if (isEnvBrowser()) {
                // @ts-expect-error Mock data might not match type perfectly
                result = MOCK_CHARACTER_GROUPS[cid] || []
            } else {
                result = await sendNui<string[]>('mri_Qadmin:callback:GetCharacterGroups', { citizenid: cid }) || []
            }

            setActivePlayer(player)
            setSelectedGroups(new Set(result))
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const toggleGroup = (groupId: string) => {
        const next = new Set(selectedGroups)
        if (next.has(groupId)) next.delete(groupId)
        else next.add(groupId)
        setSelectedGroups(next)
    }

    const handleSave = async () => {
        if (!activePlayer?.citizenid) return
        setLoading(true)
        const response: any = await sendNui('mri_Qadmin:server:UpdateCharacterGroups', { citizenid: activePlayer.citizenid, groups: Array.from(selectedGroups) })
        if (response?.status === 'ok') {
            await loadPlayerGroups(activePlayer)
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col h-full bg-card/5 relative">
            {!activePlayer ? (
                <div className="flex flex-col h-full max-w-5xl mx-auto w-full p-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex-1 overflow-y-auto pb-8 min-h-[400px]">
                        {playersList.length === 0 && !searchingPlayers ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                                <User className="w-16 h-16 mb-4" />
                                <p className="text-lg">{t('permissions.player_groups.no_players')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {playersList.map((p) => (
                                    <div 
                                        key={p.citizenid || p.id}
                                        onClick={() => loadPlayerGroups(p)}
                                        className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group shadow-sm hover:shadow-md"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 relative overflow-hidden group-hover:bg-primary/20 transition-colors">
                                            <User className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <div className={cn("absolute bottom-0 w-full h-1.5", p.online ? "bg-green-500" : "bg-red-500")} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-foreground truncate">{p.name || t('common.unknown')}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] uppercase font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">ID: {p.id}</span>
                                                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground truncate">{p.citizenid}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-8 animate-in fade-in slide-in-from-right-8">
                    <button 
                        onClick={() => setActivePlayer(null)}
                        className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors w-fit font-medium text-sm"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> {t('permissions.player_groups.back_to_search')}
                    </button>

                    <div className="bg-card/40 border border-border/50 rounded-2xl p-8 backdrop-blur-sm shadow-xl relative overflow-hidden">
                        {/* Header Profile */}
                        <div className="flex items-start gap-6 border-b border-border/50 pb-8 mb-8">
                            <div className="w-24 h-24 rounded-2xl bg-muted border border-border flex items-center justify-center relative shadow-lg">
                                <User className="w-10 h-10 text-primary" />
                                <div className={cn("absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-card flex items-center justify-center", activePlayer.online ? "bg-green-500" : "bg-red-500")}>
                                   {activePlayer.online && <span className="absolute w-full h-full animate-ping rounded-full bg-green-500/50" />}
                                </div>
                            </div>
                            <div className="flex flex-col justify-center flex-1">
                                <h3 className="text-3xl font-bold tracking-tight mb-2 text-foreground">{activePlayer.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2.5 py-1 rounded bg-muted/80 border border-border text-xs font-mono font-medium text-foreground">
                                        ID: {activePlayer.id}
                                    </span>
                                    <span className="px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-xs font-mono font-medium text-primary">
                                        {activePlayer.citizenid}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> {t('permissions.player_groups.assigned_groups')}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {groups.map(g => (
                                    <div 
                                        key={g.id}
                                        onClick={() => toggleGroup(g.id)}
                                        className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            selectedGroups.has(g.id) 
                                                ? 'bg-primary/10 border-primary shadow-sm shadow-primary/10' 
                                                : 'bg-card/50 border-border/50 hover:border-primary/50 hover:bg-card'
                                        }`}
                                    >
                                        <span className="font-bold text-sm text-foreground">{g.label}</span>
                                        <span className="text-[10px] text-muted-foreground mt-1 uppercase font-mono tracking-wider">{g.id}</span>
                                    </div>
                                ))}
                                {groups.length === 0 && (
                                    <span className="col-span-full text-center text-muted-foreground py-4 text-sm bg-muted/30 rounded-lg">{t('permissions.player_groups.no_groups_hint')}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
                            <MriButton variant="outline" onClick={() => setActivePlayer(null)}>{t('common.cancel')}</MriButton>
                            <MriButton onClick={handleSave} disabled={loading} className="px-10 shadow-lg shadow-primary/20 text-md h-12">
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {t('permissions.player_groups.save_links')}
                            </MriButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
