import React, { useState, useEffect, useRef } from 'react'

interface DragState {
    active: boolean;
    item: any;
    source: any;
    x: number;
    y: number;
}

export const DragGhost = () => {
    const [drag, setDrag] = useState<DragState>({ active: false, item: null, source: null, x: 0, y: 0 })
    const dragRef = useRef<DragState>(drag)

    useEffect(() => {
        dragRef.current = drag
    }, [drag])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (dragRef.current.active) {
                setDrag(prev => ({ ...prev, x: e.clientX, y: e.clientY }))
            }
        }

        const handleMouseUp = (e: MouseEvent) => {
            if (dragRef.current.active) {
                // Dispatch custom drop event
                window.dispatchEvent(new CustomEvent('custom-drag-drop', {
                    detail: {
                        item: dragRef.current.item,
                        source: dragRef.current.source,
                        x: e.clientX,
                        y: e.clientY
                    }
                }))
                setDrag({ active: false, item: null, source: null, x: 0, y: 0 })
            }
        }

        const handleManualDragStart = (e: any) => {
            setDrag({
                active: true,
                item: e.detail.item,
                source: e.detail.source,
                x: e.detail.x,
                y: e.detail.y
            })
        }

        window.addEventListener('custom-drag-start', handleManualDragStart as any)
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)

        return () => {
            window.removeEventListener('custom-drag-start', handleManualDragStart as any)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

    if (!drag.active || !drag.item) return null

    const iconUrl = drag.item.iconUrl || `nui://ox_inventory/web/images/${drag.item.name}.png`

    return (
        <div
            className="fixed pointer-events-none z-[9999] flex flex-col items-center gap-1"
            style={{
                left: drag.x,
                top: drag.y,
                transform: 'translate(-50%, -50%) rotate(3deg) scale(1.1)',
            }}
        >
            <div className="w-16 h-16 bg-card/80 backdrop-blur-md border-2 border-primary/50 rounded shadow-2xl flex items-center justify-center p-2">
                <img src={iconUrl} className="w-full h-full object-contain drop-shadow-lg" alt="" />
            </div>
            <div className="bg-primary px-2 py-0.5 rounded shadow-lg">
                <span className="text-[10px] font-bold text-white uppercase">{drag.item.label}</span>
            </div>
        </div>
    )
}
