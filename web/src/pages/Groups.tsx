import React, { useState, useEffect } from 'react'
import { useI18n } from '@/context/I18n'
import { useNui } from '@/context/NuiContext'
import Spinner from '@/components/Spinner'
import { Button, Input, PageHeader } from '@mriqbox/ui-kit'
import { RefreshCw, Briefcase, Skull, UserMinus, UserCog, ChevronDown, ChevronUp, Search } from 'lucide-react'
import ChangeGroupModal from '@/components/players/ChangeGroupModal'
import ConfirmAction from '@/components/players/ConfirmAction'
import { cn } from '@/lib/utils'
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

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

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
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

  const filteredGroups = (groups: Group[]) => {
      const s = search.toLowerCase()
      return groups.map(g => ({
          ...g,
          members: g.members.filter(m => m.name.toLowerCase().includes(s))
      })).filter(g => g.members.length > 0 || g.name.toLowerCase().includes(s))
  }

  const renderGrade = (grade: number | { level: number, name: string }) => {
      if (typeof grade === 'object' && grade !== null) {
          return `${grade.name} (${grade.level})`
      }
      return grade
  }

  const getGradeLevel = (grade: number | { level: number, name: string }) => {
      if (typeof grade === 'object' && grade !== null) {
          return grade.level
      }
      return Number(grade) || 0
  }

  const renderGroupList = (groups: Group[], type: 'job' | 'gang') => {
      const list = filteredGroups(groups)
      return list.map((group, idx) => {
          const key = `${type}-${group.name}-${idx}`
          const isCollapsed = collapsed[key]

          return (
              <div key={key} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm transition-all hover:border-primary/50 group">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => toggleCollapse(key)}
                  >
                      <div className="flex items-center gap-3">
                           <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-muted text-muted-foreground border border-border", type === 'job' ? 'group-hover:text-blue-400 group-hover:border-blue-400/20' : 'group-hover:text-red-400 group-hover:border-red-400/20')}>
                                {type === 'job' ? <Briefcase className="w-5 h-5" /> : <Skull className="w-5 h-5" />}
                           </div>
                           <div>
                                <span className="font-bold text-lg text-foreground">{group.label}</span>
                                <p className="text-xs text-muted-foreground font-mono">ID: {group.name} • {t('groups_members').replace('%s', String(group.members.length))}</p>
                           </div>
                      </div>

                      <div className="p-1 rounded-md bg-muted/50 border border-border text-muted-foreground">
                        {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </div>
                  </div>

                  {!isCollapsed && (
                      <div className="border-t border-border bg-muted/30">
                          {group.members.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">{t('groups_no_members')}</div>
                          ) : (
                              <div className="divide-y divide-border/50">
                                {group.members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-2 h-2 rounded-full relative", member.online ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-red-500")}>
                                                    {member.online && (
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                    )}
                                                </div>
                                            <span className="font-medium text-foreground/90">{member.name}</span>
                                            <span className="text-xs text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded border border-border font-mono">Grade: {renderGrade(member.grade)}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                              title={t('change_group_title_' + type)}
                                              onClick={() => setEditingMember({ member, type, groupName: group.name })}
                                            >
                                                <UserCog className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                              title={t('fire_' + type)}
                                              onClick={() => setFiringMember({ member, type })}
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                              </div>
                          )}
                      </div>
                  )}
              </div>
          )
      })
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <PageHeader title={t('groups')} icon={Briefcase}>
         <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
               placeholder={t('search_placeholder_players')}
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-9 bg-card border-border focus:border-ring h-10"
            />
         </div>
         <Button onClick={fetchGroups} disabled={loading} size="icon" variant="outline" className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
         </Button>
      </PageHeader>

      {loading ? (
        <div className="h-full flex items-center justify-center text-muted-foreground gap-2 p-8">
            <Spinner />
            <p>{t('loading_groups')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-8 pb-4">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Briefcase className="h-5 w-5 text-blue-500" />
                    <h2 className="text-lg font-bold text-foreground">{t('groups_jobs')}</h2>
                </div>
                <div className="flex flex-col gap-3">
                    {renderGroupList(data.jobs, 'job')}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Skull className="h-5 w-5 text-red-500" />
                    <h2 className="text-lg font-bold text-foreground">{t('groups_gangs')}</h2>
                </div>
                <div className="flex flex-col gap-3">
                    {renderGroupList(data.gangs, 'gang')}
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
