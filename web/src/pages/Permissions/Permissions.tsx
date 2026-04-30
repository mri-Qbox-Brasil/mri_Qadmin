import { useState, useEffect, useCallback } from 'react'
import { MriPageHeader, MriButton } from '@mriqbox/ui-kit'
import { MriExpandableSearch } from '@/components/ui/MriExpandableSearch'
import { Shield, Key, RefreshCw, UserPlus } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { MriTabs, MriTabItem } from '@/components/ui/MriTabs'
import GroupManager, { GroupData } from './components/GroupManager'
import PlayerGroups from './components/PlayerGroups'
import { isEnvBrowser } from '@/utils/misc'
import { MOCK_GROUPS } from '@/utils/mockData'

export default function Permissions() {
    const { t } = useI18n()
    const { sendNui, on, off } = useNui()
    const [activeTab, setActiveTab] = useState<'groups' | 'players'>('groups')
    const [search, setSearch] = useState('')
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [groups, setGroups] = useState<GroupData[]>([])

    const handleRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1)
    }, [])

    useEffect(() => {
        const onRefresh = () => handleRefresh()
        on('refreshPermissionsLists', onRefresh)
        return () => off('refreshPermissionsLists', onRefresh)
    }, [on, off, handleRefresh])

    const loadGroups = useCallback(async () => {
        setRefreshing(true)
        try {
            if (isEnvBrowser()) {
                setGroups(MOCK_GROUPS)
                return
            }
            const data = await sendNui<GroupData[]>('mri_Qadmin:callback:GetGroups')
            setGroups(data || [])
        } catch (e) {
            console.error(e)
        } finally {
            setRefreshing(false)
        }
    }, [sendNui])

    useEffect(() => {
        loadGroups()
    }, [refreshTrigger, loadGroups])

    const permissionTabs: MriTabItem[] = [
        { id: 'groups', label: t('permissions.tabs.manage_groups'), icon: Shield },
        { id: 'players', label: t('permissions.tabs.assign_players'), icon: UserPlus },
    ]

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader
                title={t('permissions.title')}
                icon={Key}
                count={groups.length}
                countLabel={t('permissions.count_label')}
            >
                <div className="flex items-center gap-3">
                    <MriTabs
                        items={permissionTabs}
                        value={activeTab}
                        onChange={setActiveTab}
                    />

                    <div className="flex items-center gap-2">
                        <MriExpandableSearch
                            placeholder={activeTab === 'groups' ? t('permissions.search_groups') : t('permissions.search_players')}
                            value={search}
                            onChange={(val) => setSearch(val)}
                        />
                    </div>

                    <MriButton
                        size="icon"
                        variant="outline"
                        isLoading={refreshing}
                        className="h-10 w-10 border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={handleRefresh}
                        title={t('common.refresh')}
                    >
                        {!refreshing && <RefreshCw className="w-4 h-4" />}
                    </MriButton>

                </div>
            </MriPageHeader>

            <div className="flex-1 overflow-hidden p-6 flex flex-col relative" key={activeTab}>
                {/* Background decorative elements */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10" />

                <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                    {activeTab === 'groups' ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="flex-1 overflow-hidden">
                                <GroupManager
                                    searchQuery={search}
                                    refreshTrigger={refreshTrigger}
                                    groups={groups}
                                    onCountChange={() => loadGroups()}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="flex-1 overflow-y-auto">
                                <PlayerGroups
                                    groups={groups}
                                    searchQuery={search}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}
