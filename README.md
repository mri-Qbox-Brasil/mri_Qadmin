# mri_Qadmin

Um painel administrativo poderoso e extensível para servidores FiveM baseados em QBCore e Qbox, oferecendo gerenciamento abrangente de jogadores, controle de servidor, ferramentas de veículos, integração com sistema VIP, transmissão de tela ao vivo e uma arquitetura de plugins para módulos externos.

## Principais recursos

-   **Painel Administrativo Completo** — Interface NUI intuitiva para gerenciamento de servidor, jogadores e recursos.
-   **Sistema de Permissões Avançado** — Gerenciamento de grupos, permissões dinâmicas e status de "Master Admin" com bypass total.
-   **Gerenciamento de Jogadores e Veículos** — Ferramentas para teleporte, vitais, inventário, spawn, reparo, modificação de veículos e controle de chaves.
-   **Transmissão de Tela (WebRTC)** — Visualização em tempo real da tela de jogadores para monitoramento.
-   **Arquitetura de Plugins** — Extensibilidade para adicionar funcionalidades administrativas personalizadas e integrar com outros recursos.

## Instalação rápida

1.  Copie a pasta `mri_Qadmin` para a pasta de resources do servidor.
2.  Adicione `ensure mri_Qadmin` no `server.cfg` (após as dependências obrigatórias).
3.  Execute o script SQL fornecido (se houver) para inicializar as tabelas do banco de dados.

## Configuração

### Dependências obrigatórias

-   `ox_lib` — Para callbacks, comandos, gerenciamento de permissões ACE e funções de utilidade.
-   `oxmysql` — Para interação com o banco de dados MySQL.
-   `qb-core` — Framework principal para dados de jogadores, funções e notificações.
-   `json` — Para codificação/decodificação de dados JSON.
-   `mri_Qbox` — Para integração com o sistema VIP.
-   `server/server_secrets.json` — Arquivo externo necessário para o sinalizador WebRTC Cloudflare SFU.

O recurso utiliza o banco de dados para persistência de grupos, permissões, configurações, logs, dados de jogadores e informações de "Master Admin". As tabelas são criadas automaticamente ou através de um script SQL inicial.

### Permissões

O `mri_Qadmin` possui um sistema de permissões robusto baseado em grupos, permitindo controle granular sobre todas as ações administrativas.

-   **Grupos:** Os administradores podem ser atribuídos a grupos com permissões específicas.
-   **Master Admin:** Um status especial que concede bypass total a todas as permissões do Qadmin, configurável via console.
-   **Registro de Permissões:** Scripts externos podem registrar suas próprias permissões e categorias dentro do painel do Qadmin usando a export `RegisterPermissions`.
-   **Permissão de Abertura:** A permissão necessária para abrir o painel administrativo é configurável (ex: `Config.OpenPanelPerms`).

## Comandos

| Comando | Descrição |
| :------ | :-------- |
| `/adm` | Abre o painel administrativo. |
| `/nc` | Ativa/desativa o modo noclip. |
| `/vector2`, `/vec2` | Copia as coordenadas atuais como Vector2. |
| `/vector3`, `/vec3` | Copia as coordenadas atuais como Vector3. |
| `/vector4`, `/vec4` | Copia as coordenadas atuais como Vector4 (incluindo heading). |
| `/heading` | Copia o heading atual. |
| `/setammo` | Define a munição para a arma atual. |
| `mri_qadmin.setmaster [target]` | (Console Only) Concede status de "Master Admin" a um jogador. |
| `mri_qadmin.removemaster [target]` | (Console Only) Revoga status de "Master Admin" de um jogador. |
| `mri_qadmin.debugperms [target]` | (Console Only) Exibe informações detalhadas de depuração de permissões para um jogador. |
| `mri_qadmin.purgemasters` | (Console Only) Limpa todos os bypasses de "Master Admin" do banco de dados. |
| `mri_qadmin.inspectdb` | (Console Only) Inspeciona as tabelas de permissões do Qadmin no banco de dados. |
| `wall` | Ativa/desativa o recurso ESP Wallhack para o jogador (requer `qadmin.action.enable_wall`). |

## Exports

### Client

| Export | Descrição |
| :----- | :-------- |
| `CheckPerms` | Verifica permissões no lado do cliente. |
| `ToggleUI` | Alterna a visibilidade da interface do usuário (UI) do painel. |
| `OpenUI` | Abre a interface do usuário (UI) do painel. |
| `IsMenuVisible` | Verifica se o menu do painel está visível. |

### Server

| Export | Descrição |
| :----- | :-------- |
| `HasPerms` | Verifica permissões no lado do servidor. |
| `IsPlayerInPrincipal` | Verifica se um jogador está em um principal específico. |
| `GeneratePlate` | Gera uma placa de veículo no lado do servidor. |
| `GetActions` | Recupera ações administrativas configuradas. |
| `AddLog` | Adiciona um registro ao sistema de logs. |
| `RegisterPermissions(perms, categoryDef)` | Permite que scripts externos registrem suas próprias permissões e categorias. |
| `UnregisterPlugin(id)` | Desregistra um plugin previamente registrado do painel Qadmin. |
| `RegisterPlugin(manifest)` | Registra um novo plugin (página administrativa) no painel Qadmin. |
| `GetUserPermissions(src)` | Retorna uma lista de todas as permissões que um determinado jogador possui. |
| `getPlayers(page, pageSize, search)` | Recupera uma lista paginada de jogadores online e offline. |
| `RefreshResources()` | Atualiza a lista de todos os recursos do servidor e seus estados. |
| `GetServerData()` | Recupera várias estatísticas do servidor (contagem de jogadores, veículos, totais de dinheiro). |
| `GetPrimitiveSettings()` | Retorna uma tabela de configurações primitivas (string, number, boolean). |
| `GetVehiclesList()` | Retorna uma lista ordenada de todos os veículos disponíveis no servidor. |

## Server Modules

| Módulo | Descrição |
| :----- | :-------- |
| `main.lua` | Lógica principal do servidor, gerenciamento de dados, permissões e eventos. |

## Client Modules

| Módulo | Descrição |
| :----- | :-------- |
| `main.lua` | Entry point do cliente, gerenciamento da UI, eventos e funcionalidades client-side. |

## Estrutura de arquivos 📁

```
mri_Qadmin/
├── client/
├── server/
├── shared/
├── web/
└── fxmanifest.lua
```

## Observações importantes ⚠️

-   O arquivo `server/server_secrets.json` é **obrigatório** para a funcionalidade de transmissão de tela WebRTC via Cloudflare SFU. Certifique-se de configurá-lo corretamente.
-   Alguns comandos (como `/adm`, `/nc`, `/vector2`, etc.) são executados e whitelisted pelo recurso, mas podem não ser registrados diretamente no código client-side fornecido, dependendo da configuração.
-   O recurso é altamente configurável, permitindo a integração com diferentes sistemas de combustível (`Config.Fuel`), concessionárias (`Config.Dealership`) e inventários (`Config.Inventory`).
-   A arquitetura de plugins permite que desenvolvedores estendam facilmente as funcionalidades do painel administrativo.
