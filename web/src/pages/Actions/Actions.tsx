import React, { useState, useEffect } from 'react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'
import ActionButton from './components/ActionButton'
import ActionDropdown from './components/ActionDropdown'
import { MriButton, MriPageHeader } from '@mriqbox/ui-kit'
import { MriExpandableSearch } from '@/components/ui/MriExpandableSearch'
import { Zap, RefreshCw, Star, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MriTabs, MriTabItem } from '@/components/ui/MriTabs'
import { VirtuosoGrid } from 'react-virtuoso'
import ActionsSkeleton from '@/components/skeletons/ActionsSkeleton'
import { hasPermission } from '@/utils/permissions'
import { MOCK_GAME_DATA } from '@/utils/mockData'
import ActionManager, { ActionManagerRef } from '../ActionManager/ActionManager'
import { Plus } from 'lucide-react'

export default function Actions() {
    const { gameData, setGameData, myPermissions } = useAppState()
    const { sendNui } = useNui()
    const { t } = useI18n()
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'manager'>('all')
    const [selectedCategory, setSelectedCategory] = useState<'All' | 'Actions' | 'PlayerActions' | 'OtherActions'>('All')
    const [favorites, setFavorites] = useState<Record<string, boolean>>({})
    const managerRef = React.useRef<ActionManagerRef>(null)

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
        const sourceMap = {
            'Actions': gameData.actions,
            'PlayerActions': gameData.playerActions,
            'OtherActions': gameData.otherActions
        }
        
        let actions: any[] = []
        if (selectedCategory === 'All') {
            actions = [
                ...(Array.isArray(gameData.actions) ? gameData.actions.map(a => ({ ...a, category: 'Actions' })) : Object.entries(gameData.actions || {}).map(([k, v]) => ({ ...(v as any), id: k, category: 'Actions' }))),
                ...(Array.isArray(gameData.playerActions) ? gameData.playerActions.map(a => ({ ...a, category: 'PlayerActions' })) : Object.entries(gameData.playerActions || {}).map(([k, v]) => ({ ...(v as any), id: k, category: 'PlayerActions' }))),
                ...(Array.isArray(gameData.otherActions) ? gameData.otherActions.map(a => ({ ...a, category: 'OtherActions' })) : Object.entries(gameData.otherActions || {}).map(([k, v]) => ({ ...(v as any), id: k, category: 'OtherActions' })))
            ]
        } else {
            const rawSource = sourceMap[selectedCategory as keyof typeof sourceMap] || []
            actions = Array.isArray(rawSource)
                ? rawSource.map((v, i) => ({ ...v, id: v.id || i.toString(), category: selectedCategory }))
                : Object.entries(rawSource).map(([k, v]) => ({ ...(v as any), id: k, category: selectedCategory }))
        }

        return actions.map(action => ({
            ...action,
            label: (action.label || '').trim()
        })).sort((a, b) => a.label.localeCompare(b.label))
    }, [gameData, selectedCategory])


    const filteredActions = actionList.filter((action: any) => {
        // Permission Check
        const permKey = action.perms || `action.${action.id}`
        if (!hasPermission(myPermissions, permKey)) return false

        const matchesSearch = action.label.toLowerCase().includes(search.toLowerCase())
        if (!matchesSearch) return false
        if (activeTab === 'favorites') {
            return favorites[action.id]
        }
        return true
    })

    const actionTabs: MriTabItem[] = [
        { id: 'all', label: t('actions.filter.all'), icon: Zap },
        { id: 'favorites', label: t('actions.filter.favorites'), icon: Star, className: activeTab === 'favorites' ? 'text-yellow-500 hover:text-yellow-400' : '' },
        ...(hasPermission(myPermissions, 'qadmin.action.manage_actions') ? [
            { id: 'manager', label: t('nav.action_manager'), icon: SettingsIcon }
        ] : []),
    ]

    const categoryTabs: MriTabItem[] = [
        { id: 'All', label: t('all') || 'All' },
        { id: 'Actions', label: t('categories.actions') || 'Actions' },
        { id: 'PlayerActions', label: t('categories.player_actions') || 'Player Actions' },
        { id: 'OtherActions', label: t('categories.other_actions') || 'Other Actions' },
    ]

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('qadmin.page.actions')} countLabel={activeTab !== 'manager' ? t('credits.records') : undefined} count={activeTab !== 'manager' ? actionList.length : undefined} icon={Zap}>
                <div className="flex items-center gap-4">
                    <MriTabs
                        items={actionTabs}
                        value={activeTab}
                        onChange={(val) => setActiveTab(val as any)}
                    />
                    <div className="w-px h-6 bg-border mx-2" /> {/* Divider */}
                    <MriTabs
                        items={categoryTabs}
                        variant="pills"
                        value={selectedCategory}
                        onChange={(val) => setSelectedCategory(val as any)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <MriExpandableSearch
                        placeholder={t('actions.search_placeholder')}
                        value={search}
                        onChange={(val) => setSearch(val)}
                    />
                    <MriButton
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </MriButton>
                    {activeTab === 'manager' && hasPermission(myPermissions, 'qadmin.action.manage_actions') && (
                        <MriButton
                            size="icon"
                            variant="brand"
                            className="h-10 w-10"
                            onClick={() => managerRef.current?.handleOpenCreate()}
                        >
                            <Plus className="w-4 h-4" />
                        </MriButton>
                    )}
                </div>
            </MriPageHeader>

            {activeTab === 'manager' ? (
                <ActionManager ref={managerRef} isEmbedded search={search} selectedCategory={selectedCategory} />
            ) : loading && actionList.length === 0 ? (
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
