import React, { createContext, useContext, useEffect, useState } from 'react'
import { colord, extend } from 'colord'
import namesPlugin from 'colord/plugins/names'

import { ThemeContextType } from '@/types'

extend([namesPlugin])

const DEFAULT_ACCENT = '#00E699'
const HEX_RE = /^#[0-9a-f]{6}$/i

function isValidHex(value: string): boolean {
    return HEX_RE.test(value)
}

function applyAccentColor(hex: string) {
    if (!isValidHex(hex)) return

    const c = colord(hex)
    const hsl = c.toHsl()
    const tokenValue = `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`
    const fgValue = c.isDark() ? '210 40% 98%' : '240 10% 3.9%'

    const root = document.documentElement
    root.style.setProperty('--primary', tokenValue)
    root.style.setProperty('--primary-foreground', fgValue)
    root.style.setProperty('--ring', tokenValue)
    root.style.setProperty('--primary-rgb', `${c.toRgb().r}, ${c.toRgb().g}, ${c.toRgb().b}`)
}

const BG_VARS = ['--background','--card','--popover','--secondary','--muted','--border','--input','--foreground','--card-foreground','--popover-foreground'] as const

function applyBackgroundColor(hex: string) {
    const root = document.documentElement
    if (!isValidHex(hex)) {
        BG_VARS.forEach(v => root.style.removeProperty(v))
        return
    }
    const c = colord(hex)
    const { h, s, l } = c.toHsl()
    root.style.setProperty('--background', `${h} ${s}% ${l}%`)
    root.style.setProperty('--card',       `${h} ${s}% ${Math.min(l + 2,  100)}%`)
    root.style.setProperty('--popover',    `${h} ${s}% ${Math.min(l + 2,  100)}%`)
    const surf = `${h} ${Math.max(s - 5, 0)}% ${Math.min(l + 11, 100)}%`
    ;(['--secondary','--muted','--border','--input'] as const).forEach(v => root.style.setProperty(v, surf))
    const fg = c.isDark() ? '0 0% 98%' : '240 10% 3.9%'
    ;(['--foreground','--card-foreground','--popover-foreground'] as const).forEach(v => root.style.setProperty(v, fg))
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState(() => localStorage.getItem('ps:theme') || 'dark')
    const [scale, setScaleState] = useState(() => Number(localStorage.getItem('ps:scale')) || 100)
    const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT)
    const [serverAccentColor, setServerAccentColorState] = useState<string>(DEFAULT_ACCENT)
    const [backgroundColor, setBackgroundColorState] = useState<string>(
        () => localStorage.getItem('ps:backgroundColor') ?? ''
    )
    const [serverBackgroundColor, setServerBackgroundColorState] = useState<string>('')

    // Theme dark/light/system — inalterado.
    useEffect(() => {
        const root = document.documentElement

        const isDark = theme === 'dark' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: light)').matches)

        if (theme === 'light') {
            root.classList.add('light')
            root.classList.remove('dark')
        } else if (theme === 'dark') {
            root.classList.add('dark')
            root.classList.remove('light')
        } else if (theme === 'system') {
            if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                root.classList.add('light')
                root.classList.remove('dark')
            } else {
                root.classList.add('dark')
                root.classList.remove('light')
            }
        }
        localStorage.setItem('ps:theme', theme)

        // Ao entrar em light mode limpa overrides de fundo; ao voltar para dark restaura.
        if (!isDark) {
            applyBackgroundColor('')
        } else {
            applyBackgroundColor(localStorage.getItem('ps:backgroundColor') ?? '')
        }
    }, [theme])

    // Scale persiste em localStorage.
    useEffect(() => {
        localStorage.setItem('ps:scale', String(scale))
    }, [scale])

    useEffect(() => { applyAccentColor(accentColor) }, [accentColor])

    useEffect(() => {
        applyBackgroundColor(backgroundColor)
        localStorage.setItem('ps:backgroundColor', backgroundColor)
    }, [backgroundColor])

    // Listener de mensagens do Lua: setupUI (boot) + updateAccentColor (runtime).
    // Server é a fonte da verdade — sempre que chega broadcast, sobrepõe
    // qualquer preview local pendente.
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const { action, data, accentColor: msgAccent } = event.data || {}

            const apply = (hex: string) => {
                const upper = hex.toUpperCase()
                setAccentColorState(upper)
                setServerAccentColorState(upper)
            }

            if (action === 'setupUI' && data) {
                if (typeof data.accentColor === 'string' && isValidHex(data.accentColor)) apply(data.accentColor)
                if (typeof data.backgroundColor === 'string') {
                    const bg = data.backgroundColor.toUpperCase()
                    setBackgroundColorState(bg)
                    setServerBackgroundColorState(bg)
                }
            } else if (action === 'updateAccentColor' && typeof msgAccent === 'string' && isValidHex(msgAccent)) {
                apply(msgAccent)
            } else if (action === 'updateBackgroundColor') {
                const bg = (event.data.backgroundColor ?? '').toUpperCase()
                setBackgroundColorState(bg)
                setServerBackgroundColorState(bg)
            }
        }

        window.addEventListener('message', handler)
        return () => window.removeEventListener('message', handler)
    }, [])

    const setTheme = (t: string) => setThemeState(t)
    const setScale = (s: number) => setScaleState(s)
    // Setter local: usado quando admin altera no UI antes do server broadcast voltar.
    // O broadcast sobrepõe imediatamente após (idempotente).
    const setAccentColor = (hex: string) => {
        if (isValidHex(hex)) setAccentColorState(hex.toUpperCase())
    }

    const setBackgroundColor = (hex: string) => {
        const val = hex === '' ? '' : isValidHex(hex) ? hex.toUpperCase() : backgroundColor
        setBackgroundColorState(val)
    }

    return (
        <ThemeContext.Provider value={{
            theme, setTheme,
            accentColor, serverAccentColor, setAccentColor,
            backgroundColor, serverBackgroundColor, setBackgroundColor,
            scale, setScale,
        }}>
            {children}
        </ThemeContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
