import { useState, useEffect, useCallback } from 'react'
import { MriPageHeader, MriButton } from '@mriqbox/ui-kit'
import { MriExpandableSearch } from '@/components/ui/MriExpandableSearch'
import { Shield, Key, Users, RefreshCw, Wand2, Sparkles } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import AcesList from './components/AcesList'
import PrincipalsList from './components/PrincipalsList'
import { useNui } from '@/context/NuiContext'
import { MriTabs, MriTabItem } from '@/components/ui/MriTabs'
import ConfirmAction from '@/components/players/ConfirmAction'
import PermissionWizard from './components/PermissionWizard'

export default function Permissions() {
    const { t } = useI18n()
    const { sendNui, on, off } = useNui()
    const [activeTab, setActiveTab] = useState<'aces' | 'principals'>('principals')
    const [search, setSearch] = useState('')
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [itemCount, setItemCount] = useState(0)
    const [showSeedConfirm, setShowSeedConfirm] = useState(false)
    const [showWizard, setShowWizard] = useState(false)
    const [selectedPrincipal, setSelectedPrincipal] = useState<string>('group.admin')

    const handleRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1)
    }, [])

    const handleRequestEditAce = (principal: string) => {
        setSelectedPrincipal(principal)
        setActiveTab('aces')
    }

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

    const permissionTabs: MriTabItem[] = [
        { id: 'principals', label: t('permissions_inheritance'), icon: Users },
        { id: 'aces', label: t('permissions_aces'), icon: Key },
    ]

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader
                title={t('permissions_title')}
                icon={Shield}
                count={itemCount}
                countLabel={activeTab === 'principals' ? t('permissions_inheritance') : t('permissions_aces')}
            >
                <div className="flex items-center gap-3">
                    <MriTabs
                        items={permissionTabs}
                        value={activeTab}
                        onChange={setActiveTab}
                    />

                    <div className="flex items-center gap-2">
                        <MriExpandableSearch
                            placeholder={t('search_placeholder_items')}
                            value={search}
                            onChange={(val) => setSearch(val)}
                        />
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
                        className="h-10 w-10 border-input bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-foreground border-primary/20"
                        onClick={() => setShowWizard(true)}
                        title={t('permission_wizard_title')}
                    >
                        <Sparkles className="w-4 h-4" />
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

            <div className="flex-1 overflow-hidden p-6 flex flex-col relative" key={activeTab}>
                {/* Background decorative elements */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10" />

                <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
                    {activeTab === 'principals' ? (
                        <div className="flex flex-col h-full space-y-6 overflow-hidden">
                            <div className="px-1">
                                <h2 className="text-2xl font-bold tracking-tight">{t('permissions_inheritance_title')}</h2>
                                <p className="text-muted-foreground text-sm">{t('permissions_inheritance_desc')}</p>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <PrincipalsList 
                                    searchQuery={search} 
                                    refreshTrigger={refreshTrigger} 
                                    onCountChange={setItemCount} 
                                    onRequestEdit={handleRequestEditAce}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full space-y-6 overflow-hidden">
                            <div className="px-1">
                                <h2 className="text-2xl font-bold tracking-tight">{t('permissions_aces_title')}</h2>
                                <p className="text-muted-foreground text-sm">{t('permissions_aces_desc')}</p>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <AcesList 
                                    searchQuery={search} 
                                    refreshTrigger={refreshTrigger} 
                                    onCountChange={setItemCount} 
                                    selectedPrincipal={selectedPrincipal}
                                    setSelectedPrincipal={setSelectedPrincipal}
                                />
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
            {showWizard && (
                <PermissionWizard
                    isOpen={showWizard}
                    onClose={() => setShowWizard(false)}
                    onFinish={handleRefresh}
                />
            )}
        </div>
    )
}
