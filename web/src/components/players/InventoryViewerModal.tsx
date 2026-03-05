import React, { useState, useEffect } from 'react'
import { MriButton, MriSpinner } from '@mriqbox/ui-kit'
import { RefreshCw, User, X, Trash2, Plus, Copy, AlertTriangle, Car } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useNui } from '@/context/NuiContext'
import { InventoryItem } from './InventoryItem'
import { cn } from '@/lib/utils'
import { MOCK_INVENTORY } from '@/utils/mockData'

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
  target: {
    id: number | string // player ID or Plate
    name?: string
    type: 'player' | 'trunk' | 'glovebox'
  }
  onClose: () => void
}

interface ConfirmState {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
}

export default function InventoryViewerModal({ target, onClose }: InventoryViewerModalProps) {
  const { t } = useI18n()
  const { sendNui, debugMode } = useNui()
  const [data, setData] = useState<InventoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGiveItem, setShowGiveItem] = useState(false)
  const [giveItemData, setGiveItemData] = useState({ name: '', count: 1 })
  const [confirm, setConfirm] = useState<ConfirmState>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  })

  const fetchInventory = async () => {
    setLoading(true)
    if (debugMode) {
        setData(JSON.parse(JSON.stringify(MOCK_INVENTORY)))
        setLoading(false)
        return
    }
    try {
      let resp: InventoryResponse | null = null;
      if (target.type === 'player') {
          resp = await sendNui<InventoryResponse>('mri_Qadmin:callback:GetPlayerInventory', { targetId: target.id })
      } else {
          resp = await sendNui<InventoryResponse>('mri_Qadmin:callback:GetVehicleInventory', { plate: target.id, type: target.type })
      }

      if (resp) {
        setData(resp)
      }
    } catch (e) {
      console.error('Failed to fetch inventory:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [target.id, target.type])

  const handleRemoveItem = async (itemName: string, slot: number) => {
    if (debugMode) {
        if (data) {
            const newData = { ...data, items: data.items.filter(it => it.slot !== slot) }
            setData(newData)
        }
        return
    }

    const success = await sendNui<boolean>('mri_Qadmin:server:RemoveInventoryItem', {
        targetId: target.id,
        item: itemName,
        count: 1,
        slot: slot,
        type: target.type
    })
    if (success) fetchInventory()
  }

  const handleTransferItem = async (itemName: string, slot: number) => {
    if (debugMode) {
        if (data) {
            const newData = { ...data, items: data.items.filter(it => it.slot !== slot) }
            setData(newData)
        }
        return
    }

    const success = await sendNui<boolean>('mri_Qadmin:server:TransferItemToSelf', {
        targetId: target.id,
        item: itemName,
        count: 1,
        slot: slot,
        type: target.type
    })
    if (success) fetchInventory()
  }

  const handleCopyAll = () => {
    setConfirm({
        show: true,
        title: "Copiar Inventário",
        message: `Deseja copiar todos os itens de ${target.name || target.id} para o seu inventário?`,
        type: 'info',
        onConfirm: async () => {
            if (!debugMode) {
                const success = await sendNui<boolean>('mri_Qadmin:server:CopyInventoryToSelf', { targetId: target.id, type: target.type })
                if (success) fetchInventory()
            }
            setConfirm(prev => ({ ...prev, show: false }))
        }
    })
  }

  const handleClearInventory = () => {
    setConfirm({
        show: true,
        title: "Limpar Inventário",
        message: `Tem certeza que deseja apagar permanentemente todos os itens de ${target.name || target.id}? Esta ação não pode ser desfeita.`,
        type: 'danger',
        onConfirm: async () => {
            if (debugMode) {
                if (data) setData({ ...data, items: [], weight: 0 })
            } else {
                const success = await sendNui<boolean>('mri_Qadmin:server:ClearPlayerInventory', { targetId: target.id, type: target.type })
                if (success) fetchInventory()
            }
            setConfirm(prev => ({ ...prev, show: false }))
        }
    })
  }

  const handleGiveItem = async () => {
    if (!giveItemData.name) return

    if (debugMode) {
        if (data) {
            const newItems = [...data.items, {
                name: giveItemData.name,
                label: giveItemData.name.toUpperCase(),
                count: giveItemData.count,
                slot: data.items.length + 1,
                weight: 500
            }]
            setData({ ...data, items: newItems })
        }
        setShowGiveItem(false)
        setGiveItemData({ name: '', count: 1 })
        return
    }

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

  const renderSlots = () => {
    if (!data) return null
    const slots = []

    // Dynamic slot count: Use returned slots or fallback to highest slot/min value
    const maxSlotsInInv = data.items.length > 0 ? Math.max(...data.items.map(i => i.slot || 0)) : 0
    const capacity = data.slots || 0
    const totalSlots = Math.max(capacity, maxSlotsInInv, 25)

    // Always round up to a multiple of 5 for a clean grid
    const gridCount = Math.ceil(totalSlots / 5) * 5

    for (let i = 1; i <= gridCount; i++) {
      const item = data.items.find(it => it.slot === i)
      if (item) {
        slots.push(
          <InventoryItem
            key={`slot-${i}`}
            name={item.name}
            label={item.label}
            count={item.count}
            slot={item.slot}
            metadata={item.metadata}
            weight={item.weight}
            onRemove={handleRemoveItem}
            onTransfer={handleTransferItem}
          />
        )
      } else {
        slots.push(<InventoryItem key={`slot-${i}`} slot={i} isEmpty name="" label="" count={0} />)
      }
    }
    return slots
  }

  const weightPercent = data ? Math.min(100, (data.weight / data.maxWeight) * 100) : 0
  const formatTotalWeight = (w: number) => (w / 1000).toFixed(1)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="w-full max-w-3xl bg-card border border-border shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col min-h-[500px] p-6 relative">

          {/* Confirmation Overlay */}
          {confirm.show && (
              <div className="absolute inset-0 z-[110] bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in duration-200">
                  <div className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-lg p-6 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3 mb-4">
                          <div className={cn(
                              "p-2 rounded-full",
                              confirm.type === 'danger' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                          )}>
                              <AlertTriangle className="w-6 h-6" />
                          </div>
                          <h3 className="text-lg font-bold uppercase tracking-tight">{confirm.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                          {confirm.message}
                      </p>
                      <div className="flex items-center justify-end gap-3">
                          <MriButton variant="ghost" onClick={() => setConfirm(prev => ({ ...prev, show: false }))}>
                              Cancelar
                          </MriButton>
                          <MriButton
                            variant={confirm.type === 'danger' ? 'destructive' : 'default'}
                            onClick={confirm.onConfirm}
                          >
                              Confirmar
                          </MriButton>
                      </div>
                  </div>
              </div>
          )}

          {/* Header Style */}
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
                        {target.type === 'player' ? 'Inventário do Jogador' : target.type === 'trunk' ? 'Porta-malas' : 'Porta-luvas'}
                    </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MriButton
                  size="sm"
                  variant="outline"
                  onClick={() => setShowGiveItem(!showGiveItem)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Dar Item
                </MriButton>
                <MriButton
                  size="sm"
                  variant="outline"
                  onClick={handleCopyAll}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Tudo
                </MriButton>
                <MriButton
                  size="sm"
                  variant="outline"
                  onClick={handleClearInventory}
                  className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar
                </MriButton>
                <MriButton
                  size="sm"
                  variant="outline"
                  onClick={fetchInventory}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
                  {t('refresh')}
                </MriButton>
                <MriButton
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </MriButton>
              </div>
            </div>

            {showGiveItem && (
                <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border rounded-md animate-in slide-in-from-top-2 duration-200">
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Nome do Item</label>
                        <input
                            type="text"
                            placeholder="ex: water"
                            className="w-full bg-background border border-border px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                            value={giveItemData.name}
                            onChange={(e) => setGiveItemData({ ...giveItemData, name: e.target.value })}
                        />
                    </div>
                    <div className="w-24 space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Qtd</label>
                        <input
                            type="number"
                            className="w-full bg-background border border-border px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                            value={giveItemData.count}
                            onChange={(e) => setGiveItemData({ ...giveItemData, count: parseInt(e.target.value) || 1 })}
                        />
                    </div>
                    <div className="pt-5">
                        <MriButton size="sm" onClick={handleGiveItem} disabled={!giveItemData.name}>
                            Confirmar
                        </MriButton>
                    </div>
                </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-end items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest gap-2">
                 <span className="text-foreground">{data ? formatTotalWeight(data.weight) : '0.0'}</span>
                 <span>/</span>
                 <span>{data ? formatTotalWeight(data.maxWeight) : '0.0'} KG</span>
                 <span className="text-muted-foreground opacity-50 ml-1">({data?.slots || 0} Slots)</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border">
                  <div
                      className={cn(
                          "h-full transition-all duration-1000 ease-out",
                          weightPercent > 90 ? "bg-destructive" : weightPercent > 70 ? "bg-orange-500" : "bg-primary"
                      )}
                      style={{ width: `${weightPercent}%` }}
                  />
              </div>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[60vh]">
            {loading && !data ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                <MriSpinner size="lg" />
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest animate-pulse">
                  {t('loading_data')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 pb-4 pr-1">
                {renderSlots()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
