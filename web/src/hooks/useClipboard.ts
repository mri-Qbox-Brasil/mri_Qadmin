import { useCallback } from 'react'
import { useNui } from '@/context/NuiContext'

export function useClipboard() {
    const { sendNui, debugMode } = useNui()

    const copy = useCallback(async (value: string) => {
        if (debugMode) {
            await navigator.clipboard.writeText(value).catch(() => {})
            return
        }
        await sendNui('setClipboard', { value })
    }, [sendNui, debugMode])

    return { copy }
}
