import React from 'react'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'
import { Button } from '@/components/ui/Button'
import { Play, Square, RotateCw } from 'lucide-react'

interface ButtonStateProps {
  resource: string
  icon?: string // Svelte passed icon class, we map to Lucide
  state: string
}

export default function ButtonState({ resource, icon, state }: ButtonStateProps) {
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
    <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 hover:bg-primary hover:text-primary-foreground"
        onClick={changeState}
    >
      <IconComponent className="h-4 w-4" />
    </Button>
  )
}
