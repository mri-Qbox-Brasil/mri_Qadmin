import { useState } from 'react'
import { useI18n } from '@/context/I18n'
import { useAppState } from '@/context/AppState'
import { MriInput, MriSelectSearch } from '@mriqbox/ui-kit'
import ActionModal from '@/components/ActionModal'
import { Briefcase, Shield } from 'lucide-react'

export default function ChangeGroupModal({
  type,
  playerId,
  defaultGroup = '',
  defaultGrade = 0,
  onClose,
  onSubmit
}: {
  type: 'job' | 'gang';
  playerId: string;
  defaultGroup?: string;
  defaultGrade?: number;
  onClose: () => void;
  onSubmit: (group: string, grade: number) => void
}) {
  const { gameData } = useAppState()

  const [group, setGroup] = useState(defaultGroup)
  const [grade, setGrade] = useState(defaultGrade)

  const { t } = useI18n()

  const groupOptions = (type === 'job' ? gameData.jobs : gameData.gangs).map((g: any) => ({
    label: g.label,
    value: g.name,
    original: g
  }))

  const selectedGroupData = groupOptions.find(o => o.value === group)

  const gradeOptions = selectedGroupData?.original?.grades
      ? Object.entries(selectedGroupData.original.grades).map(([level, g]: [string, any]) => ({
          label: `${g.name} (${level})`,
          value: level
      }))
      : []

  return (
    <ActionModal
      title={type === 'job' ? t('set_job') : t('set_gang')}
      icon={type === 'job' ? Briefcase : Shield}
      onClose={onClose}
      onConfirm={() => onSubmit(group, grade)}
    >
      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('label_name')}</label>
      <div className="mb-4">
        <MriSelectSearch
            options={groupOptions}
            value={group}
            onChange={(val) => { setGroup(val); setGrade(0); }} // Reset grade on group change
            placeholder={t('select_placeholder')}
            searchPlaceholder={t('actions_search_placeholder')}
        />
      </div>

      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('label_grade')}</label>
      {gradeOptions.length > 0 ? (
          <div className="mb-6">
              <MriSelectSearch
                  options={gradeOptions}
                  value={grade}
                  onChange={(val) => setGrade(Number(val))}
                  placeholder={t('select_placeholder')}
                  searchPlaceholder={t('actions_search_placeholder')}
              />
          </div>
      ) : (
          <MriInput type="number" value={grade} onChange={e => setGrade(Number((e.target as HTMLInputElement).value))} className="mb-6 bg-background border-border h-10" />
      )}
    </ActionModal>
  )
}
