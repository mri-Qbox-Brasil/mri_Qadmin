import React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { MriButton } from '@mriqbox/ui-kit'
import { Briefcase, Skull, ChevronDown, ChevronUp, UserCog, UserMinus } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface GroupListProps {
  groups: Group[]
  type: 'job' | 'gang'
  search: string
  expanded: Record<string, boolean>
  toggleExpand: (key: string) => void
  onEdit: (member: GroupMember, groupName: string) => void
  onFire: (member: GroupMember) => void
  t: (key: string) => string
}

export default function GroupList({
  groups,
  type,
  search,
  expanded,
  toggleExpand,
  onEdit,
  onFire,
  t
}: GroupListProps) {

  const filtered = React.useMemo(() => {
    const s = search.toLowerCase()
    return groups.map(g => ({
        ...g,
        members: g.members.filter(m => m.name.toLowerCase().includes(s))
    })).filter(g => g.members.length > 0 || g.name.toLowerCase().includes(s))
  }, [groups, search])

  const renderGrade = (grade: number | { level: number, name: string }) => {
      if (typeof grade === 'object' && grade !== null) {
          return `${grade.name} (${grade.level})`
      }
      return grade
  }

  return (
    <Virtuoso
      style={{ height: '100%' }}
      data={filtered}
      itemContent={(index, group) => {
        const key = `${type}-${group.name}-${index}`
        const isExpanded = expanded[key]

        return (
            <div className="pb-3">
               <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm transition-all hover:border-primary/50 group">
                   <div
                     className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted transition-colors select-none"
                     onClick={() => toggleExpand(key)}
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
                         {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                       </div>
                   </div>

                   {isExpanded && (
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
                                             <MriButton
                                               variant="ghost"
                                               size="sm"
                                               className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                               title={t('change_group_title_' + type)}
                                               onClick={() => onEdit(member, group.name)}
                                             >
                                                 <UserCog className="h-4 w-4" />
                                             </MriButton>
                                             <MriButton
                                               variant="ghost"
                                               size="sm"
                                               className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                               title={t('fire_' + type)}
                                               onClick={() => onFire(member)}
                                             >
                                                 <UserMinus className="h-4 w-4" />
                                             </MriButton>
                                         </div>
                                     </div>
                                 ))}
                               </div>
                           )}
                       </div>
                   )}
               </div>
            </div>
        )
      }}
    />
  )
}
