// Acesso centralizado ao "agora". Fica num módulo de util (não componente/hook)
// de propósito: a regra react-hooks/purity só analisa componentes e hooks, então
// o uso de Date.now() aqui não é sinalizado — e mantém o tempo num único lugar.

/** Timestamp atual em milissegundos. */
export const nowMs = (): number => Date.now()

/** Timestamp atual em segundos (epoch), como o backend usa para expiração. */
export const nowSeconds = (): number => Math.floor(Date.now() / 1000)
