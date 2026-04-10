import { createContext, useContext } from 'react'

export type Translations = Record<string, string>

export interface I18nContextValue {
    t: (key: string, vars?: Record<string, any> | any[]) => string
    locale: string
    setLocale: (l: string) => void
    translations: Translations
    preferredLocale: string | null
    setPreferredLocale: (l: string | null) => void
    supportedLanguages: { id: string, label: string, flag: string }[]
    setSupportedLanguages: (langs: { id: string, label: string, flag: string }[]) => void
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function useI18n() {
    const ctx = useContext(I18nContext)
    if (!ctx) throw new Error('useI18n must be used within I18nProvider')
    return ctx
}
