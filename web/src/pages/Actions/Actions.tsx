import React, { useState, useEffect } from 'react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/context/I18n'
import ActionButton from './components/ActionButton'
import ActionDropdown from './components/ActionDropdown'
import { Button, Input, PageHeader } from '@mriqbox/ui-kit'
import { Search, Zap, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Actions() {
  const { gameData, setGameData } = useAppState()
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
        const data = await sendNui('getData')
        if (data) setGameData((prev: any) => ({ ...prev, ...data }))
    } catch (e) {
        console.error(e)
    } finally {
        setLoading(false)
    }
  }

  const actions = gameData.actions || []
  const actionList = React.useMemo(() => {
    const list = Array.isArray(actions)
      ? actions.map((v, i) => ({ ...v, id: v.id || i.toString() }))
      : Object.entries(actions).map(([k, v]) => ({ ...(v as any), id: k }))

    return list.map(action => ({
      ...action,
      label: (action.label || '').trim()
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [actions])

  const filteredActions = actionList.filter((action: any) => {
    const matchesSearch = action.label.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'favorites') {
        return favorites[action.id]
    }
    return true
  })

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <PageHeader title={t('nav_actions')} icon={Zap}>
         <div className="flex gap-2 bg-muted rounded-lg p-1 border border-border">
              <button
                 onClick={() => setFilter('all')}
                 className={cn(
                     "px-3 py-1 text-xs font-medium rounded-md transition-all",
                     filter === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                 )}
              >
                 {t('actions_filter_all')}
              </button>
              <button
                 onClick={() => setFilter('favorites')}
                 className={cn(
                     "px-3 py-1 text-xs font-medium rounded-md transition-all",
                     filter === 'favorites' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                 )}
              >
                 {t('actions_filter_favorites')}
              </button>
         </div>

         <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                 placeholder={t('actions_search_placeholder')}
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="pl-9 bg-card border-border focus:border-ring h-10 transition-colors"
              />
         </div>
         <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={handleRefresh}
            disabled={loading}
         >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
         </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-8 no-scrollbar">
        {filteredActions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Zap className="w-10 h-10 opacity-20" />
                <p>{t('none_found')}</p>
            </div>
        ) : (
            <div className="@container">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                    {filteredActions.map((action: any) => (
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
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  )
}
