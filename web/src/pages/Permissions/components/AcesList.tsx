import React, { useEffect, useState } from 'react'
import { MriButton, MriInput } from '@mriqbox/ui-kit'
import { Trash2, Plus, ChevronDown, ChevronRight, Shield } from 'lucide-react'
import { useNui } from '@/context/NuiContext'
import Spinner from '@/components/Spinner'
import { isEnvBrowser } from '@/utils/misc'
import { MOCK_ACES } from '@/utils/mockData'
import ConfirmAction from '@/components/players/ConfirmAction'
import CreatableCombobox from '@/components/shared/CreatableCombobox'

interface Ace {
  id: number
  principal: string
  object: string
  allow: number
}

import { useI18n } from '@/context/I18n'

function AceGroup({ principal, items, onRemove, onToggle }: { principal: string, items: Ace[], onRemove: (a: Ace) => void, onToggle: (a: Ace) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const { t } = useI18n()

    return (
        <div className="border border-border rounded-md bg-card overflow-hidden">
            <div
                className="flex items-center gap-2 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm font-medium">{principal}</span>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full ml-auto">
                    {items.length} {t('permissions_aces').toLowerCase()}
                </span>
            </div>

            {isOpen && (
                <div className="divide-y divide-border/50">
                    {items.map(ace => {
                        const isPending = ace.id > 10000000000
                        return (
                            <div key={ace.id} className={`flex items-center gap-4 p-3 pl-9 hover:bg-muted/20 text-sm ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <button
                                    onClick={(e) => { e.stopPropagation(); if (!isPending) onToggle(ace) }}
                                    disabled={isPending}
                                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded transition-colors ${
                                        ace.allow
                                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                        : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                    } ${isPending ? 'group-hover:bg-transparent' : ''}`}
                                    >
                                    {ace.allow ? t('permissions_allow') : t('permissions_deny')}
                                    </button>
                                    <span className="font-mono text-muted-foreground">{ace.object} {isPending && <span className="text-[10px] italic ml-2 opacity-70">...syncing</span>}</span>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (!isPending) onRemove(ace); }}
                                        className={`ml-auto transition-colors ${isPending ? 'text-muted-foreground/30' : 'text-muted-foreground hover:text-red-500'}`}
                                        disabled={isPending}
                                    >
                                    {isPending ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default function AcesList({ searchQuery = '', refreshTrigger = 0, onCountChange }: { searchQuery?: string, refreshTrigger?: number, onCountChange?: (n: number) => void }) {
  const { sendNui } = useNui()
  const { t } = useI18n()
  const [aces, setAces] = useState<Ace[]>([])
  const [loading, setLoading] = useState(false)
  const [newAce, setNewAce] = useState({ principal: '', object: '', allow: 1 })
  const [allowType, setAllowType] = useState(1)

  const [confirm, setConfirm] = useState<{ type: 'add' | 'remove', ace?: Ace } | null>(null)

  const fetchAces = async () => {
    setLoading(true)
    try {
        if (isEnvBrowser()) {
          setTimeout(() => {
             if (aces.length === 0) {
                 setAces(MOCK_ACES)
                 onCountChange?.(MOCK_ACES.length)
             } else {
                 onCountChange?.(aces.length)
             }
             setLoading(false)
          }, 500)
          return
        }
        const data = await sendNui('mri_Qadmin:callback:GetAces')
        const list = Array.isArray(data) ? data : []
        setAces(list)
        onCountChange?.(list.length)
    } catch (e) {
        console.error(e)
    } finally {
        if (!isEnvBrowser()) setLoading(false)
    }
  }

  useEffect(() => {
    fetchAces()
  }, [refreshTrigger])

  const handleAdd = async () => {
    if (!newAce.principal || !newAce.object) return
    setConfirm({ type: 'add' })
  }

  const handleRemove = async (ace: Ace) => {
    setConfirm({ type: 'remove', ace })
  }

  const handleToggle = async (ace: Ace) => {
    // Optimistic update
    setAces(prev => prev.map(a => a.id === ace.id ? {...a, allow: a.allow ? 0 : 1} : a))

    if (isEnvBrowser()) return

    await sendNui('toggle_ace', { id: ace.id })
    // No manual fetch - wait for server broadcast
  }

  const executeAction = async () => {
    if (!confirm) return

    if (isEnvBrowser()) {
        if (confirm.type === 'add') {
            const mockId = Math.floor(Math.random() * 10000)
            const newItem = {
               id: mockId,
               principal: newAce.principal,
               object: newAce.object,
               allow: allowType
            }
            setAces([...aces, newItem])
            setNewAce({ principal: '', object: '', allow: 1 })
          } else if (confirm.type === 'remove' && confirm.ace) {
            setAces(aces.filter(a => a.id !== confirm.ace?.id))
          }
          setConfirm(null)
          return
    }

    if (confirm.type === 'add') {
         // Optimistic Add
         const tempId = Date.now()
         const newItem = {
            id: tempId,
            principal: newAce.principal,
            object: newAce.object,
            allow: allowType === 1 ? 1 : 0
         }
         setAces(prev => [...prev, newItem])
         setNewAce({ principal: '', object: '', allow: 1 })

         await sendNui('add_ace', {
            principal: newAce.principal,
            object: newAce.object,
            allow: allowType === 1
        })
    } else if (confirm.type === 'remove' && confirm.ace) {
        // Optimistic Remove
        const removeId = confirm.ace.id
        setAces(prev => prev.filter(a => a.id !== removeId))

        await sendNui('remove_ace', { id: confirm.ace.id })
    }

    setConfirm(null)
    // No manual fetch - wait for server broadcast
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex gap-2 items-end bg-card p-4 rounded-lg border border-border shrink-0">
          <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('permissions_principal_label')}</label>
              <CreatableCombobox
                 options={[
                     { label: 'group.admin', value: 'group.admin' },
                     { label: 'group.mod', value: 'group.mod' },
                     ...aces.map(a => ({ label: a.principal, value: a.principal }))
                 ].filter((v,i,a) => a.findIndex(t => t.value === v.value) === i)} // Unique
                 value={newAce.principal}
                 onChange={(val) => setNewAce({...newAce, principal: val})}
                 placeholder={t('select_placeholder')}
                 searchPlaceholder={t('actions_search_placeholder')}
               />
          </div>
          <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('permissions_object_label')}</label>
              <CreatableCombobox
                 options={[
                     { label: 'command.noclip', value: 'command.noclip' },
                     { label: 'command.god', value: 'command.god' },
                     ...aces.map(a => ({ label: a.object, value: a.object }))
                 ].filter((v,i,a) => a.findIndex(t => t.value === v.value) === i)}
                 value={newAce.object}
                 onChange={(val) => setNewAce({...newAce, object: val})}
                 placeholder={t('select_placeholder')}
                 searchPlaceholder={t('actions_search_placeholder')}
              />
          </div>
          <div className="w-32">
               <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('permissions_type_label')}</label>
               <CreatableCombobox
                 options={[
                    { label: t('permissions_allow'), value: '1' },
                    { label: t('permissions_deny'), value: '0' }
                 ]}
                 value={String(allowType)}
                 onChange={(val) => setAllowType(Number(val))}
                 placeholder={t('select_placeholder')}
                 searchPlaceholder={t('actions_search_placeholder')}
                 allowCreate={false}
               />
          </div>
          <MriButton size="sm" className="h-9" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" /> {t('permissions_add_btn')}
          </MriButton>
      </div>

      <div className="bg-card border border-border rounded-lg flex flex-col gap-1 p-2 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-1">
            {loading ? (
                <div className="p-8 flex justify-center"><Spinner /></div>
            ) : aces.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">{t('permissions_no_aces')}</div>
            ) : (
                (() => {
                    // Filter first
                    const filtered = aces.filter(a => {
                        const search = searchQuery.toLowerCase()
                        if (!search) return true
                        return (
                            a.principal.toLowerCase().includes(search) ||
                            a.object.toLowerCase().includes(search)
                        )
                    })

                    if (filtered.length === 0 && searchQuery) {
                        return <div className="p-8 text-center text-muted-foreground">{t('permissions_no_matches').replace('%s', searchQuery)}</div>
                    }

                    // Group by principal
                    const grouped = filtered.reduce((acc, curr) => {
                        if (!acc[curr.principal]) acc[curr.principal] = []
                        acc[curr.principal].push(curr)
                        return acc
                    }, {} as Record<string, Ace[]>)

                    return Object.entries(grouped).map(([principal, items]) => (
                        <AceGroup
                            key={principal}
                            principal={principal}
                            items={items}
                            onRemove={handleRemove}
                            onToggle={handleToggle}
                        />
                    ))
                })()
            )}
        </div>
      </div>

      {confirm && (
        <ConfirmAction
          text={confirm.type === 'add'
            ? t('permissions_confirm_add_ace').replace('%s', newAce.object).replace('%s', newAce.principal)
            : t('permissions_confirm_remove_ace').replace('%s', confirm.ace?.object || '').replace('%s', confirm.ace?.principal || '')
          }
          onConfirm={executeAction}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
