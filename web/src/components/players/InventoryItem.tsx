import React from 'react'
import { cn } from '@/lib/utils'
import { Trash2, Copy } from 'lucide-react'

interface InventoryItemProps {
  name: string
  label: string
  count: number
  slot: number
  metadata?: any
  weight?: number
  iconUrl?: string
  className?: string
  isEmpty?: boolean
  onRemove?: (item: string, slot: number) => void
  onTransfer?: (item: string, slot: number) => void
  onTransferToOther?: (item: string, slot: number) => void
  sourceId?: string | number
  sourceType?: string
}
import { ArrowRightLeft, ImageOff } from 'lucide-react'

export const InventoryItem: React.FC<InventoryItemProps> = ({
  name,
  label,
  count,
  slot,
  metadata,
  weight,
  iconUrl,
  className,
  isEmpty = false,
  onRemove,
  onTransfer,
  onTransferToOther,
  sourceId,
  sourceType
}) => {
  if (isEmpty) {
    return (
      <div
        className={cn(
          "relative aspect-[0.9/1] rounded bg-muted/50 border border-border flex items-center justify-center group",
          className
        )}
      >
        <span className="text-4xl font-bold text-white/5 select-none transition-colors group-hover:text-white/10">
          {slot}
        </span>
      </div>
    )
  }

  const fallbackIcon = name ? `nui://ox_inventory/web/images/${name}.png` : ''
  const finalIcon = iconUrl || fallbackIcon

  // Format weight to grams if small, or kg if large
  const formatWeight = (w?: number) => {
    if (w === undefined) return ''
    if (w < 1000) return `${w} g`
    return `${(w / 1000).toFixed(1)} kg`
  }

  const [imageError, setImageError] = React.useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEmpty || e.button !== 0) return // Only left click


    // Dispatch custom event to DragGhost
    window.dispatchEvent(new CustomEvent('custom-drag-start', {
        detail: {
            item: { name, slot, label, count, iconUrl },
            source: { id: sourceId, type: sourceType },
            x: e.clientX,
            y: e.clientY
        }
    }))
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      title={`${label} (${name})${metadata ? '\n\n' + JSON.stringify(metadata, null, 2) : ''}`}
      className={cn(
        "relative aspect-[0.9/1] rounded bg-card border border-border flex flex-col items-center justify-between p-1 overflow-hidden group hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing select-none",
        className
      )}
    >
      {/* Top Bar: Weight & Count */}
      <div className="w-full flex justify-between items-start px-1 pt-0.5 z-10 pointer-events-none">
        <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-tighter">
          {formatWeight(weight)}
        </span>
        <div className="bg-primary/20 border border-primary/30 px-1 rounded-sm">
            <span className="text-[9px] font-bold text-primary">
                {count}x
            </span>
        </div>
      </div>

      {/* Item Icon */}
      <div className="flex-1 flex items-center justify-center w-full p-0.5 relative pointer-events-none min-h-0">
        {imageError ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground/30 gap-1">
                <ImageOff className="w-8 h-8 opacity-20" />
                <span className="text-[10px] opacity-20 text-center px-1">Img Error</span>
            </div>
        ) : (
            <img
            src={finalIcon}
            alt=""
            draggable={false}
            className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,0,0,0.5)] group-hover:scale-125 transition-transform duration-500 select-none pointer-events-none"
            onError={() => setImageError(true)}
            />
        )}

        {/* Floating Actions above the label */}
        {(onTransfer || onRemove || onTransferToOther) && (
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 pb-1">
                {onTransferToOther && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTransferToOther(name, slot);
                        }}
                        className="p-1 px-2 rounded bg-primary/90 text-white shadow-lg hover:bg-primary transition-colors"
                        title="Transferir para o outro inventário"
                    >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                )}
                {onTransfer && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTransfer(name, slot);
                        }}
                        className="p-1 px-2 rounded bg-blue-500/90 text-white shadow-lg hover:bg-blue-600 transition-colors"
                        title="Transferir para mim"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                )}
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(name, slot);
                        }}
                        className="p-1 px-2 rounded bg-destructive/90 text-white shadow-lg hover:bg-destructive transition-colors"
                        title="Remover Item"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        )}
      </div>

      {/* Bottom Label */}
      <div className="w-full bg-muted/80 py-1 px-1.5 border-t border-border mt-auto pointer-events-none">
        <p className="text-[10px] font-medium text-white/80 truncate text-center uppercase tracking-tight">
          {label}
        </p>
      </div>

      {/* Subtle Slot Number at bottom right or background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-bold text-foreground/[0.03] pointer-events-none select-none">
        {slot}
      </div>

      {/* Hover background effect */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
    </div>
  )
}
