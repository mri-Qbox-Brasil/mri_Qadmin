import React, { useState } from 'react'
import { useAppState } from '@/context/AppState'
import { useI18n } from '@/context/I18n'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriInput, MriPageHeader } from '@mriqbox/ui-kit'
import { Search, Terminal, Command, Copy, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VirtuosoGrid } from 'react-virtuoso'
import CommandsSkeleton from '@/components/skeletons/CommandsSkeleton'

export default function Commands() {
    const { gameData, setGameData } = useAppState()
    const { sendNui } = useNui()
    const { t } = useI18n()
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)

    const commands = React.useMemo(() => {
        return (gameData.commands || []).map((cmd: any) => ({
            ...cmd,
            name: (cmd.name || '').trim()
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))
    }, [gameData.commands])

    const filteredCommands = commands.filter((cmd: any) =>
        cmd.name.toLowerCase().includes(search.toLowerCase()) ||
        (cmd.description || '').toLowerCase().includes(search.toLowerCase())
    )

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
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

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('nav_commands')} icon={Terminal} countLabel={t('records')} count={filteredCommands.length}>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <MriInput
                        placeholder={t('commands_search_placeholder')}
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

            {loading && commands.length === 0 ? (
                <CommandsSkeleton />
            ) : filteredCommands.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Command className="w-10 h-10 opacity-20" />
                    <p>{t('commands_none_found')}</p>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden p-8">
                    <VirtuosoGrid
                        style={{ height: '100%' }}
                        data={filteredCommands}
                        listClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        itemContent={(index, cmd) => (
                            <div key={cmd.name} className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 hover:bg-muted/50 transition-all group relative overflow-hidden">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MriButton size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(cmd.name)}>
                                        <Copy className="w-3 h-3" />
                                    </MriButton>
                                </div>

                                <div className="w-12 h-12 bg-muted/30 rounded-lg flex items-center justify-center border border-border shrink-0">
                                    <Terminal className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className="font-bold text-foreground truncate pr-6 font-mono text-sm">{cmd.name}</h3>
                                    <p className="text-xs text-muted-foreground truncate" title={cmd.description}>{cmd.description || t('no_description')}</p>
                                </div>
                            </div>
                        )}
                    />
                </div>
            )}
        </div>
    )
}
