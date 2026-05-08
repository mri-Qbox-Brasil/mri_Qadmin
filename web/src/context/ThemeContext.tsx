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

// Aplica `accentColor` (hex) nas CSS vars --primary, --ring e --primary-foreground.
// Mesmo padrão do mri_Qmultichar/mri_Qspawn — convar `mri:color` é a fonte da
// verdade, broadcast em runtime do servidor atualiza ao vivo.
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

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState(() => localStorage.getItem('ps:theme') || 'dark')
    const [scale, setScaleState] = useState(() => Number(localStorage.getItem('ps:scale')) || 100)
    // accentColor = preview ao vivo (pode estar editado localmente).
    // serverAccentColor = última cor confirmada pelo servidor.
    // Settings page compara os dois pra detectar draft pendente.
    const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT)
    const [serverAccentColor, setServerAccentColorState] = useState<string>(DEFAULT_ACCENT)

    // Theme dark/light/system — inalterado.
    useEffect(() => {
        const root = document.documentElement

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
    }, [theme])

    // Scale persiste em localStorage.
    useEffect(() => {
        localStorage.setItem('ps:scale', String(scale))
    }, [scale])

    // Aplica accent color sempre que muda. Vem do servidor (setupUI ou
    // updateAccentColor broadcast).
    useEffect(() => {
        applyAccentColor(accentColor)
    }, [accentColor])

    // Listener de mensagens do Lua: setupUI (boot) + updateAccentColor (runtime).
    // Server é a fonte da verdade — sempre que chega broadcast, sobrepõe
    // qualquer preview local pendente.
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const { action, data, accentColor: msgAccent } = event.data || {}

            const apply = (hex: string) => {
                const upper = hex.toUpperCase()
                console.info('[ThemeContext] applying accent from server:', upper)
                setAccentColorState(upper)
                setServerAccentColorState(upper)
            }

            if (action === 'setupUI' && data && typeof data.accentColor === 'string' && isValidHex(data.accentColor)) {
                apply(data.accentColor)
            } else if (action === 'updateAccentColor') {
                if (typeof msgAccent === 'string' && isValidHex(msgAccent)) {
                    apply(msgAccent)
                } else {
                    console.warn('[ThemeContext] updateAccentColor com payload inválido:', event.data)
                }
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

    return (
        <ThemeContext.Provider value={{ theme, setTheme, accentColor, serverAccentColor, setAccentColor, scale, setScale }}>
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
