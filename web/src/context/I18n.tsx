import React, { useEffect, useState } from 'react'
import en from '../../../locales/en.json'
import { useNui } from './NuiContext'
import { I18nContext, Translations } from '../hooks/useI18n'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { sendNui, on, off } = useNui()
  const [locale, setLocale] = useState<string>('en')
  const [translations, setTranslations] = useState<Translations>(en as Translations)
  const [preferredLocale, setPreferredLocaleState] = useState<string | null>(localStorage.getItem('mri_qadmin_locale'))
  const [supportedLanguages, setSupportedLanguages] = useState<{ id: string, label: string, flag: string }[]>([
    { id: 'pt-br', label: 'Português (BR)', flag: '🇧🇷' },
    { id: 'en', label: 'English', flag: '🇺🇸' },
    { id: 'es', label: 'Español', flag: '🇪🇸' },
  ])

  const setPreferredLocale = (val: string | null) => {
    if (val) localStorage.setItem('mri_qadmin_locale', val)
    else localStorage.removeItem('mri_qadmin_locale')
    setPreferredLocaleState(val)
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const resp: any = await sendNui('getTranslations', { locale: preferredLocale }, null)
        if (!mounted) return
        if (resp) {
          if (resp.translations && typeof resp.translations === 'object') {
            setTranslations({ ...(en as Translations), ...resp.translations })
          } else if (typeof resp === 'object') {
            setTranslations({ ...(en as Translations), ...resp })
          }

          const serverLocale = resp.locale || 'pt-br'
          setLocale(preferredLocale || serverLocale)
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

      const serverLocale = data.locale || 'pt-br'
      setLocale(preferredLocale || serverLocale)
    }

    on('setTranslations', handler)
    return () => {
      mounted = false
      off('setTranslations', handler)
    }
  }, [sendNui, on, off, preferredLocale])

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
    <I18nContext.Provider value={{ t, locale, setLocale, translations, preferredLocale, setPreferredLocale, supportedLanguages, setSupportedLanguages }}>
      {children}
    </I18nContext.Provider>
  )
}
