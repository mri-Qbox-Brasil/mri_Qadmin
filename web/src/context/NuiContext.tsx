import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react'

import { Handler, NuiContextValue } from '@/types'

const NuiContext = createContext<NuiContextValue | undefined>(undefined)

export function NuiProvider({ children, debugMode = false, debugResourceName = '' }: { children: React.ReactNode; debugMode?: boolean; debugResourceName?: string }) {
    const handlersRef = useRef(new Map<string, Set<Handler>>())

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            const { action, data } = event.data || {}
            if (!action) return
            const set = handlersRef.current.get(action)
            if (set) {
                set.forEach((h) => h(data))
            }
        }

        window.addEventListener('message', listener)
        return () => window.removeEventListener('message', listener)
    }, [])

    const on = useCallback((action: string, handler: Handler) => {
        const map = handlersRef.current
        const set = map.get(action) || new Set<Handler>()
        set.add(handler)
        map.set(action, set)
    }, [])

    const off = useCallback((action: string, handler: Handler) => {
        const map = handlersRef.current
        const set = map.get(action)
        if (set) {
            set.delete(handler)
            if (set.size === 0) map.delete(action)
        }
    }, [])

    const sendNui = useCallback(async function <T = any>(eventName: string, data: unknown = {}, debugReturn?: T): Promise<T> {
        const isMockMode = localStorage.getItem('mri_qadmin_use_mocks') === 'true'
        if (debugMode || isMockMode) return Promise.resolve((debugReturn ?? ({} as T)) as T)

        const options: RequestInit = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data),
        }

        const win = window as any
        const primaryResource = win.GetParentResourceName ? win.GetParentResourceName() : undefined
        const resourceName = primaryResource || debugResourceName || (win.__psResourceName ?? '')

        const tryFetch = async (resName: string) => {
            const url = `https://${resName}/${eventName}`
            return fetch(url, options)
        }

        // try primary resource, fall back to debugResourceName if 404
        let resp = await tryFetch(resourceName)
        if (resp.status === 404 && debugResourceName && resourceName !== debugResourceName) {
            try {
                resp = await tryFetch(debugResourceName)
                console.warn('[NUI] fallback to debugResourceName', debugResourceName, 'for event', eventName)
            } catch {
                // ignore, we'll throw below
            }
        }

        if (!resp.ok) {
            const text = await resp.text().catch(() => '')
            throw new Error(`NUI request failed ${resp.status} ${resp.statusText} - ${text}`)
        }

        return resp.json()
    }, [debugMode, debugResourceName])

    return (
        <NuiContext.Provider value={{ sendNui, on, off, debugMode }}>
            {children}
        </NuiContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNui() {
    const ctx = useContext(NuiContext)
    if (!ctx) throw new Error('useNui must be used within a NuiProvider')
    return ctx
}
