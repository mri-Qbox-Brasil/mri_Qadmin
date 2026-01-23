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

function AceGroup({ principal, items, onRemove, onToggle }: { principal: string, items: Ace[], onRemove: (a: Ace) => void, onToggle: (a: Ace) => void }) {
    const [isOpen, setIsOpen] = useState(false)

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
                    {items.length} aces
                </span>
            </div>

            {isOpen && (
                <div className="divide-y divide-border/50">
                    {items.map(ace => (
                        <div key={ace.id} className="flex items-center gap-4 p-3 pl-9 hover:bg-muted/20 text-sm">
                             <button
                                onClick={(e) => { e.stopPropagation(); onToggle(ace) }}
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded transition-colors hover:opacity-80 ${ace.allow ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                             >
                                {ace.allow ? 'ALLOW' : 'DENY'}
                             </button>
                             <span className="font-mono text-muted-foreground">{ace.object}</span>
                             <button onClick={(e) => { e.stopPropagation(); onRemove(ace); }} className="ml-auto text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                             </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function AcesList({ searchQuery = '', refreshTrigger = 0, onCountChange }: { searchQuery?: string, refreshTrigger?: number, onCountChange?: (n: number) => void }) {
  const { sendNui } = useNui()
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
    if (isEnvBrowser()) {
        setAces(aces.map(a => a.id === ace.id ? {...a, allow: a.allow ? 0 : 1} : a))
        return
    }
    await sendNui('toggle_ace', { id: ace.id })
    fetchAces()
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
         await sendNui('clickButton', {
            data: 'add_ace',
            type: 'server',
            event: 'mri_Qadmin:server:AddAce',
            selectedData: {
                principal: { value: newAce.principal },
                object: { value: newAce.object },
                allow: { value: allowType === 1 }
            }
        })
        setNewAce({ principal: '', object: '', allow: 1 })
    } else if (confirm.type === 'remove' && confirm.ace) {
        await sendNui('clickButton', {
            data: 'remove_ace',
            type: 'server',
            event: 'mri_Qadmin:server:RemoveAce',
            selectedData: { id: { value: confirm.ace.id } }
        })
    }

    setConfirm(null)
    fetchAces()
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex gap-2 items-end bg-card p-4 rounded-lg border border-border shrink-0">
          <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Principal</label>
              <CreatableCombobox
                 options={[
                     { label: 'group.admin', value: 'group.admin' },
                     { label: 'group.mod', value: 'group.mod' },
                     ...aces.map(a => ({ label: a.principal, value: a.principal }))
                 ].filter((v,i,a) => a.findIndex(t => t.value === v.value) === i)} // Unique
                 value={newAce.principal}
                 onChange={(val) => setNewAce({...newAce, principal: val})}
                 placeholder="Select or type principal..."
                 searchPlaceholder="Search principal..."
               />
          </div>
          <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Object</label>
              <CreatableCombobox
                 options={[
                     { label: 'command.noclip', value: 'command.noclip' },
                     { label: 'command.god', value: 'command.god' },
                     ...aces.map(a => ({ label: a.object, value: a.object }))
                 ].filter((v,i,a) => a.findIndex(t => t.value === v.value) === i)}
                 value={newAce.object}
                 onChange={(val) => setNewAce({...newAce, object: val})}
                 placeholder="Select or type object..."
                 searchPlaceholder="Search object..."
              />
          </div>
          <div className="w-24">
               <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
               <select
                 className="w-full h-9 bg-input border border-input rounded px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                 value={allowType}
                 onChange={(e) => setAllowType(Number(e.target.value))}
               >
                  <option value={1}>Allow</option>
                  <option value={0}>Deny</option>
               </select>
          </div>
          <MriButton size="sm" className="h-9" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add
          </MriButton>
      </div>

      <div className="bg-card border border-border rounded-lg flex flex-col gap-1 p-2 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-1">
            {loading ? (
                <div className="p-8 flex justify-center"><Spinner /></div>
            ) : aces.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No permissions found</div>
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
                        return <div className="p-8 text-center text-muted-foreground">No matches for "{searchQuery}"</div>
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
            ? `Are you sure you want to ADD permission '${newAce.object}' to '${newAce.principal}'?`
            : `Are you sure you want to REMOVE permission '${confirm.ace?.object}' from '${confirm.ace?.principal}'?`
          }
          onConfirm={executeAction}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
