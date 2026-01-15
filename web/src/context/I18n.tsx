import React, { createContext, useContext, useEffect, useState } from 'react'
import en from '../../../locales/en.json'
import { useNui } from './NuiContext'

type Translations = Record<string, string>

interface I18nContextValue {
  t: (key: string, vars?: Record<string, any> | any[]) => string
  locale: string
  setLocale: (l: string) => void
  translations: Translations
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { sendNui, on, off } = useNui()
  const [locale, setLocale] = useState<string>('en')
  const [translations, setTranslations] = useState<Translations>(en as Translations)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const resp: any = await sendNui('getTranslations', {}, null)
        if (!mounted) return
        if (resp) {
          if (resp.translations && typeof resp.translations === 'object') {
            setTranslations({ ...(en as Translations), ...resp.translations })
          } else if (typeof resp === 'object') {
            setTranslations({ ...(en as Translations), ...resp })
          }
          if (resp.locale) setLocale(resp.locale)
        }
      } catch (e) {
        // fallback to en
      }
    }

    load()

    const handler = (data: any) => {
      if (!data) return
      if (data.translations) setTranslations({ ...(en as Translations), ...data.translations })
      else if (typeof data === 'object') setTranslations({ ...(en as Translations), ...data })
      if (data.locale) setLocale(data.locale)
    }

    on('setTranslations', handler)
    return () => {
      mounted = false
      off('setTranslations', handler)
    }
  }, [sendNui, on, off])

  function interpolate(str: string, vars?: Record<string, any> | any[]) {
    if (!vars) return str
    // support %s placeholders with array
    if (Array.isArray(vars)) {
      let i = 0
      return str.replace(/%s/g, () => String(vars[i++] ?? ''))
    }
    // support {name} placeholders with object
    return str.replace(/\{(.*?)\}/g, (_, k) => String((vars as Record<string, any>)[k] ?? ''))
  }

  function t(key: string, vars?: Record<string, any> | any[]) {
    const raw = translations[key] ?? (en as Translations)[key] ?? key
    try {
      return interpolate(raw, vars)
    } catch (e) {
      return raw
    }
  }

  return (
    <I18nContext.Provider value={{ t, locale, setLocale, translations }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
