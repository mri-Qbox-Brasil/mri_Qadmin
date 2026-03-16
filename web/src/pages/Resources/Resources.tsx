import React, { useState } from 'react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'
import { MriButton, MriPageHeader, MriCompactSearch } from '@mriqbox/ui-kit'
import ResourceCard from './components/ResourceCard'
import Changelog from './components/Changelog'
import { Database, RefreshCw, Container, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Virtuoso } from 'react-virtuoso'
import ResourcesSkeleton from '@/components/skeletons/ResourcesSkeleton'

export default function Resources() {
    const { gameData, setGameData } = useAppState()
    const { sendNui, on, off } = useNui()
    const { t } = useI18n()
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)

    const resources = React.useMemo(() => {
        return (gameData.resources || []).map((res: any) => ({
            ...res,
            name: (res.name || '').trim()
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))
    }, [gameData.resources])

    const filteredResources = React.useMemo(() => {
        return resources.filter((res: any) =>
            res.name.toLowerCase().includes(search.toLowerCase())
        )
    }, [resources, search])

    const searchOptions = React.useMemo(() => {
        return resources.map((res: any) => ({
            value: res.name,
            label: res.name
        }))
    }, [resources])

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

    React.useEffect(() => {
        const handleUpdate = (data: any) => {
            if (!data || !data.name) return
            setGameData((prev: any) => {
                const existing = prev.resources || []
                const index = existing.findIndex((r: any) => r.name === data.name)

                let newResources
                if (index > -1) {
                    newResources = [...existing]
                    newResources[index] = { ...newResources[index], ...data }
                } else {
                    newResources = [...existing, data]
                }

                return { ...prev, resources: newResources }
            })
        }

        on('updateResourceState', handleUpdate)
        return () => off('updateResourceState', handleUpdate)
    }, [on, off, setGameData])

    if (loading && resources.length === 0) {
        return <ResourcesSkeleton />
    }

    return (
        <div className="w-full h-full flex overflow-hidden bg-background">
            {/* Resource List */}
            <div className="w-1/2 h-full flex flex-col border-r border-border overflow-hidden">
                <MriPageHeader title={t('nav_resources')} icon={Container} countLabel={t('records')} count={filteredResources.length}>
                    <div className="flex items-center gap-2">
                        <MriCompactSearch
                            placeholder={t('resources_search_placeholder')}
                            value={search}
                            onChange={setSearch}
                            options={searchOptions}
                            searchPlaceholder={t('resources_search_placeholder')}
                            className="w-8 h-8 border-border bg-card/60"
                        />
                        {search && (
                            <MriButton
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                                onClick={() => setSearch('')}
                                title={t('common_clear')}
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

                <div className="flex-1 overflow-hidden pt-4 pl-2 pr-4">
                    {filteredResources.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Database className="w-10 h-10 opacity-20" />
                            <p>{t('resources_none_found')}</p>
                        </div>
                    ) : (
                        <Virtuoso
                            style={{ height: '100%' }}
                            data={filteredResources}
                            itemContent={(index, res) => (
                                <div className="pb-2">
                                    <ResourceCard
                                        label={res.name}
                                        version={res.version}
                                        author={res.author}
                                        description={res.description}
                                        state={res.resourceState}
                                    />
                                </div>
                            )}
                        />
                    )}
                </div>
            </div>

            {/* Changelog Column */}
            <div className="w-1/2 h-full overflow-hidden bg-muted/10">
                <Changelog />
            </div>
        </div>
    )
}
