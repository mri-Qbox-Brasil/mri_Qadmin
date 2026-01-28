import React, { useState, useEffect } from 'react'
import { useI18n } from '@/context/I18n'
import { useNui } from '@/context/NuiContext'
import Spinner from '@/components/Spinner'
import { MriButton, MriInput, MriPageHeader } from '@mriqbox/ui-kit'
import { RefreshCw, Briefcase, Skull, UserMinus, UserCog, ChevronDown, ChevronUp, Search } from 'lucide-react'
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
      const action = type === 'gang' ? 'fire_gang' : 'fire_job'
      const groupField = type === 'gang' ? { Gang: { value: 'none' } } : { Job: { value: 'unemployed' } }

      try {
          await sendNui('clickButton', {
              data: action,
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
         <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <MriInput
               placeholder={t('search_placeholder_players')}
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-9 bg-card border-border focus:border-ring h-10"
            />
         </div>
         <MriButton onClick={fetchGroups} disabled={loading} size="icon" variant="outline" className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
         </MriButton>
      </MriPageHeader>

      {loading ? (
        <GroupsSkeleton />
      ) : (
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6 p-8 pb-4">
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
             playerId={editingMember.member.id}
             defaultGroup={editingMember.groupName}
             defaultGrade={getGradeLevel(editingMember.member.grade)}
             onClose={() => setEditingMember(null)}
             onSubmit={async (group, grade) => {
                 const action = editingMember.type === 'gang' ? 'set_gang' : 'set_job'
                 const fieldName = editingMember.type === 'job' ? 'Job' : 'Gang'
                 try {
                     await sendNui('clickButton', {
                         data: action,
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
