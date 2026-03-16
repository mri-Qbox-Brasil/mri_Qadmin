import React from 'react'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { MriButton } from '@mriqbox/ui-kit'
import { Play, Square, RotateCw } from 'lucide-react'

interface ButtonStateProps {
    resource: string
    icon?: string
    state: string
}

export default function ButtonState({ resource, state }: ButtonStateProps) {
    const { sendNui } = useNui()
    const { setGameData } = useAppState()

    const changeState = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            const data = await sendNui('setResourceState', { name: resource, state: state })
            if (data) {
                setGameData(prev => ({ ...prev, resources: data }))
            }
        } catch (err) {
            console.error("Failed to set resource state", err)
        }
    }

    let IconComponent = Play
    if (state === 'stop') IconComponent = Square
    if (state === 'restart') IconComponent = RotateCw

    return (
        <MriButton
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-primary hover:text-primary-foreground"
            onClick={changeState}
        >
            <IconComponent className="h-4 w-4" />
        </MriButton>
    )
}
