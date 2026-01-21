import React, { useState } from 'react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/context/I18n'
import { MriButton, MriInput, MriPageHeader } from '@mriqbox/ui-kit'
import ResourceCard from './components/ResourceCard'
import Changelog from './components/Changelog'
import { Search, Box, Database, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'

export default function Resources() {
  const { gameData, setGameData } = useAppState()
  const { sendNui } = useNui()
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

  return (
    <div className="w-full h-full flex overflow-hidden bg-background">
      {/* Resource List */}
      <div className="w-1/2 h-full flex flex-col border-r border-border">
         <MriPageHeader title={t('nav_resources')} icon={Box} count={filteredResources.length}>
             <div className="relative w-full max-w-xs">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <MriInput
                    placeholder={t('resources_search_placeholder')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 bg-card border-border focus:border-ring h-10 transition-colors"
                 />
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

        <div className="flex-1 overflow-auto space-y-3 pr-2 no-scrollbar p-6">
            {filteredResources.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Database className="w-10 h-10 opacity-20" />
                    <p>{t('resources_none_found')}</p>
                </div>
            ) : (
                filteredResources.map((res: any) => (
                    <ResourceCard
                        key={res.name}
                        label={res.name}
                        version={res.version}
                        author={res.author}
                        description={res.description}
                        state={res.resourceState}
                    />
                ))
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
