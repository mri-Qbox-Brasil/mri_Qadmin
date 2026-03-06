import React, { useState, useEffect, useRef } from 'react'
import { MriButton, MriSpinner } from '@mriqbox/ui-kit'
import { RefreshCw, User, X, Trash2, Plus, Copy, AlertTriangle, Car, ArrowLeftRight, ArrowRightLeft, Search } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { InventoryItem } from './InventoryItem'
import { cn } from '@/lib/utils'
import { MOCK_INVENTORY } from '@/utils/mockData'
import { DragGhost } from './DragGhost'

export interface InventoryTarget {
    id: number | string // player ID or Plate
    name?: string
    type: 'player' | 'trunk' | 'glovebox' | 'chest'
}

interface InventoryItemData {
  name: string
  label: string
  count: number
  slot: number
  metadata?: any
  weight?: number
}

interface InventoryResponse {
  items: InventoryItemData[]
  weight: number
  maxWeight: number
  slots?: number
  label?: string
}

interface InventoryViewerModalProps {
  target: InventoryTarget
  onClose: () => void
}

interface ConfirmState {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
}

interface InventorySlotProps {
  target: InventoryTarget
  onClose?: () => void
  onAddComparison?: () => void
  isSecondary?: boolean
  otherTarget?: InventoryTarget | null
}

const InventorySlot = ({ target, onClose, onAddComparison, isSecondary, otherTarget }: InventorySlotProps) => {
  const { t } = useI18n()
  const { sendNui, debugMode } = useNui()
  const [data, setData] = useState<InventoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGiveItem, setShowGiveItem] = useState(false)
  const [giveItemData, setGiveItemData] = useState({ name: '', count: 1 })
  const [search, setSearch] = useState('')
  const [selectedAmount, setSelectedAmount] = useState<number>(1)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info',
  })
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const hoveredSlotRef = useRef<number | null>(null)

  useEffect(() => {
    hoveredSlotRef.current = hoveredSlot
    if (hoveredSlot) console.log('[mri_Qadmin] Slot Hovered:', hoveredSlot)
  }, [hoveredSlot])

  const fetchInventory = async () => {
    setLoading(true)
    if (debugMode) {
      setData(JSON.parse(JSON.stringify(MOCK_INVENTORY)))
      setLoading(false)
      return
    }
    try {
      let resp: InventoryResponse | null = null
      if (target.type === 'player') {
        resp = await sendNui<InventoryResponse>('mri_Qadmin:callback:GetPlayerInventory', { targetId: target.id })
      } else {
        resp = await sendNui<InventoryResponse>('mri_Qadmin:callback:GetVehicleInventory', { plate: target.id, type: target.type })
      }
      if (resp) setData(resp)
    } catch (e) {
      console.error('Failed to fetch inventory:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()

    // Register for real-time updates
    sendNui('mri_Qadmin:server:StartWatchingInventory', { id: target.id, type: target.type })

    return () => {
        // Unregister when closed
        sendNui('mri_Qadmin:server:StopWatchingInventory', { id: target.id, type: target.type })
    }
  }, [target.id, target.type])

  // Global listener for external updates (NUI message)
  useEffect(() => {
    const handleNuiMessage = (event: MessageEvent) => {
        const { action, data: eventData } = event.data;
        if (action === 'inventoryUpdate') {
            const invId = target.type === 'player' ? Number(target.id) : (target.type === 'trunk' ? 'trunk' + target.id : 'glovebox' + target.id);
            if (eventData.inventoryId === invId) {
                fetchInventory();
            }
        }
    };

    window.addEventListener('message', handleNuiMessage);
    return () => window.removeEventListener('message', handleNuiMessage);
  }, [target.id, target.type]);

  const handleRemoveItem = async (itemName: string, slot: number) => {
    const success = await sendNui<boolean>('mri_Qadmin:server:RemoveInventoryItem', {
      targetId: target.id,
      item: itemName,
      count: selectedAmount,
      slot: slot,
      type: target.type
    })
    if (success) fetchInventory()
  }

  const handleTransferItem = async (itemName: string, slot: number) => {
    const success = await sendNui<boolean>('mri_Qadmin:server:TransferItemToSelf', {
      targetId: target.id,
      item: itemName,
      count: selectedAmount,
      slot: slot,
      type: target.type
    })
    if (success) fetchInventory()
  }

  const handleTransferToOther = async (itemName: string, slot: number) => {
      if (!otherTarget) return

      // First remove from current
      const successRemove = await sendNui<boolean>('mri_Qadmin:server:RemoveInventoryItem', {
          targetId: target.id,
          item: itemName,
          count: selectedAmount,
          slot: slot,
          type: target.type
      })

      if (successRemove) {
          // Then add to other
          await sendNui<boolean>('mri_Qadmin:server:GiveInventoryItem', {
              targetId: otherTarget.id,
              item: itemName,
              count: selectedAmount,
              type: otherTarget.type
          })
          fetchInventory()
          // We need a way to trigger refresh on the OTHER slot too.
          // For now, emitters or shared state would be better, but we'll stick to local.
          window.dispatchEvent(new CustomEvent('inventory-refresh', { detail: { targetId: otherTarget.id } }))
      }
  }

  useEffect(() => {
      const handler = (e: any) => {
          if (e.detail?.targetId === target.id) fetchInventory()
      }
      window.addEventListener('inventory-refresh', handler)
      return () => window.removeEventListener('inventory-refresh', handler)
  }, [target.id])

  const handleCopyAll = () => {
    setConfirm({
      show: true,
      title: 'Copiar Inventário',
      message: `Deseja copiar todos os itens para o seu inventário?`,
      type: 'info',
      onConfirm: async () => {
        const success = await sendNui<boolean>('mri_Qadmin:server:CopyInventoryToSelf', { targetId: target.id, type: target.type })
        if (success) fetchInventory()
        setConfirm(prev => ({ ...prev, show: false }))
      }
    })
  }

  const handleClearInventory = () => {
    setConfirm({
      show: true,
      title: 'Limpar Inventário',
      message: `Tem certeza que deseja apagar permanentemente todos os itens?`,
      type: 'danger',
      onConfirm: async () => {
        const success = await sendNui<boolean>('mri_Qadmin:server:ClearPlayerInventory', { targetId: target.id, type: target.type })
        if (success) fetchInventory()
        setConfirm(prev => ({ ...prev, show: false }))
      }
    })
  }

  const handleGiveItem = async () => {
    if (!giveItemData.name) return
    const success = await sendNui<boolean>('mri_Qadmin:server:GiveInventoryItem', {
      targetId: target.id,
      item: giveItemData.name,
      count: giveItemData.count,
      type: target.type
    })
    if (success) {
      fetchInventory()
      setShowGiveItem(false)
      setGiveItemData({ name: '', count: 1 })
    }
  }

  const handleManualDrop = async (e: any) => {
    const { item, source } = e.detail
    const toSlot = hoveredSlotRef.current

    console.log('[mri_Qadmin] Manual Drop Event Received:', {
        toSlot: toSlot,
        sourceId: source?.id,
        item: item?.name
    })

    if (!toSlot || !source?.id) return

    console.log('[mri_Qadmin] Manual Move Processing:', {
        from: source.id,
        to: target.id,
        item: item.name,
        fromSlot: item.slot,
        toSlot
    })

    const success = await sendNui<boolean>('mri_Qadmin:server:MoveInventoryItem', {
        fromId: source.id,
        fromType: source.type,
        fromSlot: item.slot,
        toId: target.id,
        toType: target.type,
        toSlot: toSlot,
        item: item.name,
        count: selectedAmount > 0 ? Math.min(selectedAmount, item.count) : item.count
    })

    if (success) {
        fetchInventory()
        if (String(source.id) !== String(target.id)) {
            window.dispatchEvent(new CustomEvent('inventory-refresh', { detail: { targetId: source.id } }))
        }
    }
  }

  useEffect(() => {
    window.addEventListener('custom-drag-drop', handleManualDrop as any)
    return () => window.removeEventListener('custom-drag-drop', handleManualDrop as any)
  }, [target.id, target.type])

  const handleDrop = async (e: React.DragEvent, toSlot: number) => {
      console.log('[mri_Qadmin] handleDrop triggered for slot:', toSlot)
      e.preventDefault()
      e.stopPropagation()
      setDragOverSlot(null)

      const rawData = e.dataTransfer.getData('text') || e.dataTransfer.getData('text/plain')
      console.log('[mri_Qadmin] Drop Event:', { toSlot, hasData: !!rawData })

      if (!rawData) return

      try {
          const payload = JSON.parse(rawData)
          const item = payload.item
          const source = payload.source

          if (!source?.id) return

          console.log('[mri_Qadmin] Processing Move:', {
              from: source.id,
              to: target.id,
              item: item.name,
              fromSlot: item.slot,
              toSlot
          })

          const success = await sendNui<boolean>('mri_Qadmin:server:MoveInventoryItem', {
              fromId: source.id,
              fromType: source.type,
              fromSlot: item.slot,
              toId: target.id,
              toType: target.type,
              toSlot: toSlot,
              item: item.name,
              count: selectedAmount > 0 ? Math.min(selectedAmount, item.count) : item.count
          })

          if (success) {
              fetchInventory()
              if (String(source.id) !== String(target.id)) {
                  window.dispatchEvent(new CustomEvent('inventory-refresh', { detail: { targetId: source.id } }))
              }
          }
      } catch (err) {
          console.error('[mri_Qadmin] Drop failed:', err)
      }
  }

  const renderSlots = () => {
    if (!data) return null
    const filteredItems = search.trim() !== ""
        ? data.items.filter(it =>
            it.name.toLowerCase().includes(search.toLowerCase()) ||
            it.label.toLowerCase().includes(search.toLowerCase())
          )
        : data.items

    const maxSlotsInInv = data.items.length > 0 ? Math.max(...data.items.map(i => i.slot || 0)) : 0
    const capacity = data.slots || 0
    const totalSlots = Math.max(capacity, maxSlotsInInv, 25)
    const gridCount = Math.ceil(totalSlots / 5) * 5

    const slots = []
    for (let i = 1; i <= gridCount; i++) {
      const item = filteredItems.find(it => it.slot === i)
      const isHighlighted = dragOverSlot === i

      if (item) {
        slots.push(
          <div
            key={`slot-${i}`}
            onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverSlot !== i) setDragOverSlot(i)
            }}
            onDragEnter={(e) => {
                e.preventDefault()
                if (dragOverSlot !== i) setDragOverSlot(i)
            }}
            onDragLeave={() => setDragOverSlot(null)}
            onDrop={(e) => handleDrop(e, i)}
            onMouseEnter={() => setHoveredSlot(i)}
            onMouseLeave={() => setHoveredSlot(null)}
            className={cn(
                "w-full h-full rounded-md transition-colors",
                isHighlighted && "bg-primary/20 ring-2 ring-primary ring-inset"
            )}
          >
            <InventoryItem
                name={item.name}
                label={item.label}
                count={item.count}
                slot={item.slot}
                metadata={item.metadata}
                weight={item.weight}
                sourceId={target.id}
                sourceType={target.type}
                onRemove={handleRemoveItem}
                onTransfer={handleTransferItem}
                onTransferToOther={otherTarget ? handleTransferToOther : undefined}
            />
          </div>
        )
      } else if (search.trim() === "") {
        slots.push(
            <div
                key={`slot-${i}`}
                onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverSlot !== i) setDragOverSlot(i)
                }}
                onDragEnter={(e) => {
                    e.preventDefault()
                    if (dragOverSlot !== i) setDragOverSlot(i)
                }}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={(e) => handleDrop(e, i)}
                onMouseEnter={() => setHoveredSlot(i)}
                onMouseLeave={() => setHoveredSlot(null)}
                className={cn(
                    "w-full h-full rounded-md transition-colors",
                    isHighlighted && "bg-primary/10 ring-2 ring-primary/50 ring-inset"
                )}
            >
                <InventoryItem
                    slot={i}
                    isEmpty
                    name=""
                    label=""
                    count={0}
                    sourceId={target.id}
                    sourceType={target.type}
                />
            </div>
        )
      }
    }
    return slots
  }

  const weightPercent = data ? Math.min(100, (data.weight / data.maxWeight) * 100) : 0
  const formatTotalWeight = (w: number) => (w / 1000).toFixed(1)

  return (
    <div className={cn("flex flex-col min-h-[500px] p-6 relative bg-card", isSecondary && "border-l border-border")}>
      {confirm.show && (
          <div className="absolute inset-0 z-[110] bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-lg p-6 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3 mb-4">
                      <div className={cn("p-2 rounded-full", confirm.type === 'danger' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                          <AlertTriangle className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold uppercase tracking-tight">{confirm.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{confirm.message}</p>
                  <div className="flex items-center justify-end gap-3">
                      <MriButton variant="ghost" onClick={() => setConfirm(prev => ({ ...prev, show: false }))}>Cancelar</MriButton>
                      <MriButton variant={confirm.type === 'danger' ? 'destructive' : 'default'} onClick={confirm.onConfirm}>Confirmar</MriButton>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col gap-4 border-b border-border pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-primary/10 text-primary">
              {target.type === 'player' ? <User className="w-5 h-5" /> : <Car className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight uppercase leading-none">
                {data?.label || target.name || target.id}
              </h2>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                {target.type === 'player' ? 'Jogador' : target.type === 'trunk' ? 'Porta-malas' : 'Porta-luvas'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSecondary && onAddComparison && !otherTarget && (
                <MriButton size="sm" variant="outline" onClick={onAddComparison} className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                    <ArrowLeftRight className="w-4 h-4" /> Comparar
                </MriButton>
            )}
            <MriButton size="icon" variant="ghost" onClick={() => setShowGiveItem(!showGiveItem)} title="Dar Item"><Plus className="w-4 h-4" /></MriButton>
            <MriButton size="icon" variant="ghost" onClick={handleCopyAll} title="Copiar Tudo"><Copy className="w-4 h-4" /></MriButton>
            <MriButton size="icon" variant="ghost" onClick={handleClearInventory} className="text-destructive hover:bg-destructive/10" title="Limpar"><Trash2 className="w-4 h-4" /></MriButton>
            <MriButton size="icon" variant="ghost" onClick={fetchInventory} disabled={loading}><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></MriButton>
            {onClose && <MriButton size="icon" variant="ghost" onClick={onClose}><X className="w-5 h-5" /></MriButton>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar item..."
              className="w-full bg-muted/30 border border-border pl-9 pr-3 py-1.5 rounded text-sm focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-muted/30 border border-border px-3 py-1 rounded">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Qtd</label>
            <input
              type="number"
              min="1"
              className="w-12 bg-transparent border-none text-sm focus:outline-none font-bold text-primary text-center"
              value={selectedAmount}
              onChange={(e) => setSelectedAmount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>

        {showGiveItem && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border rounded-md animate-in slide-in-from-top-2">
                <input type="text" placeholder="Nome do Item" className="flex-1 bg-background border border-border px-3 py-1.5 rounded text-sm" value={giveItemData.name} onChange={(e) => setGiveItemData({ ...giveItemData, name: e.target.value })} />
                <input type="number" className="w-20 bg-background border border-border px-3 py-1.5 rounded text-sm" value={giveItemData.count} onChange={(e) => setGiveItemData({ ...giveItemData, count: parseInt(e.target.value) || 1 })} />
                <MriButton size="sm" onClick={handleGiveItem} disabled={!giveItemData.name}>Add</MriButton>
            </div>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <div className="flex gap-2">
               <span className="text-foreground">{data ? formatTotalWeight(data.weight) : '0.0'}</span> / <span>{data ? formatTotalWeight(data.maxWeight) : '0.0'} KG</span>
            </div>
            <span>{data?.slots || 0} Slots</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border">
            <div className={cn("h-full transition-all duration-1000", weightPercent > 90 ? "bg-destructive" : weightPercent > 70 ? "bg-orange-500" : "bg-primary")} style={{ width: `${weightPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[55vh]">
        {loading && !data ? (
          <div className="h-full flex flex-col items-center justify-center py-20"><MriSpinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-5 gap-2 pb-4 pr-1">{renderSlots()}</div>
        )}
      </div>
    </div>
  )
}

const TargetSearch = ({ onSelect, onCancel }: { onSelect: (t: InventoryTarget) => void, onCancel: () => void }) => {
    const [search, setSearch] = useState('')
    const { sendNui } = useNui()
    const [results, setResults] = useState<{ id: string | number, name: string, type: string }[]>([])

    const handleSearch = async (val: string) => {
        setSearch(val)
        if (val.trim().length < 1) {
            setResults([])
            return
        }

        // Dynamic search for players
        try {
            const players = await sendNui<any[]>('mri_Qadmin:callback:GetOnlinePlayers')
            if (players) {
                const filtered = players
                    .filter(p => p.name.toLowerCase().includes(val.toLowerCase()) || String(p.id).includes(val))
                    .map(p => ({ id: p.id, name: p.name, type: 'player' }))
                setResults(filtered.slice(0, 5))
            }
        } catch (e) {
            setResults([])
        }
    }

    const isNum = /^\d+$/.test(search.trim())

    return (
        <div className="absolute inset-0 z-[120] bg-background/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-card border border-border shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-xl p-6 border-primary/20">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-foreground/90">Abrir Inventário</h3>
                    <MriButton size="icon" variant="ghost" onClick={onCancel} className="h-8 w-8"><X className="w-5 h-5" /></MriButton>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/50" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Pesquisar Jogador, ID ou Placa..."
                        className="w-full bg-muted/50 border-2 border-border focus:border-primary/50 pl-10 pr-4 py-3 rounded-lg text-base transition-all focus:outline-none placeholder:text-muted-foreground/50"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && search.trim()) {
                                // Default to player if numeric, or trunk if string
                                onSelect({
                                    id: search.trim(),
                                    name: isNum ? `Jogador ${search}` : `Veículo ${search}`,
                                    type: isNum ? 'player' : 'trunk'
                                })
                            }
                        }}
                    />
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Search Results */}
                    {results.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest px-1">Jogadores Online</p>
                            {results.map(r => (
                                <button
                                    key={`${r.type}-${r.id}`}
                                    className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border hover:bg-primary/10 hover:border-primary transition-all group"
                                    onClick={() => onSelect({ id: r.id, name: r.name, type: r.type as any })}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                           <User className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold leading-tight">{r.name}</p>
                                            <p className="text-[10px] text-muted-foreground">ID: {r.id}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black bg-muted px-2 py-0.5 rounded uppercase opacity-60">Online</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Quick Options for typed text */}
                    {search.trim().length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                            <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest px-1">Opções Diretas</p>

                            {/* Force Player ID */}
                            <button
                                className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group"
                                onClick={() => onSelect({ id: search.trim(), name: `Jogador ${search}`, type: 'player' })}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                       <User className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold">Abrir como Jogador ({search})</span>
                                </div>
                            </button>

                            {/* Trunk / Glovebox Options */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/40 border border-border/60 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all group"
                                    onClick={() => onSelect({ id: search.trim(), name: `Placa ${search}`, type: 'trunk' })}
                                >
                                    <Car className="w-6 h-6 text-orange-500" />
                                    <span className="text-xs font-bold uppercase tracking-tighter">Porta-malas</span>
                                </button>
                                <button
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/40 border border-border/60 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all group"
                                    onClick={() => onSelect({ id: search.trim(), name: `Placa ${search}`, type: 'glovebox' })}
                                >
                                    <div className="relative">
                                        <Car className="w-6 h-6 text-orange-500" />
                                        <Search className="absolute -bottom-1 -right-1 w-3 h-3 text-white fill-orange-500" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-tighter">Porta-luvas</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-4 border-t border-border">
                    <p className="text-[10px] text-center text-muted-foreground/40 font-medium uppercase tracking-[0.2em]">MRI QADMIN INVENTORY SYSTEM</p>
                </div>
            </div>
        </div>
    )
}


export default function InventoryViewerModal({ target, onClose }: InventoryViewerModalProps) {
  const [secondTarget, setSecondTarget] = useState<InventoryTarget | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <DragGhost />
      <div className={cn(
          "bg-card border border-border shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden pointer-events-auto transition-all duration-300 ease-in-out",
          secondTarget ? "w-[1240px]" : "w-full max-w-3xl"
      )}>
        <div className="flex relative items-stretch" onDragOver={(e) => e.preventDefault()}>
          {showSearch && (
              <TargetSearch
                onSelect={(t) => { setSecondTarget(t); setShowSearch(false); }}
                onCancel={() => setShowSearch(false)}
              />
          )}

          <InventorySlot
            target={target}
            onClose={onClose}
            onAddComparison={() => setShowSearch(true)}
            otherTarget={secondTarget}
          />

          {secondTarget && (
              <InventorySlot
                isSecondary
                target={secondTarget}
                onClose={() => setSecondTarget(null)}
                otherTarget={target}
              />
          )}
        </div>
      </div>
    </div>
  )
}
