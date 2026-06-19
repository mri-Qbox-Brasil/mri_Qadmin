import { useState } from 'react'
import { ArrowUpCircle, X, Copy, Check } from 'lucide-react'
import { useAppState } from '@/context/AppState'
import { useI18n } from '@/hooks/useI18n'

// Banner dispensavel exibido no topo do conteudo quando ha uma nova release
// do mri_Qadmin. Visivel apenas para admins (server so envia updateInfo a quem
// tem qadmin.page.resources). O dismiss e persistido por versao: ao sair uma
// versao ainda mais nova, o banner volta a aparecer.
const DISMISS_KEY = 'mri_qadmin_update_dismissed'

// Copia texto pra area de transferencia. No CEF do FiveM o navigator.clipboard
// costuma ser bloqueado, entao caímos no fallback execCommand('copy').
const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch { /* cai no fallback */ }
    try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        return ok
    } catch {
        return false
    }
}

export default function UpdateBanner() {
    const { gameData } = useAppState()
    const { t } = useI18n()
    const info = gameData?.updateInfo
    const latest = info?.latest ?? ''

    const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => {
        try { return localStorage.getItem(DISMISS_KEY) } catch { return null }
    })
    const [copied, setCopied] = useState(false)

    if (!info?.updateAvailable || (!!latest && dismissedVersion === latest)) return null

    const dismiss = () => {
        try { localStorage.setItem(DISMISS_KEY, latest) } catch { /* noop */ }
        setDismissedVersion(latest)
    }

    const copyLink = async () => {
        const ok = await copyToClipboard(info.url)
        if (ok) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 mb-2 text-xs text-primary shadow-sm">
            <ArrowUpCircle className="w-4 h-4 shrink-0" />
            <div className="flex-1 min-w-0">
                <span className="font-bold">{t('update.banner_title') || 'Atualização disponível'}</span>
                <span className="text-primary/80">
                    {' — '}
                    {(t('update.banner_body') || 'mri_Qadmin v%s já está disponível (você tem a v%c).')
                        .replace('%s', latest)
                        .replace('%c', info.current)}
                </span>
            </div>
            <button
                onClick={copyLink}
                className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/30 px-2 py-1 font-semibold hover:bg-primary/20 transition-colors"
                title={info.url}
            >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? (t('update.copied') || 'Copiado!') : (t('update.copy_link') || 'Copiar link')}
            </button>
            <button
                onClick={dismiss}
                className="shrink-0 p-1 rounded-md hover:bg-primary/20 transition-colors"
                title={t('update.dismiss') || 'Dispensar'}
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
