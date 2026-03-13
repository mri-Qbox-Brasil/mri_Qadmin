import { useState, useEffect, useCallback } from 'react'
import { MriPageHeader, MriButton, MriCompactSearch } from '@mriqbox/ui-kit'
import { Shield, Key, Users, RefreshCw, Wand2, X } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import AcesList from './components/AcesList'
import PrincipalsList from './components/PrincipalsList'
import { cn } from '@/lib/utils'
import { useNui } from '@/context/NuiContext'
import ConfirmAction from '@/components/players/ConfirmAction'

export default function Permissions() {
    const { t } = useI18n()
    const { sendNui, on, off } = useNui()
    const [activeTab, setActiveTab] = useState<'aces' | 'principals'>('principals')
    const [search, setSearch] = useState('')
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [itemCount, setItemCount] = useState(0)
    const [showSeedConfirm, setShowSeedConfirm] = useState(false)

    const handleRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1)
    }, [])

    useEffect(() => {
        const onRefresh = () => handleRefresh()
        on('refreshPermissionsLists', onRefresh)
        return () => off('refreshPermissionsLists', onRefresh)
    }, [on, off, handleRefresh])

    const handleSeed = async () => {
        await sendNui('seed_pages')
        setShowSeedConfirm(false)
        // Also refresh manually a bit later just in case
        setTimeout(handleRefresh, 1000)
    }

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader
                title={t('permissions_title')}
                icon={Shield}
                count={itemCount}
                countLabel={activeTab === 'principals' ? t('permissions_inheritance') : t('permissions_aces')}
            >
                <div className="flex items-center gap-3">
                    <div className="flex gap-2 bg-muted rounded-lg p-1 border border-border">
                        <button
                            onClick={() => setActiveTab('principals')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                                activeTab === 'principals' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Users className="w-3.5 h-3.5" />
                            {t('permissions_inheritance')}
                        </button>
                        <button
                            onClick={() => setActiveTab('aces')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                                activeTab === 'aces' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Key className="w-3.5 h-3.5" />
                            {t('permissions_aces')}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <MriCompactSearch
                            placeholder={t('search_placeholder_items')}
                            value={search}
                            onChange={(val) => setSearch(val)}
                            options={[]} // We will leave options empty or fetch common groups
                            searchPlaceholder={t('search_placeholder_items')}
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
                        title={t('refresh')}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </MriButton>

                    <MriButton
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSeedConfirm(true)}
                        title={t('permissions_seed_btn')}
                    >
                        <Wand2 className="w-4 h-4" />
                    </MriButton>
                </div>
            </MriPageHeader>

            <div className="flex-1 overflow-hidden p-6 flex flex-col">
                <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                    {activeTab === 'principals' ? (
                        <div className="flex flex-col h-full space-y-4 overflow-hidden">
                            <div>
                                <h2 className="text-lg font-bold">{t('permissions_inheritance_title')}</h2>
                                <p className="text-muted-foreground text-sm">{t('permissions_inheritance_desc')}</p>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <PrincipalsList searchQuery={search} refreshTrigger={refreshTrigger} onCountChange={setItemCount} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full space-y-4 overflow-hidden">
                            <div>
                                <h2 className="text-lg font-bold">{t('permissions_aces_title')}</h2>
                                <p className="text-muted-foreground text-sm">{t('permissions_aces_desc')}</p>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <AcesList searchQuery={search} refreshTrigger={refreshTrigger} onCountChange={setItemCount} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showSeedConfirm && (
                <ConfirmAction
                    text={t('permissions_seed_confirm')}
                    onConfirm={handleSeed}
                    onCancel={() => setShowSeedConfirm(false)}
                />
            )}
        </div>
    )
}
