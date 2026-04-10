import React, { useState, useEffect } from 'react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'
import ActionButton from './components/ActionButton'
import ActionDropdown from './components/ActionDropdown'
import { MriButton, MriPageHeader, MriCompactSearch } from '@mriqbox/ui-kit'
import { Zap, RefreshCw, X, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VirtuosoGrid } from 'react-virtuoso'
import ActionsSkeleton from '@/components/skeletons/ActionsSkeleton'
import { hasPermission } from '@/utils/permissions'
import { MOCK_GAME_DATA } from '@/utils/mockData'

export default function Actions() {
    const { gameData, setGameData, myPermissions } = useAppState()
    const { sendNui } = useNui()
    const { t } = useI18n()
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState<'all' | 'favorites'>('all')
    const [favorites, setFavorites] = useState<Record<string, boolean>>({})

    useEffect(() => {
        // Load favorites from local storage
        const loadedFavorites: Record<string, boolean> = {}
        if (gameData.actions) {
            Object.keys(gameData.actions).forEach(key => {
                if (localStorage.getItem(`favorite-${key}`) === 'true') {
                    loadedFavorites[key] = true
                }
            })
            setFavorites(loadedFavorites)
        }
    }, [gameData.actions])

    const toggleFavorite = (id: string) => {
        const newState = !favorites[id]
        setFavorites(prev => ({ ...prev, [id]: newState }))
        localStorage.setItem(`favorite-${id}`, String(newState))
    }

    const handleRefresh = async () => {
        setLoading(true)
        try {
            const data = await sendNui('getData', {}, MOCK_GAME_DATA)
            if (data) setGameData((prev: any) => ({ ...prev, ...data }))
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const actionList = React.useMemo(() => {
        const actions = gameData.actions || []
        const list = Array.isArray(actions)
            ? actions.map((v, i) => ({ ...v, id: v.id || i.toString() }))
            : Object.entries(actions).map(([k, v]) => ({ ...(v as any), id: k }))

        return list.map(action => ({
            ...action,
            label: (action.label || '').trim()
        })).sort((a, b) => a.label.localeCompare(b.label))
    }, [gameData.actions])

    const actionOptions = React.useMemo(() => actionList.map(a => ({
        value: a.id,
        label: a.label
    })), [actionList])

    const filteredActions = actionList.filter((action: any) => {
        // Permission Check
        const permKey = action.perms || `action.${action.id}`
        if (!hasPermission(myPermissions, permKey)) return false

        const matchesSearch = action.label.toLowerCase().includes(search.toLowerCase())
        if (!matchesSearch) return false
        if (filter === 'favorites') {
            return favorites[action.id]
        }
        return true
    })

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('nav_actions')} countLabel={t('records')} count={actionList.length} icon={Zap}>
                <div className="flex gap-2 bg-muted rounded-lg p-1 border border-border">
                    <button
                        onClick={() => setFilter('all')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                            filter === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Zap className="w-3.5 h-3.5" />
                        {t('actions_filter_all')}
                    </button>
                    <button
                        onClick={() => setFilter('favorites')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                            filter === 'favorites' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        {t('actions_filter_favorites')}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <MriCompactSearch
                        placeholder={t('actions_search_placeholder')}
                        value={search}
                        onChange={(val) => setSearch(val)}
                        options={actionOptions}
                        searchPlaceholder={t('actions_search_placeholder')}
                        className="w-8 h-8 border-border bg-card/60"
                    />
                    {search && (
                        <MriButton
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => setSearch('')}
                        >
                            <X size={16} />
                        </MriButton>
                    )}
                </div>
                <MriButton
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </MriButton>
            </MriPageHeader>

            {loading && actionList.length === 0 ? (
                <ActionsSkeleton />
            ) : filteredActions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Zap className="w-10 h-10 opacity-20" />
                    <p>{t('none_found')}</p>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden pt-4 p-2">
                    <VirtuosoGrid
                        style={{ height: '100%' }}
                        data={filteredActions}
                        listClassName="grid grid-cols-4 gap-4 items-start"
                        itemContent={(index, action) => (
                            action.dropdown ? (
                                <ActionDropdown
                                    key={action.id}
                                    id={action.id}
                                    data={action}
                                    isFavorite={favorites[action.id]}
                                    onToggleFavorite={toggleFavorite}
                                />
                            ) : (
                                <ActionButton
                                    key={action.id}
                                    id={action.id}
                                    data={action}
                                    isFavorite={favorites[action.id]}
                                    onToggleFavorite={toggleFavorite}
                                />
                            )
                        )}
                    />
                </div>
            )}
        </div>
    )
}
