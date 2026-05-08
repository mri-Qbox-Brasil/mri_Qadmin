import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useAppState } from '@/context/AppState'
import { MriInput, MriSelect, MriActionModal } from '@mriqbox/ui-kit'
import { Briefcase, Shield } from 'lucide-react'

export default function ChangeGroupModal({
    type,
    defaultGroup = '',
    defaultGrade = 0,
    onClose,
    onSubmit
}: {
    type: 'job' | 'gang';
    defaultGroup?: string;
    defaultGrade?: number;
    onClose: () => void;
    onSubmit: (group: string, grade: number) => void
}) {
    const { gameData } = useAppState()
    const { t } = useI18n()

    const [group, setGroup] = useState(defaultGroup)
    const [grade, setGrade] = useState(defaultGrade)

    const groupOptions = (type === 'job' ? gameData.jobs : gameData.gangs).map((g: any) => ({
        label: g.label,
        value: g.name,
        original: g
    }))

    const selectedGroupData = groupOptions.find(o => o.value === group)

    const gradeOptions = selectedGroupData?.original?.grades && Object.keys(selectedGroupData.original.grades).length > 0
        ? Object.entries(selectedGroupData.original.grades)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([level, g]: [string, any]) => ({
                label: `${g.label || g.name} (${level})`,
                value: level
            }))
        : []

    return (
        <MriActionModal
            title={type === 'job' ? t('player.actions.job.set') : t('player.actions.gang.set')}
            icon={type === 'job' ? Briefcase : Shield}
            onClose={onClose}
            onConfirm={() => { onSubmit(group, grade); onClose(); }}
        >
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                        {type === 'job' ? t('player.actions.job.label') : t('player.actions.gang.label')}
                    </label>
                    <MriSelect
                        options={groupOptions}
                        value={group}
                        onChange={(val) => { setGroup(val); setGrade(0); }}
                        placeholder={t('actions.search_placeholder')}
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                        {type === 'job' ? t('player.actions.job.grade') : t('player.actions.gang.grade')}
                    </label>
                    {gradeOptions.length > 0 ? (
                        <MriSelect
                            options={gradeOptions}
                            value={String(grade)}
                            onChange={(val) => setGrade(Number(val))}
                            placeholder={t('actions.search_placeholder')}
                        />
                    ) : (
                        <MriInput 
                            type="number" 
                            value={grade} 
                            onChange={e => setGrade(Number((e.target as HTMLInputElement).value))} 
                            className="bg-background border-border h-10" 
                        />
                    )}
                </div>
            </div>
        </MriActionModal>
    )
}
