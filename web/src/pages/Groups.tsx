import React, { useState, useEffect } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriPageHeader, MriCompactSearch } from '@mriqbox/ui-kit'
import { RefreshCw, Briefcase, Skull, X } from 'lucide-react'
import ChangeGroupModal from '@/components/players/ChangeGroupModal'
import ConfirmAction from '@/components/players/ConfirmAction'
import { cn } from '@/lib/utils'
import GroupsSkeleton from '@/components/skeletons/GroupsSkeleton'
import GroupList from '@/components/groups/GroupList'
import { MOCK_GAME_DATA } from '@/utils/mockData'


interface GroupMember {
    id: string
    name: string
    online: boolean
    job?: string
    gang?: string
    grade: number | { level: number, name: string }
}

interface Group {
    name: string
    label: string
    members: GroupMember[]
}

interface GroupsData {
    jobs: Group[]
    gangs: Group[]
}

export default function Groups() {
    const { t } = useI18n()
    const { sendNui } = useNui()
    const [data, setData] = useState<GroupsData>({ jobs: [], gangs: [] })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    const groupOptions = React.useMemo(() => {
        const allGroups = [...data.jobs, ...data.gangs]
        const members = allGroups.flatMap(g => g.members)
        // Unique members by ID
        const uniqueMembers = Array.from(new Map(members.map(m => [m.id, m])).values())
        return uniqueMembers.map(m => ({
            value: m.name || m.id,
            label: `${m.name} (#${m.id})`
        }))
    }, [data])

    // Modals state
    const [editingMember, setEditingMember] = useState<{ member: GroupMember, type: 'job' | 'gang', groupName: string } | null>(null)
    const [firingMember, setFiringMember] = useState<{ member: GroupMember, type: 'job' | 'gang' } | null>(null)

    const fetchGroups = React.useCallback(async () => {
        setLoading(true)
        try {
            const response = await sendNui('getGroupsData', {}, { jobs: MOCK_GAME_DATA.jobs, gangs: MOCK_GAME_DATA.gangs })
            if (response) {
                // Filter out 'unemployed' and 'none'
                const jobs = (response.jobs || []).filter((j: Group) => j.name.toLowerCase() !== 'unemployed')
                const gangs = (response.gangs || []).filter((g: Group) => g.name.toLowerCase() !== 'none')
                setData({ jobs, gangs })
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [sendNui])

    useEffect(() => {
        fetchGroups()
    }, [fetchGroups])

    const toggleExpand = (key: string) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleFire = async () => {
        if (!firingMember) return
        const { member, type } = firingMember
        const groupField = type === 'gang' ? { Gang: { value: 'none' } } : { Job: { value: 'unemployed' } }

        try {
            await sendNui('clickButton', {
                data: {
                    event: type === 'gang' ? 'mri_Qadmin:server:SetGang' : 'mri_Qadmin:server:SetJob',
                    type: 'server',
                    perms: type === 'gang' ? 'qadmin.action.set_gang' : 'qadmin.action.set_job'
                },
                selectedData: {
                    Player: { value: member.id },
                    ...groupField,
                    Grade: { value: 0 }
                }
            })
            setFiringMember(null)
            fetchGroups()
        } catch (e) {
            console.error(e)
        }
    }



    const getGradeLevel = (grade: number | { level: number, name: string }) => {
        if (typeof grade === 'object' && grade !== null) {
            return grade.level
        }
        return Number(grade) || 0
    }



    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('groups')} icon={Briefcase}>
                <div className="flex items-center gap-2">
                    <MriCompactSearch
                        placeholder={t('search_placeholder_players')}
                        value={search}
                        onChange={setSearch}
                        options={groupOptions}
                        searchPlaceholder={t('search_placeholder_players')}
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
                <MriButton onClick={fetchGroups} disabled={loading} size="icon" variant="outline" className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10">
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </MriButton>
            </MriPageHeader>

            {loading ? (
                <GroupsSkeleton />
            ) : (
                <div className="flex-1 overflow-hidden grid grid-cols-2 gap-6 pt-4 p-2">
                    <div className="flex flex-col gap-4 h-full overflow-hidden">
                        <div className="flex items-center gap-2 pb-2 border-b border-border shrink-0">
                            <Briefcase className="h-5 w-5 text-blue-500" />
                            <h2 className="text-lg font-bold text-foreground">{t('groups_jobs')}</h2>
                        </div>
                        <div className="flex-1 min-h-0">
                            <GroupList
                                groups={data.jobs}
                                type="job"
                                search={search}
                                expanded={expanded}
                                toggleExpand={toggleExpand}
                                onEdit={(m, g) => setEditingMember({ member: m, type: 'job', groupName: g })}
                                onFire={(m) => setFiringMember({ member: m, type: 'job' })}
                                t={t}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 h-full overflow-hidden">
                        <div className="flex items-center gap-2 pb-2 border-b border-border shrink-0">
                            <Skull className="h-5 w-5 text-red-500" />
                            <h2 className="text-lg font-bold text-foreground">{t('groups_gangs')}</h2>
                        </div>
                        <div className="flex-1 min-h-0">
                            <GroupList
                                groups={data.gangs}
                                type="gang"
                                search={search}
                                expanded={expanded}
                                toggleExpand={toggleExpand}
                                onEdit={(m, g) => setEditingMember({ member: m, type: 'gang', groupName: g })}
                                onFire={(m) => setFiringMember({ member: m, type: 'gang' })}
                                t={t}
                            />
                        </div>
                    </div>
                </div>
            )}

            {firingMember && (
                <ConfirmAction
                    text={`${t('fire_' + firingMember.type)}: ${firingMember.member.name}?`}
                    onConfirm={handleFire}
                    onCancel={() => setFiringMember(null)}
                />
            )}

            {editingMember && (
                <ChangeGroupModal
                    type={editingMember.type}
                    defaultGroup={editingMember.groupName}
                    defaultGrade={getGradeLevel(editingMember.member.grade)}
                    onClose={() => setEditingMember(null)}
                    onSubmit={async (group, grade) => {
                        const fieldName = editingMember.type === 'job' ? 'Job' : 'Gang'
                        try {
                            await sendNui('clickButton', {
                                data: {
                                    event: editingMember.type === 'gang' ? 'mri_Qadmin:server:SetGang' : 'mri_Qadmin:server:SetJob',
                                    type: 'server',
                                    perms: editingMember.type === 'gang' ? 'qadmin.action.set_gang' : 'qadmin.action.set_job'
                                },
                                selectedData: {
                                    Player: { value: editingMember.member.id },
                                    [fieldName]: { value: group },
                                    Grade: { value: grade }
                                }
                            })
                            setEditingMember(null)
                            fetchGroups()
                        } catch (e) {
                            console.error(e)
                        }
                    }}
                />
            )}
        </div>
    )
}
