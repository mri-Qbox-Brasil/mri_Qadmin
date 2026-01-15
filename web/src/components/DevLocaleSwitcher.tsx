import { useState } from 'react'
import { useI18n } from '@/context/I18n'
import { SelectSearch } from '@mriqbox/ui-kit'
import { cn } from '@/lib/utils'

export default function DevLocaleSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n()
  const [loading, setLoading] = useState(false)

  const locales = ['en','de','es','fr','pt-br','it','nl','no','tr','id']
  const options = locales.map(l => ({ label: l.toUpperCase(), value: l }))

  async function applyLocale(code: string) {
    setLoading(true)
    try {
      // dynamic import of locales from workspace
      const mod = await import(`../../../locales/${code}.json`)
      const translations = mod.default || mod
      // post message to I18nProvider listener
      window.postMessage({ action: 'setTranslations', data: { translations, locale: code } }, '*')
    } catch (e) {
      console.error('load locale', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("min-w-[140px]", className)}>
        <SelectSearch
            options={options}
            value={locale}
            onChange={applyLocale}
            disabled={loading}
            placeholder="Locale"
            searchPlaceholder="Search..."
            className="w-full h-9 text-xs"
        />
    </div>
  )
}
