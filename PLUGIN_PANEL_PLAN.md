# Plano — Plugin dirige o painel do mri_Qadmin (MVP)

> Objetivo: um plugin registrado no Qadmin consegue **abrir e fechar o painel já
> na página dele**, apontando para a categoria e o componente exatos, **sem
> perder o que o admin já tinha preenchido**.

Última atualização: 2026-08-21 · Versão base do resource: 1.21.2 · Entrega: PR #7 (branch `jj`)

---

## 1. Contexto e diagnóstico

`RegisterPlugin` registrava a aba no sidebar e parava aí:

```
plugin  →  RegisterPlugin(manifest)  →  registry server-side
                                     →  pluginsUpdated (por source, filtrado por ACE)
                                     →  item no sidebar
                                     →  ...e acabou: quem navega é o admin, no braço
```

Faltavam três coisas, e cada uma quebra numa camada diferente:

| Falta | Onde quebra |
|---|---|
| O plugin pedir "abre em mim" | Lua: não existia export de navegação |
| Dizer **onde** dentro da página | React: a rota é uma string só, sem sub-destino |
| Não perder o que estava preenchido | React: fechar desmontava a árvore inteira |

**Conclusão:** não dá para resolver só no Lua. Precisa de contrato de export
(Lua), de um canal de destino fino (Lua→NUI→iframe) e de mudar o ciclo de vida
do painel (React). São três frentes com riscos próprios.

---

## 2. Arquitetura

```
  plugin (client)                       plugin (server)
  exports:OpenPlugin(id, opts)          exports:OpenPluginForPlayer(src, id, opts)
        │                                     │  canDrivePanel: HasPerms + pluginsForSource
        │                                     ▼
        │                          TriggerClientEvent 'mri_Qadmin:client:OpenPlugin'
        ▼                                     │
  client/plugins.lua  ◄─────────────────────  ┘
        │  CheckPerms('qadmin.open')
        │  resolveTarget: opts > manifest.default* > 'plugin:<id>'
        ▼
  SendNUIMessage{ action='navigate', route, page, category, focus }
        │
        ▼
  App.tsx → effectiveRoute (gate de página por ACE) → setRoute
        ├─ página nativa  → navTarget (one-shot) → aba + useNavFocus (scroll/foco/realce)
        └─ página plugin  → MriPluginHost → postMessage 'mri-plugin/navigate' → iframe
        │
        └─ routeChanged (NUI callback) ──► currentRoute no Lua
                                           (base de Close / Toggle / IsPluginOpen)
```

Decisões-chave:

1. **Destino em cascata:** `opts` da chamada > `default*` do manifest >
   convenção `plugin:<id>`. O plugin declara o normal uma vez e sobrescreve por
   chamada quando precisa.
2. **O gate é o mesmo do `/adm`** (`qadmin.open` + `requiredPerms` do plugin).
   Nos exports de servidor a checagem roda no servidor, com `HasPerms`
   ([server/plugins.lua:101](server/plugins.lua#L101)), antes de tocar no client.
3. **Fechar esconde, não desmonta** (`display: none` sob wrapper
   `display: contents`) — é o que preserva campo digitado, aba, scroll e o
   documento do iframe.
4. **O Qadmin não mexe no DOM do iframe.** `page`/`category`/`focus` chegam ao
   plugin por postMessage; navegar internamente é responsabilidade dele.
5. **`currentRoute` é espelho do React**, não palpite do Lua: a NUI devolve a
   rota efetiva por `routeChanged` ([client/plugins.lua:32](client/plugins.lua#L32)).
   Sem isso, `ClosePlugin` de um plugin em background derrubaria o painel que o
   admin abriu em outra aba.

---

## 3. Escopo

### ✅ Dentro do MVP
Abrir, fechar, alternar e consultar (`OpenPlugin` / `ClosePlugin` /
`TogglePlugin` / `IsPluginOpen`) pelo client; os três equivalentes
`*ForPlayer` pelo server; destino com `route` / `page` / `category` / `focus`;
`category` nas páginas nativas (settings, permissions, actions); `focus` por
`[data-nav-id]` → `#id` → `[name]`; estado preservado no fechar; polling pausado
enquanto escondido.

### ⚠️ Depende do plugin
`page`, `category` e `focus` dentro de uma página de plugin só funcionam se o
guest ouvir `mri-plugin/init` e `mri-plugin/navigate`. O Qadmin entrega; quem
não escutar, ignora em silêncio.

### ❌ Fora do MVP
Histórico/voltar entre destinos · fila ou arbitragem quando dois plugins
disputam o painel · `focus` no manifest (de propósito: piscaria a cada abertura)
· parâmetros livres de deep-link além dos quatro campos · abrir para um admin
que não seja o dono da sessão sem passar pelo export de servidor.

---

## 4. Plano por fases

### Fase 0 — Contrato dos exports ✅ entregue
Exports client + server, retorno `(ok, reason)` em vez de falha silenciosa,
gate de permissão nas duas pontas.
- **Arquivos:** `client/plugins.lua`, `server/plugins.lua`, `fxmanifest.lua`.

### Fase 1 — Destino fino ✅ entregue
`route`/`page`/`category`/`focus`, `default*` no manifest, `navTarget` one-shot,
`useNavFocus`, `mri-plugin/navigate` no bridge, `nonce` para repetir o mesmo
destino.
- **Arquivos:** `web/src/utils/navTarget.ts`, `web/src/hooks/useNavFocus.ts`,
  `web/src/plugin/{types.ts,MriPluginHost.tsx}`, páginas nativas.

### Fase 2 — Sobrevivência do estado ✅ entregue
Esconder em vez de desmontar; `panelVisible` no `AppState`; pausa de polling.
- **Arquivos:** `web/src/App.tsx`, `web/src/context/AppState.tsx`,
  `LiveMapPage`, `MapModal`, `ScreenModal`, `Dashboard`.

### Fase 3 — Correções pós-revisão ✅ entregue
Furo do guard do `ClosePlugin`, cache que reconsultava o servidor, validação de
`pluginId` no `ClosePluginForPlayer`. Detalhe na seção 7.

### Fase 4 — Teste automatizado 🔶 parcial
`navTarget` coberto por vitest (o único módulo puro do lote). O contrato Lua
segue sem teste: `client/plugins.lua` depende de `SendNUIMessage`/`ToggleUI` e o
harness ainda não tem `CreateThread` cooperativo — a mesma dívida que o
[TODO](TODO.md) já registra para `server/plugins.lua`.
- **Entregável pendente:** stub de NUI no harness + specs de
  `resolveTarget`/`closePlugin`/`togglePlugin`.
- **Estimativa:** 8h sem IA / 4h com IA.

### Fase 5 — Matar o otimismo do `currentRoute` ✅ entregue
`openPlugin` não grava mais a rota: `currentRoute` passou a ser só o espelho do
que o React confirma por `routeChanged`. A janela não era curta como o plano
supunha — quando o `effectiveRoute` recusa em silêncio, a rota **não muda** e
portanto `routeChanged` nunca dispara, então o valor otimista mentia para
sempre. Junto veio `openedRoutes`: a rota com que cada plugin foi realmente
aberto, porque `opts.route` sobrescreve o default e recalcular sem os opts
deixava a sessão infechável e indetectável por id.
- **Arquivos:** `client/plugins.lua`.

### Fase 6 — Versionar o protocolo do bridge ⏳
`mri-plugin/navigate` entrou aditivo: plugin velho ignora e nada quebra. Isso
não escala — a próxima mensagem pode não ser aditiva.
- **Entregável:** `protocolVersion` no `mri-plugin/init` e negociação mínima.
- **Estimativa:** 6h sem IA / 3h com IA.

### Fase 7 — Arbitragem entre plugins ⏳
Hoje o último `OpenPlugin` ganha. Com dois plugins reagindo ao mesmo evento de
jogo, o painel pisca entre destinos.
- **Entregável:** política explícita (ignorar se já aberto em outro plugin, ou
  fila com prioridade declarada no manifest).
- **Estimativa:** 10h sem IA / 5h com IA.

---

## 5. Estimativas

Premissas iguais às do [REMOTE_ACCESS_PLAN.md](REMOTE_ACCESS_PLAN.md#5-estimativas-de-tempo):
1 dev sênior, dia útil = 8h.

| Fase | Descrição | Sem IA | Com IA | Status |
|---|---|---:|---:|---|
| 0 | Contrato dos exports | 10h | 5h | ✅ |
| 1 | Destino fino | 16h | 8h | ✅ |
| 2 | Sobrevivência do estado | 12h | 6h | ✅ |
| 3 | Correções pós-revisão | 4h | 2h | ✅ |
| 4 | Teste automatizado | 8h | 4h | 🔶 |
| 5 | Confirmação de rota | 6h | 3h | ✅ |
| 6 | Versionar o bridge | 6h | 3h | ⏳ |
| 7 | Arbitragem | 10h | 5h | ⏳ |
| **MVP (0–5, exceto 4)** | | **48h** | **24h** | |
| **Total** | | **72h** | **36h** | |

---

## 6. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Painel montado o tempo todo mantém timer vivo | CPU/rede com o painel fechado | `panelVisible` + varredura: os 3 `setInterval` da SPA pausam; nenhum `requestAnimationFrame` no código |
| Plugin em background fecha o painel do admin | admin perde o que estava fazendo | `ClosePlugin(id)` só age se a rota ativa for a dele — e agora recusa id desconhecido |
| `route` livre aponta para página proibida | admin veria página sem permissão | `effectiveRoute` ([web/src/App.tsx:215](web/src/App.tsx#L215)) redireciona; os callbacks de dados já são gated no server |
| `focus` não encontra o elemento | nada acontece, sem erro | 20 tentativas × 100ms e desiste; `data-nav-id` é contrato explícito |
| Reabrir mostra dado velho | admin decide sobre snapshot obsoleto | Dashboard refaz `getServerInfo` ao reabrir; pollers retomam sozinhos |
| Plugin antigo não entende `mri-plugin/navigate` | destino fino não aplica | mensagem aditiva; abre na página mesmo assim (Fase 6 formaliza) |

---

## 7. Gaps de planejamento encontrados

Levantados na revisão do rascunho do PR #7 — o que o plano das Fases 0–2 não
previa:

| # | Gap | Impacto | Status |
|---|---|---|---|
| G1 | `ClosePlugin(id)` fechava mesmo com id desconhecido: quando `resolveTarget` devolvia `nil`, a comparação de rota era pulada | qualquer resource fechava o painel do admin passando uma string qualquer | ✅ coberto — devolve `not_registered` |
| G2 | `getPlugins()` só cacheava lista não-vazia: para quem não enxerga plugin nenhum, **toda** chamada refazia `lib.callback.await` | round-trip bloqueante por chamada num predicado que plugin chama em loop | ✅ coberto — flag `pluginsFetched` (a lista é push-mantida por `broadcastPluginsUpdated` e `PlayerPermissionsReady`, então não estagna) |
| G3 | `ClosePluginForPlayer` não validava `pluginId` | mesmo vetor do G1, vindo do servidor | ✅ coberto — valida tipo |
| G4 | 30 arquivos, **zero teste** | regressão silenciosa na próxima mexida | 🔶 parcial — `navTarget` coberto; Lua vira Fase 4 |
| G5 | Docs listavam só as razões de abrir; `already_closed`, `not_active` e `invalid_source` não apareciam em lugar nenhum | integrador trata retorno que não conhece | ✅ coberto — tabela de razões no README/MANUAL |
| G6 | `not_registered` cobre dois casos: id inexistente **e** plugin que o jogador não pode ver | integrador lê como "errei o id" | ✅ coberto — documentado; é de propósito, não vaza a existência do plugin |
| G7 | `currentRoute` otimista: gravado antes de o React confirmar a rota | `IsPluginOpen` mente **para sempre**, não numa janela: a recusa do `effectiveRoute` não muda a rota, logo não dispara `routeChanged` | ✅ coberto — Fase 5 |
| G8 | Bridge sem versão de protocolo | próxima mensagem não-aditiva quebra plugin velho | ⏳ registrado — Fase 6 |
| G9 | Pausa de polling escolhida a dedo, sem varredura | timer sobrevivente rodando com painel fechado | ✅ coberto — ver G11; a varredura por `setInterval` estava certa (3, todos pausados) mas era estreita demais |
| G11 | **`LiveScreensPage` seguia transmitindo com o painel fechado.** O único `StopPlayerScreen` da página era o cleanup de unmount, e fechar deixou de desmontar. Não é timer: `grep setInterval` não podia achar | captura de tela do jogador continuava viva no client dele, com as peer connections abertas, até troca de rota ou reload da NUI | ✅ coberto — gate de `panelVisible`, para ao esconder e re-pede ao reabrir |
| G12 | Iframe do plugin sem sinal de abertura nem de visibilidade: o `navigate` só saía com `page`/`category`/`focus`, e `mri-plugin/close` era declarado e nunca enviado | plugin sem `default*` nunca sabia da reabertura (o `init` não roda de novo) e seguia com polling atrás do painel fechado | ✅ coberto — nonce sobe a todo `OpenPlugin`; `mri-plugin/visibility` (aditiva) avisa esconder/reexibir |
| G13 | `broadcastPluginsUpdated` não rodava nas 3 mutações de permissão em runtime — `PlayerPermissionsReady` só dispara em `OnPlayerLoaded` e `Reload` | admin perdia a `requiredPerm` e o plugin seguia dirigindo o painel dele até relogar; a flag `pluginsFetched` do G2 estendeu a validade do cache errado | ✅ coberto — as 3 mutações disparam o evento, mesmo par que os call sites existentes |
| G14 | Fetches de mount-only (`Logs` ×2, `Groups`) e a inscrição de `RefreshPlayers` não consideravam que o mount parou de recorrer | reabrir mostrava snapshot velho sem aviso; `Players` refazia o page-walk dentro de painel fechado | ✅ coberto — gate de `panelVisible` |
| G15 | `focus` documentado como pronto em página nativa, sem nenhum alvo marcado no codebase | integrador escreve a chamada e não entende o silêncio | 🔶 doc corrigida — marcar os componentes segue pendente |
| G10 | Feature desse tamanho sem plano no repo | decisão de escopo perdida no diff | ✅ coberto — este documento, linkado no [TODO](TODO.md) |

---

## 8. Recomendação de execução

1. **Fase 4 primeiro.** É a única dívida que cresce: cada fase seguinte mexe no
   mesmo `client/plugins.lua` sem rede de proteção.
2. **Fase 5 antes da 7.** Arbitragem depende de saber com certeza o que está
   aberto — construir fila sobre `currentRoute` otimista é construir sobre areia.
3. **Fase 6 quando entrar o segundo plugin real.** Com um consumidor só,
   versionar protocolo é cerimônia; com dois, é o que evita quebrar um deles.
