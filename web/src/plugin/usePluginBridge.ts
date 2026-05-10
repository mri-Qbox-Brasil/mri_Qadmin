import { useCallback, useEffect, useRef } from 'react'
import {
  isMriPluginMessage,
  MriPluginGuestMessage,
  MriPluginHostMessage,
} from './types'

/**
 * Host-side bridge (Qadmin). Recebe mensagens do plugin guest (via iframe
 * postMessage) e expoe um sender pro Qadmin enviar de volta.
 *
 * Uso:
 * ```tsx
 * const iframeRef = useRef<HTMLIFrameElement>(null)
 * const send = usePluginBridgeHost(iframeRef, {
 *   onReady: () => send({ type: 'mri-plugin/init', accentColor, locale, perms }),
 *   onRequestClose: () => closePanel(),
 * })
 * ```
 */
export function usePluginBridgeHost(
  iframeRef: React.RefObject<HTMLIFrameElement>,
  handlers: {
    onReady?: () => void
    onRequestClose?: () => void
  }
) {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isMriPluginMessage(event.data)) return
      // So aceita mensagens vindas do iframe filho — descarta msgs de outros
      // contextos (extensoes, devtools, etc) que possam mandar postMessage.
      if (event.source !== iframeRef.current?.contentWindow) return

      const msg = event.data as MriPluginGuestMessage
      switch (msg.type) {
        case 'mri-plugin/ready':
          handlersRef.current.onReady?.()
          break
        case 'mri-plugin/request-close':
          handlersRef.current.onRequestClose?.()
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [iframeRef])

  // Sender: envia msg pro iframe. Retorna false se iframe nao montou ainda.
  const send = useCallback(
    (msg: MriPluginHostMessage) => {
      const target = iframeRef.current?.contentWindow
      if (!target) return false
      target.postMessage(msg, '*')
      return true
    },
    [iframeRef]
  )

  return send
}
