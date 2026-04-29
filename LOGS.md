# Sistema de Logs — mri_Qadmin

---

## Visão geral

Cada ação administrativa gera um log com: resource de origem, categoria, nível (`info` / `success` / `warn` / `error`), mensagem, dados extras, admin (nome + citizenid) e timestamp.

Cada log pode ser roteado para até três destinos independentes, controlados por categoria e por resource:

| Destino        | Descrição                                                                 |
|----------------|---------------------------------------------------------------------------|
| **Banco de dados** | Persistência permanente, consultável pelo painel                      |
| **Discord**    | Embed formatado enviado via webhook                                        |
| **Relay**      | Evento Lua `ForwardEvent` disparado para outros resources                  |

---

## Banco de dados

```sql
CREATE TABLE IF NOT EXISTS mri_qadmin_logs (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    resource         VARCHAR(100) NOT NULL,
    category         VARCHAR(50)  NOT NULL,
    level            VARCHAR(20)  NOT NULL DEFAULT 'info',
    message          TEXT         NOT NULL,
    data             LONGTEXT     NULL,
    admin            VARCHAR(100) NULL,
    admin_src        INT          NULL,
    admin_citizenid  VARCHAR(50)  NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

Se a tabela já existia antes desta versão, as colunas novas são adicionadas automaticamente via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

---

## Configuração

### config.lua — valores iniciais

```lua
Config.Logs = {
    Webhooks = {
        players = "", bans = "", inventory = "", vehicles = "",
        money = "", server = "", permissions = "", chat = "", system = "",
        Fallback = "",   -- recebe categorias sem webhook específico
    },
    ForwardEvent    = "",          -- evento Lua para relay (ex: "meuResource:onLog")
    DBEnabled       = true,
    MaxMemory       = 500,         -- logs em memória para exibição instantânea
    ResourceMode    = 'blacklist', -- 'blacklist' | 'whitelist'
    ResourceEntries = {},
    Categories = {
        { id = 'players', label = '👤 Players' },
        -- ...
    },
}
```

> As flags `db`, `discord` e `relay` por categoria **não ficam no config.lua** — são gerenciadas pelo painel e salvas em `server/logs_settings.json`, que tem prioridade sobre o config em runtime.

### Prioridades de leitura

```
logs_settings.json  >  config.lua
```

Se `logs_settings.json` existir, todos os campos presentes nele sobrescrevem o config.lua ao iniciar o resource.

---

## Categorias

Cada categoria tem três flags de destino:

| Flag      | Padrão (sem config) | Descrição                        |
|-----------|---------------------|----------------------------------|
| `db`      | `true`              | Salva no banco                   |
| `discord` | `false`             | Envia ao webhook configurado     |
| `relay`   | `false`             | Dispara o `ForwardEvent`         |

Para um destino ser ativado, **tanto a categoria quanto o resource** devem permitir aquele destino (lógica AND).

Categorias podem ser **desativadas** (`disabled = true`), o que suprime todos os destinos mas ainda exibe o log no painel em tempo real.

---

## Filtragem por resource

**`ResourceMode = 'blacklist'`** (padrão): resources não listados em `ResourceEntries` passam normalmente.

**`ResourceMode = 'whitelist'`**: apenas resources explicitamente listados são processados; os demais chegam ao painel em tempo real mas não são salvos no DB, Discord ou relay.

`ResourceEntries` define regras por resource com as mesmas flags `db`, `discord` e `relay`, combinadas em AND com as regras da categoria.

---

## API — AddLog

### Interno (server-side do mri_Qadmin)

```lua
AddLog(src, resource, category, level, message, data)
```

```lua
-- Exemplo com helper GetTargetData
local logData = GetTargetData(targetSrc)
logData.reason = reason
AddLog(source, 'mri_Qadmin', 'bans', 'warn', 'Banimento: Fulano foi banido', logData)
```

**`GetTargetData(src)`** retorna `{ target_src, target_name, target_citizenid }` automaticamente resolvidos pelo QBCore.

### Externo (outros resources)

```lua
-- Via export
exports['mri_Qadmin']:AddLog(resource, category, level, message, data [, adminSrc])

-- Via evento
TriggerEvent('mri_Qadmin:server:AddLog', resource, category, level, message, data [, adminSrc])
```

---

## Campos especiais em `data`

| Campo               | Efeito                                                   |
|---------------------|----------------------------------------------------------|
| `target_src`        | Resolvido automaticamente se `target_name` não informado |
| `target_name`       | Aparece no campo **Alvo** do embed Discord               |
| `target_citizenid`  | Aparece no campo **Alvo** do embed Discord               |

Esses três campos são excluídos do bloco `Data` do embed — ficam apenas em **Alvo**.

---

## Discord

- Até **10 embeds** por request, até **~5800 caracteres** acumulados
- Fila persistida em `server/logs_queue.json` — logs não entregues são reenviados após restart
- Retry com backoff exponencial; respeita o header `retry-after` do HTTP 429
- Ordem de envio segue a **prioridade das categorias** (posição no array)

---

## Painel web

| Aba       | Funcionalidade                                                                 |
|-----------|--------------------------------------------------------------------------------|
| **Logs**  | Feed em tempo real + histórico com filtros por categoria, nível, resource e texto |
| **Configurações** | Gerencia categorias, webhooks, ResourceEntries, DB global, MaxMemory e ForwardEvent |

### Permissões

| Permissão              | O que libera                                     |
|------------------------|--------------------------------------------------|
| `qadmin.page.logs`     | Ver logs e receber atualizações em tempo real    |
| `qadmin.logs.settings` | Editar configurações de logs pelo painel         |

---

## Compatibilidade com qb-log

O sistema intercepta `qb-log:server:CreateLog` automaticamente: infere a categoria pelo conteúdo da mensagem e encaminha como log normal com `admin = "System"`.
