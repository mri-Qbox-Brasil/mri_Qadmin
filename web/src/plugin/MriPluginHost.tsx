import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { MriPluginManifest } from './types'
import { usePluginBridgeHost } from './usePluginBridge'

interface MriPluginHostProps {
  manifest: MriPluginManifest
  accentColor: string
  backgroundColor?: string
  locale: string
  perms: string[]
  onRequestClose?: () => void
}

/**
 * Renderiza o plugin guest dentro de um iframe e plumba o bridge postMessage.
 *
 * URL: `https://cfx-nui-{resource}/web/build/index.html?embedded=1` —
 * convencao FiveM CEF pra cross-resource NUI. O `?embedded=1` ajuda o plugin
 * a detectar o modo (alem de window.self !== window.top).
 */
export function MriPluginHost({
  manifest,
  accentColor,
  backgroundColor,
  locale,
  perms,
  onRequestClose,
}: MriPluginHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = usePluginBridgeHost(iframeRef, {
    onReady: () => {
      setReady(true)
      send({ type: 'mri-plugin/init', accentColor, backgroundColor, locale, perms })
    },
    onRequestClose,
  })

  useEffect(() => {
    if (!ready) return
    send({ type: 'mri-plugin/theme-changed', accentColor, backgroundColor })
  }, [accentColor, backgroundColor, ready, send])

  // Re-emite perms quando myPermissions muda em runtime (ex: plugin registrou após o admin abrir o painel).
  useEffect(() => {
    if (!ready) return
    send({ type: 'mri-plugin/perms-changed', perms })
  }, [perms, ready, send])

  // Timeout de loading: se o plugin nao mandar `ready` em 10s, mostra erro.
  // Causas comuns: resource nao esta running, build quebrado, bridge code
  // ausente no plugin.
  useEffect(() => {
    if (ready) return
    const timer = setTimeout(() => {
      if (!ready) setError(`Plugin "${manifest.id}" nao respondeu em 10s. Resource "${manifest.resource}" esta running?`)
    }, 10000)
    return () => clearTimeout(timer)
  }, [ready, manifest])

  const htmlPath = manifest.htmlPath ?? 'web/build/index.html'
  const src = `https://cfx-nui-${manifest.resource}/${htmlPath}?embedded=1`

  return (
    <div className="relative w-full h-full bg-background">
      {/* Iframe sempre montado — preserva state do plugin entre togglas */}
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0 block"
        title={manifest.label}
        // Sandbox NAO setado — plugins precisam de acesso completo (scripts,
        // postMessage, fetchNui). Confie no contrato.
      />

      {/* Loading overlay enquanto plugin nao manda `ready` */}
      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando {manifest.label}...</p>
        </div>
      )}

      {/* Error overlay se timeout */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 p-6">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <p className="text-base font-semibold text-foreground">Plugin indisponivel</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
        </div>
      )}
    </div>
  )
}
