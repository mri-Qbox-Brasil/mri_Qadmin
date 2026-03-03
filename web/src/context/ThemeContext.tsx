import React, { createContext, useContext, useEffect, useState } from 'react'
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";

extend([namesPlugin]);
// ... (rest of the interface and context remains same)

interface ThemeContextType {
    theme: string
    setTheme: (t: string) => void
    accent: string
    setAccent: (c: string) => void
    scale: number
    setScale: (s: number) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Initialize state from localStorage or defaults
    const [theme, setThemeState] = useState(() => localStorage.getItem('ps:theme') || 'dark')
    const [accent, setAccentState] = useState(() => localStorage.getItem('ps:accent') || 'green')
    const [scale, setScaleState] = useState(() => Number(localStorage.getItem('ps:scale')) || 100)

    // Effect to apply settings and save to localStorage
    useEffect(() => {
        const root = document.documentElement
        const body = document.body

        // Apply Theme
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

        // Apply Accent
        // We need to map IDs to values again or store values.
        // Strategy: Store the ID in state, and look up the value.
        // However, to keep it simple and consistent with previous code, let's look at how we want to handle the CSS variable.
        // We will store the COLOR ID (e.g., 'green', 'blue') in the state.
        // We need the map of ID -> Value here to apply it to the root.

        const COLORS: Record<string, string> = {
            'green': '160 100% 45%',
            'blue': '221 83% 53%',
            'purple': '262 83% 58%',
            'red': '346 84% 61%',
            'orange': '25 95% 53%',
            'pink': '316 73% 52%',
            'yellow': '47 95% 57%',
        }

        const colorValue = COLORS[accent] || accent

        // Calculate dynamic foreground using colord
        // If it's a name, colord will resolve it. If it's "h s% l%", colord("hsl(...)") works.
        const colorForColord = colorValue.includes('%') ? `hsl(${colorValue})` : colorValue
        const c = colord(colorForColord)
        const isDark = c.isDark()

        // Use high-contrast foreground
        const fgValue = isDark ? '210 40% 98%' : '240 10% 3.9%'

        if (colorValue) {
             root.style.setProperty('--primary', colorValue)
             root.style.setProperty('--primary-foreground', fgValue)
             root.style.setProperty('--ring', colorValue)
        }
        localStorage.setItem('ps:accent', accent)

        // Apply Scale
        // Scale is now handled in App.tsx via the scale value from context
        localStorage.setItem('ps:scale', String(scale))

    }, [theme, accent, scale])

    const setTheme = (t: string) => setThemeState(t)
    const setAccent = (c: string) => setAccentState(c)
    const setScale = (s: number) => setScaleState(s)

    return (
        <ThemeContext.Provider value={{ theme, setTheme, accent, setAccent, scale, setScale }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
