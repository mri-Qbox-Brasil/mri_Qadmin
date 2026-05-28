// Contrato compartilhado entre mri_Qadmin (host) e plugins guest (mri_Qspawn,
// futuros). Drift control: este arquivo deve bater 1:1 com a copia em
// {plugin_resource}/web/src/plugin/types.ts. Mudancas aqui sao breaking pro
// ecossistema — bump pequeno (eg adicionar campo opcional) ok, rename/remove
// quebra plugins existentes.

/** Manifest enviado pelo plugin no boot do server. Usado pelo Qadmin pra
 * popular o sidebar e renderizar o iframe quando o user clicar. */
export interface MriPluginManifest {
  /** Identificador unico (kebab-case). Usado no route do Qadmin como `plugin:{id}`. */
  id: string
  /** Texto exibido no sidebar. */
  label: string
  /** Nome de icone lucide-react (eg 'map-pin', 'sword', 'box'). */
  icon: string
  /** Nome do resource FiveM (eg 'mri_Qspawn'). Usado pra montar a URL do iframe. */
  resource: string
  /** Path do HTML buildado dentro do resource (relativo a raiz). Default
   * `web/build/index.html` por compat. Plugins novos que builadam pra `html/`
   * passam `html/index.html`. */
  htmlPath?: string
  /** ACE perms que liberam o plugin. Semantica OR — user precisa de QUALQUER
   * uma delas. Vazio = sempre visivel. Ex: ['mri_Qspawn.admin', 'command']
   * libera pra quem tem ace especifica OU pra console/god. */
  requiredPerms?: string[]
  /** Metadados ricos para as permissoes listadas em requiredPerms.
   *  Quando presente, o editor de grupos usa label/desc de cada entrada.
   *  Plugins sem esse campo exibem o sufixo do perm id como label. */
  permDefs?: Array<{
    id: string
    label?: string
    desc?: string
    category?: string
  }>
  /** Descricao curta opcional (tooltip ou subtitle). */
  description?: string
}

/** Mensagens que o host (Qadmin) envia pro plugin via postMessage. */
export type MriPluginHostMessage =
  /** Boot: enviado uma vez quando o plugin sinaliza `ready`. */
  | {
      type: 'mri-plugin/init'
      accentColor: string
      backgroundColor?: string
      locale: string
      perms: string[]
    }
  /** Runtime: tema mudou (accent e/ou background). */
  | {
      type: 'mri-plugin/theme-changed'
      accentColor: string
      backgroundColor?: string
    }
  /** Runtime: lista de permissões do usuário mudou. */
  | {
      type: 'mri-plugin/perms-changed'
      perms: string[]
    }
  /** Host pediu pro plugin fechar/limpar (eg user navegou pra outro item). */
  | { type: 'mri-plugin/close' }

/** Mensagens que o plugin guest envia pro host (Qadmin). */
export type MriPluginGuestMessage =
  /** Plugin terminou de montar e ta pronto pra receber init. */
  | { type: 'mri-plugin/ready' }
  /** Plugin pediu pra Qadmin fechar a UI inteira. */
  | { type: 'mri-plugin/request-close' }

/** Type guard utilitario pra distinguir msgs do nosso protocolo de outros
 * postMessages (qualquer codigo pode mandar postMessage; o type prefix
 * `mri-plugin/` evita colisao). */
export const isMriPluginMessage = (
  data: unknown
): data is MriPluginHostMessage | MriPluginGuestMessage => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof (data as { type: unknown }).type === 'string' &&
    (data as { type: string }).type.startsWith('mri-plugin/')
  )
}
